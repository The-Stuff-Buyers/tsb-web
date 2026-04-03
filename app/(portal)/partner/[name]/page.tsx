'use client'

import { useEffect, useState, useCallback, useRef } from 'react'

// ── Types ──────────────────────────────────────────────────────────────────────

interface PauseInterval { paused_at: string; resumed_at: string | null }

interface ClockData {
  business_hours_elapsed: number
  business_hours_total: number
  business_hours_remaining: number
  percent_elapsed: number
  status: string
  urgency: string
  started_at: string
  expires_at_estimated: string | null
  clock_type?: string
  paused_intervals?: PauseInterval[]
}

interface DealCard {
  deal_id: string
  item_name: string
  condition: string
  quantity: number
  location: string
  category: string
  description_preview: string
  attachment_count: number
  submitted_at: string
  portal_status: string
  is_resubmission: boolean
  clock?: ClockData | null
  info_request?: { requested_at: string; notes: string }
  quote_snapshot?: { offer_type_display: string; cash_offer_total: number | null; consignment_return: number | null; submitted_at: string } | null
  pipeline_status_display?: string
  can_revise?: boolean
  counter_offer_deadline?: string | null
}

interface PartnerData {
  partner: { name: string; display_name: string; has_first_refusal: boolean; first_refusal_hours: number }
  contact_name: string
  counts: { needs_response: number; on_hold: number; quoted: number; accepted: number; total: number }
  sections: { needs_response: DealCard[]; on_hold: DealCard[]; quoted: DealCard[]; accepted: DealCard[]; closed_count: number }
}

interface DealDetail {
  deal_id: string; item_name: string; description: string; condition: string; quantity: number
  location: string; category: string; submitted_at: string; portal_status: string
  clock: ClockData | null; attachments: { id: string; file_name: string; file_type: string; file_size: number; url: string; is_image: boolean }[]
  quote_summary: Record<string, unknown> | null; prior_quotes: Record<string, unknown>[]
  info_request: { requested_at: string; notes: string } | null
  info_provided: { provided_at: string; notes: string } | null
  prior_decline: { declined_at: string; notes: string } | null
  timeline: { event_type: string; timestamp: string; description: string; actor: string }[]
  can_submit_quote: boolean; can_decline: boolean; can_request_info: boolean; can_counter_offer: boolean
  counter_offer_deadline: string | null
}

const OFFER_TYPES = [
  { value: '', label: '— Select offer type —' },
  { value: 'cash_purchase', label: 'Cash Purchase' },
  { value: 'net_30', label: 'Cash — Net 30' },
  { value: 'net_60', label: 'Cash — Net 60' },
  { value: 'consignment', label: 'Consignment' },
  { value: 'both', label: 'Cash + Consignment' },
  { value: 'other', label: 'Other (specify in notes)' },
]
const PICKUP_OPTIONS = [
  { value: '', label: '— Select —' },
  { value: 'buyer_arranges', label: 'We Arrange & Pay Pickup' },
  { value: 'seller_delivers', label: 'Seller Delivers to Our Location' },
  { value: 'split', label: 'Split / Negotiable' },
]

function formatUSD(v: string) {
  const n = parseFloat(v.replace(/[^0-9.]/g, ''))
  if (isNaN(n)) return v
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n)
}

function getClockColor(urgency: string) {
  if (urgency === 'expired') return '#991b1b'
  if (urgency === 'critical') return '#ef4444'
  if (urgency === 'warning') return '#eab308'
  return '#22c55e'
}

function timeAgo(iso: string) {
  const ms = Date.now() - new Date(iso).getTime()
  const h = Math.floor(ms / 3600000)
  if (h < 1) return 'just now'
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  return `${d}d ago`
}

// ── ClockBar ──────────────────────────────────────────────────────────────────

