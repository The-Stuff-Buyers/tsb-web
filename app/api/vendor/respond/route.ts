import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

let supabaseClient: ReturnType<typeof createClient> | null = null
function getSupabase() {
  if (!supabaseClient) {
    supabaseClient = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
  }
  return supabaseClient
}

const CYCLOPS_WEBHOOK_URL = process.env.CYCLOPS_WEBHOOK_URL || 'http://localhost:3001'
const CYCLOPS_WEBHOOK_SECRET = process.env.CYCLOPS_WEBHOOK_SECRET

// Canonical offer type resolver — maps web form payment_structure values to DB enum (consignment | cash | both).
// Canonical version lives in cyclops-pipeline/src/bidfta.js → resolveOfferType. Keep in sync.
function resolveOfferType(paymentStructure: string | null | undefined): 'cash' | 'consignment' | 'both' | null {
  if (!paymentStructure) return null
  const ps = paymentStructure.toLowerCase().trim()
  if (ps.startsWith('consignment')) return 'consignment'
  if (ps === 'both') return 'both'
  // cash_purchase, net_30, net_60, other → all cash-structure variants
  // payment terms (net_30/net_60) are preserved in the payment_structure column
  return 'cash'
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request format.' }, { status: 400 })
  }

  const {
    deal_id, token,
    offer_type, quantity_offered, cash_offer_per_unit, cash_offer_total,
    consignment_return, pickup_logistics, pickup_date, notes,
    vendor_company, vendor_contact, vendor_email, vendor_phone,
    resubmission_needed,
  } = body as Record<string, string>

  const isDecline = offer_type === 'declined'

  // Required fields
  if (!deal_id || !token || !offer_type || (!isDecline && !quantity_offered) || !notes) {
    return NextResponse.json(
      { error: 'Missing required fields: deal_id, token, offer_type, notes.' },
      { status: 400 }
    )
  }

  const supabase = getSupabase()

  // 1. Validate token
  const { data: tokenRow, error: tokenErr } = await supabase
    .from('vendor_response_tokens')
    .select('id, deal_id, token, expires_at, used_at')
    .eq('token', token)
    .maybeSingle() as { data: { id: string; deal_id: string; token: string; expires_at: string; used_at: string | null } | null; error: unknown }

  if (tokenErr || !tokenRow) {
    return NextResponse.json({ error: 'This link is invalid or has expired.' }, { status: 403 })
  }

  if (tokenRow.used_at) {
    return NextResponse.json({ error: 'A quote has already been submitted using this link.' }, { status: 410 })
  }

  if (new Date(tokenRow.expires_at) < new Date()) {
    return NextResponse.json({ error: 'This link has expired.' }, { status: 410 })
  }

  // 2. Look up deal
  const { data: deal, error: dealErr } = await supabase
    .from('deals')
    .select('id, deal_id, stage, latest_quote_id')
    .eq('deal_id', deal_id)
    .maybeSingle() as { data: { id: string; deal_id: string; stage: string; latest_quote_id: string | null } | null; error: unknown }

  if (dealErr || !deal) {
    return NextResponse.json({ error: 'Deal not found.' }, { status: 404 })
  }

  // Verify token belongs to this deal
  if (tokenRow.deal_id !== deal.id) {
    return NextResponse.json({ error: 'Token does not match this deal.' }, { status: 403 })
  }

  // Verify deal is at the right stage
  if (deal.stage !== 'submitted_to_bidfta') {
    return NextResponse.json(
      { error: `Deal is not awaiting a vendor quote (current stage: ${deal.stage}).` },
      { status: 400 }
    )
  }

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'

  try {
    // ── Decline path ──────────────────────────────────────────────────────────
    if (isDecline) {
      // Mark quote as declined
      if (deal.latest_quote_id) {
        await supabase.from('quotes').update({
          status: 'declined',
          received_at: new Date().toISOString(),
          notes: notes || null,
          raw_response: body,
        } as never).eq('id', deal.latest_quote_id)
      }

      // Log event
      await supabase.from('deal_events').insert({
        deal_id: deal.id,
        event_type: 'bidfta_declined',
        actor: 'vendor_web_form',
        metadata: { vendor_company: vendor_company || null, decline_reason: notes, source: 'web_form' },
        from_stage: 'submitted_to_bidfta',
        to_stage: 'closed_bidfta_declined',
      } as never)

      // Close the deal
      await supabase.from('deals').update({
        stage: 'closed_bidfta_declined',
        closed_at: new Date().toISOString(),
        close_reason: 'bidfta_declined',
        bidfta_response_at: new Date().toISOString(),
        decline_reason_collected: true,
      } as never).eq('id', deal.id)

      // Mark token used
      await supabase.from('vendor_response_tokens').update({
        used_at: new Date().toISOString(),
        used_by_ip: ip,
      } as never).eq('id', tokenRow.id)

      // Notify Cyclops (best-effort)
      if (CYCLOPS_WEBHOOK_SECRET) {
        try {
          await fetch(`${CYCLOPS_WEBHOOK_URL}/webhook/bidfta-response`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${CYCLOPS_WEBHOOK_SECRET}` },
            body: JSON.stringify({ deal_id, offer_type: 'declined', resubmission_needed: resubmission_needed === 'true', notes, vendor_company, vendor_contact, vendor_email, vendor_phone }),
          })
        } catch (e) { console.error('[vendor/respond] Cyclops webhook failed (decline):', e) }
      }

      return NextResponse.json({ success: true })
    }

    // ── Quote path ────────────────────────────────────────────────────────────
    // 3. Update the pending quote row
    const mappedOfferType = resolveOfferType(offer_type)

    // Parse numeric fields up front so expected_recovery can be derived cleanly
    const parsedCashOfferPerUnit = cash_offer_per_unit
      ? parseFloat(String(cash_offer_per_unit).replace(/[^0-9.]/g, '')) || null
      : null
    const parsedCashOfferTotal = cash_offer_total
      ? parseFloat(String(cash_offer_total).replace(/[^0-9.]/g, '')) || null
      : null
    const parsedConsignmentReturn = consignment_return
      ? parseFloat(String(consignment_return).replace(/[^0-9.]/g, '')) || null
      : null

    // Derive expected_recovery at write time — never at send time.
    // consignment: use consignment_return; cash/net variants: use cash_offer_total; both: cash_offer_total is guaranteed floor.
    let expectedRecovery: number | null = null
    if (mappedOfferType === 'consignment') expectedRecovery = parsedConsignmentReturn ?? parsedCashOfferTotal
    else if (mappedOfferType === 'cash') expectedRecovery = parsedCashOfferTotal
    else if (mappedOfferType === 'both') expectedRecovery = parsedCashOfferTotal

    const quoteUpdate: Record<string, unknown> = {
      status: 'received',
      received_at: new Date().toISOString(),
      raw_response: body,
      offer_type: mappedOfferType,
      quantity_offered: parseInt(String(quantity_offered), 10) || null,
      // TODO: when BidFTA begins quoting on pallets/lots, add quantity_type as a field on the vendor response form and remove this default.
      quantity_type: 'unit',
      cash_offer_per_unit: parsedCashOfferPerUnit,
      cash_offer_total: parsedCashOfferTotal,
      consignment_return: parsedConsignmentReturn,
      expected_recovery: expectedRecovery,
      pickup_logistics: pickup_logistics || null,
      expected_pickup_date: pickup_date || null,
      payment_structure: offer_type || null,
      notes: notes || null,
    }

    if (deal.latest_quote_id) {
      await supabase
        .from('quotes')
        .update(quoteUpdate as never)
        .eq('id', deal.latest_quote_id)
    } else {
      // Shouldn't happen but create one if missing
      const { data: newQuote } = await supabase
        .from('quotes')
        .insert({
          deal_id: deal.id,
          partner_name: 'bidfta',
          customer_reference: deal.deal_id,
          ...quoteUpdate,
        } as never)
        .select()
        .single() as { data: { id: string } | null }

      if (newQuote) {
        await supabase.from('deals').update({ latest_quote_id: newQuote.id } as never).eq('id', deal.id)
      }
    }

    // 4. Log event
    await supabase.from('deal_events').insert({
      deal_id: deal.id,
      event_type: 'quote_received',
      actor: 'vendor_web_form',
      metadata: {
        vendor_company: vendor_company || null,
        vendor_contact: vendor_contact || null,
        offer_type,
        source: 'web_form',
      },
      from_stage: 'submitted_to_bidfta',
      to_stage: 'gate2_pending',
    } as never)

    // 5. Advance deal to gate2_pending
    await supabase
      .from('deals')
      .update({
        stage: 'gate2_pending',
        bidfta_response_at: new Date().toISOString(),
      } as never)
      .eq('id', deal.id)

    // 6. Mark token as used
    await supabase
      .from('vendor_response_tokens')
      .update({
        used_at: new Date().toISOString(),
        used_by_ip: ip,
      } as never)
      .eq('id', tokenRow.id)

    // 7. Fire Cyclops webhook (best-effort)
    if (CYCLOPS_WEBHOOK_SECRET) {
      try {
        await fetch(`${CYCLOPS_WEBHOOK_URL}/webhook/bidfta-response`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${CYCLOPS_WEBHOOK_SECRET}`,
          },
          body: JSON.stringify({
            deal_id,
            offer_type,
            quantity_offered: parseInt(String(quantity_offered), 10),
            cash_offer_per_unit: cash_offer_per_unit || '',
            cash_offer_total: cash_offer_total || '',
            consignment_return: consignment_return || '',
            pickup_logistics: pickup_logistics || '',
            pickup_date: pickup_date || '',
            notes: notes || '',
            vendor_company: vendor_company || '',
            vendor_contact: vendor_contact || '',
            vendor_email: vendor_email || '',
            vendor_phone: vendor_phone || '',
          }),
        })
      } catch (webhookErr) {
        // Log but don't fail the submission
        console.error('[vendor/respond] Cyclops webhook failed:', webhookErr)
      }
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[vendor/respond] Processing error:', err)
    return NextResponse.json(
      { error: 'Something went wrong processing your quote. Please try again or contact quotes@thestuffbuyers.com.' },
      { status: 500 }
    )
  }
}
