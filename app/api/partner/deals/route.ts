import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { validatePartnerSession } from '../../../../lib/partner-auth'
import { computeClock } from '../../../../lib/business-hours'

let supabaseClient: ReturnType<typeof createClient> | null = null
function getSupabase() {
  if (!supabaseClient) {
    supabaseClient = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  }
  return supabaseClient
}

type PauseInterval = { paused_at: string; resumed_at: string | null }

export async function GET(req: NextRequest) {
  const session = await validatePartnerSession(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = getSupabase()
  const { searchParams } = new URL(req.url)
  const closedOnly = searchParams.get('closed') === 'true'

  // Fetch partner info
  const { data: partner } = await supabase
    .from('partners')
    .select('name, display_name, has_first_refusal, first_refusal_hours')
    .eq('name', session.partnerName)
    .maybeSingle() as { data: { name: string; display_name: string; has_first_refusal: boolean; first_refusal_hours: number } | null }

  if (!partner) return NextResponse.json({ error: 'Partner not found' }, { status: 404 })

  if (closedOnly) {
    // Return closed deals only
    const { data: closedRows } = await supabase
      .from('partner_deal_status')
      .select('deal_id, portal_status, updated_at, deals!inner(deal_id, item_name, quantity, location_raw)')
      .eq('partner_name', session.partnerName)
      .in('portal_status', ['closed_won', 'closed_lost', 'declined_by_partner', 'counter_expired'])
      .order('updated_at', { ascending: false })
      .limit(100) as { data: Record<string, unknown>[] | null }

    const closed = (closedRows || []).map((r: Record<string, unknown>) => {
      const d = r.deals as Record<string, unknown>
      const outcomeMap: Record<string, string> = {
        closed_won: 'Won',
        closed_lost: 'Closed',
        declined_by_partner: 'Declined',
        counter_expired: 'Counter Expired',
      }
      return {
        deal_id: d?.deal_id || '',
        item_name: d?.item_name || '',
        quantity: d?.quantity || 0,
        location: (d?.location_raw as string) || 'N/A',
        portal_status: r.portal_status,
        outcome_display: outcomeMap[r.portal_status as string] || r.portal_status,
        closed_at: r.updated_at,
      }
    })
    return NextResponse.json({ closed })
  }

  // Fetch all active partner_deal_status rows with deal + clock + quote
  const { data: rows } = await supabase
    .from('partner_deal_status')
    .select(`
      id, portal_status, is_first_refusal, is_resubmission,
      counter_offer_allowed, counter_offer_deadline, routed_at, quote_id, clock_id,
      deals!inner(id, deal_id, item_name, condition, quantity, location_raw, description, category_id, stage),
      partner_deal_clock(id, clock_started_at, clock_status, total_hours, pause_intervals, clock_type, info_request_notes, info_requested_at),
      quotes(id, offer_type, payment_structure, cash_offer_total, consignment_return, status, received_at)
    `)
    .eq('partner_name', session.partnerName)
    .not('portal_status', 'in', '("closed_won","closed_lost")')
    .order('routed_at', { ascending: false }) as { data: Record<string, unknown>[] | null }

  const allRows = rows || []

  // Fetch category names for all deals
  const categoryIds = [...new Set(allRows.map((r: Record<string, unknown>) => {
    const d = r.deals as Record<string, unknown>
    return d?.category_id as string
  }).filter(Boolean))]

  const categoryMap: Record<string, string> = {}
  if (categoryIds.length > 0) {
    const { data: cats } = await supabase
      .from('categories')
      .select('id, display_name')
      .in('id', categoryIds) as { data: { id: string; display_name: string }[] | null }
    for (const cat of cats || []) {
      categoryMap[cat.id] = cat.display_name
    }
  }

  // Fetch attachment counts
  const dealUuids = allRows.map((r: Record<string, unknown>) => {
    const d = r.deals as Record<string, unknown>
    return d?.id as string
  }).filter(Boolean)

  const attachCountMap: Record<string, number> = {}
  if (dealUuids.length > 0) {
    const { data: atts } = await supabase
      .from('deal_attachments')
      .select('deal_id')
      .in('deal_id', dealUuids) as { data: { deal_id: string }[] | null }
    for (const att of atts || []) {
      attachCountMap[att.deal_id] = (attachCountMap[att.deal_id] || 0) + 1
    }
  }

  // Build sections
  const needsResponse = []
  const onHold = []
  const quoted = []
  const accepted = []
  const closedCount = { value: 0 }

  for (const row of allRows) {
    const d = row.deals as Record<string, unknown>
    const clockRow = row.partner_deal_clock as Record<string, unknown> | null
    const quoteRow = row.quotes as Record<string, unknown> | null
    const status = row.portal_status as string

    if (['closed_won', 'closed_lost', 'declined_by_partner', 'counter_expired'].includes(status)) {
      closedCount.value++
      continue
    }

    const dealId = d?.deal_id as string
    const dealUuid = d?.id as string
    const baseCard = {
      deal_id: dealId,
      item_name: d?.item_name as string,
      condition: (d?.condition as string) || 'N/A',
      quantity: d?.quantity as number,
      location: (d?.location_raw as string) || 'N/A',
      category: categoryMap[d?.category_id as string] || 'N/A',
      description_preview: ((d?.description as string) || '').slice(0, 200),
      attachment_count: attachCountMap[dealUuid] || 0,
      submitted_at: row.routed_at as string,
      portal_status: status,
      is_resubmission: !!(row.is_resubmission),
    }

    // Compute clock
    let clockData = null
    if (clockRow) {
      const pauseIntervals: PauseInterval[] = Array.isArray(clockRow.pause_intervals)
        ? (clockRow.pause_intervals as PauseInterval[])
        : (JSON.parse(String(clockRow.pause_intervals || '[]')) as PauseInterval[])

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

    if (status === 'pending_quote' || status === 'sla_expired') {
      needsResponse.push({
        ...baseCard,
        clock: clockData,
        prior_decline: row.is_resubmission ? { declined_at: '', notes: '' } : null,
      })
    } else if (status === 'on_hold') {
      onHold.push({
        ...baseCard,
        clock: clockData,
        info_request: {
          requested_at: clockRow?.info_requested_at || row.routed_at,
          notes: clockRow?.info_request_notes || '',
        },
      })
    } else if (['quote_submitted', 'seller_declined_quote', 'declined_by_partner', 'counter_expired'].includes(status)) {
      const offerTypeDisplay = buildOfferTypeDisplay(quoteRow)
      const pipelineMap: Record<string, string> = {
        quote_submitted: 'Under Review',
        seller_declined_quote: 'Seller Passed',
        declined_by_partner: 'Declined',
        counter_expired: 'Counter Expired',
      }
      quoted.push({
        ...baseCard,
        pipeline_status_display: pipelineMap[status] || status,
        quote_snapshot: quoteRow ? {
          offer_type_display: offerTypeDisplay,
          cash_offer_total: quoteRow.cash_offer_total || null,
          consignment_return: quoteRow.consignment_return || null,
          submitted_at: quoteRow.received_at || '',
        } : null,
        can_revise: !!(row.counter_offer_allowed),
        counter_offer_deadline: row.counter_offer_deadline || null,
        seller_decline_reason: null,
      })
    } else if (['seller_interested', 'meeting_scheduled'].includes(status)) {
      const pipelineMap: Record<string, string> = {
        seller_interested: 'Scheduling Meeting',
        meeting_scheduled: 'Meeting Scheduled',
      }
      accepted.push({
        ...baseCard,
        pipeline_status_display: pipelineMap[status] || status,
        quote_snapshot: quoteRow ? {
          offer_type_display: buildOfferTypeDisplay(quoteRow),
          cash_offer_total: quoteRow.cash_offer_total || null,
          consignment_return: quoteRow.consignment_return || null,
          submitted_at: quoteRow.received_at || '',
        } : null,
      })
    }
  }

  // Sort needs_response by clock hours remaining ASC (most urgent first)
  needsResponse.sort((a, b) => {
    const ar = a.clock?.business_hours_remaining ?? 999
    const br = b.clock?.business_hours_remaining ?? 999
    return ar - br
  })

  return NextResponse.json({
    partner: {
      name: partner.name,
      display_name: partner.display_name,
      has_first_refusal: partner.has_first_refusal,
      first_refusal_hours: partner.first_refusal_hours,
    },
    contact_name: session.contactName,
    counts: {
      needs_response: needsResponse.length,
      on_hold: onHold.length,
      quoted: quoted.length,
      accepted: accepted.length,
      total: allRows.length,
    },
    sections: {
      needs_response: needsResponse,
      on_hold: onHold,
      quoted: quoted,
      accepted: accepted,
      closed_count: closedCount.value,
    },
  })
}

function buildOfferTypeDisplay(quoteRow: Record<string, unknown> | null): string {
  if (!quoteRow) return 'Unknown'
  const offerType = (quoteRow.offer_type as string) || ''
  const payStruct = (quoteRow.payment_structure as string) || ''
  if (offerType === 'consignment') {
    const match = payStruct.match(/consignment_(\d+)_(\d+)/)
    if (match) return `Consignment ${match[1]}/${match[2]}`
    return 'Consignment'
  }
  if (payStruct === 'net_30') return 'Cash — Net 30'
  if (payStruct === 'net_60') return 'Cash — Net 60'
  if (offerType === 'cash') return 'Cash Purchase'
  if (offerType === 'both') return 'Cash + Consignment'
  return offerType.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}
