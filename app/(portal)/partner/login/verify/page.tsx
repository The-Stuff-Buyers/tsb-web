'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'

function VerifyPageInner() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token') || ''
  const next = searchParams.get('next') || ''

  const [state, setState] = useState<'loading' | 'success' | 'error'>('loading')
  const [error, setError] = useState('')
  const [partnerName, setPartnerName] = useState('')

  useEffect(() => {
    if (!token) { setError('No login token found in URL.'); setState('error'); return }

    fetch('/api/partner/login/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
      .then(async res => {
        const data = await res.json()
        if (!res.ok) { setError(data.error || 'Login failed.'); setState('error'); return }
        setPartnerName(data.partner_name)
        setState('success')
        const destination = next || `/partner/${encodeURIComponent(data.partner_name)}`
        setTimeout(() => { window.location.href = destination }, 800)
      })
      .catch(() => { setError('Network error. Please try again.'); setState('error') })
  }, [token, next])

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />
      <div className="page">
        <div className="card">
          <div className="wordmark">THE STUFF BUYERS</div>
          {state === 'loading' && (
            <>
              <div className="spinner">◆</div>
              <div className="state-text">Verifying your login link…</div>
            </>
          )}
          {state === 'success' && (
            <>
              <div className="success-icon">◆</div>
              <div className="state-heading">Logged In</div>
              <div className="state-text">Redirecting to your dashboard…</div>
              <div className="partner-name">{partnerName}</div>
            </>
          )}
          {state === 'error' && (
            <>
              <div className="error-icon">✕</div>
              <div className="state-heading">Login Failed</div>
              <div className="state-text">{error}</div>
              <a href="/partner/login" className="retry-btn">◆ REQUEST NEW LINK</a>
            </>
          )}
        </div>
      </div>
    </>
  )
}

export default function VerifyPage() {
  return (
    <Suspense fallback={<div style={{ background: '#0F0F0F', minHeight: '100vh' }} />}>
      <VerifyPageInner />
    </Suspense>
  )
}

const STYLES = `
  .page { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 24px; }
  .card { text-align: center; padding: 64px 40px; max-width: 400px; width: 100%; }
  .wordmark { font-family: 'Barlow Condensed', sans-serif; font-weight: 800; font-size: 24px; letter-spacing: 0.04em; color: #C9A84C; text-transform: uppercase; margin-bottom: 32px; }
  @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
  .spinner { font-size: 36px; color: #C9A84C; font-weight: 800; animation: pulse 1.2s ease-in-out infinite; margin-bottom: 16px; }
  .success-icon { font-size: 40px; color: #22c55e; font-weight: 800; margin-bottom: 16px; }
  .error-icon { font-size: 40px; color: #cc4444; margin-bottom: 16px; }
  .state-heading { font-size: 20px; font-weight: 700; color: #e8e8e8; text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 10px; }
  .state-text { font-size: 14px; color: #888; line-height: 1.6; margin-bottom: 16px; }
  .partner-name { font-family: 'Space Mono', monospace; font-size: 11px; color: #C9A84C; letter-spacing: 0.12em; text-transform: uppercase; }
  .retry-btn { display: inline-block; margin-top: 16px; background: #C9A84C; color: #111; font-family: 'Barlow Condensed', sans-serif; font-weight: 800; font-size: 13px; letter-spacing: 0.12em; text-transform: uppercase; padding: 12px 24px; text-decoration: none; border-bottom: 2px solid #a08530; }
`
