import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { validateOpsSession } from '../../../../lib/ops-auth'
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
  const session = await validateOpsSession(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = getSupabase()

  // ── Fetch all active deals ─────────────────────────────────────────────────
  const { data: deals } = await supabase
    .from('deals')
    .select('id, deal_id, item_name, condition, quantity, location_raw, category_id, stage, assigned_to, created_at, submitted_to_bidfta, contact_name, company_name, submitted_email, phone, closed_at, close_reason, first_refusal_partner, first_refusal_expired_at')
    .not('stage', 'in', '("closed_won","closed_lost","closed_bidfta_declined","closed_all_partners_declined")')
    .order('created_at', { ascending: false })
    .limit(200) as { data: Record<string, unknown>[] | null }

  const allDeals = deals || []
  const dealIds = allDeals.map(d => d.id as string)

  // ── Fetch category names ───────────────────────────────────────────────────
  const catIds = Array.from(new Set(allDeals.map(d => d.category_id as string).filter(Boolean)))
  const categoryMap: Record<string, string> = {}
  if (catIds.length > 0) {
    const { data: cats } = await supabase.from('categories').select('id, display_name').in('id', catIds) as { data: { id: string; display_name: string }[] | null }
    for (const c of cats || []) categoryMap[c.id] = c.display_name
  }

  // ── Fetch partner_deal_status + clocks ────────────────────────────────────
  const { data: pdsRows } = await supabase
    .from('partner_deal_status')
    .select(`
      id, deal_id, partner_name, portal_status, clock_id, is_first_refusal,
      counter_offer_allowed, counter_offer_deadline, quote_id, updated_at,
      partner_deal_clock(id, clock_started_at, clock_status, total_hours, pause_intervals, clock_type),
      quotes(id, offer_type, cash_offer_total, received_at)
    `)
    .in('deal_id', dealIds) as { data: Record<string, unknown>[] | null }

  // Group partner statuses by deal
  const partnersByDeal: Record<string, Record<string, unknown>[]> = {}
  for (const pds of pdsRows || []) {
    const did = pds.deal_id as string
    if (!partnersByDeal[did]) partnersByDeal[did] = []
    partnersByDeal[did].push(pds)
  }

  // ── Fetch latest deal_events for last activity ─────────────────────────────
  const { data: eventRows } = await supabase
    .from('deal_events')
    .select('deal_id, event_type, created_at, metadata, actor')
    .in('deal_id', dealIds)
    .order('created_at', { ascending: false }) as { data: Record<string, unknown>[] | null }

  const latestEventByDeal: Record<string, Record<string, unknown>> = {}
  for (const ev of eventRows || []) {
    const did = ev.deal_id as string
    if (!latestEventByDeal[did]) latestEventByDeal[did] = ev
  }

  // ── Fetch partner display names ────────────────────────────────────────────
  const { data: partnerRows } = await supabase.from('partners').select('name, display_name') as { data: { name: string; display_name: string }[] | null }
  const partnerDisplayMap: Record<string, string> = {}
  for (const p of partnerRows || []) partnerDisplayMap[p.name] = p.display_name

  // ── Build pipeline counts ──────────────────────────────────────────────────
  const pipeline = {
    intake_queue: 0,
    gate1_review: 0,
    with_partners: 0,
    gate2_review: 0,
    offer_out: 0,
    closed_this_week: 0,
    total_active: 0,
  }

  // Closed this week
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const { count: closedCount } = await supabase
    .from('deals')
    .select('id', { count: 'exact', head: true })
    .in('stage', ['closed_won', 'closed_lost', 'closed_bidfta_declined', 'closed_all_partners_declined'])
    .gte('closed_at', oneWeekAgo) as { count: number | null }
  pipeline.closed_this_week = closedCount || 0

  // ── Build alerts ───────────────────────────────────────────────────────────
  const alerts: Record<string, unknown>[] = []
  const now = new Date()

  // ── Build deal cards ───────────────────────────────────────────────────────
  const dealCards = []

  for (const deal of allDeals) {
    const dealId = deal.deal_id as string
    const stage = deal.stage as string
    const dealUuid = deal.id as string

    // Pipeline counts
    if (stage === 'gate1_pending') {
      pipeline.intake_queue++
      pipeline.gate1_review++
    } else if (stage === 'submitted_to_bidfta' || (partnersByDeal[dealUuid]?.length > 0)) {
      pipeline.with_partners++
    } else if (stage === 'gate2_pending') {
      pipeline.gate2_review++
    } else if (stage === 'offer_sent') {
      pipeline.offer_out++
    }
    pipeline.total_active++

    const partners = (partnersByDeal[dealUuid] || []).map((pds: Record<string, unknown>) => {
      const clockRow = pds.partner_deal_clock as Record<string, unknown> | null
      const quoteRow = pds.quotes as Record<string, unknown> | null

      let clockUrgency = null
      let clockHoursRemaining = null

      if (clockRow) {
        const pauseIntervals: PauseInterval[] = Array.isArray(clockRow.pause_intervals)
          ? clockRow.pause_intervals as PauseInterval[]
          : JSON.parse(String(clockRow.pause_intervals || '[]')) as PauseInterval[]

        const computed = computeClock({
          clock_started_at: clockRow.clock_started_at as string,
          total_hours: clockRow.total_hours as number,
          pause_intervals: pauseIntervals,
          clock_status: clockRow.clock_status as 'running' | 'paused' | 'expired' | 'stopped',
        })
        clockUrgency = computed.urgency
        clockHoursRemaining = computed.business_hours_remaining

        const portalStatus = pds.portal_status as string
        const partnerName = pds.partner_name as string

        // Generate alerts
        if (clockUrgency === 'expired' && (portalStatus === 'pending_quote' || portalStatus === 'sla_expired')) {
          const hoursAgo = Math.round((now.getTime() - new Date(clockRow.clock_started_at as string).getTime()) / 3600000)
          alerts.push({
            type: 'first_refusal_expired',
            deal_id: dealId,
            partner_name: partnerName,
            hours_remaining: 0,
            message: `${partnerDisplayMap[partnerName] || partnerName} SLA expired on ${dealId}`,
            created_at: now.toISOString(),
            severity: 'critical',
            hours_ago: hoursAgo,
          })
        } else if (clockUrgency === 'critical' && portalStatus === 'pending_quote') {
          alerts.push({
            type: 'sla_at_risk',
            deal_id: dealId,
            partner_name: partnerName,
            hours_remaining: clockHoursRemaining,
            message: `SLA at risk: ${dealId} — ${clockHoursRemaining.toFixed(1)}h left for ${partnerDisplayMap[partnerName] || partnerName}`,
            created_at: now.toISOString(),
            severity: 'warning',
          })
        } else if (portalStatus === 'seller_declined_quote' && pds.counter_offer_allowed && pds.counter_offer_deadline) {
          const counterDeadline = new Date(pds.counter_offer_deadline as string)
          const hoursLeft = (counterDeadline.getTime() - now.getTime()) / 3600000
          if (hoursLeft < 24 && hoursLeft > 0) {
            alerts.push({
              type: 'counter_offer_window_closing',
              deal_id: dealId,
              partner_name: partnerName,
              hours_remaining: Math.round(hoursLeft),
              message: `Counter offer window closing: ${dealId} — ${Math.round(hoursLeft)}h left`,
              created_at: now.toISOString(),
              severity: 'warning',
            })
          }
        } else if (portalStatus === 'on_hold') {
          alerts.push({
            type: 'partner_info_requested',
            deal_id: dealId,
            partner_name: partnerName,
            message: `${partnerDisplayMap[partnerName] || partnerName} requested info on ${dealId}`,
            created_at: now.toISOString(),
            severity: 'info',
          })
        } else if (portalStatus === 'quote_submitted') {
          alerts.push({
            type: 'new_quote_received',
            deal_id: dealId,
            partner_name: partnerName,
            message: `New quote from ${partnerDisplayMap[partnerName] || partnerName} on ${dealId}`,
            created_at: now.toISOString(),
            severity: 'info',
          })
        }
      }

      return {
        partner_name: pds.partner_name as string,
        partner_display_name: partnerDisplayMap[pds.partner_name as string] || pds.partner_name as string,
        portal_status: pds.portal_status,
        clock_urgency: clockUrgency,
        clock_hours_remaining: clockHoursRemaining,
        is_first_refusal: !!(pds.is_first_refusal),
        quote_snapshot: (pds.quotes as Record<string, unknown> | null) ? {
          offer_type_display: (quoteRow?.offer_type as string) || 'Unknown',
          cash_offer_total: quoteRow?.cash_offer_total || null,
          submitted_at: quoteRow?.received_at || '',
        } : null,
      }
    })

    // Last activity
    const lastEvent = latestEventByDeal[dealUuid]
    const lastActivity = lastEvent
      ? buildActivityText(lastEvent, partnerDisplayMap)
      : `Created ${timeAgo(deal.created_at as string)}`
    const lastActivityAt = lastEvent ? (lastEvent.created_at as string) : (deal.created_at as string)

    // SLA
    const slaTarget = deal.submitted_to_bidfta
      ? new Date(new Date(deal.submitted_to_bidfta as string).getTime() + 48 * 3600000).toISOString()
      : null
    const slaBreached = slaTarget ? new Date(slaTarget) < now : false

    dealCards.push({
      deal_id: dealId,
      item_name: deal.item_name,
      condition: deal.condition || 'N/A',
      quantity: deal.quantity,
      location: (deal.location_raw as string) || 'N/A',
      category: categoryMap[deal.category_id as string] || 'N/A',
      seller_name: deal.contact_name || null,
      seller_email: deal.submitted_email || null,
      seller_phone: deal.phone || null,
      seller_company: deal.company_name || null,
      stage,
      assigned_to: deal.assigned_to || null,
      partners,
      first_refusal_expired: !!(deal.first_refusal_expired_at),
      created_at: deal.created_at,
      submitted_to_partners_at: deal.submitted_to_bidfta || null,
      last_activity: lastActivity,
      last_activity_at: lastActivityAt,
      sla_target_at: slaTarget,
      sla_breached: slaBreached,
    })
  }

  // Sort by last activity DESC
  dealCards.sort((a, b) => new Date(b.last_activity_at).getTime() - new Date(a.last_activity_at).getTime())

  // Deduplicate alerts by type+deal
  const seenAlerts = new Set<string>()
  const uniqueAlerts = alerts.filter(a => {
    const key = `${a.type}-${a.deal_id}-${a.partner_name || ''}`
    if (seenAlerts.has(key)) return false
    seenAlerts.add(key)
    return true
  })

  // Sort alerts: critical first
  const severityOrder: Record<string, number> = { critical: 0, warning: 1, info: 2 }
  uniqueAlerts.sort((a, b) => (severityOrder[a.severity as string] || 99) - (severityOrder[b.severity as string] || 99))

  // Closed count
  const { count: totalClosedCount } = await supabase
    .from('deals')
    .select('id', { count: 'exact', head: true })
    .in('stage', ['closed_won', 'closed_lost', 'closed_bidfta_declined', 'closed_all_partners_declined']) as { count: number | null }

  return NextResponse.json({
    pipeline,
    alerts: uniqueAlerts,
    deals: dealCards,
    closed_count: totalClosedCount || 0,
  })
}

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  const h = Math.floor(ms / 3600000)
  if (h < 1) return 'just now'
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  return `${d}d ago`
}

function buildActivityText(ev: Record<string, unknown>, partnerMap: Record<string, string>): string {
  const meta = (ev.metadata as Record<string, unknown>) || {}
  const partner = meta.partner_name ? (partnerMap[meta.partner_name as string] || meta.partner_name as string) : ''
  const ago = timeAgo(ev.created_at as string)

  switch (ev.event_type) {
    case 'quote_received': return `${partner} quoted — ${ago}`
    case 'partner_declined': return `${partner} declined — ${ago}`
    case 'partner_info_requested': return `${partner} requested info — ${ago}`
    case 'info_provided': return `Info provided to ${partner} — ${ago}`
    case 'counter_offer_received': return `${partner} counter offer — ${ago}`
    case 'seller_interested': return `Seller interested — ${ago}`
    case 'seller_declined_quote': return `Seller declined quote — ${ago}`
    case 'routed_to_partner': return `Routed to ${partner} — ${ago}`
    case 'bidfta_declined': return `Declined — ${ago}`
    default: return `${String(ev.event_type).replace(/_/g, ' ')} — ${ago}`
  }
}
