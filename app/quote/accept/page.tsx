'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'

// ── Types ─────────────────────────────────────────────────────────────────────

type PageState = 'loading' | 'success' | 'already_accepted' | 'expired' | 'invalid'

// ── Component ─────────────────────────────────────────────────────────────────

export default function QuoteAcceptPageWrapper() {
  return (
    <Suspense fallback={<div style={{ background: '#0a0a0a', minHeight: '100vh' }} />}>
      <QuoteAcceptPage />
    </Suspense>
  )
}

function QuoteAcceptPage() {
  const searchParams = useSearchParams()
  const dealParam = searchParams.get('deal') || ''
  const tokenParam = searchParams.get('token') || ''

  const [pageState, setPageState] = useState<PageState>('loading')
  const [dealId, setDealId] = useState('')

  useEffect(() => {
    if (!dealParam || !tokenParam) {
      setPageState('invalid')
      return
    }

    // Page loads → client-side POST fires the actual acceptance write.
    // This guards against email prefetch bots (Outlook SafeLinks, Google) auto-triggering GET.
    fetch('/api/quote/accept', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deal: dealParam, token: tokenParam }),
    })
      .then(async (res) => {
        const data = await res.json()
        if (res.ok) {
          setDealId(data.deal_id || dealParam)
          setPageState('success')
        } else {
          if (data.error === 'already_accepted') setPageState('already_accepted')
          else if (data.error === 'expired') setPageState('expired')
          else setPageState('invalid')
        }
      })
      .catch(() => setPageState('invalid'))
  }, [dealParam, tokenParam])

  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="referrer" content="no-referrer" />
        <title>Quote Acceptance — The Stuff Buyers</title>
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
          {pageState === 'success' && <SuccessState dealId={dealId || dealParam} />}
          {pageState === 'already_accepted' && <AlreadyAcceptedState />}
          {pageState === 'expired' && <ExpiredState />}
          {pageState === 'invalid' && <InvalidState />}
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
      <div className="spinner" />
      <div className="state-text">Confirming your acceptance…</div>
    </div>
  )
}

function SuccessState({ dealId }: { dealId: string }) {
  return (
    <div className="state-screen">
      <div className="wordmark">THE STUFF BUYERS</div>
      <div className="state-icon confirm">◆</div>
      <div className="state-heading">You&apos;re All Set</div>
      <div className="state-text">
        Our team will be in touch within 1 business day to coordinate next steps.
        <br /><br />
        <span className="ref-block">
          <span className="ref-label">Reference</span>
          <strong className="ref-id">{dealId}</strong>
        </span>
      </div>
      <div className="state-contact">
        Questions? <a href="mailto:quotes@thestuffbuyers.com">quotes@thestuffbuyers.com</a>
        &nbsp;&middot;&nbsp;
        <a href="tel:8889872927">888-987-2927</a>
      </div>
    </div>
  )
}

function AlreadyAcceptedState() {
  return (
    <div className="state-screen">
      <div className="wordmark">THE STUFF BUYERS</div>
      <div className="state-icon">◆</div>
      <div className="state-heading">Already Accepted</div>
      <div className="state-text">
        This offer has already been accepted. Our team will be reaching out shortly.
      </div>
      <div className="state-contact">
        Questions? <a href="mailto:quotes@thestuffbuyers.com">quotes@thestuffbuyers.com</a>
        &nbsp;&middot;&nbsp;
        <a href="tel:8889872927">888-987-2927</a>
      </div>
    </div>
  )
}

function ExpiredState() {
  return (
    <div className="state-screen">
      <div className="wordmark">THE STUFF BUYERS</div>
      <div className="state-icon muted">!</div>
      <div className="state-heading">Link Expired</div>
      <div className="state-text">
        This link has expired. Please contact us to reconnect.
      </div>
      <div className="state-contact">
        <a href="mailto:quotes@thestuffbuyers.com">quotes@thestuffbuyers.com</a>
        &nbsp;&middot;&nbsp;
        <a href="tel:8889872927">888-987-2927</a>
      </div>
    </div>
  )
}

function InvalidState() {
  return (
    <div className="state-screen">
      <div className="wordmark">THE STUFF BUYERS</div>
      <div className="state-icon muted">✕</div>
      <div className="state-heading">Link Not Valid</div>
      <div className="state-text">
        This link is not valid. Please contact us for assistance.
      </div>
      <div className="state-contact">
        <a href="mailto:quotes@thestuffbuyers.com">quotes@thestuffbuyers.com</a>
        &nbsp;&middot;&nbsp;
        <a href="tel:8889872927">888-987-2927</a>
      </div>
    </div>
  )
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const STYLES = `
  *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }

  body {
    background: #0a0a0a;
    font-family: 'Barlow Condensed', sans-serif;
    color: #e8e8e8;
    -webkit-font-smoothing: antialiased;
    min-height: 100vh;
  }

  .page-wrapper {
    min-height: 100vh;
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 40px 24px;
  }

  .state-screen {
    max-width: 520px;
    width: 100%;
    text-align: center;
    padding: 64px 48px;
    background: #111;
    border: 1px solid #222;
    border-top: 4px solid #f0c040;
  }

  .wordmark {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 800;
    font-size: 24px;
    letter-spacing: 0.06em;
    color: #f0c040;
    text-transform: uppercase;
    margin-bottom: 44px;
  }

  .state-icon {
    font-size: 44px;
    color: #f0c040;
    margin-bottom: 16px;
    font-weight: 800;
    line-height: 1;
  }
  .state-icon.confirm { font-size: 56px; }
  .state-icon.muted { color: #555; }

  .state-heading {
    font-size: 28px;
    font-weight: 800;
    color: #f0ede6;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    margin-bottom: 16px;
  }

  .state-text {
    font-size: 17px;
    font-weight: 300;
    color: #9a9590;
    line-height: 1.7;
    margin-bottom: 28px;
  }

  .ref-block {
    display: inline-block;
    margin-top: 8px;
    background: #0f0f0f;
    border: 1px solid #2a2a2a;
    border-left: 3px solid #f0c040;
    padding: 10px 20px;
  }
  .ref-label {
    font-family: 'Space Mono', monospace;
    font-size: 8px;
    color: #555;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    display: block;
    margin-bottom: 4px;
  }
  .ref-id {
    font-family: 'Space Mono', monospace;
    font-size: 13px;
    color: #f0c040;
    font-weight: 700;
    letter-spacing: 0.08em;
  }

  .state-contact {
    font-family: 'Space Mono', monospace;
    font-size: 10px;
    color: #555;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    line-height: 1.8;
  }
  .state-contact a {
    color: #f0c040;
    text-decoration: none;
  }
  .state-contact a:hover { text-decoration: underline; }

  .spinner {
    width: 36px;
    height: 36px;
    border: 3px solid #222;
    border-top-color: #f0c040;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
    margin: 0 auto 24px;
  }
  @keyframes spin { to { transform: rotate(360deg); } }

  @media (max-width: 480px) {
    .state-screen { padding: 48px 28px; }
    .state-heading { font-size: 22px; }
  }
`