function ClockBar({ clock }: { clock: ClockData }) {
  const pct = Math.min(clock.percent_elapsed * 100, 100)
  const color = getClockColor(clock.urgency)
  const label = clock.urgency === 'expired'
    ? 'Window expired'
    : `${clock.business_hours_remaining.toFixed(1)} biz hrs remaining`

  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', height: 6, position: 'relative', overflow: 'hidden' }}>
        <div style={{
          position: 'absolute', left: 0, top: 0, height: '100%', width: `${pct}%`,
          background: color,
          transition: 'width 0.3s ease',
          boxShadow: clock.urgency === 'expired' ? `0 0 8px ${color}` : 'none',
        }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
        <span style={{ fontFamily: 'Space Mono, monospace', fontSize: 9, color: color, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          {label}
        </span>
        <span style={{ fontFamily: 'Space Mono, monospace', fontSize: 9, color: '#555', letterSpacing: '0.08em' }}>
          {clock.status === 'paused' ? 'PAUSED' : `${Math.round(pct)}%`}
        </span>
      </div>
    </div>
  )
}

// ── InlineQuoteForm ───────────────────────────────────────────────────────────

interface QuoteFormProps {
  dealId: string
  quantity: number
  isCounterOffer?: boolean
  previousQuote?: Record<string, unknown> | null
  onSuccess: (action: string) => void
}

function InlineQuoteForm({ dealId, quantity, isCounterOffer, previousQuote, onSuccess }: QuoteFormProps) {
  const [mode, setMode] = useState<'quote' | 'decline' | 'info'>('quote')
  const [offerType, setOfferType] = useState(previousQuote ? String(previousQuote.payment_structure_display || '') : '')
  const [qty, setQty] = useState(String(quantity))
  const [cashPerUnit, setCashPerUnit] = useState(previousQuote ? String(previousQuote.cash_offer_per_unit || '') : '')
  const [cashTotal, setCashTotal] = useState(previousQuote ? String(previousQuote.cash_offer_total || '') : '')
  const [consignment, setConsignment] = useState(previousQuote ? String(previousQuote.consignment_return || '') : '')
  const [pickup, setPickup] = useState('')
  const [pickupDate, setPickupDate] = useState('')
  const [notes, setNotes] = useState('')
  const [infoNotes, setInfoNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const isConsignment = offerType === 'consignment'

  // Auto-calc
  useEffect(() => {
    const pu = parseFloat(cashPerUnit.replace(/[^0-9.]/g, ''))
    const q = parseInt(qty, 10)
    if (!isNaN(pu) && !isNaN(q) && pu > 0 && q > 0) setCashTotal(formatUSD(String(pu * q)))
  }, [cashPerUnit, qty])

  const submit = async () => {
    setError('')
    if (mode === 'quote' && !offerType) { setError('Please select an offer type.'); return }
    if (mode === 'quote' && !notes.trim()) { setError('Notes are required.'); return }
    if (mode === 'decline' && !notes.trim()) { setError('Decline reason is required.'); return }
    if (mode === 'info' && !infoNotes.trim()) { setError('Please describe what information you need.'); return }

    setSubmitting(true)
    try {
      const action = isCounterOffer ? 'counter_offer' : mode === 'quote' ? 'quote' : mode === 'decline' ? 'decline' : 'request_info'
      const payload: Record<string, unknown> = { action, deal_id: dealId }

      if (mode === 'quote' || isCounterOffer) {
        Object.assign(payload, {
          offer_type: offerType, quantity_offered: parseInt(qty, 10),
          cash_offer_per_unit: cashPerUnit || undefined,
          cash_offer_total: cashTotal || undefined,
          consignment_return: consignment || undefined,
          pickup_logistics: pickup || undefined,
          pickup_date: pickupDate || undefined,
          notes,
        })
        if (isCounterOffer) payload.counter_offer_reason = notes
      } else if (mode === 'decline') {
        payload.notes = notes
      } else {
        payload.info_request_notes = infoNotes
      }

      const res = await fetch('/api/partner/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Submission failed.'); setSubmitting(false); return }
      onSuccess(action)
    } catch {
      setError('Network error. Please try again.')
      setSubmitting(false)
    }
  }

  return (
    <div style={{ background: '#111', border: '1px solid #2a2a2a', borderLeft: '3px solid #C9A84C', padding: 20, marginTop: 16 }}>
      {!isCounterOffer && (
        <div style={{ display: 'flex', gap: 0, marginBottom: 16, border: '1px solid #333' }}>
          {(['quote', 'decline', 'info'] as const).map(m => (
            <button key={m} onClick={() => setMode(m)} style={{
              flex: 1, padding: '10px 8px', background: mode === m ? (m === 'decline' ? '#1a0a0a' : '#1a1600') : '#111',
              border: 'none', borderRight: '1px solid #333', color: mode === m ? (m === 'decline' ? '#cc4444' : '#C9A84C') : '#666',
              fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: 11, letterSpacing: '0.1em',
              textTransform: 'uppercase', cursor: 'pointer', transition: 'all 0.15s',
            }}>
              {m === 'quote' ? 'Submit Quote' : m === 'decline' ? 'Decline' : 'Request Info'}
            </button>
          ))}
        </div>
      )}
      {isCounterOffer && <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 9, color: '#C9A84C', letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 14 }}>REVISE OFFER</div>}

      {error && <div style={{ background: '#2a1515', border: '1px solid #662222', borderLeft: '3px solid #cc4444', color: '#ff8888', fontSize: 13, padding: '10px 14px', marginBottom: 14 }}>{error}</div>}

      {mode === 'info' && !isCounterOffer ? (
        <>
          <FormRow label="What information do you need? *">
            <textarea className="fc" value={infoNotes} onChange={e => setInfoNotes(e.target.value)} rows={3} placeholder="Describe what photos, documents, or details you need before quoting." style={{ width: '100%', background: '#1e1e1e', border: '1px solid #333', borderBottom: '2px solid #C9A84C', color: '#e8e8e8', fontFamily: 'Barlow Condensed, sans-serif', fontSize: 14, padding: '8px 12px', outline: 'none', resize: 'vertical', minHeight: 64 }} />
          </FormRow>
          <button onClick={submit} disabled={submitting} style={{ ...btnStyle, background: '#555', borderBottomColor: '#333', color: '#e8e8e8' }}>
            {submitting ? '◆  SENDING…' : '◆  REQUEST INFORMATION'}
          </button>
        </>
      ) : mode === 'decline' && !isCounterOffer ? (
        <>
          <FormRow label="Reason for declining *">
            <textarea className="fc" value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder="Please explain why you cannot provide a quote for this item." style={{ width: '100%', background: '#1e1e1e', border: '1px solid #333', borderBottom: '2px solid #cc4444', color: '#e8e8e8', fontFamily: 'Barlow Condensed, sans-serif', fontSize: 14, padding: '8px 12px', outline: 'none', resize: 'vertical', minHeight: 64 }} />
          </FormRow>
          <button onClick={submit} disabled={submitting} style={{ ...btnStyle, background: '#662222', borderBottomColor: '#441111', color: '#ffaaaa' }}>
            {submitting ? '◆  SUBMITTING…' : '◆  SUBMIT — NO QUOTE'}
          </button>
        </>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
            <FormRow label="Offer Type *">
              <select value={offerType} onChange={e => setOfferType(e.target.value)} style={inputStyle}>
                {OFFER_TYPES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </FormRow>
            <FormRow label="Quantity">
              <input type="number" value={qty} onChange={e => setQty(e.target.value)} style={inputStyle} min={0} />
            </FormRow>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
            <FormRow label="Cash Per Unit">
              <input type="text" value={cashPerUnit} onChange={e => setCashPerUnit(e.target.value)} onBlur={() => cashPerUnit && setCashPerUnit(formatUSD(cashPerUnit))} style={inputStyle} placeholder="$4.75" />
            </FormRow>
            <FormRow label={isConsignment ? 'Total Inventory Value' : 'Cash Total'}>
              <input type="text" value={cashTotal} onChange={e => setCashTotal(e.target.value)} onBlur={() => cashTotal && setCashTotal(formatUSD(cashTotal))} style={inputStyle} placeholder="Auto-calc or enter manually" />
            </FormRow>
          </div>
          {isConsignment && (
            <FormRow label="Est. Consignment Return">
              <input type="text" value={consignment} onChange={e => setConsignment(e.target.value)} onBlur={() => consignment && setConsignment(formatUSD(consignment))} style={inputStyle} placeholder="$1,800.00" />
            </FormRow>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
            <FormRow label="Pickup / Logistics">
              <select value={pickup} onChange={e => setPickup(e.target.value)} style={inputStyle}>
                {PICKUP_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </FormRow>
            <FormRow label="Pickup Date">
              <input type="date" value={pickupDate} onChange={e => setPickupDate(e.target.value)} style={inputStyle} />
            </FormRow>
          </div>
          <FormRow label={isCounterOffer ? 'Counter Offer Notes / Reason *' : 'Notes *'}>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder={isCounterOffer ? 'Explain your revised offer...' : 'Provide offer details, conditions, or contingencies.'} style={{ ...inputStyle, resize: 'vertical', minHeight: 64 }} />
          </FormRow>
          <button onClick={submit} disabled={submitting} style={btnStyle}>
            {submitting ? '◆  SUBMITTING…' : isCounterOffer ? '◆  SUBMIT REVISED OFFER' : '◆  SUBMIT QUOTE RESPONSE'}
          </button>
        </>
      )}
    </div>
  )
}

function FormRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 8, color: '#888', letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 5 }}>{label}</div>
      {children}
    </div>
  )
}

