'use client'

import { useState } from 'react'

export default function OpsLoginPage() {
  const [password, setPassword] = useState('')
  const [state, setState] = useState<'idle' | 'loading' | 'error'>('idle')
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!password) { setError('Password required.'); return }
    setState('loading')
    setError('')
    try {
      const res = await fetch('/api/ops/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Invalid password.'); setState('error'); return }
      window.location.href = '/ops/dashboard'
    } catch {
      setError('Network error. Please try again.')
      setState('error')
    }
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />
      <div className="page">
        <div className="card">
          <div className="card-header">
            <div className="wordmark">THE STUFF BUYERS</div>
            <div className="tagline">Operations Dashboard</div>
          </div>
          <form onSubmit={handleSubmit} className="login-form">
            <label className="form-label" htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              className="form-input"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              autoFocus
              disabled={state === 'loading'}
            />
            {error && <div className="error-msg">{error}</div>}
            <button type="submit" className="submit-btn" disabled={state === 'loading'}>
              {state === 'loading' ? '◆  LOGGING IN…' : '◆  ACCESS DASHBOARD'}
            </button>
          </form>
          <div className="card-footer">TSB Operations · Restricted Access</div>
        </div>
      </div>
    </>
  )
}

const STYLES = `
  .page { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 24px 16px; }
  .card { width: 100%; max-width: 400px; background: #1a1a1a; border: 1px solid #333; }
  .card-header { background: #111; border-bottom: 3px solid #C9A84C; padding: 28px 40px 24px; }
  .wordmark { font-family: 'Barlow Condensed', sans-serif; font-weight: 800; font-size: 26px; letter-spacing: 0.04em; color: #C9A84C; text-transform: uppercase; line-height: 1; }
  .tagline { font-family: 'Space Mono', monospace; font-size: 9px; color: #888; letter-spacing: 0.14em; text-transform: uppercase; margin-top: 4px; }
  .login-form { padding: 32px 40px 28px; }
  .form-label { font-family: 'Space Mono', monospace; font-size: 9px; color: #888; letter-spacing: 0.18em; text-transform: uppercase; display: block; margin-bottom: 6px; }
  .form-input { width: 100%; background: #1e1e1e; border: 1px solid #333; border-bottom: 2px solid #C9A84C; color: #e8e8e8; font-family: 'Barlow Condensed', sans-serif; font-size: 18px; padding: 10px 14px; outline: none; border-radius: 0; }
  .form-input:disabled { opacity: 0.5; }
  .error-msg { background: #2a1515; border-left: 3px solid #cc4444; color: #ff8888; font-size: 13px; padding: 10px 14px; margin-top: 12px; }
  .submit-btn { display: block; width: 100%; padding: 14px; background: #C9A84C; border: none; border-bottom: 3px solid #a08530; color: #111; font-family: 'Barlow Condensed', sans-serif; font-weight: 800; font-size: 15px; letter-spacing: 0.14em; text-transform: uppercase; cursor: pointer; margin-top: 16px; transition: background 0.15s; }
  .submit-btn:hover:not(:disabled) { background: #d4b358; }
  .submit-btn:disabled { opacity: 0.7; cursor: not-allowed; }
  .card-footer { background: #111; border-top: 1px solid #222; padding: 10px 40px; font-family: 'Space Mono', monospace; font-size: 8px; color: #444; letter-spacing: 0.1em; text-align: center; text-transform: uppercase; }
`
