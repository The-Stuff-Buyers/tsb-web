'use client'

import { useState, useEffect, useCallback } from 'react'

// ── Types ─────────────────────────────────────────────────────────────────────

interface PartnerRow {
  partner_name: string
  partner_display_name: string
  portal_status: string
  clock_urgency: string | null
  clock_hours_remaining: number | null
  is_first_refusal: boolean
  quote_snapshot: { offer_type_display: string; cash_offer_total: number | null; submitted_at: string } | null
}

interface DealCard {
  deal_id: string
  item_name: string
  condition: string
  quantity: number
  location: string
  category: string
  seller_name: string | null
  seller_email: string | null
  seller_phone: string | null
  seller_company: string | null
  stage: string
  assigned_to: string | null
  partners: PartnerRow[]
  first_refusal_expired: boolean
  created_at: string
  submitted_to_partners_at: string | null
  last_activity: string
  last_activity_at: string
  sla_target_at: string | null
  sla_breached: boolean
}

interface Alert {
  type: string
  deal_id: string
  partner_name?: string
  hours_remaining?: number
  message: string
  severity: 'critical' | 'warning' | 'info'
}

interface Pipeline {
  intake_queue: number
  gate1_review: number
  with_partners: number
  gate2_review: number
  offer_out: number
  closed_this_week: number
  total_active: number
}

