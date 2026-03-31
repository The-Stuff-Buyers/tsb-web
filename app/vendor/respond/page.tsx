'use client'

import { Suspense, useEffect, useState, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'

// ── Types ─────────────────────────────────────────────────────────────────────

interface DealData {
  deal_id: string
  item_name: string
  condition: string
  quantity: number
  location: string
  category: string
  description: string
  deadline: string
  submitted_at: string
  vendor: {
    company: string
    contact_name: string
    email: string
    phone: string
  }
}

type PageState = 'loading' | 'form' | 'submitted' | 'already_submitted' | 'error'

// ── USD Formatting ────────────────────────────────────────────────────────────

function formatUSD(value: string): string {
  const num = parseFloat(value.replace(/[^0-9.]/g, ''))
  if (isNaN(num)) return value
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(num)
}

// ── Offer types ───────────────────────────────────────────────────────────────

const OFFER_TYPES = [
  { value: '', label: '— Select offer type —' },
  { value: 'cash_purchase', label: 'Cash Purchase (outright buy)' },
  { value: 'consignment_60_40', label: 'Consignment — 60/40 (seller gets 60%)' },
  { value: 'consignment_70_30', label: 'Consignment — 70/30 (seller gets 70%)' },
  { value: 'consignment_80_20', label: 'Consignment — 80/20 (seller gets 80%)' },
  { value: 'net_30', label: 'Net 30' },
  { value: 'net_60', label: 'Net 60' },
  { value: 'other', label: 'Other (specify in notes)' },
]

const PICKUP_OPTIONS = [
  { value: '', label: '— Select —' },
  { value: 'buyer_arranges', label: 'We Arrange & Pay Pickup' },
  { value: 'seller_delivers', label: 'Seller Delivers to Our Location' },
  { value: 'split', label: 'Split / Negotiable' },
  { value: 'na', label: 'N/A — No Offer' },
]

// ── Component ─────────────────────────────────────────────────────────────────

export default function VendorRespondPageWrapper() {
  return (
    <Suspense fallback={<div style={{ background: '#0F0F0F', minHeight: '100vh' }} />}>
      <VendorRespondPage />
    </Suspense>
  )
}

function VendorRespondPage() {
  const searchParams = useSearchParams()
  const dealParam = searchParams.get('deal') || ''
  const tokenParam = searchParams.get('token') || ''

  const [pageState, setPageState] = useState<PageState>('loading')
  const [errorMsg, setErrorMsg] = useState('')
  const [deal, setDeal] = useState<DealData | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  // Decline toggle
  const [declined, setDeclined] = useState(false)

  // Form fields
  const [offerType, setOfferType] = useState('')
  const [quantityOffered, setQuantityOffered] = useState('')
  const [cashPerUnit, setCashPerUnit] = useState('')
  const [cashTotal, setCashTotal] = useState('')
  const [consignmentReturn, setConsignmentReturn] = useState('')
  const [pickupLogistics, setPickupLogistics] = useState('')
  const [pickupDate, setPickupDate] = useState('')
  const [notes, setNotes] = useState('')

  // Quote valid through: calculated on submit as submittedAt + 72h
  const quoteValidThrough = deal?.submitted_at
    ? (() => {
        const exp = new Date(new Date(deal.submitted_at).getTime() + 72 * 60 * 60 * 1000)
        return exp.toLocaleDateString('en-US', {
          weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
          timeZone: 'America/Chicago',
        }) + ' at ' + exp.toLocaleTimeString('en-US', {
          hour: 'numeric', minute: '2-digit', hour12: true,
          timeZone: 'America/Chicago',
        }) + ' CT'
      })()
    : 'Valid through: 72 hours from submission'

  const isConsignment = !declined && offerType.startsWith('consignment')

  // Auto-calc total from per unit × qty
  useEffect(() => {
    const perUnit = parseFloat(cashPerUnit.replace(/[^0-9.]/g, ''))
    const qty = parseInt(quantityOffered, 10)
    if (!isNaN(perUnit) && !isNaN(qty) && perUnit > 0 && qty > 0) {
      setCashTotal(formatUSD(String(perUnit * qty)))
    }
  }, [cashPerUnit, quantityOffered])

  // Auto-calc consignment return from total inventory value × split %
  // Parses split directly from enum string: consignment_XX_YY → XX/100
  useEffect(() => {
    if (!isConsignment) {
      setConsignmentReturn('')
      return
    }
    const match = offerType.match(/consignment_(\d+)_(\d+)/)
    const splitPercent = match ? parseInt(match[1]) / 100 : null
    if (splitPercent === null) return
    const total = parseFloat(cashTotal.replace(/[^0-9.]/g, ''))
    if (!isNaN(total) && total > 0) {
      setConsignmentReturn(formatUSD(String(total * splitPercent)))
    } else {
      setConsignmentReturn('')
    }
  }, [cashTotal, offerType, isConsignment])

  // Fetch deal data
  useEffect(() => {
    if (!dealParam || !tokenParam) {
      setErrorMsg('This link is invalid or has expired.')
      setPageState('error')
      return
    }

    fetch(`/api/vendor/respond/deal?deal=${encodeURIComponent(dealParam)}&token=${encodeURIComponent(tokenParam)}`)
      .then(async (res) => {
        const data = await res.json()
        if (!res.ok) {
          if (data.error === 'already_submitted') {
            setPageState('already_submitted')
          } else {
            setErrorMsg(data.error || data.message || 'This link is invalid or has expired.')
            setPageState('error')
          }
          return
        }
        setDeal(data)
        setQuantityOffered(String(data.quantity))
        setPageState('form')
      })
      .catch(() => {
        setErrorMsg('Unable to load deal data. Please try again.')
        setPageState('error')
      })
  }, [dealParam, tokenParam])

  const handleSubmit = useCallback(async () => {
    if (!deal) return
    setSubmitError('')

    // Validation
    if (!declined && !offerType) { setSubmitError('Please select an offer type.'); return }
    if (!declined && (!quantityOffered || parseInt(quantityOffered, 10) < 1)) { setSubmitError('Please enter a valid quantity.'); return }
    if (!notes.trim()) { setSubmitError(declined ? 'A decline reason is required.' : 'Please provide quote notes or a decline reason.'); return }

    setSubmitting(true)

    try {
      const res = await fetch('/api/vendor/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deal_id: deal.deal_id,
          token: tokenParam,
          offer_type: declined ? 'declined' : offerType,
          quantity_offered: declined ? 0 : parseInt(quantityOffered, 10),
          cash_offer_per_unit: cashPerUnit || undefined,
          cash_offer_total: cashTotal || undefined,
          consignment_return: consignmentReturn || undefined,
          pickup_logistics: pickupLogistics || undefined,
          pickup_date: pickupDate || undefined,
          notes,
          vendor_company: deal.vendor.company,
          vendor_contact: deal.vendor.contact_name,
          vendor_email: deal.vendor.email,
          vendor_phone: deal.vendor.phone,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setSubmitError(data.error || 'Submission failed. Please try again.')
        setSubmitting(false)
        return
      }

      setPageState('submitted')
    } catch {
      setSubmitError('Network error. Please check your connection and try again.')
      setSubmitting(false)
    }
  }, [deal, tokenParam, offerType, quantityOffered, cashPerUnit, cashTotal, consignmentReturn, pickupLogistics, pickupDate, notes])

  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>TSB Vendor Quote Response</title>
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@300;400;600;700;800&family=Space+Mono:wght@400;700&display=swap"
          rel="stylesheet"
        />
        <style dangerouslySetInnerHTML={{ __html: STYLES }} />
      </head>
      <body>
        <div className="page-wrapper">
          {pageState === 'loading' && <LoadingState />}
          {pageState === 'error' && <ErrorState message={errorMsg} />}
          {pageState === 'already_submitted' && <AlreadySubmittedState dealId={dealParam} />}
          {pageState === 'submitted' && <ConfirmationState dealId={deal?.deal_id || dealParam} />}
          {pageState === 'form' && deal && (
            <div className="form-container">
              {/* Header */}
              <div className="form-header">
                <div className="header-row">
                  <div>
                    <div className="wordmark">THE STUFF BUYERS</div>
                    <div className="tagline">Inventory Recovery · Partner Network</div>
                  </div>
                  <div className="deal-badge">
                    <div className="deal-id-display">{deal.deal_id}</div>
                    <div className="deal-date">VENDOR QUOTE RESPONSE</div>
                  </div>
                </div>
              </div>

              {/* Banner */}
              <div className="banner">
                <span>◆ QUOTE RESPONSE FORM · {deal.vendor.company}</span>
              </div>

              {/* Deal Summary Card */}
              <div className="section">
                <div className="section-label">DEAL SUMMARY</div>
                <div className="item-card">
                  <div className="item-name">{deal.item_name}</div>
                  <div className="item-grid">
                    <div className="grid-cell">
                      <span className="field-key">Condition</span>
                      <span className="field-val">{deal.condition}</span>
                    </div>
                    <div className="grid-cell">
                      <span className="field-key">Category</span>
                      <span className="field-val">{deal.category}</span>
                    </div>
                    <div className="grid-cell">
                      <span className="field-key">Quantity</span>
                      <span className="field-val highlight">{deal.quantity} units</span>
                    </div>
                    <div className="grid-cell">
                      <span className="field-key">Location</span>
                      <span className="field-val">{deal.location}</span>
                    </div>
                  </div>
                  {deal.description && (
                    <div className="description-block">
                      <span className="field-key">Description</span>
                      <span className="field-val desc">{deal.description}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Deadline Bar */}
              <div className="deadline-bar">
                <span className="dl-label">Quote Response Deadline</span>
                <span className="dl-value">{deal.deadline}</span>
              </div>

              {/* Quote Form */}
              <div className="section">
                <div className="section-label">YOUR QUOTE</div>

                {/* Decline / Quote Toggle */}
                <div className="decline-toggle">
                  <label className={`toggle-opt${!declined ? ' active' : ''}`}>
                    <input
                      type="radio"
                      name="response_type"
                      checked={!declined}
                      onChange={() => setDeclined(false)}
                    />
                    Submit Quote
                  </label>
                  <label className={`toggle-opt decline${declined ? ' active decline-active' : ''}`}>
                    <input
                      type="radio"
                      name="response_type"
                      checked={declined}
                      onChange={() => setDeclined(true)}
                    />
                    Decline to Quote
                  </label>
                </div>

                {declined && (
                  <div className="decline-notice">
                    ◆ You are declining to quote on this item. All quote fields have been disabled. A reason is required below.
                  </div>
                )}

                {submitError && (
                  <div className="error-banner">{submitError}</div>
                )}

                {/* Offer Type */}
                <div className={`form-row${declined ? ' field-disabled' : ''}`}>
                  <label className="form-label">Offer Type *</label>
                  <select
                    className={`form-control${declined ? ' readonly' : ''}`}
                    value={offerType}
                    disabled={declined}
                    onChange={(e) => setOfferType(e.target.value)}
                  >
                    {OFFER_TYPES.map((o) => (
                      <option key={o.value} value={o.value} disabled={o.value === ''}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Quantity */}
                <div className={`form-row-grid${declined ? ' field-disabled' : ''}`}>
                  <div className="form-row">
                    <label className="form-label">Quantity You Are Offering On *</label>
                    <input
                      type="number"
                      className={`form-control${declined ? ' readonly' : ''}`}
                      value={quantityOffered}
                      onChange={(e) => !declined && setQuantityOffered(e.target.value)}
                      readOnly={declined}
                      min={0}
                      placeholder="e.g. 300"
                    />
                  </div>
                  <div className="form-row">
                    <label className="form-label">Quantity Requested (reference)</label>
                    <input
                      type="number"
                      className="form-control readonly"
                      value={deal.quantity}
                      readOnly
                    />
                  </div>
                </div>

                {/* Cash Offers */}
                <div className={`form-row-grid${declined ? ' field-disabled' : ''}`}>
                  <div className="form-row">
                    <label className="form-label">Cash Offer Per Unit</label>
                    <input
                      type="text"
                      className={`form-control${declined ? ' readonly' : ''}`}
                      value={cashPerUnit}
                      onChange={(e) => !declined && setCashPerUnit(e.target.value)}
                      onBlur={() => !declined && cashPerUnit && setCashPerUnit(formatUSD(cashPerUnit))}
                      readOnly={declined}
                      placeholder="e.g. $4.75"
                    />
                  </div>
                  <div className="form-row">
                    <label className="form-label">{isConsignment ? 'Total Inventory Value' : 'Cash Offer Total'}</label>
                    <input
                      type="text"
                      className={`form-control${declined ? ' readonly' : ''}`}
                      value={cashTotal}
                      onChange={(e) => !declined && setCashTotal(e.target.value)}
                      onBlur={() => !declined && cashTotal && setCashTotal(formatUSD(cashTotal))}
                      readOnly={declined}
                      placeholder={isConsignment ? 'Gross auction estimate' : 'Auto-calculates or enter manually'}
                    />
                  </div>
                </div>

                {/* Consignment Return - only shown if consignment selected */}
                {isConsignment && (
                  <div className="form-row">
                    <label className="form-label">Estimated Consignment Return</label>
                    <input
                      type="text"
                      className="form-control"
                      value={consignmentReturn}
                      onChange={(e) => setConsignmentReturn(e.target.value)}
                      onBlur={() => consignmentReturn && setConsignmentReturn(formatUSD(consignmentReturn))}
                      placeholder="e.g. $1,800.00 est."
                    />
                  </div>
                )}

                {/* Logistics */}
                <div className={`form-row-grid${declined ? ' field-disabled' : ''}`}>
                  <div className="form-row">
                    <label className="form-label">Pickup / Logistics</label>
                    <select
                      className={`form-control${declined ? ' readonly' : ''}`}
                      value={pickupLogistics}
                      onChange={(e) => !declined && setPickupLogistics(e.target.value)}
                      disabled={declined}
                    >
                      {PICKUP_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value} disabled={o.value === ''}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-row">
                    <label className="form-label">Estimated Pickup / Close Date</label>
                    <input
                      type="date"
                      className={`form-control${declined ? ' readonly' : ''}`}
                      value={pickupDate}
                      onChange={(e) => !declined && setPickupDate(e.target.value)}
                      readOnly={declined}
                    />
                  </div>
                </div>

                {/* Notes */}
                <div className="form-row">
                  <label className="form-label">{declined ? 'Reason for Declining *' : 'Quote Notes / Decline Reason *'}</label>
                  <textarea
                    className="form-control"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder={declined ? 'Required: please explain why you are declining to quote on this item.' : 'Provide your offer details, conditions, contingencies, or reason for declining. This field is required.'}
                    rows={4}
                  />
                </div>
              </div>

              {/* Vendor Info (readonly) */}
              <div className="section">
                <div className="section-label">RESPONDING VENDOR</div>
                <div className="form-row-grid">
                  <div className="form-row">
                    <label className="form-label">Company</label>
                    <input type="text" className="form-control readonly" value={deal.vendor.company} readOnly />
                  </div>
                  <div className="form-row">
                    <label className="form-label">Contact Name</label>
                    <input type="text" className="form-control readonly" value={deal.vendor.contact_name} readOnly />
                  </div>
                </div>
                <div className="form-row-grid">
                  <div className="form-row">
                    <label className="form-label">Email</label>
                    <input type="email" className="form-control readonly" value={deal.vendor.email} readOnly />
                  </div>
                  <div className="form-row">
                    <label className="form-label">Phone</label>
                    <input type="tel" className="form-control readonly" value={deal.vendor.phone} readOnly />
                  </div>
                </div>

                {/* Quote Valid Through */}
                <div className="form-row" style={{ marginTop: 16 }}>
                  <label className="form-label">Quote Valid Through</label>
                  <div className="quote-expiry">{quoteValidThrough}</div>
                </div>
              </div>

              {/* Submit */}
              <div className="section submit-section">
                <button
                  className={`submit-btn${declined ? ' decline-btn' : ''}`}
                  onClick={handleSubmit}
                  disabled={submitting}
                >
                  {submitting ? '◆  SUBMITTING…' : declined ? '◆  SUBMIT DECLINE' : '◆  SUBMIT QUOTE RESPONSE'}
                </button>
                <p className="submit-hint">
                  Your response will be submitted directly to The Stuff Buyers team for review.
                </p>
              </div>

              {/* Footer */}
              <div className="footer">
                © 2026 The Stuff Buyers LLC · All Rights Reserved · {deal.deal_id}
              </div>
            </div>
          )}
        </div>
      </body>
    </html>
  )
}

// ── State screens ─────────────────────────────────────────────────────────────

function LoadingState() {
  return (
    <div className="state-screen">
      <div className="wordmark">THE STUFF BUYERS</div>
      <div className="state-text">Loading deal data…</div>
    </div>
  )
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="state-screen">
      <div className="wordmark">THE STUFF BUYERS</div>
      <div className="state-icon">✕</div>
      <div className="state-heading">Link Invalid</div>
      <div className="state-text">{message}</div>
      <div className="state-contact">
        Need help? Contact <a href="mailto:quotes@thestuffbuyers.com">quotes@thestuffbuyers.com</a> or call <a href="tel:8889872927">(888) 987-2927</a>
      </div>
    </div>
  )
}

function AlreadySubmittedState({ dealId }: { dealId: string }) {
  return (
    <div className="state-screen">
      <div className="wordmark">THE STUFF BUYERS</div>
      <div className="state-icon">✓</div>
      <div className="state-heading">Quote Already Submitted</div>
      <div className="state-text">
        A quote has already been submitted for deal {dealId}. If you need to update your response, please contact us directly.
      </div>
      <div className="state-contact">
        <a href="mailto:quotes@thestuffbuyers.com">quotes@thestuffbuyers.com</a> · <a href="tel:8889872927">(888) 987-2927</a>
      </div>
    </div>
  )
}

function ConfirmationState({ dealId }: { dealId: string }) {
  return (
    <div className="state-screen">
      <div className="wordmark">THE STUFF BUYERS</div>
      <div className="state-icon confirm">◆</div>
      <div className="state-heading">Quote Received</div>
      <div className="state-text">
        Your quote for <strong>{dealId}</strong> has been submitted successfully.
        The Stuff Buyers team will review and be in touch.
      </div>
      <div className="state-contact">
        Questions? <a href="mailto:quotes@thestuffbuyers.com">quotes@thestuffbuyers.com</a> · <a href="tel:8889872927">(888) 987-2927</a>
      </div>
    </div>
  )
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const STYLES = `
  *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }

  body {
    background: #0F0F0F;
    font-family: 'Barlow Condensed', sans-serif;
    color: #e8e8e8;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    min-height: 100vh;
  }

  .page-wrapper {
    min-height: 100vh;
    display: flex;
    justify-content: center;
    padding: 24px 16px;
  }

  /* ── Form Container ──────────────────────────── */

  .form-container {
    width: 100%;
    max-width: 680px;
    background: #1a1a1a;
    border: 1px solid #333;
  }

  /* ── Header ──────────────────────────────────── */

  .form-header {
    background: #111;
    border-bottom: 3px solid #C9A84C;
    padding: 32px 40px 24px;
  }
  .header-row {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    gap: 16px;
    flex-wrap: wrap;
  }
  .wordmark {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 800;
    font-size: 28px;
    letter-spacing: 0.04em;
    color: #C9A84C;
    text-transform: uppercase;
    line-height: 1;
  }
  .tagline {
    font-family: 'Space Mono', monospace;
    font-size: 9px;
    color: #888;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    margin-top: 4px;
  }
  .deal-badge { text-align: right; }
  .deal-id-display {
    font-family: 'Space Mono', monospace;
    font-size: 11px;
    color: #C9A84C;
    letter-spacing: 0.08em;
  }
  .deal-date {
    font-family: 'Space Mono', monospace;
    font-size: 9px;
    color: #666;
    margin-top: 3px;
  }

  /* ── Banner ──────────────────────────────────── */

  .banner {
    background: #C9A84C;
    padding: 10px 40px;
    font-weight: 700;
    font-size: 11px;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: #111;
  }

  /* ── Sections ────────────────────────────────── */

  .section {
    padding: 32px 40px;
    border-bottom: 1px solid #2a2a2a;
  }
  .section-label {
    font-family: 'Space Mono', monospace;
    font-size: 9px;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: #C9A84C;
    margin-bottom: 16px;
  }

  /* ── Item Card ───────────────────────────────── */

  .item-card {
    background: #111;
    border: 1px solid #2e2e2e;
    border-left: 3px solid #C9A84C;
    padding: 20px 24px;
  }
  .item-name {
    font-size: 18px;
    font-weight: 700;
    color: #C9A84C;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    margin-bottom: 16px;
  }
  .item-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px 24px;
  }
  .grid-cell {}
  .field-key {
    font-family: 'Space Mono', monospace;
    font-size: 8px;
    color: #666;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    display: block;
    margin-bottom: 2px;
  }
  .field-val {
    font-size: 14px;
    font-weight: 600;
    color: #e8e8e8;
    letter-spacing: 0.02em;
    display: block;
  }
  .field-val.highlight { color: #C9A84C; font-size: 16px; }
  .field-val.desc {
    font-weight: 300;
    color: #aaa;
    font-size: 13px;
    line-height: 1.5;
    margin-top: 4px;
  }
  .description-block {
    margin-top: 16px;
    padding-top: 12px;
    border-top: 1px solid #2a2a2a;
  }

  /* ── Deadline Bar ────────────────────────────── */

  .deadline-bar {
    background: #0f0f0f;
    border-top: 1px solid #C9A84C;
    border-bottom: 1px solid #2a2a2a;
    padding: 12px 40px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
  }
  .dl-label {
    font-family: 'Space Mono', monospace;
    font-size: 8px;
    color: #888;
    letter-spacing: 0.2em;
    text-transform: uppercase;
  }
  .dl-value {
    font-size: 16px;
    font-weight: 700;
    color: #C9A84C;
    letter-spacing: 0.08em;
  }

  /* ── Form Controls ───────────────────────────── */

  .form-row { margin-bottom: 16px; }
  .form-row-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0 16px;
  }
  .form-label {
    font-family: 'Space Mono', monospace;
    font-size: 8px;
    color: #888;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    display: block;
    margin-bottom: 6px;
  }
  .form-control {
    width: 100%;
    background: #1e1e1e;
    border: 1px solid #333;
    border-bottom: 2px solid #C9A84C;
    color: #e8e8e8;
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 15px;
    font-weight: 400;
    padding: 10px 14px;
    outline: none;
    appearance: none;
    -webkit-appearance: none;
    letter-spacing: 0.02em;
    border-radius: 0;
    transition: border-color 0.15s ease;
  }
  .form-control:focus {
    border-color: #C9A84C;
    border-bottom-color: #C9A84C;
    box-shadow: 0 1px 0 0 #C9A84C;
  }
  .form-control.readonly {
    opacity: 0.5;
    cursor: not-allowed;
    background: #161616;
  }
  select.form-control { cursor: pointer; }
  textarea.form-control {
    resize: vertical;
    min-height: 80px;
    font-size: 14px;
    line-height: 1.5;
  }

  /* ── Quote Expiry ────────────────────────────── */

  .quote-expiry {
    background: #0f0f0f;
    border: 1px solid #333;
    border-left: 3px solid #C9A84C;
    padding: 12px 16px;
    font-family: 'Space Mono', monospace;
    font-size: 12px;
    color: #C9A84C;
    letter-spacing: 0.06em;
  }

  /* ── Error Banner ────────────────────────────── */

  .error-banner {
    background: #2a1515;
    border: 1px solid #662222;
    border-left: 3px solid #cc4444;
    color: #ff8888;
    font-size: 14px;
    font-weight: 400;
    padding: 12px 16px;
    margin-bottom: 20px;
    letter-spacing: 0.02em;
  }

  /* ── Submit ──────────────────────────────────── */

  .submit-section { text-align: center; }
  .submit-btn {
    display: block;
    width: 100%;
    padding: 16px 24px;
    background: #C9A84C;
    border: none;
    border-bottom: 3px solid #a08530;
    color: #111;
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 800;
    font-size: 16px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    cursor: pointer;
    transition: background 0.15s ease, transform 0.1s ease;
  }
  .submit-btn:hover:not(:disabled) {
    background: #d4b358;
  }
  .submit-btn:active:not(:disabled) {
    transform: translateY(1px);
    border-bottom-width: 2px;
  }
  .submit-btn:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }
  .submit-hint {
    font-family: 'Space Mono', monospace;
    font-size: 8px;
    color: #666;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    margin-top: 8px;
  }

  /* ── Footer ──────────────────────────────────── */

  .footer {
    background: #0d0d0d;
    border-top: 1px solid #222;
    padding: 14px 40px;
    font-family: 'Space Mono', monospace;
    font-size: 8px;
    color: #444;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    text-align: center;
  }

  /* ── State Screens ───────────────────────────── */

  .state-screen {
    max-width: 480px;
    text-align: center;
    padding: 80px 32px;
  }
  .state-screen .wordmark {
    margin-bottom: 40px;
  }
  .state-icon {
    font-size: 48px;
    color: #C9A84C;
    margin-bottom: 16px;
    font-weight: 800;
  }
  .state-icon.confirm { font-size: 56px; }
  .state-heading {
    font-size: 24px;
    font-weight: 700;
    color: #e8e8e8;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    margin-bottom: 12px;
  }
  .state-text {
    font-size: 15px;
    font-weight: 300;
    color: #aaa;
    line-height: 1.6;
    margin-bottom: 24px;
  }
  .state-text strong { color: #C9A84C; font-weight: 600; }
  .state-contact {
    font-family: 'Space Mono', monospace;
    font-size: 10px;
    color: #666;
    letter-spacing: 0.08em;
  }
  .state-contact a {
    color: #C9A84C;
    text-decoration: none;
  }
  .state-contact a:hover { text-decoration: underline; }

  /* ── Decline Toggle ─────────────────────────── */

  .decline-toggle {
    display: flex;
    margin-bottom: 20px;
    border: 1px solid #333;
  }
  .toggle-opt {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 16px;
    font-size: 13px;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    cursor: pointer;
    color: #666;
    background: #111;
    transition: all 0.15s;
    user-select: none;
  }
  .toggle-opt + .toggle-opt { border-left: 1px solid #333; }
  .toggle-opt input[type="radio"] {
    accent-color: #C9A84C;
    width: 14px;
    height: 14px;
    flex-shrink: 0;
  }
  .toggle-opt.active { color: #C9A84C; background: #1a1600; }
  .toggle-opt.decline-active { color: #cc4444; background: #1a0a0a; border-left-color: #662222; }
  .toggle-opt.decline-active input[type="radio"] { accent-color: #cc4444; }

  .decline-notice {
    background: #1a0a0a;
    border: 1px solid #662222;
    border-left: 3px solid #cc4444;
    color: #cc4444;
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.04em;
    padding: 10px 14px;
    margin-bottom: 20px;
    text-transform: uppercase;
  }

  .field-disabled {
    opacity: 0.35;
    pointer-events: none;
  }

  .submit-btn.decline-btn {
    background: #662222;
    border-bottom-color: #441111;
    color: #ffaaaa;
  }
  .submit-btn.decline-btn:hover:not(:disabled) { background: #7a2828; }

  /* ── Mobile ──────────────────────────────────── */

  @media (max-width: 520px) {
    .form-header, .section { padding: 24px 20px; }
    .banner, .footer, .deadline-bar { padding-left: 20px; padding-right: 20px; }
    .form-row-grid { grid-template-columns: 1fr; }
    .item-grid { grid-template-columns: 1fr; }
    .header-row { flex-direction: column; align-items: flex-start; }
    .deal-badge { text-align: left; }
  }
`
