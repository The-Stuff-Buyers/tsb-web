'use client'

import { useState } from 'react'

export default function PartnerLoginPage() {
  const [email, setEmail] = useState('')
  const [state, setState] = useState<'idle' | 'loading' | 'sent' | 'error'>('idle')
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) { setError('Email required.'); return }
    setState('loading')
    setError('')
    try {
      const res = await fetch('/api/partner/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Something went wrong.'); setState('error'); return }
      setState('sent')
    } catch {
      setError('Network error. Please try again.')
      setState('error')
    }
  }

  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Partner Portal Login — The Stuff Buyers</title>
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@300;400;600;700;800&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet" />
        <style dangerouslySetInnerHTML={{ __html: STYLES }} />
      </head>
      <body>
        <div className="page">
          <div className="card">
            <div className="card-header">
              <div className="wordmark">THE STUFF BUYERS</div>
              <div className="tagline">Partner Portal</div>
            </div>

            {state === 'sent' ? (
              <div className="success-state">
                <div className="success-icon">◆</div>
                <div className="success-heading">Check Your Email</div>
                <div className="success-text">
                  If <strong>{email}</strong> is registered, you&apos;ll receive a login link shortly.
                  The link expires in 15 minutes.
                </div>
                <button className="back-btn" onClick={() => { setState('idle'); setEmail('') }}>
                  Try another email
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="login-form">
                <div className="form-label-row">
                  <label className="form-label" htmlFor="email">Email Address</label>
                </div>
                <input
                  id="email"
                  type="email"
                  className="form-input"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="todd.pewitt@bidfta.com"
                  autoComplete="email"
                  autoFocus
                  disabled={state === 'loading'}
                />
                {error && <div className="error-msg">{error}</div>}
                <button type="submit" className="submit-btn" disabled={state === 'loading'}>
                  {state === 'loading' ? '◆  SENDING…' : '◆  SEND LOGIN LINK'}
                </button>
                <p className="hint">We&apos;ll email you a secure login link. No password required.</p>
              </form>
            )}

            <div className="card-footer">
              Questions? <a href="mailto:quotes@thestuffbuyers.com">quotes@thestuffbuyers.com</a>
            </div>
          </div>
        </div>
      </body>
    </html>
  )
}

const STYLES = `
  *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
  body { background: #0F0F0F; font-family: 'Barlow Condensed', sans-serif; color: #e8e8e8; min-height: 100vh; -webkit-font-smoothing: antialiased; }
  .page { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 24px 16px; }
  .card { width: 100%; max-width: 440px; background: #1a1a1a; border: 1px solid #333; }
  .card-header { background: #111; border-bottom: 3px solid #C9A84C; padding: 28px 40px 24px; }
  .wordmark { font-family: 'Barlow Condensed', sans-serif; font-weight: 800; font-size: 26px; letter-spacing: 0.04em; color: #C9A84C; text-transform: uppercase; line-height: 1; }
  .tagline { font-family: 'Space Mono', monospace; font-size: 9px; color: #888; letter-spacing: 0.14em; text-transform: uppercase; margin-top: 4px; }
  .login-form { padding: 32px 40px 28px; }
  .form-label-row { margin-bottom: 6px; }
  .form-label { font-family: 'Space Mono', monospace; font-size: 9px; color: #888; letter-spacing: 0.18em; text-transform: uppercase; }
  .form-input { width: 100%; background: #1e1e1e; border: 1px solid #333; border-bottom: 2px solid #C9A84C; color: #e8e8e8; font-family: 'Barlow Condensed', sans-serif; font-size: 16px; padding: 10px 14px; outline: none; border-radius: 0; transition: border-color 0.15s; letter-spacing: 0.02em; }
  .form-input:focus { border-color: #C9A84C; box-shadow: 0 1px 0 0 #C9A84C; }
  .form-input:disabled { opacity: 0.5; }
  .error-msg { background: #2a1515; border: 1px solid #662222; border-left: 3px solid #cc4444; color: #ff8888; font-size: 13px; padding: 10px 14px; margin-top: 12px; }
  .submit-btn { display: block; width: 100%; padding: 14px 24px; background: #C9A84C; border: none; border-bottom: 3px solid #a08530; color: #111; font-family: 'Barlow Condensed', sans-serif; font-weight: 800; font-size: 15px; letter-spacing: 0.14em; text-transform: uppercase; cursor: pointer; transition: background 0.15s; margin-top: 16px; }
  .submit-btn:hover:not(:disabled) { background: #d4b358; }
  .submit-btn:disabled { opacity: 0.7; cursor: not-allowed; }
  .hint { font-family: 'Space Mono', monospace; font-size: 8px; color: #555; letter-spacing: 0.1em; text-transform: uppercase; margin-top: 10px; text-align: center; }
  .success-state { padding: 40px 40px 32px; text-align: center; }
  .success-icon { font-size: 40px; color: #C9A84C; font-weight: 800; margin-bottom: 16px; }
  .success-heading { font-size: 20px; font-weight: 700; color: #e8e8e8; letter-spacing: 0.04em; text-transform: uppercase; margin-bottom: 12px; }
  .success-text { font-size: 14px; color: #aaa; line-height: 1.6; margin-bottom: 24px; }
  .success-text strong { color: #C9A84C; }
  .back-btn { background: none; border: 1px solid #444; color: #888; font-family: 'Space Mono', monospace; font-size: 9px; letter-spacing: 0.12em; text-transform: uppercase; padding: 8px 16px; cursor: pointer; transition: border-color 0.15s; }
  .back-btn:hover { border-color: #C9A84C; color: #C9A84C; }
  .card-footer { background: #111; border-top: 1px solid #222; padding: 12px 40px; font-family: 'Space Mono', monospace; font-size: 9px; color: #555; letter-spacing: 0.08em; text-align: center; }
  .card-footer a { color: #C9A84C; text-decoration: none; }
`