interface DashboardData {
  pipeline: Pipeline
  alerts: Alert[]
  deals: DealCard[]
  closed_count: number
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const STAGE_COLUMN: Record<string, string> = {
  gate1_pending: 'gate1',
  submitted_to_bidfta: 'partners',
  gate2_pending: 'gate2',
  offer_sent: 'offer',
}

function stageLabel(s: string) {
  const map: Record<string, string> = {
    gate1_pending: 'Gate 1',
    submitted_to_bidfta: 'With Partners',
    gate2_pending: 'Gate 2',
    offer_sent: 'Offer Sent',
    closed_won: 'Won',
    closed_lost: 'Lost',
    closed_bidfta_declined: 'Declined',
    closed_all_partners_declined: 'All Declined',
  }
  return map[s] || s.replace(/_/g, ' ')
}

function portalStatusLabel(s: string) {
  const map: Record<string, string> = {
    pending_quote: 'Pending',
    on_hold: 'On Hold',
    quote_submitted: 'Quoted',
    declined_by_partner: 'Declined',
    sla_expired: 'SLA Expired',
    seller_interested: 'Interested',
    seller_declined_quote: 'Seller Declined',
    deal_closed: 'Closed',
  }
  return map[s] || s.replace(/_/g, ' ')
}

function fmt(n: number | null | undefined, prefix = '$') {
  if (n == null) return '—'
  return prefix + n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

function timeAgo(iso: string) {
  const ms = Date.now() - new Date(iso).getTime()
  const h = Math.floor(ms / 3600000)
  if (h < 1) return 'just now'
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

function urgencyColor(u: string | null) {
  if (u === 'critical' || u === 'expired') return '#ef4444'
  if (u === 'warning') return '#eab308'
  return '#22c55e'
}

function severityColor(s: string) {
  if (s === 'critical') return '#ef4444'
  if (s === 'warning') return '#eab308'
  return '#60a5fa'
}

// ── Sub-components ────────────────────────────────────────────────────────────

function PartnerWaterfall({ partners, dealId, onAction }: { partners: PartnerRow[]; dealId: string; onAction: (a: string, d: string, extra?: Record<string, unknown>) => void }) {
  if (partners.length === 0) return <div style={{ color: '#555', fontSize: 11, fontFamily: 'Space Mono, monospace', letterSpacing: '0.06em' }}>NO PARTNERS ROUTED</div>
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
      {partners.map(p => {
        const isActive = p.portal_status === 'pending_quote' || p.portal_status === 'on_hold' || p.portal_status === 'sla_expired'
        const isQuoted = p.portal_status === 'quote_submitted'
        const isDeclined = p.portal_status === 'declined_by_partner'
        const needsInfo = p.portal_status === 'on_hold'
        return (
          <div key={p.partner_name} style={{ background: '#1e1e1e', border: `1px solid ${isActive ? '#333' : '#2a2a2a'}`, padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: 13, color: '#e8e8e8', letterSpacing: '0.04em' }}>{p.partner_display_name}</span>
                {p.is_first_refusal && <span style={{ fontFamily: 'Space Mono, monospace', fontSize: 8, color: '#C9A84C', border: '1px solid #C9A84C', padding: '1px 5px', letterSpacing: '0.1em' }}>1ST</span>}
                <span style={{ fontFamily: 'Space Mono, monospace', fontSize: 9, color: isDeclined ? '#ef4444' : isQuoted ? '#22c55e' : needsInfo ? '#eab308' : '#888', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  {portalStatusLabel(p.portal_status)}
                </span>
              </div>
              {p.clock_hours_remaining != null && isActive && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                  <div style={{ width: 80, height: 3, background: '#2a2a2a', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${Math.min(100, (1 - p.clock_hours_remaining / 48) * 100)}%`, background: urgencyColor(p.clock_urgency), transition: 'width 0.3s' }} />
                  </div>
                  <span style={{ fontFamily: 'Space Mono, monospace', fontSize: 9, color: urgencyColor(p.clock_urgency) }}>
                    {p.clock_hours_remaining <= 0 ? 'EXPIRED' : `${p.clock_hours_remaining.toFixed(1)}h`}
                  </span>
                </div>
              )}
              {p.quote_snapshot && (
                <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 9, color: '#888', marginTop: 3 }}>
                  {p.quote_snapshot.offer_type_display} · {fmt(p.quote_snapshot.cash_offer_total)}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              {needsInfo && (
                <button
                  onClick={() => {
                    const notes = window.prompt('Info notes (optional):') ?? ''
                    onAction('provide_info', dealId, { partner_name: p.partner_name, notes })
                  }}
                  style={smallBtnStyle('#eab308', '#111')}
                >
                  INFO
                </button>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function smallBtnStyle(bg: string, color: string): React.CSSProperties {
  return {
    background: bg,
    color,
    border: 'none',
    fontFamily: 'Barlow Condensed, sans-serif',
    fontWeight: 800,
    fontSize: 10,
    letterSpacing: '0.1em',
    padding: '4px 8px',
    cursor: 'pointer',
    textTransform: 'uppercase' as const,
    whiteSpace: 'nowrap' as const,
  }
}

function ActionBar({ deal, onAction, partners }: { deal: DealCard; onAction: (a: string, d: string, extra?: Record<string, unknown>) => void; partners: { name: string; display_name: string }[] }) {
  const [showRoute, setShowRoute] = useState(false)
  const stage = deal.stage

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
      {stage === 'gate1_pending' && (
        <>
          <button onClick={() => onAction('approve_gate1', deal.deal_id)} style={smallBtnStyle('#C9A84C', '#111')}>APPROVE G1</button>
          <button onClick={() => {
            const notes = window.prompt('Rejection reason:') ?? 'Rejected at Gate 1'
            onAction('reject_gate1', deal.deal_id, { notes })
          }} style={smallBtnStyle('#ef4444', '#fff')}>REJECT G1</button>
          <button onClick={() => setShowRoute(v => !v)} style={smallBtnStyle('#444', '#e8e8e8')}>ROUTE →</button>
        </>
      )}
      {stage === 'submitted_to_bidfta' && (
        <button onClick={() => setShowRoute(v => !v)} style={smallBtnStyle('#444', '#e8e8e8')}>+ ROUTE PARTNER</button>
      )}
      {stage === 'gate2_pending' && (
        <>
          <button onClick={() => {
            const quoteId = window.prompt('Quote ID (optional):') ?? ''
            onAction('approve_gate2', deal.deal_id, { quote_id: quoteId })
          }} style={smallBtnStyle('#C9A84C', '#111')}>APPROVE G2</button>
          {deal.partners.some(p => p.portal_status === 'quote_submitted') && (
            <button onClick={() => {
              const pn = deal.partners.find(p => p.portal_status === 'quote_submitted')?.partner_name ?? ''
              onAction('seller_interested', deal.deal_id, { partner_name: pn })
            }} style={smallBtnStyle('#22c55e', '#111')}>SELLER INTERESTED</button>
          )}
          {deal.partners.some(p => p.portal_status === 'quote_submitted') && (
            <button onClick={() => {
              const pn = deal.partners.find(p => p.portal_status === 'quote_submitted')?.partner_name ?? ''
              onAction('seller_declined_quote', deal.deal_id, { partner_name: pn })
            }} style={smallBtnStyle('#777', '#fff')}>SELLER DECLINED</button>
          )}
        </>
      )}
      <button onClick={() => {
        const reason = window.prompt('Close reason:', 'manual_close') ?? 'manual_close'
        if (reason) onAction('close_deal', deal.deal_id, { close_reason: reason })
      }} style={smallBtnStyle('#333', '#666')}>CLOSE</button>

      {showRoute && (
        <div style={{ width: '100%', background: '#222', border: '1px solid #333', padding: 10, marginTop: 4 }}>
          <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 9, color: '#888', letterSpacing: '0.12em', marginBottom: 8 }}>ROUTE TO PARTNER</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {partners.filter(p => !deal.partners.some(dp => dp.partner_name === p.name)).map(p => (
              <button
                key={p.name}
                onClick={() => { onAction('route_to_partner', deal.deal_id, { partner_name: p.name }); setShowRoute(false) }}
                style={smallBtnStyle('#C9A84C', '#111')}
              >
                {p.display_name}
              </button>
            ))}
            {partners.filter(p => !deal.partners.some(dp => dp.partner_name === p.name)).length === 0 && (
              <span style={{ fontFamily: 'Space Mono, monospace', fontSize: 9, color: '#555' }}>ALL PARTNERS ROUTED</span>
            )}
          </div>
          <button onClick={() => setShowRoute(false)} style={{ ...smallBtnStyle('#333', '#888'), marginTop: 8 }}>CANCEL</button>
        </div>
      )}
    </div>
  )
}

function DealCardComp({ deal, onAction, partners }: { deal: DealCard; onAction: (a: string, d: string, extra?: Record<string, unknown>) => void; partners: { name: string; display_name: string }[] }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div style={{ background: '#1a1a1a', border: `1px solid ${deal.sla_breached ? '#3a1515' : '#2a2a2a'}`, marginBottom: 8 }}>
      <div
        onClick={() => setExpanded(v => !v)}
        style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: expanded ? '1px solid #2a2a2a' : 'none' }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontFamily: 'Space Mono, monospace', fontSize: 10, color: '#C9A84C', letterSpacing: '0.06em' }}>{deal.deal_id}</span>
              {deal.sla_breached && <span style={{ fontFamily: 'Space Mono, monospace', fontSize: 8, color: '#ef4444', border: '1px solid #ef4444', padding: '1px 5px', letterSpacing: '0.1em' }}>SLA BREACH</span>}
            </div>
            <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: 15, color: '#e8e8e8', letterSpacing: '0.02em', marginTop: 3, lineHeight: 1.2 }}>
              {deal.item_name || 'Unnamed Item'}
            </div>
            <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 9, color: '#666', marginTop: 4, letterSpacing: '0.06em' }}>
              {deal.category} · {deal.condition} · {deal.quantity > 1 ? `${deal.quantity} units` : '1 unit'} · {deal.location}
            </div>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 8, color: '#555', letterSpacing: '0.06em', marginBottom: 2 }}>
              {timeAgo(deal.last_activity_at)}
            </div>
            <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 8, color: '#555', letterSpacing: '0.04em', maxWidth: 120, textAlign: 'right', lineHeight: 1.4 }}>
              {deal.last_activity}
            </div>
          </div>
        </div>
      </div>

      {expanded && (
        <div style={{ padding: '12px 14px' }}>
          {/* Seller info */}
          {deal.seller_name && (
            <div style={{ background: '#111', border: '1px solid #2a2a2a', padding: '8px 12px', marginBottom: 10 }}>
              <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 8, color: '#555', letterSpacing: '0.12em', marginBottom: 6 }}>SELLER</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 20px' }}>
                <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: 14, color: '#e8e8e8' }}>{deal.seller_name}{deal.seller_company ? ` · ${deal.seller_company}` : ''}</span>
                {deal.seller_email && <a href={`mailto:${deal.seller_email}`} style={{ fontFamily: 'Space Mono, monospace', fontSize: 9, color: '#C9A84C', textDecoration: 'none' }}>{deal.seller_email}</a>}
                {deal.seller_phone && <span style={{ fontFamily: 'Space Mono, monospace', fontSize: 9, color: '#888' }}>{deal.seller_phone}</span>}
              </div>
            </div>
          )}

          {/* Partner waterfall */}
          <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 8, color: '#555', letterSpacing: '0.12em', marginBottom: 4 }}>PARTNER STATUS</div>
          <PartnerWaterfall partners={deal.partners} dealId={deal.deal_id} onAction={onAction} />

          {/* Actions */}
          <ActionBar deal={deal} onAction={onAction} partners={partners} />
        </div>
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function OpsDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [view, setView] = useState<'kanban' | 'table'>('kanban')
  const [alertsDismissed, setAlertsDismissed] = useState<Set<string>>(new Set())
  const [actionMsg, setActionMsg] = useState('')
  const [partners, setPartners] = useState<{ name: string; display_name: string }[]>([])
  const [stageFilter, setStageFilter] = useState<string>('all')
  const [search, setSearch] = useState('')

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/ops/dashboard')
      if (res.status === 401) { window.location.href = '/ops/login'; return }
      if (!res.ok) { setError('Failed to load dashboard.'); return }
      const json = await res.json()
      setData(json)
    } catch {
      setError('Network error.')
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchPartners = useCallback(async () => {
    try {
      const res = await fetch('/api/ops/partners')
      if (res.ok) {
        const json = await res.json()
        setPartners(json.partners || [])
      }
    } catch { /* skip */ }
  }, [])

  useEffect(() => {
    fetchData()
    fetchPartners()
    const t = setInterval(fetchData, 60000)
    return () => clearInterval(t)
  }, [fetchData, fetchPartners])

  const handleAction = useCallback(async (action: string, dealId: string, extra: Record<string, unknown> = {}) => {
    try {
      const res = await fetch('/api/ops/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, deal_id: dealId, ...extra }),
      })
      const json = await res.json()
      if (!res.ok) {
        setActionMsg(`Error: ${json.error || 'Action failed.'}`)
      } else {
        setActionMsg(json.message || 'Done.')
        fetchData()
      }
      setTimeout(() => setActionMsg(''), 4000)
    } catch {
      setActionMsg('Network error.')
      setTimeout(() => setActionMsg(''), 4000)
    }
  }, [fetchData])

  const handleLogout = async () => {
    await fetch('/api/ops/logout', { method: 'POST' })
    window.location.href = '/ops/login'
  }

  if (loading) {
    return (
      <html lang="en"><head><meta charSet="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /><title>Ops — TSB</title><link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@300;400;600;700;800&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet" /><style dangerouslySetInnerHTML={{ __html: BASE_STYLES }} /></head>
        <body><div style={{ minHeight: '100vh', background: '#0F0F0F', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#C9A84C', fontFamily: 'Space Mono, monospace', fontSize: 12, letterSpacing: '0.14em' }}>LOADING…</div></body>
      </html>
    )
  }

  if (error) {
    return (
      <html lang="en"><head><meta charSet="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /><title>Ops — TSB</title><link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@300;400;600;700;800&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet" /><style dangerouslySetInnerHTML={{ __html: BASE_STYLES }} /></head>
        <body><div style={{ minHeight: '100vh', background: '#0F0F0F', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444', fontFamily: 'Space Mono, monospace', fontSize: 12 }}>{error}</div></body>
      </html>
    )
  }

  const { pipeline, alerts, deals, closed_count } = data!

  const visibleAlerts = alerts.filter(a => !alertsDismissed.has(`${a.type}-${a.deal_id}-${a.partner_name || ''}`))

  // Filter deals
  const filteredDeals = deals.filter(d => {
    if (stageFilter !== 'all' && STAGE_COLUMN[d.stage] !== stageFilter) return false
    if (search) {
      const q = search.toLowerCase()
      return d.deal_id.toLowerCase().includes(q) || (d.item_name || '').toLowerCase().includes(q) || (d.seller_name || '').toLowerCase().includes(q)
    }
    return true
  })

  const byColumn = (col: string) => filteredDeals.filter(d => STAGE_COLUMN[d.stage] === col)
  const inGate1 = byColumn('gate1')
  const inPartners = byColumn('partners')
  const inGate2 = byColumn('gate2')
  const inOffer = byColumn('offer')

  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Ops Dashboard — The Stuff Buyers</title>
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@300;400;600;700;800&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet" />
        <style dangerouslySetInnerHTML={{ __html: BASE_STYLES + PAGE_STYLES }} />
      </head>
      <body>

        {/* ── Header ── */}
        <header className="header">
          <div className="header-left">
            <div className="wordmark">THE STUFF BUYERS</div>
            <div className="tagline">Operations Dashboard</div>
          </div>
          <div className="pipeline-stats">
            <StatBadge label="INTAKE" value={pipeline.intake_queue} color="#888" />
            <StatBadge label="GATE 1" value={pipeline.gate1_review} color="#C9A84C" />
            <StatBadge label="PARTNERS" value={pipeline.with_partners} color="#60a5fa" />
            <StatBadge label="GATE 2" value={pipeline.gate2_review} color="#a78bfa" />
            <StatBadge label="OFFER OUT" value={pipeline.offer_out} color="#22c55e" />
            <StatBadge label="CLOSED/WK" value={pipeline.closed_this_week} color="#555" />
          </div>
          <div className="header-right">
            <button
              onClick={() => setView(v => v === 'kanban' ? 'table' : 'kanban')}
              style={{ ...smallBtnStyle('#333', '#888'), fontSize: 10, padding: '6px 12px' }}
            >
              {view === 'kanban' ? '≡ TABLE' : '⊞ KANBAN'}
            </button>
            <button onClick={handleLogout} style={{ ...smallBtnStyle('#222', '#666'), fontSize: 10, padding: '6px 12px' }}>LOGOUT</button>
          </div>
        </header>

        {/* ── Action feedback ── */}
        {actionMsg && (
          <div style={{ background: actionMsg.startsWith('Error') ? '#2a1515' : '#1a2a1a', borderBottom: `2px solid ${actionMsg.startsWith('Error') ? '#ef4444' : '#22c55e'}`, padding: '10px 24px', fontFamily: 'Space Mono, monospace', fontSize: 11, color: actionMsg.startsWith('Error') ? '#ff8888' : '#86efac', letterSpacing: '0.06em' }}>
            {actionMsg}
          </div>
        )}

        {/* ── Alerts bar ── */}
        {visibleAlerts.length > 0 && (
          <div className="alerts-bar">
            <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 9, color: '#888', letterSpacing: '0.14em', marginBottom: 8, flexShrink: 0 }}>ALERTS ({visibleAlerts.length})</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {visibleAlerts.map((a, i) => {
                const key = `${a.type}-${a.deal_id}-${a.partner_name || ''}`
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#111', border: `1px solid ${severityColor(a.severity)}22`, borderLeft: `3px solid ${severityColor(a.severity)}`, padding: '8px 12px' }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: severityColor(a.severity), flexShrink: 0 }} />
                    <div style={{ flex: 1, fontFamily: 'Barlow Condensed, sans-serif', fontSize: 14, color: '#e8e8e8', letterSpacing: '0.02em' }}>{a.message}</div>
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                      {a.type === 'new_quote_received' && a.partner_name && (
                        <button onClick={() => handleAction('approve_gate2', a.deal_id)} style={smallBtnStyle('#C9A84C', '#111')}>APPROVE G2</button>
                      )}
                      {a.type === 'partner_info_requested' && a.partner_name && (
                        <button onClick={() => {
                          const notes = window.prompt('Info notes:') ?? ''
                          handleAction('provide_info', a.deal_id, { partner_name: a.partner_name, notes })
                          setAlertsDismissed(s => new Set([...s, key]))
                        }} style={smallBtnStyle('#eab308', '#111')}>PROVIDE INFO</button>
                      )}
                      <button onClick={() => setAlertsDismissed(s => new Set([...s, key]))} style={smallBtnStyle('#222', '#555')}>✕</button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── Search + Filter bar ── */}
        <div className="filter-bar">
          <input
            type="text"
            placeholder="Search deal ID, item, seller…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ background: '#1a1a1a', border: '1px solid #333', borderBottom: '2px solid #C9A84C', color: '#e8e8e8', fontFamily: 'Barlow Condensed, sans-serif', fontSize: 15, padding: '7px 14px', outline: 'none', minWidth: 260 }}
          />
          <div style={{ display: 'flex', gap: 4 }}>
            {[['all', 'ALL'], ['gate1', 'GATE 1'], ['partners', 'PARTNERS'], ['gate2', 'GATE 2'], ['offer', 'OFFER OUT']].map(([val, lbl]) => (
              <button
                key={val}
                onClick={() => setStageFilter(val)}
                style={{ ...smallBtnStyle(stageFilter === val ? '#C9A84C' : '#222', stageFilter === val ? '#111' : '#888'), fontSize: 10, padding: '6px 12px', border: '1px solid #333' }}
              >
                {lbl}
              </button>
            ))}
          </div>
          <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 9, color: '#555', letterSpacing: '0.06em', marginLeft: 'auto' }}>
            {filteredDeals.length} deal{filteredDeals.length !== 1 ? 's' : ''} · {closed_count} total closed
          </div>
        </div>

        {/* ── Main content ── */}
        <main className="main">

          {view === 'kanban' ? (
            <div className="kanban">
              <KanbanColumn title="GATE 1" count={inGate1.length} color="#C9A84C" deals={inGate1} onAction={handleAction} partners={partners} />
              <KanbanColumn title="WITH PARTNERS" count={inPartners.length} color="#60a5fa" deals={inPartners} onAction={handleAction} partners={partners} />
              <KanbanColumn title="GATE 2" count={inGate2.length} color="#a78bfa" deals={inGate2} onAction={handleAction} partners={partners} />
              <KanbanColumn title="OFFER OUT" count={inOffer.length} color="#22c55e" deals={inOffer} onAction={handleAction} partners={partners} />
            </div>
          ) : (
            <TableView deals={filteredDeals} onAction={handleAction} />
          )}
        </main>

      </body>
    </html>
  )
}

// ── Kanban column ─────────────────────────────────────────────────────────────

function KanbanColumn({ title, count, color, deals, onAction, partners }: {
  title: string; count: number; color: string;
  deals: DealCard[];
  onAction: (a: string, d: string, extra?: Record<string, unknown>) => void;
  partners: { name: string; display_name: string }[];
}) {
  return (
    <div className="kanban-col">
      <div className="kanban-col-header" style={{ borderBottom: `2px solid ${color}` }}>
        <span style={{ color, fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 800, fontSize: 13, letterSpacing: '0.12em' }}>{title}</span>
        <span style={{ fontFamily: 'Space Mono, monospace', fontSize: 10, color, background: `${color}22`, padding: '2px 8px', marginLeft: 8 }}>{count}</span>
      </div>
      <div className="kanban-col-body">
        {deals.length === 0 && (
          <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 9, color: '#444', textAlign: 'center', padding: '20px 0', letterSpacing: '0.1em' }}>EMPTY</div>
        )}
        {deals.map(d => (
          <DealCardComp key={d.deal_id} deal={d} onAction={onAction} partners={partners} />
        ))}
      </div>
    </div>
  )
}

// ── Table view ────────────────────────────────────────────────────────────────

function TableView({ deals, onAction }: { deals: DealCard[]; onAction: (a: string, d: string, extra?: Record<string, unknown>) => void }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'Barlow Condensed, sans-serif' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #C9A84C' }}>
            {['DEAL', 'ITEM', 'STAGE', 'SELLER', 'PARTNERS', 'LAST ACTIVITY', 'ACTIONS'].map(h => (
              <th key={h} style={{ fontFamily: 'Space Mono, monospace', fontSize: 8, color: '#888', letterSpacing: '0.14em', padding: '10px 14px', textAlign: 'left', whiteSpace: 'nowrap' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {deals.map((d, i) => (
            <tr key={d.deal_id} style={{ borderBottom: '1px solid #1e1e1e', background: i % 2 === 0 ? '#0F0F0F' : '#111' }}>
              <td style={{ padding: '10px 14px', fontFamily: 'Space Mono, monospace', fontSize: 10, color: '#C9A84C', whiteSpace: 'nowrap' }}>{d.deal_id}</td>
              <td style={{ padding: '10px 14px', color: '#e8e8e8', fontSize: 14, fontWeight: 700, maxWidth: 200 }}>
                <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.item_name || '—'}</div>
                <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 8, color: '#555', marginTop: 2 }}>{d.category} · {d.condition}</div>
              </td>
              <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                <span style={{ fontFamily: 'Space Mono, monospace', fontSize: 9, color: d.sla_breached ? '#ef4444' : '#888', letterSpacing: '0.08em' }}>{stageLabel(d.stage)}</span>
              </td>
              <td style={{ padding: '10px 14px', maxWidth: 160 }}>
                {d.seller_name ? (
                  <>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#e8e8e8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.seller_name}</div>
                    {d.seller_email && <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 8, color: '#555', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.seller_email}</div>}
                  </>
                ) : <span style={{ color: '#444', fontSize: 12 }}>—</span>}
              </td>
              <td style={{ padding: '10px 14px', maxWidth: 200 }}>
                {d.partners.length === 0 ? <span style={{ fontFamily: 'Space Mono, monospace', fontSize: 8, color: '#444' }}>—</span> : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    {d.partners.map(p => (
                      <div key={p.partner_name} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: 12, color: '#e8e8e8' }}>{p.partner_display_name}</span>
                        <span style={{ fontFamily: 'Space Mono, monospace', fontSize: 8, color: '#666', letterSpacing: '0.06em' }}>{portalStatusLabel(p.portal_status)}</span>
                        {p.clock_hours_remaining != null && p.clock_hours_remaining > 0 && (
                          <span style={{ fontFamily: 'Space Mono, monospace', fontSize: 8, color: urgencyColor(p.clock_urgency) }}>{p.clock_hours_remaining.toFixed(0)}h</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </td>
              <td style={{ padding: '10px 14px', fontFamily: 'Space Mono, monospace', fontSize: 9, color: '#555', whiteSpace: 'nowrap' }}>
                <div>{d.last_activity}</div>
                <div style={{ color: '#444', marginTop: 2 }}>{timeAgo(d.last_activity_at)}</div>
              </td>
              <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {d.stage === 'gate1_pending' && (
                    <button onClick={() => onAction('approve_gate1', d.deal_id)} style={smallBtnStyle('#C9A84C', '#111')}>G1 ✓</button>
                  )}
                  {d.stage === 'gate2_pending' && (
                    <button onClick={() => onAction('approve_gate2', d.deal_id)} style={smallBtnStyle('#C9A84C', '#111')}>G2 ✓</button>
                  )}
                  {d.partners.some(p => p.portal_status === 'on_hold') && (
                    <button onClick={() => {
                      const pn = d.partners.find(p => p.portal_status === 'on_hold')?.partner_name ?? ''
                      const notes = window.prompt('Info notes:') ?? ''
                      onAction('provide_info', d.deal_id, { partner_name: pn, notes })
                    }} style={smallBtnStyle('#eab308', '#111')}>INFO</button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {deals.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px 0', fontFamily: 'Space Mono, monospace', fontSize: 10, color: '#444', letterSpacing: '0.1em' }}>NO DEALS MATCH</div>
      )}
    </div>
  )
}

// ── Stat badge ────────────────────────────────────────────────────────────────

function StatBadge({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '0 10px' }}>
      <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 800, fontSize: 22, color, lineHeight: 1 }}>{value}</div>
      <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 7, color: '#555', letterSpacing: '0.12em', marginTop: 2 }}>{label}</div>
    </div>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

const BASE_STYLES = `
  *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
  body { background: #0F0F0F; font-family: 'Barlow Condensed', sans-serif; color: #e8e8e8; min-height: 100vh; -webkit-font-smoothing: antialiased; }
`

const PAGE_STYLES = `
  .header { position: sticky; top: 0; z-index: 100; background: #111; border-bottom: 2px solid #C9A84C; padding: 14px 20px; display: flex; align-items: center; gap: 20px; }
  .header-left { flex-shrink: 0; }
  .wordmark { font-family: 'Barlow Condensed', sans-serif; font-weight: 800; font-size: 20px; letter-spacing: 0.04em; color: #C9A84C; text-transform: uppercase; line-height: 1; }
  .tagline { font-family: 'Space Mono', monospace; font-size: 8px; color: #555; letter-spacing: 0.14em; margin-top: 2px; }
  .pipeline-stats { display: flex; align-items: center; gap: 0; flex: 1; justify-content: center; border-left: 1px solid #222; border-right: 1px solid #222; padding: 0 10px; }
  .pipeline-stats > div { border-right: 1px solid #222; }
  .pipeline-stats > div:last-child { border-right: none; }
  .header-right { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
  .alerts-bar { background: #0a0a0a; border-bottom: 1px solid #1e1e1e; padding: 14px 20px; }
  .filter-bar { background: #0F0F0F; border-bottom: 1px solid #1e1e1e; padding: 12px 20px; display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
  .main { padding: 16px 20px; }
  .kanban { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; align-items: start; }
  @media (max-width: 1100px) { .kanban { grid-template-columns: repeat(2, 1fr); } }
  @media (max-width: 640px) { .kanban { grid-template-columns: 1fr; } .pipeline-stats { display: none; } }
  .kanban-col { background: #111; border: 1px solid #1e1e1e; }
  .kanban-col-header { padding: 12px 14px; display: flex; align-items: center; }
  .kanban-col-body { padding: 10px; min-height: 60px; }
`