const inputStyle: React.CSSProperties = { width: '100%', background: '#1e1e1e', border: '1px solid #333', borderBottom: '2px solid #C9A84C', color: '#e8e8e8', fontFamily: 'Barlow Condensed, sans-serif', fontSize: 14, padding: '8px 12px', outline: 'none', appearance: 'none', WebkitAppearance: 'none', borderRadius: 0 }
const btnStyle: React.CSSProperties = { display: 'block', width: '100%', padding: '13px 24px', background: '#C9A84C', border: 'none', borderBottom: '3px solid #a08530', color: '#111', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 800, fontSize: 14, letterSpacing: '0.14em', textTransform: 'uppercase', cursor: 'pointer', marginTop: 4 }

// ── DealCardExpanded ──────────────────────────────────────────────────────────

function DealCardExpanded({ dealId, onActionSuccess }: { dealId: string; onActionSuccess: () => void }) {
  const [detail, setDetail] = useState<DealDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  useEffect(() => {
    setLoading(true)
    setError('')
    fetch(`/api/partner/deals/${encodeURIComponent(dealId)}`)
      .then(async res => {
        const data = await res.json()
        if (!res.ok) { setError(data.error || 'Failed to load.'); setLoading(false); return }
        setDetail(data)
        setLoading(false)
      })
      .catch(() => { setError('Network error.'); setLoading(false) })
  }, [dealId])

  const handleActionSuccess = (action: string) => {
    const msgs: Record<string, string> = {
      quote: '✓ Quote submitted successfully.',
      decline: '✓ Decline recorded.',
      request_info: '✓ Info request sent. Clock paused.',
      counter_offer: '✓ Counter offer submitted.',
    }
    setSuccessMsg(msgs[action] || '✓ Done.')
    setTimeout(() => { onActionSuccess() }, 1200)
  }

  if (loading) return <div style={{ padding: '16px 0', color: '#555', fontFamily: 'Space Mono, monospace', fontSize: 10 }}>Loading…</div>
  if (error) return <div style={{ padding: '12px 0', color: '#cc4444', fontSize: 13 }}>{error}</div>
  if (!detail) return null

  return (
    <div style={{ marginTop: 16 }}>
      {successMsg && <div style={{ background: '#0d1f0d', border: '1px solid #2d4a2d', borderLeft: '3px solid #22c55e', color: '#4ade80', fontSize: 14, fontWeight: 600, padding: '10px 14px', marginBottom: 12 }}>{successMsg}</div>}

      {/* Deal Detail Header — same info as email form */}
      <div style={{ background: '#0d0d0d', border: '1px solid #222', padding: '14px 16px', marginBottom: 16 }}>
        <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 8, color: '#C9A84C', letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 10 }}>Deal Details</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px', marginBottom: detail.description ? 10 : 0 }}>
          {[  
            ['Item', detail.item_name],
            ['Condition', detail.condition],
            ['Quantity', detail.quantity != null ? detail.quantity.toLocaleString() + ' units' : '—'],
            ['Location', detail.location],
            ['Category', detail.category],
          ].map(([label, value]) => value && value !== 'N/A' ? (
            <div key={String(label)}>
              <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 7, color: '#555', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 2 }}>{label}</div>
              <div style={{ fontSize: 13, color: '#e8e8e8', fontWeight: 600 }}>{value}</div>
            </div>
          ) : null)}
        </div>
        {detail.description && (
          <div style={{ borderTop: '1px solid #1e1e1e', paddingTop: 10, marginTop: 4 }}>
            <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 7, color: '#555', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 4 }}>Description</div>
            <div style={{ fontSize: 13, color: '#aaa', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{detail.description}</div>
          </div>
        )}
      </div>

      {detail.info_request && !detail.info_provided && (
        <div style={{ background: '#1a1200', border: '1px solid #4a3a00', borderLeft: '3px solid #eab308', padding: '12px 14px', marginBottom: 16 }}>
          <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 8, color: '#eab308', letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 4 }}>Info Requested · {timeAgo(detail.info_request.requested_at)}</div>
          <div style={{ fontSize: 13, color: '#ccc' }}>{detail.info_request.notes}</div>
        </div>
      )}
      {detail.info_provided && (
        <div style={{ background: '#0d1f0d', border: '1px solid #2d4a2d', borderLeft: '3px solid #22c55e', padding: '12px 14px', marginBottom: 16 }}>
          <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 8, color: '#22c55e', letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 4 }}>Info Provided · {timeAgo((detail.info_provided as Record<string, string>).provided_at)}</div>
          <div style={{ fontSize: 13, color: '#ccc' }}>{(detail.info_provided as Record<string, string>).notes}</div>
        </div>
      )}

      {/* Attachments */}
      {detail.attachments && detail.attachments.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 8, color: '#C9A84C', letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 10 }}>Attached Files ({detail.attachments.length})</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: 8 }}>
            {detail.attachments.map(f => f.is_image ? (
              <a key={f.id} href={f.url} target="_blank" rel="noopener noreferrer" style={{ display: 'block', background: '#111', border: '1px solid #2e2e2e', textDecoration: 'none', overflow: 'hidden' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={f.url} alt={f.file_name} style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', display: 'block' }} />
                <div style={{ padding: '4px 6px', fontSize: 9, color: '#888', fontFamily: 'Space Mono, monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.file_name}</div>
              </a>
            ) : (
              <a key={f.id} href={f.url} download={f.file_name} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', background: '#111', border: '1px solid #2e2e2e', padding: '12px 8px', textDecoration: 'none', textAlign: 'center' }}>
                <div style={{ fontSize: 24, marginBottom: 6 }}>{f.file_type.includes('pdf') ? '📄' : '📋'}</div>
                <div style={{ fontSize: 9, color: '#e8e8e8', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 600, wordBreak: 'break-all' }}>{f.file_name}</div>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Quote Summary (for quoted deals) */}
      {detail.quote_summary && !detail.can_submit_quote && !detail.can_counter_offer && (
        <div style={{ background: '#111', border: '1px solid #2a2a2a', borderLeft: '3px solid #555', padding: '14px 16px', marginBottom: 16 }}>
          <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 8, color: '#888', letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 8 }}>Your Quote</div>
          <div style={{ fontSize: 14, color: '#e8e8e8', fontWeight: 600 }}>{(detail.quote_summary as Record<string, string>).offer_type || (detail.quote_summary as Record<string, string>).payment_structure_display}</div>
          {(detail.quote_summary as Record<string, unknown>).cash_offer_total != null ? <div style={{ fontSize: 13, color: '#C9A84C' }}>${Number((detail.quote_summary as Record<string, unknown>).cash_offer_total).toLocaleString()}</div> : null}
          {(detail.quote_summary as Record<string, unknown>).consignment_return ? <div style={{ fontSize: 13, color: '#C9A84C' }}>Est. {formatUSD(String((detail.quote_summary as Record<string, unknown>).consignment_return))}</div> : null}
          {(detail.quote_summary as Record<string, unknown>).notes ? <div style={{ fontSize: 12, color: '#888', marginTop: 6, lineHeight: 1.5 }}>{String((detail.quote_summary as Record<string, unknown>).notes)}</div> : null}
        </div>
      )}

      {/* Counter offer form */}
      {detail.can_counter_offer && (
        <div style={{ marginBottom: 16 }}>
          {detail.counter_offer_deadline && (
            <div style={{ background: '#1a0a00', border: '1px solid #4a2800', borderLeft: '3px solid #f97316', padding: '10px 14px', marginBottom: 12 }}>
              <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 8, color: '#f97316', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 3 }}>Counter Offer Window</div>
              <div style={{ fontSize: 13, color: '#ccc' }}>Deadline: {new Date(detail.counter_offer_deadline).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'America/Chicago' })} CT</div>
            </div>
          )}
          <InlineQuoteForm dealId={dealId} quantity={detail.quantity} isCounterOffer previousQuote={detail.quote_summary} onSuccess={handleActionSuccess} />
        </div>
      )}

      {/* Quote / decline form for pending deals */}
      {(detail.can_submit_quote || detail.can_decline || detail.can_request_info) && !successMsg && (
        <InlineQuoteForm dealId={dealId} quantity={detail.quantity} onSuccess={handleActionSuccess} />
      )}

      {/* Timeline */}
      {detail.timeline && detail.timeline.length > 0 && (
        <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #1e1e1e' }}>
          <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 8, color: '#555', letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 10 }}>Timeline</div>
          {detail.timeline.map((ev, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 6, alignItems: 'flex-start' }}>
              <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 8, color: '#444', letterSpacing: '0.06em', whiteSpace: 'nowrap', paddingTop: 2 }}>{new Date(ev.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
              <div style={{ fontSize: 12, color: '#888', lineHeight: 1.4 }}>{ev.description}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Deal Card (collapsed + expanded) ──────────────────────────────────────────

function DealCardItem({ card, isExpanded, onToggle, onRefresh }: { card: DealCard; isExpanded: boolean; onToggle: () => void; onRefresh: () => void }) {
  const statusColors: Record<string, string> = {
    pending_quote: '#C9A84C',
    sla_expired: '#cc4444',
    on_hold: '#eab308',
    quote_submitted: '#888',
    seller_interested: '#22c55e',
    meeting_scheduled: '#22c55e',
    seller_declined_quote: '#f97316',
  }
  const statusLabels: Record<string, string> = {
    pending_quote: 'Awaiting Quote',
    sla_expired: 'Window Expired',
    on_hold: 'On Hold',
    quote_submitted: 'Quote Submitted',
    seller_interested: 'Seller Interested',
    meeting_scheduled: 'Meeting Scheduled',
    seller_declined_quote: 'Seller Passed',
    declined_by_partner: 'Declined',
    counter_expired: 'Counter Expired',
  }
  const accentColor = statusColors[card.portal_status] || '#555'

  return (
    <div style={{ border: `1px solid #2a2a2a`, borderLeft: `3px solid ${accentColor}`, background: '#1a1a1a', marginBottom: 8, cursor: 'pointer' }} onClick={onToggle}>
      {/* Card Header */}
      <div style={{ padding: '14px 20px 12px' }}>
        {card.clock && <ClockBar clock={card.clock} />}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#e8e8e8', letterSpacing: '0.02em', marginBottom: 4, textTransform: 'uppercase' }}>
              {card.item_name}
              {card.is_resubmission && <span style={{ marginLeft: 8, background: '#2a1515', border: '1px solid #662222', color: '#cc6666', fontSize: 9, fontFamily: 'Space Mono, monospace', padding: '2px 6px', letterSpacing: '0.1em' }}>RESUBMISSION</span>}
            </div>
            <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 9, color: '#666', letterSpacing: '0.08em' }}>
              {card.quantity != null ? card.quantity.toLocaleString() : '—'} units · {card.location} · {card.condition}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
            <div style={{ background: accentColor + '22', border: `1px solid ${accentColor}44`, color: accentColor, fontFamily: 'Space Mono, monospace', fontSize: 8, padding: '3px 8px', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
              {statusLabels[card.portal_status] || card.portal_status}
            </div>
            {card.attachment_count > 0 && (
              <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 8, color: '#555', letterSpacing: '0.08em' }}>
                📎 {card.attachment_count}
              </div>
            )}
          </div>
        </div>

        {/* Quote snapshot for quoted cards */}
        {card.quote_snapshot && (
          <div style={{ marginTop: 8, display: 'flex', gap: 16, alignItems: 'center' }}>
            <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 9, color: '#888' }}>{card.quote_snapshot.offer_type_display}</div>
            {card.quote_snapshot.cash_offer_total != null && <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 10, color: '#C9A84C' }}>${Number(card.quote_snapshot.cash_offer_total).toLocaleString()}</div>}
            {card.can_revise && <div style={{ background: '#1a1600', border: '1px solid #4a3a00', color: '#C9A84C', fontFamily: 'Space Mono, monospace', fontSize: 8, padding: '3px 8px', letterSpacing: '0.1em' }}>◆ REVISE OFFER</div>}
          </div>
        )}

        {/* On-hold info */}
        {card.info_request && (
          <div style={{ marginTop: 8, fontFamily: 'Space Mono, monospace', fontSize: 9, color: '#eab308' }}>
            Info requested {timeAgo(card.info_request.requested_at)} · <span style={{ color: '#888' }}>{card.info_request.notes?.slice(0, 60)}{(card.info_request.notes?.length || 0) > 60 ? '…' : ''}</span>
          </div>
        )}
      </div>

      {/* Expanded content */}
      {isExpanded && (
        <div style={{ padding: '0 20px 20px', borderTop: '1px solid #1e1e1e' }} onClick={e => e.stopPropagation()}>
          <DealCardExpanded dealId={card.deal_id} onActionSuccess={onRefresh} />
        </div>
      )}
    </div>
  )
}

