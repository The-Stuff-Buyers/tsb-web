import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { validateOpsSession } from '../../../../lib/ops-auth'

let supabaseClient: ReturnType<typeof createClient> | null = null
function getSupabase() {
  if (!supabaseClient) {
    supabaseClient = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  }
  return supabaseClient
}

const CYCLOPS_WEBHOOK_URL = process.env.CYCLOPS_WEBHOOK_URL || 'http://localhost:3001'
const CYCLOPS_WEBHOOK_SECRET = process.env.CYCLOPS_WEBHOOK_SECRET

export async function POST(req: NextRequest) {
  const session = await validateOpsSession(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: Record<string, unknown>
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid request.' }, { status: 400 }) }

  const { action, deal_id } = body as { action: string; deal_id: string }
  if (!action || !deal_id) return NextResponse.json({ error: 'action and deal_id required.' }, { status: 400 })

  const supabase = getSupabase()
  const now = new Date().toISOString()

  // Look up deal
  const { data: deal } = await supabase
    .from('deals')
    .select('id, deal_id, stage, latest_quote_id')
    .eq('deal_id', deal_id)
    .maybeSingle() as { data: { id: string; deal_id: string; stage: string; latest_quote_id: string | null } | null }

  if (!deal) return NextResponse.json({ error: 'Deal not found.' }, { status: 404 })

  // ── APPROVE GATE 1 ─────────────────────────────────────────────────────────
  if (action === 'approve_gate1') {
    await supabase.from('deals').update({ stage: 'submitted_to_bidfta' } as never).eq('id', deal.id)
    await supabase.from('deal_events').insert({ deal_id: deal.id, event_type: 'gate1_approved', actor: 'ops_dashboard', metadata: { by: session.username }, from_stage: deal.stage, to_stage: 'submitted_to_bidfta' } as never)
    return NextResponse.json({ success: true, action, message: 'Gate 1 approved. Deal submitted to BidFTA.' })
  }

  // ── REJECT GATE 1 ──────────────────────────────────────────────────────────
  if (action === 'reject_gate1') {
    const reason = body.notes as string || 'Rejected at Gate 1'
    await supabase.from('deals').update({ stage: 'closed_bidfta_declined', closed_at: now, close_reason: 'gate1_rejected' } as never).eq('id', deal.id)
    await supabase.from('deal_events').insert({ deal_id: deal.id, event_type: 'gate1_rejected', actor: 'ops_dashboard', metadata: { by: session.username, reason }, from_stage: deal.stage, to_stage: 'closed_bidfta_declined' } as never)
    return NextResponse.json({ success: true, action, message: 'Gate 1 rejected. Deal closed.' })
  }

  // ── ROUTE TO PARTNER ───────────────────────────────────────────────────────
  if (action === 'route_to_partner') {
    const { partner_name } = body as { partner_name: string }
    if (!partner_name) return NextResponse.json({ error: 'partner_name required.' }, { status: 400 })

    // Get partner config
    const { data: partner } = await supabase
      .from('partners')
      .select('name, first_refusal_hours, has_first_refusal')
      .eq('name', partner_name)
      .maybeSingle() as { data: { name: string; first_refusal_hours: number; has_first_refusal: boolean } | null }

    if (!partner) return NextResponse.json({ error: 'Partner not found.' }, { status: 404 })

    // Check for existing routing
    const { data: existing } = await supabase
      .from('partner_deal_status')
      .select('id, portal_status')
      .eq('deal_id', deal.id)
      .eq('partner_name', partner_name)
      .maybeSingle() as { data: { id: string; portal_status: string } | null }

    if (existing) return NextResponse.json({ error: 'Deal already routed to this partner.' }, { status: 409 })

    // Create clock
    const { data: clock } = await supabase.from('partner_deal_clock').insert({
      deal_id: deal.id,
      partner_name,
      clock_type: 'first_refusal',
      clock_started_at: now,
      clock_status: 'running',
      total_hours: partner.first_refusal_hours || 48,
      pause_intervals: [],
    } as never).select('id').single() as { data: { id: string } | null }

    // Create partner_deal_status
    await supabase.from('partner_deal_status').insert({
      deal_id: deal.id,
      partner_name,
      portal_status: 'pending_quote',
      clock_id: clock?.id || null,
      is_first_refusal: partner.has_first_refusal,
      routed_at: now,
      routed_by: session.username,
    } as never)

    // Update deal if going from gate1_pending
    if (deal.stage === 'gate1_pending') {
      await supabase.from('deals').update({ stage: 'submitted_to_bidfta', submitted_to_bidfta: now } as never).eq('id', deal.id)
    }

    await supabase.from('deal_events').insert({ deal_id: deal.id, event_type: 'routed_to_partner', actor: 'ops_dashboard', metadata: { partner_name, by: session.username }, from_stage: deal.stage, to_stage: deal.stage } as never)

    return NextResponse.json({ success: true, action, message: `Routed to ${partner_name}.` })
  }

  // ── PROVIDE INFO ───────────────────────────────────────────────────────────
  if (action === 'provide_info') {
    const { partner_name, notes } = body as { partner_name: string; notes: string }
    if (!partner_name) return NextResponse.json({ error: 'partner_name required.' }, { status: 400 })

    const { data: pds } = await supabase
      .from('partner_deal_status')
      .select('id, portal_status, clock_id')
      .eq('deal_id', deal.id)
      .eq('partner_name', partner_name)
      .maybeSingle() as { data: { id: string; portal_status: string; clock_id: string | null } | null }

    if (!pds) return NextResponse.json({ error: 'Partner deal status not found.' }, { status: 404 })
    if (pds.portal_status !== 'on_hold') return NextResponse.json({ error: 'Deal is not on hold.' }, { status: 409 })

    // Resume clock
    if (pds.clock_id) {
      const { data: clockRow } = await supabase.from('partner_deal_clock').select('pause_intervals').eq('id', pds.clock_id).maybeSingle() as { data: { pause_intervals: unknown } | null }
      const pauses: Record<string, unknown>[] = Array.isArray(clockRow?.pause_intervals) ? clockRow.pause_intervals as Record<string, unknown>[] : []
      // Close the last open pause
      const updated = pauses.map((p, i) => i === pauses.length - 1 && !p.resumed_at ? { ...p, resumed_at: now } : p)
      await supabase.from('partner_deal_clock').update({
        clock_status: 'running',
        pause_intervals: updated,
        info_provided_at: now,
        info_provided_notes: notes || null,
      } as never).eq('id', pds.clock_id)
    }

    await supabase.from('partner_deal_status').update({ portal_status: 'pending_quote', updated_at: now } as never).eq('id', pds.id)

    await supabase.from('deal_events').insert({ deal_id: deal.id, event_type: 'info_provided', actor: 'ops_dashboard', metadata: { partner_name, notes, by: session.username }, from_stage: deal.stage, to_stage: deal.stage } as never)

    return NextResponse.json({ success: true, action, message: `Info provided to ${partner_name}. Clock resumed.` })
  }

  // ── APPROVE GATE 2 ─────────────────────────────────────────────────────────
  if (action === 'approve_gate2') {
    await supabase.from('deals').update({ stage: 'offer_sent' } as never).eq('id', deal.id)
    await supabase.from('deal_events').insert({ deal_id: deal.id, event_type: 'gate2_approved', actor: 'ops_dashboard', metadata: { by: session.username, quote_id: body.quote_id }, from_stage: deal.stage, to_stage: 'offer_sent' } as never)

    if (CYCLOPS_WEBHOOK_SECRET) {
      try {
        await fetch(`${CYCLOPS_WEBHOOK_URL}/webhook/gate2-approved`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${CYCLOPS_WEBHOOK_SECRET}` },
          body: JSON.stringify({ deal_id, quote_id: body.quote_id }),
        })
      } catch (e) { console.error('[ops/action] Cyclops webhook error:', e) }
    }

    return NextResponse.json({ success: true, action, message: 'Gate 2 approved. Offer sent stage.' })
  }

  // ── SELLER INTERESTED ──────────────────────────────────────────────────────
  if (action === 'seller_interested') {
    const { partner_name } = body as { partner_name: string }
    if (partner_name) {
      await supabase.from('partner_deal_status').update({ portal_status: 'seller_interested', updated_at: now } as never).eq('deal_id', deal.id).eq('partner_name', partner_name)
    }
    await supabase.from('deal_events').insert({ deal_id: deal.id, event_type: 'seller_interested', actor: 'ops_dashboard', metadata: { partner_name, by: session.username }, from_stage: deal.stage, to_stage: deal.stage } as never)
    return NextResponse.json({ success: true, action, message: 'Seller interest recorded.' })
  }

  // ── SELLER DECLINED QUOTE ──────────────────────────────────────────────────
  if (action === 'seller_declined_quote') {
    const { partner_name } = body as { partner_name: string }
    if (!partner_name) return NextResponse.json({ error: 'partner_name required.' }, { status: 400 })

    const { data: partnerConfig } = await supabase.from('partners').select('counter_offer_hours, counter_offer_enabled').eq('name', partner_name).maybeSingle() as { data: { counter_offer_hours: number; counter_offer_enabled: boolean } | null }

    const counterEnabled = partnerConfig?.counter_offer_enabled !== false
    const counterHours = partnerConfig?.counter_offer_hours || 24
    const counterDeadline = counterEnabled ? new Date(Date.now() + counterHours * 3600000).toISOString() : null

    // Create counter-offer clock if enabled
    if (counterEnabled) {
      const { data: counterClock } = await supabase.from('partner_deal_clock').insert({
        deal_id: deal.id,
        partner_name,
        clock_type: 'counter_offer',
        clock_started_at: now,
        clock_status: 'running',
        total_hours: counterHours,
        pause_intervals: [],
      } as never).select('id').single() as { data: { id: string } | null }

      await supabase.from('partner_deal_status').update({
        portal_status: 'seller_declined_quote',
        updated_at: now,
        counter_offer_allowed: true,
        counter_offer_deadline: counterDeadline,
        clock_id: counterClock?.id || null,
      } as never).eq('deal_id', deal.id).eq('partner_name', partner_name)
    } else {
      await supabase.from('partner_deal_status').update({ portal_status: 'seller_declined_quote', updated_at: now, counter_offer_allowed: false } as never).eq('deal_id', deal.id).eq('partner_name', partner_name)
    }

    await supabase.from('deal_events').insert({ deal_id: deal.id, event_type: 'seller_declined_quote', actor: 'ops_dashboard', metadata: { partner_name, by: session.username, counter_offer_window_hours: counterEnabled ? counterHours : 0 }, from_stage: deal.stage, to_stage: deal.stage } as never)

    return NextResponse.json({ success: true, action, message: `Seller decline recorded. Counter offer window: ${counterEnabled ? `${counterHours}h` : 'disabled'}.` })
  }

  // ── CLOSE DEAL ─────────────────────────────────────────────────────────────
  if (action === 'close_deal') {
    const reason = (body.close_reason as string) || 'manual_close'
    await supabase.from('deals').update({ stage: 'closed_lost', closed_at: now, close_reason: reason } as never).eq('id', deal.id)
    await supabase.from('deal_events').insert({ deal_id: deal.id, event_type: 'deal_closed', actor: 'ops_dashboard', metadata: { reason, by: session.username }, from_stage: deal.stage, to_stage: 'closed_lost' } as never)
    return NextResponse.json({ success: true, action, message: 'Deal closed.' })
  }

  return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 })
}
