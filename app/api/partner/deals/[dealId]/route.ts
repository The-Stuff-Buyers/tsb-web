import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { validatePartnerSession } from '../../../../../lib/partner-auth'
import { computeClock } from '../../../../../lib/business-hours'

let supabaseClient: ReturnType<typeof createClient> | null = null
function getSupabase() {
  if (!supabaseClient) {
    supabaseClient = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  }
  return supabaseClient
}

type PauseInterval = { paused_at: string; resumed_at: string | null }

export async function GET(req: NextRequest, { params }: { params: { dealId: string } }) {
  const session = await validatePartnerSession(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = getSupabase()
  const { dealId } = params

  // Look up deal
  const { data: deal } = await supabase
    .from('deals')
    .select('id, deal_id, item_name, condition, quantity, location_raw, description, category_id, stage, created_at, submitted_to_bidfta, upc, inventory_type')
    .eq('deal_id', dealId)
    .maybeSingle() as {
      data: {
        id: string; deal_id: string; item_name: string; condition: string | null
        quantity: number; location_raw: string | null; description: string | null
        category_id: string | null; stage: string; created_at: string
        submitted_to_bidfta: string | null; upc: string | null; inventory_type: string | null
      } | null
    }

  if (!deal) return NextResponse.json({ error: 'Deal not found.' }, { status: 404 })

  // Verify partner access
  const { data: pds } = await supabase
    .from('partner_deal_status')
    .select('id, portal_status, clock_id, is_first_refusal, is_resubmission, counter_offer_allowed, counter_offer_deadline, quote_id, routed_at')
    .eq('deal_id', deal.id)
    .eq('partner_name', session.partnerName)
    .maybeSingle() as {
      data: {
        id: string; portal_status: string; clock_id: string | null; is_first_refusal: boolean
        is_resubmission: boolean; counter_offer_allowed: boolean; counter_offer_deadline: string | null
        quote_id: string | null; routed_at: string | null
      } | null
    }

  if (!pds) return NextResponse.json({ error: 'Access denied.' }, { status: 403 })

  // Category
  let category = 'N/A'
  if (deal.category_id) {
    const { data: cat } = await supabase.from('categories').select('display_name').eq('id', deal.category_id).maybeSingle() as { data: { display_name: string } | null }
    if (cat) category = cat.display_name
  }

  // Attachments with signed URLs
  const { data: attachments } = await supabase
    .from('deal_attachments')
    .select('id, file_name, file_type, file_size, file_url, visible_to')
    .eq('deal_id', deal.id)
    .or(`visible_to.is.null,visible_to.cs.{${session.partnerName}}`)
    .order('created_at', { ascending: true }) as {
      data: { id: string; file_name: string; file_type: string; file_size: number; file_url: string; visible_to: string[] | null }[] | null
    }

  const files = []
  for (const att of attachments || []) {
    const { data: signed } = await supabase.storage.from('deal-attachments').createSignedUrl(att.file_url, 3600)
    if (signed?.signedUrl) {
      files.push({
        id: att.id,
        file_name: att.file_name,
        file_type: att.file_type,
        file_size: att.file_size,
        url: signed.signedUrl,
        is_image: ['image/jpeg', 'image/png', 'image/webp', 'image/heic'].includes(att.file_type) || att.file_type === 'photo',
      })
    }
  }

  // Clock data
  let clockData = null
  if (pds.clock_id) {
    const { data: clockRow } = await supabase
      .from('partner_deal_clock')
      .select('*')
      .eq('id', pds.clock_id)
      .maybeSingle() as { data: Record<string, unknown> | null }

    if (clockRow) {
      const pauseIntervals: PauseInterval[] = Array.isArray(clockRow.pause_intervals)
        ? clockRow.pause_intervals as PauseInterval[]
        : JSON.parse(String(clockRow.pause_intervals || '[]')) as PauseInterval[]

      clockData = {
        ...computeClock({
          clock_started_at: clockRow.clock_started_at as string,
          total_hours: clockRow.total_hours as number,
          pause_intervals: pauseIntervals,
          clock_status: clockRow.clock_status as 'running' | 'paused' | 'expired' | 'stopped',
        }),
        clock_type: clockRow.clock_type as string,
        paused_intervals: pauseIntervals,
      }
    }
  }

  // Quote history
  const { data: quotes } = await supabase
    .from('quotes')
    .select('id, status, offer_type, payment_structure, cash_offer_per_unit, cash_offer_total, consignment_return, expected_recovery, quantity_offered, pickup_logistics, expected_pickup_date, notes, received_at, is_counter_offer, counter_offer_reason')
    .eq('deal_id', deal.id)
    .eq('partner_name', session.partnerName)
    .order('received_at', { ascending: true }) as { data: Record<string, unknown>[] | null }

  const quoteSummaries = (quotes || []).map(q => ({
    status: q.status,
    offer_type: q.offer_type,
    payment_structure_display: q.payment_structure,
    cash_offer_per_unit: q.cash_offer_per_unit,
    cash_offer_total: q.cash_offer_total,
    consignment_return: q.consignment_return,
    expected_recovery: q.expected_recovery,
    quantity_offered: q.quantity_offered,
    pickup_logistics_display: q.pickup_logistics,
    expected_pickup_date: q.expected_pickup_date,
    notes: q.notes,
    submitted_at: q.received_at,
    is_counter_offer: q.is_counter_offer,
  }))

  const latestQuote = quoteSummaries.length > 0 ? quoteSummaries[quoteSummaries.length - 1] : null
  const priorQuotes = quoteSummaries.length > 1 ? quoteSummaries.slice(0, -1) : []

  // Timeline from deal_events
  const { data: events } = await supabase
    .from('deal_events')
    .select('event_type, created_at, actor, metadata')
    .eq('deal_id', deal.id)
    .order('created_at', { ascending: true }) as { data: Record<string, unknown>[] | null }

  const timeline = (events || []).map(e => ({
    event_type: e.event_type,
    timestamp: e.created_at,
    description: buildEventDescription(e),
    actor: e.actor || 'system',
  }))

  // Action availability
  const canSubmitQuote = ['pending_quote', 'sla_expired'].includes(pds.portal_status)
  const canDecline = ['pending_quote', 'sla_expired'].includes(pds.portal_status)
  const canRequestInfo = ['pending_quote', 'sla_expired'].includes(pds.portal_status)
  const canCounterOffer = pds.portal_status === 'seller_declined_quote' && pds.counter_offer_allowed

  // Info request data (from clock if on_hold)
  let infoRequest = null
  let infoProvided = null
  if (clockData) {
    const clockRaw = await supabase.from('partner_deal_clock').select('info_requested_at, info_request_notes, info_provided_at, info_provided_notes').eq('id', pds.clock_id!).maybeSingle() as { data: Record<string, unknown> | null }
    if (clockRaw.data?.info_requested_at) {
      infoRequest = { requested_at: clockRaw.data.info_requested_at, notes: clockRaw.data.info_request_notes }
    }
    if (clockRaw.data?.info_provided_at) {
      infoProvided = { provided_at: clockRaw.data.info_provided_at, notes: clockRaw.data.info_provided_notes }
    }
  }

  return NextResponse.json({
    deal_id: deal.deal_id,
    item_name: deal.item_name,
    description: deal.description || '',
    condition: deal.condition || 'N/A',
    quantity: deal.quantity,
    location: deal.location_raw || 'N/A',
    category,
    upc: deal.upc || null,
    inventory_type: deal.inventory_type || null,
    submitted_at: pds.routed_at || deal.submitted_to_bidfta || deal.created_at,
    portal_status: pds.portal_status,
    clock: clockData,
    attachments: files,
    quote_summary: latestQuote,
    prior_quotes: priorQuotes,
    info_request: infoRequest,
    info_provided: infoProvided,
    prior_decline: pds.is_resubmission ? { declined_at: '', notes: '' } : null,
    timeline,
    can_submit_quote: canSubmitQuote,
    can_decline: canDecline,
    can_request_info: canRequestInfo,
    can_counter_offer: canCounterOffer,
    counter_offer_deadline: pds.counter_offer_deadline,
  })
}

function buildEventDescription(e: Record<string, unknown>): string {
  const meta = (e.metadata as Record<string, unknown>) || {}
  switch (e.event_type) {
    case 'quote_received': return `Quote submitted — ${meta.offer_type || 'unknown type'}`
    case 'partner_declined': return `Declined — ${meta.decline_reason || 'no reason given'}`
    case 'partner_info_requested': return `Info requested — ${meta.notes || ''}`
    case 'info_provided': return `Info provided — ${meta.notes || ''}`
    case 'counter_offer_received': return `Counter offer submitted`
    case 'seller_interested': return 'Seller indicated interest'
    case 'seller_declined_quote': return 'Seller declined quote'
    case 'routed_to_partner': return `Routed to partner`
    default: return String(e.event_type).replace(/_/g, ' ')
  }
}