// ── Main Dashboard ────────────────────────────────────────────────────────────

export default function PartnerDashboard() {
  const [data, setData] = useState<PartnerData | null>(null)
  const [loading, setLoading] = useState(true)
  const [expandedDeal, setExpandedDeal] = useState<string | null>(null)
  const [closedDeals, setClosedDeals] = useState<Record<string, unknown>[] | null>(null)
  const [showClosed, setShowClosed] = useState(false)
  const [loadingClosed, setLoadingClosed] = useState(false)
  const hasRedirected = useRef(false)

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/partner/deals')
      if (res.status === 401 && !hasRedirected.current) {
        hasRedirected.current = true
        const pname = window.location.pathname.split('/')[2] || 'bidfta'
        window.location.href = `/partner/login?partner=${pname}`
        return
      }
      if (!res.ok) { setLoading(false); return }
      const d = await res.json()
      setData(d)
      setLoading(false)
    } catch {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  // Re-fetch on window focus (stale-while-revalidate)
  useEffect(() => {
    const handler = () => fetchData()
    window.addEventListener('focus', handler)
    return () => window.removeEventListener('focus', handler)
  }, [fetchData])

  // URL sync for expanded deal
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const d = params.get('deal')
    if (d) setExpandedDeal(d)
  }, [])

  const toggleExpanded = (dealId: string) => {
    const next = expandedDeal === dealId ? null : dealId
    setExpandedDeal(next)
    const url = new URL(window.location.href)
    if (next) url.searchParams.set('deal', next)
    else url.searchParams.delete('deal')
    window.history.pushState({}, '', url.toString())
  }

  const loadClosed = async () => {
    setLoadingClosed(true)
    try {
      const res = await fetch('/api/partner/deals?closed=true')
      const d = await res.json()
      setClosedDeals(d.closed || [])
    } finally {
      setLoadingClosed(false)
      setShowClosed(true)
    }
  }

  const handleLogout = async () => {
    await fetch('/api/partner/logout', { method: 'POST' })
    const pname = window.location.pathname.split('/')[2] || 'bidfta'
    window.location.href = `/partner/login?partner=${pname}`
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0F0F0F' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 800, fontSize: 24, color: '#C9A84C', letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 16 }}>THE STUFF BUYERS</div>
          <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 9, color: '#555', letterSpacing: '0.14em' }}>Loading portal…</div>
        </div>
      </div>
    )
  }

  if (!data) return null

  const { partner, contact_name, counts, sections } = data
  const allDeals = [...sections.needs_response, ...sections.on_hold, ...sections.quoted, ...sections.accepted]

  return (
    <>

        {/* ── Sticky Header ── */}
        <div style={{ position: 'sticky', top: 0, zIndex: 100, background: '#111', borderBottom: '2px solid #C9A84C' }}>
          <div style={{ padding: '16px 24px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
            <div>
              <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 800, fontSize: 20, color: '#C9A84C', letterSpacing: '0.04em', textTransform: 'uppercase', lineHeight: 1 }}>
                THE STUFF BUYERS <span style={{ color: '#555', fontWeight: 400 }}>·</span> Partner Portal
              </div>
              <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 9, color: '#888', letterSpacing: '0.1em', marginTop: 3 }}>
                {partner.display_name} · {contact_name}
              </div>
            </div>
            <button onClick={handleLogout} style={{ background: 'none', border: '1px solid #333', color: '#666', fontFamily: 'Space Mono, monospace', fontSize: 8, letterSpacing: '0.12em', textTransform: 'uppercase', padding: '6px 12px', cursor: 'pointer' }}>
              Logout
            </button>
          </div>
          <div style={{ padding: '8px 24px 10px', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <StatBadge count={counts.needs_response} label="Needs Response" color="#C9A84C" />
            {counts.on_hold > 0 && <StatBadge count={counts.on_hold} label="On Hold" color="#eab308" />}
            <StatBadge count={counts.quoted} label="Quoted" color="#888" />
            {counts.accepted > 0 && <StatBadge count={counts.accepted} label="Accepted" color="#22c55e" />}
          </div>
        </div>

        {/* ── Main Content ── */}
        <div style={{ maxWidth: 800, margin: '0 auto', padding: '24px 20px' }}>

          {allDeals.length === 0 && (
            <div style={{ textAlign: 'center', padding: '80px 40px', color: '#555' }}>
              <div style={{ fontSize: 32, marginBottom: 16, color: '#C9A84C', fontWeight: 800 }}>◆</div>
              <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 20, fontWeight: 700, color: '#e8e8e8', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>Welcome to the TSB Partner Portal</div>
              <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 10, color: '#555', letterSpacing: '0.08em', lineHeight: 1.8 }}>Quote requests will appear here when submitted.</div>
            </div>
          )}

          {/* Needs Response */}
          {sections.needs_response.length > 0 && (
            <Section label={`Needs Your Response · ${sections.needs_response.length}`} accent="#C9A84C">
              {sections.needs_response.map(card => (
                <DealCardItem key={card.deal_id} card={card} isExpanded={expandedDeal === card.deal_id} onToggle={() => toggleExpanded(card.deal_id)} onRefresh={fetchData} />
              ))}
            </Section>
          )}
          {sections.needs_response.length === 0 && allDeals.length > 0 && (
            <div style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', padding: '16px 20px', marginBottom: 24, color: '#555', fontFamily: 'Space Mono, monospace', fontSize: 9, letterSpacing: '0.1em' }}>
              ✓ All caught up — no open quote requests.
            </div>
          )}

          {/* On Hold */}
          {sections.on_hold.length > 0 && (
            <Section label={`On Hold — Awaiting Info · ${sections.on_hold.length}`} accent="#eab308">
              {sections.on_hold.map(card => (
                <DealCardItem key={card.deal_id} card={card} isExpanded={expandedDeal === card.deal_id} onToggle={() => toggleExpanded(card.deal_id)} onRefresh={fetchData} />
              ))}
            </Section>
          )}

          {/* Quoted */}
          {sections.quoted.length > 0 && (
            <Section label={`Quoted — Awaiting Decision · ${sections.quoted.length}`} accent="#555">
              {sections.quoted.map(card => (
                <DealCardItem key={card.deal_id} card={card} isExpanded={expandedDeal === card.deal_id} onToggle={() => toggleExpanded(card.deal_id)} onRefresh={fetchData} />
              ))}
            </Section>
          )}

          {/* Accepted */}
          {sections.accepted.length > 0 && (
            <Section label={`Accepted — In Progress · ${sections.accepted.length}`} accent="#22c55e">
              {sections.accepted.map(card => (
                <DealCardItem key={card.deal_id} card={card} isExpanded={expandedDeal === card.deal_id} onToggle={() => toggleExpanded(card.deal_id)} onRefresh={fetchData} />
              ))}
            </Section>
          )}

          {/* Closed */}
          {sections.closed_count > 0 && (
            <div style={{ marginTop: 24 }}>
              {!showClosed ? (
                <button onClick={loadClosed} disabled={loadingClosed} style={{ display: 'block', width: '100%', background: '#111', border: '1px solid #2a2a2a', color: '#555', fontFamily: 'Space Mono, monospace', fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', padding: '12px', cursor: 'pointer' }}>
                  {loadingClosed ? 'Loading…' : `Show ${sections.closed_count} closed deals ▾`}
                </button>
              ) : (
                <Section label={`Closed · ${closedDeals?.length || 0}`} accent="#333">
                  {(closedDeals || []).map((c: Record<string, unknown>) => (
                    <div key={c.deal_id as string} style={{ border: '1px solid #2a2a2a', borderLeft: '3px solid #333', background: '#1a1a1a', padding: '12px 20px', marginBottom: 6 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 700, color: '#666', textTransform: 'uppercase', letterSpacing: '0.02em' }}>{c.item_name as string}</div>
                          <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 8, color: '#444', marginTop: 3 }}>{c.deal_id as string} · {c.quantity as number} units · {c.location as string}</div>
                        </div>
                        <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 8, color: '#444', letterSpacing: '0.1em', textAlign: 'right' }}>
                          <div style={{ textTransform: 'uppercase' }}>{c.outcome_display as string}</div>
                          <div style={{ marginTop: 2 }}>{timeAgo(c.closed_at as string)}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </Section>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ borderTop: '1px solid #1a1a1a', padding: '12px 24px', fontFamily: 'Space Mono, monospace', fontSize: 8, color: '#333', letterSpacing: '0.1em', textAlign: 'center', textTransform: 'uppercase', marginTop: 24 }}>
          © 2026 The Stuff Buyers LLC · Partner Portal · questions@thestuffbuyers.com
        </div>
      
    </>
  )
}

function StatBadge({ count, label, color }: { count: number; label: string; color: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 800, fontSize: 16, color, lineHeight: 1 }}>{count}</span>
      <span style={{ fontFamily: 'Space Mono, monospace', fontSize: 8, color: '#666', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{label}</span>
    </div>
  )
}

function Section({ label, accent, children }: { label: string; accent: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, paddingBottom: 8, borderBottom: `1px solid ${accent}33` }}>
        <div style={{ width: 3, height: 14, background: accent, flexShrink: 0 }} />
        <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 9, color: accent, letterSpacing: '0.16em', textTransform: 'uppercase', fontWeight: 700 }}>{label}</div>
      </div>
      {children}
    </div>
  )
}

// BASE_STYLES moved to app/(portal)/partner/layout.tsx — v2
