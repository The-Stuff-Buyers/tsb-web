import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { validatePartnerSession } from '../../../../lib/partner-auth'

let supabaseClient: ReturnType<typeof createClient> | null = null
function getSupabase() {
  if (!supabaseClient) {
    supabaseClient = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  }
  return supabaseClient
}

const CYCLOPS_WEBHOOK_URL = process.env.CYCLOPS_WEBHOOK_URL || 'http://localhost:3001'
const CYCLOPS_WEBHOOK_SECRET = process.env.CYCLOPS_WEBHOOK_SECRET

type PortalStatus = 'pending_quote' | 'on_hold' | 'sla_expired' | 'quote_submitted' |
  'declined_by_partner' | 'seller_interested' | 'seller_declined_quote' | 'meeting_scheduled' |
  'counter_expired' | 'closed_won' | 'closed_lost'

function resolveOfferType(ps: string | null | undefined): 'cash' | 'consignment' | 'both' | null {
  if (!ps) return null
  const s = ps.toLowerCase().trim()
  if (s.startsWith('consignment')) return 'consignment'
  if (s === 'both') return 'both'
  return 'cash'
}

export async function POST(req: NextRequest) {
  const session = await validatePartnerSession(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: Record<string, unknown>
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid request.' }, { status: 400 }) }

  const { action, deal_id } = body as { action: string; deal_id: string }
  if (!action || !deal_id) return NextResponse.json({ error: 'action and deal_id required.' }, { status: 400 })

  const supabase = getSupabase()

  // Look up deal
  const { data: deal } = await supabase
    .from('deals')
    .select('id, deal_id, stage, latest_quote_id')
    .eq('deal_id', deal_id)
    .maybeSingle() as { data: { id: string; deal_id: string; stage: string; latest_quote_id: string | null } | null }

  if (!deal) return NextResponse.json({ error: 'Deal not found.' }, { status: 404 })

  // Look up partner_deal_status
  const { data: pds } = await supabase
    .from('partner_deal_status')
    .select('id, portal_status, clock_id, is_first_refusal, counter_offer_allowed, counter_offer_deadline')
    .eq('deal_id', deal.id)
    .eq('partner_name', session.partnerName)
    .maybeSingle() as {
      data: {
        id: string; portal_status: PortalStatus; clock_id: string | null
        is_first_refusal: boolean; counter_offer_allowed: boolean; counter_offer_deadline: string | null
      } | null
    }

  if (!pds) return NextResponse.json({ error: 'This deal is not assigned to your account.' }, { status: 404 })

  const now = new Date().toISOString()

  // ── QUOTE ──────────────────────────────────────────────────────────────────
  if (action === 'quote') {
    if (!['pending_quote', 'sla_expired'].includes(pds.portal_status)) {
      return NextResponse.json({ error: 'This deal is not available for quoting.' }, { status: 409 })
    }

    const { offer_type, quantity_offered, cash_offer_per_unit, cash_offer_total, consignment_return, pickup_logistics, pickup_date, notes } = body as Record<string, string>
    if (!offer_type || !notes?.trim()) {
      return NextResponse.json({ error: 'offer_type and notes required.' }, { status: 400 })
    }

    const mappedOfferType = resolveOfferType(offer_type)
    const parsedCashPerUnit = cash_offer_per_unit ? parseFloat(String(cash_offer_per_unit).replace(/[^0-9.]/g, '')) || null : null
    const parsedCashTotal = cash_offer_total ? parseFloat(String(cash_offer_total).replace(/[^0-9.]/g, '')) || null : null
    const parsedConsignment = consignment_return ? parseFloat(String(consignment_return).replace(/[^0-9.]/g, '')) || null : null

    let expectedRecovery: number | null = null
    if (mappedOfferType === 'consignment') expectedRecovery = parsedConsignment ?? parsedCashTotal
    else expectedRecovery = parsedCashTotal

    // Insert quote
    const { data: newQuote } = await supabase.from('quotes').insert({
      deal_id: deal.id,
      partner_name: session.partnerName,
      customer_reference: deal.deal_id,
      status: 'received',
      received_at: now,
      offer_type: mappedOfferType,
      quantity_offered: parseInt(String(quantity_offered || 1), 10),
      quantity_type: 'unit',
      cash_offer_per_unit: parsedCashPerUnit,
      cash_offer_total: parsedCashTotal,
      consignment_return: parsedConsignment,
      expected_recovery: expectedRecovery,
      pickup_logistics: pickup_logistics || null,
      expected_pickup_date: pickup_date || null,
      payment_structure: offer_type || null,
      notes: notes || null,
      raw_response: body,
    } as never).select('id').single() as { data: { id: string } | null }

    if (!newQuote) return NextResponse.json({ error: 'Failed to save quote.' }, { status: 500 })

    // Atomically update portal status
    const { data: updated } = await supabase
      .from('partner_deal_status')
      .update({ portal_status: 'quote_submitted', updated_at: now, quote_id: newQuote.id } as never)
      .eq('id', pds.id)
      .in('portal_status', ['pending_quote', 'sla_expired'] as PortalStatus[])
      .select('id')
      .maybeSingle()

    if (!updated) return NextResponse.json({ error: 'This deal is no longer available for quoting.' }, { status: 409 })

    // Stop clock
    if (pds.clock_id) {
      await supabase.from('partner_deal_clock').update({ clock_status: 'stopped' } as never).eq('id', pds.clock_id)
    }

    // Advance deal stage
    await supabase.from('deals').update({ stage: 'gate2_pending', bidfta_response_at: now, latest_quote_id: newQuote.id } as never).eq('id', deal.id)

    // Log event
    await supabase.from('deal_events').insert({
      deal_id: deal.id,
      event_type: 'quote_received',
      actor: 'partner_portal',
      metadata: { partner_name: session.partnerName, contact_name: session.contactName, offer_type, source: 'portal' },
      from_stage: deal.stage,
      to_stage: 'gate2_pending',
    } as never)

    // Fire Cyclops webhook
    if (CYCLOPS_WEBHOOK_SECRET) {
      try {
        await fetch(`${CYCLOPS_WEBHOOK_URL}/webhook/bidfta-response`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${CYCLOPS_WEBHOOK_SECRET}` },
          body: JSON.stringify({ deal_id, offer_type, quantity_offered, cash_offer_per_unit, cash_offer_total, consignment_return, pickup_logistics, pickup_date, notes, vendor_company: session.partnerName, vendor_contact: session.contactName }),
        })
      } catch (e) { console.error('[partner/respond] Cyclops webhook error:', e) }
    }

    return NextResponse.json({ success: true, action: 'quote' })
  }

  // ── DECLINE ────────────────────────────────────────────────────────────────
  if (action === 'decline') {
    if (!['pending_quote', 'sla_expired'].includes(pds.portal_status)) {
      return NextResponse.json({ error: 'This deal is not available for declining.' }, { status: 409 })
    }

    const { notes } = body as { notes: string }
    if (!notes?.trim()) return NextResponse.json({ error: 'Decline reason required.' }, { status: 400 })

    await supabase.from('partner_deal_status')
      .update({ portal_status: 'declined_by_partner', updated_at: now } as never)
      .eq('id', pds.id)

    if (pds.clock_id) {
      await supabase.from('partner_deal_clock').update({ clock_status: 'stopped' } as never).eq('id', pds.clock_id)
    }

    await supabase.from('deal_events').insert({
      deal_id: deal.id,
      event_type: 'partner_declined',
      actor: 'partner_portal',
      metadata: { partner_name: session.partnerName, decline_reason: notes, source: 'portal' },
      from_stage: deal.stage,
      to_stage: deal.stage,
    } as never)

    return NextResponse.json({ success: true, action: 'decline' })
  }

  // ── REQUEST INFO ────────────────────────────────────────────────────────────
  if (action === 'request_info') {
    if (!['pending_quote', 'sla_expired'].includes(pds.portal_status)) {
      return NextResponse.json({ error: 'Cannot request info in current state.' }, { status: 409 })
    }

    const { info_request_notes } = body as { info_request_notes: string }
    if (!info_request_notes?.trim()) return NextResponse.json({ error: 'info_request_notes required.' }, { status: 400 })

    await supabase.from('partner_deal_status')
      .update({ portal_status: 'on_hold', updated_at: now } as never)
      .eq('id', pds.id)

    // Pause clock — append to pause_intervals
    if (pds.clock_id) {
      const { data: clockRow } = await supabase
        .from('partner_deal_clock')
        .select('pause_intervals')
        .eq('id', pds.clock_id)
        .maybeSingle() as { data: { pause_intervals: unknown } | null }

      const existing: unknown[] = Array.isArray(clockRow?.pause_intervals) ? clockRow.pause_intervals as unknown[] : []
      const updated = [...existing, { paused_at: now, resumed_at: null }]

      await supabase.from('partner_deal_clock').update({
        clock_status: 'paused',
        pause_intervals: updated,
        info_requested_at: now,
        info_request_notes: info_request_notes,
      } as never).eq('id', pds.clock_id)
    }

    await supabase.from('deal_events').insert({
      deal_id: deal.id,
      event_type: 'partner_info_requested',
      actor: 'partner_portal',
      metadata: { partner_name: session.partnerName, notes: info_request_notes, source: 'portal' },
      from_stage: deal.stage,
      to_stage: deal.stage,
    } as never)

    return NextResponse.json({ success: true, action: 'request_info' })
  }

  // ── COUNTER OFFER ───────────────────────────────────────────────────────────
  if (action === 'counter_offer') {
    if (pds.portal_status !== 'seller_declined_quote') {
      return NextResponse.json({ error: 'Counter offer not available in current state.' }, { status: 409 })
    }
    if (!pds.counter_offer_allowed) {
      return NextResponse.json({ error: 'Counter offer window has closed.' }, { status: 409 })
    }
    if (pds.counter_offer_deadline && new Date(pds.counter_offer_deadline) < new Date()) {
      return NextResponse.json({ error: 'Counter offer deadline has passed.' }, { status: 409 })
    }

    const { offer_type, quantity_offered, cash_offer_per_unit, cash_offer_total, consignment_return, pickup_logistics, pickup_date, notes, previous_quote_id, counter_offer_reason } = body as Record<string, string>
    if (!offer_type || !notes?.trim()) return NextResponse.json({ error: 'offer_type and notes required.' }, { status: 400 })

    const mappedOfferType = resolveOfferType(offer_type)
    const parsedCashPerUnit = cash_offer_per_unit ? parseFloat(String(cash_offer_per_unit).replace(/[^0-9.]/g, '')) || null : null
    const parsedCashTotal = cash_offer_total ? parseFloat(String(cash_offer_total).replace(/[^0-9.]/g, '')) || null : null
    const parsedConsignment = consignment_return ? parseFloat(String(consignment_return).replace(/[^0-9.]/g, '')) || null : null
    const expectedRecovery: number | null = mappedOfferType === 'consignment' ? (parsedConsignment ?? parsedCashTotal) : parsedCashTotal

    const { data: newQuote } = await supabase.from('quotes').insert({
      deal_id: deal.id,
      partner_name: session.partnerName,
      customer_reference: deal.deal_id,
      status: 'received',
      received_at: now,
      offer_type: mappedOfferType,
      quantity_offered: parseInt(String(quantity_offered || 1), 10),
      quantity_type: 'unit',
      cash_offer_per_unit: parsedCashPerUnit,
      cash_offer_total: parsedCashTotal,
      consignment_return: parsedConsignment,
      expected_recovery: expectedRecovery,
      pickup_logistics: pickup_logistics || null,
      expected_pickup_date: pickup_date || null,
      payment_structure: offer_type || null,
      notes: notes || null,
      is_counter_offer: true,
      previous_quote_id: previous_quote_id || pds.clock_id || null,
      counter_offer_reason: counter_offer_reason || null,
      raw_response: body,
    } as never).select('id').single() as { data: { id: string } | null }

    if (!newQuote) return NextResponse.json({ error: 'Failed to save counter offer.' }, { status: 500 })

    const { data: updated } = await supabase
      .from('partner_deal_status')
      .update({ portal_status: 'quote_submitted', updated_at: now, quote_id: newQuote.id, counter_offer_allowed: false } as never)
      .eq('id', pds.id)
      .eq('portal_status', 'seller_declined_quote' as PortalStatus)
      .select('id').maybeSingle()

    if (!updated) return NextResponse.json({ error: 'Counter offer submission conflict.' }, { status: 409 })

    // Stop counter-offer clock
    if (pds.clock_id) {
      await supabase.from('partner_deal_clock').update({ clock_status: 'stopped' } as never).eq('id', pds.clock_id)
    }

    await supabase.from('deals').update({ stage: 'gate2_pending', latest_quote_id: newQuote.id } as never).eq('id', deal.id)

    await supabase.from('deal_events').insert({
      deal_id: deal.id,
      event_type: 'counter_offer_received',
      actor: 'partner_portal',
      metadata: { partner_name: session.partnerName, offer_type, source: 'portal', is_counter_offer: true },
      from_stage: deal.stage,
      to_stage: 'gate2_pending',
    } as never)

    if (CYCLOPS_WEBHOOK_SECRET) {
      try {
        await fetch(`${CYCLOPS_WEBHOOK_URL}/webhook/bidfta-response`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${CYCLOPS_WEBHOOK_SECRET}` },
          body: JSON.stringify({ deal_id, offer_type, quantity_offered, cash_offer_per_unit, cash_offer_total, notes, vendor_company: session.partnerName, is_counter_offer: true }),
        })
      } catch (e) { console.error('[partner/respond] Counter offer webhook error:', e) }
    }

    return NextResponse.json({ success: true, action: 'counter_offer' })
  }

  return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 })
}
