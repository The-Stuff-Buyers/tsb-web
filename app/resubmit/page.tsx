'use client'

import { Suspense, useEffect, useState, useRef, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'

// ── Types ─────────────────────────────────────────────────────────────────────

interface DealFile {
  id: string
  file_name: string
  file_type: string
  file_size: number
  url: string
  is_image: boolean
}

interface ResubmitDealData {
  deal_id: string
  item_name: string
  condition: string
  quantity: number
  location: string
  bidfta_notes: string
  existing_files: DealFile[]
}

interface UploadedFile {
  file_id: string
  file_name: string
  file_type: string
  file_size: number
  preview_url?: string
  progress: number | 'done' | 'error'
  error?: string
}

type PageState = 'loading' | 'form' | 'submitted' | 'expired' | 'used' | 'error'

const IMAGE_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// ── Wrapper ───────────────────────────────────────────────────────────────────

export default function ResubmitPageWrapper() {
  return (
    <Suspense fallback={<div style={{ background: '#0F0F0F', minHeight: '100vh' }} />}>
      <ResubmitPage />
    </Suspense>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

function ResubmitPage() {
  const searchParams = useSearchParams()
  const dealParam = searchParams.get('deal') || ''
  const tokenParam = searchParams.get('token') || ''

  const [pageState, setPageState] = useState<PageState>('loading')
  const [errorMsg, setErrorMsg] = useState('')
  const [deal, setDeal] = useState<ResubmitDealData | null>(null)
  const [additionalInfo, setAdditionalInfo] = useState('')
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [isDragOver, setIsDragOver] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  const fileInputRef = useRef<HTMLInputElement>(null)

  // Load deal data on mount
  useEffect(() => {
    if (!dealParam || !tokenParam) {
      setErrorMsg('This link is invalid or has expired.')
      setPageState('error')
      return
    }

    fetch(`/api/resubmit/deal?deal=${encodeURIComponent(dealParam)}&token=${encodeURIComponent(tokenParam)}`)
      .then(async (res) => {
        const data = await res.json()
        if (!res.ok) {
          if (data.error === 'token_used') {
            setPageState('used')
          } else if (data.error === 'token_expired') {
            setPageState('expired')
          } else {
            setErrorMsg(data.error || 'This link is invalid or has expired.')
            setPageState('error')
          }
          return
        }
        setDeal(data)
        setPageState('form')
      })
      .catch(() => {
        setErrorMsg('Unable to load. Please try again.')
        setPageState('error')
      })
  }, [dealParam, tokenParam])

  // ── File upload ──────────────────────────────────────────────────

  const uploadFile = useCallback(async (file: File) => {
    const tempId = crypto.randomUUID()
    const previewUrl = IMAGE_MIME_TYPES.has(file.type) ? URL.createObjectURL(file) : undefined

    setUploadedFiles((prev) => [
      ...prev,
      { file_id: tempId, file_name: file.name, file_type: file.type, file_size: file.size, preview_url: previewUrl, progress: 0 },
    ])

    const formData = new FormData()
    formData.append('file', file)

    try {
      const result = await new Promise<{ file_id: string; file_name: string; storage_path: string; file_size: number; file_type: string }>((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.open('POST', '/api/submit/upload')

        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const pct = Math.round((e.loaded / e.total) * 100)
            setUploadedFiles((prev) => prev.map((f) => (f.file_id === tempId ? { ...f, progress: pct } : f)))
          }
        })

        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try { resolve(JSON.parse(xhr.responseText)) }
            catch { reject(new Error('Invalid response')) }
          } else {
            try {
              const e = JSON.parse(xhr.responseText)
              reject(new Error(e.error || 'Upload failed'))
            } catch { reject(new Error('Upload failed')) }
          }
        })

        xhr.addEventListener('error', () => reject(new Error('Network error')))
        xhr.send(formData)
      })

      setUploadedFiles((prev) =>
        prev.map((f) => f.file_id === tempId ? { ...f, file_id: result.file_id, progress: 'done' } : f)
      )
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Upload failed'
      setUploadedFiles((prev) => prev.map((f) => f.file_id === tempId ? { ...f, progress: 'error', error: msg } : f))
    }
  }, [])

  function handleFilesSelected(files: FileList | File[]) {
    Array.from(files).forEach(uploadFile)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragOver(false)
    if (e.dataTransfer.files) handleFilesSelected(e.dataTransfer.files)
  }

  function removeFile(fileId: string) {
    setUploadedFiles((prev) => {
      const f = prev.find((x) => x.file_id === fileId)
      if (f?.preview_url) URL.revokeObjectURL(f.preview_url)
      return prev.filter((x) => x.file_id !== fileId)
    })
  }

  const doneFileIds = uploadedFiles.filter((f) => f.progress === 'done').map((f) => f.file_id)

  // ── Submit ───────────────────────────────────────────────────────

  async function handleSubmit() {
    if (!deal) return
    setSubmitError('')

    if (!additionalInfo.trim() && doneFileIds.length === 0) {
      setSubmitError('Please provide additional information or upload at least one file.')
      return
    }

    setSubmitting(true)

    try {
      const res = await fetch('/api/resubmit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deal_id: dealParam,
          token: tokenParam,
          additional_info: additionalInfo.trim(),
          file_ids: doneFileIds,
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
  }

  // ── Render ───────────────────────────────────────────────────────

  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>TSB — Resubmit Your Item</title>
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
          {pageState === 'error' && <MessageState icon="✕" heading="Link Invalid" text={errorMsg} />}
          {pageState === 'expired' && (
            <MessageState
              icon="⏱"
              heading="Link Expired"
              text="This resubmission link has expired. Please contact us for assistance."
            />
          )}
          {pageState === 'used' && (
            <MessageState
              icon="✓"
              heading="Already Submitted"
              text="This resubmission has already been received. We'll be in touch shortly."
            />
          )}
          {pageState === 'submitted' && (
            <MessageState
              icon="◆"
              heading="Resubmission Received"
              text={`Your updated information for ${deal?.deal_id || dealParam} has been submitted. The Stuff Buyers team will review and be in touch.`}
              confirm
            />
          )}
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
                    <div className="deal-date">ITEM RESUBMISSION</div>
                  </div>
                </div>
              </div>

              {/* Banner */}
              <div className="banner">
                <span>◆ UPDATED INFORMATION REQUEST — PLEASE REVIEW &amp; RESUBMIT</span>
              </div>

              {/* Item Summary Card (read-only) */}
              <div className="section">
                <div className="section-label">YOUR ITEM</div>
                <div className="item-card">
                  <div className="item-name">{deal.item_name}</div>
                  <div className="item-grid">
                    <div className="grid-cell">
                      <span className="field-key">Condition</span>
                      <span className="field-val">{deal.condition}</span>
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
                </div>
              </div>

              {/* What Was Requested */}
              <div className="section">
                <div className="section-label">WHAT WAS REQUESTED</div>
                <div className="notes-block">
                  {deal.bidfta_notes || 'Additional information or photos were requested.'}
                </div>
              </div>

              {/* Previously Uploaded Files */}
              {deal.existing_files && deal.existing_files.length > 0 && (
                <div className="section">
                  <div className="section-label">PREVIOUSLY UPLOADED ({deal.existing_files.length})</div>
                  <div className="file-gallery">
                    {deal.existing_files.map((f) =>
                      f.is_image ? (
                        <a key={f.id} href={f.url} target="_blank" rel="noopener noreferrer" className="file-card" title={f.file_name}>
                          <div className="file-preview-img-wrap">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={f.url} alt={f.file_name} className="file-preview-img" />
                          </div>
                          <div className="file-card-name">{f.file_name}</div>
                          <div className="file-card-size">{formatBytes(f.file_size)}</div>
                        </a>
                      ) : (
                        <a key={f.id} href={f.url} download={f.file_name} className="file-card file-card-doc" title={f.file_name}>
                          <div className="file-doc-icon">
                            {f.file_type.includes('pdf') ? '📄' : f.file_type.includes('csv') ? '📊' : '📋'}
                          </div>
                          <div className="file-card-name">{f.file_name}</div>
                          <div className="file-card-size">{formatBytes(f.file_size)}</div>
                        </a>
                      )
                    )}
                  </div>
                  <div className="readonly-note">These files are already on file and will be included automatically.</div>
                </div>
              )}

              {/* Additional Information */}
              <div className="section">
                <div className="section-label">ADDITIONAL INFORMATION</div>

                {submitError && <div className="error-banner">{submitError}</div>}

                <div className="form-row">
                  <label className="form-label">Provide the requested details below</label>
                  <textarea
                    className="form-control"
                    value={additionalInfo}
                    onChange={(e) => setAdditionalInfo(e.target.value)}
                    placeholder="Enter the information requested above. Be as specific as possible."
                    rows={5}
                  />
                </div>

                {/* New File Upload Zone */}
                <div className="form-row">
                  <label className="form-label">Upload Additional Photos or Documents (Optional)</label>
                  <div
                    onDrop={handleDrop}
                    onDragOver={(e) => { e.preventDefault(); setIsDragOver(true) }}
                    onDragLeave={() => setIsDragOver(false)}
                    onClick={() => fileInputRef.current?.click()}
                    className={`upload-zone${isDragOver ? ' upload-zone-active' : ''}`}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept="image/jpeg,image/png,image/webp,image/heic,application/pdf,.xlsx,.xls,text/csv"
                      onChange={(e) => { if (e.target.files) { handleFilesSelected(e.target.files); e.target.value = '' } }}
                      style={{ display: 'none' }}
                    />
                    <div className="upload-zone-text">
                      <span className="upload-zone-cta">Click to browse</span> or drag &amp; drop
                    </div>
                    <div className="upload-zone-hint">JPEG, PNG, HEIC, PDF, Excel, CSV · Max 25 MB</div>
                  </div>

                  {/* Uploaded files list */}
                  {uploadedFiles.length > 0 && (
                    <div className="upload-list">
                      {uploadedFiles.map((f) => (
                        <div key={f.file_id} className="upload-row">
                          {f.preview_url ? (
                            <img src={f.preview_url} alt={f.file_name} className="upload-thumb" />
                          ) : (
                            <div className="upload-icon">
                              {f.file_type.includes('pdf') ? 'PDF' : f.file_type.includes('csv') ? 'CSV' : 'DOC'}
                            </div>
                          )}
                          <div className="upload-info">
                            <div className="upload-name">{f.file_name}</div>
                            <div className="upload-size">{formatBytes(f.file_size)}</div>
                          </div>
                          <div className="upload-status">
                            {f.progress === 'done' && <span className="upload-done">✓</span>}
                            {f.progress === 'error' && <span className="upload-error" title={f.error}>✕</span>}
                            {typeof f.progress === 'number' && (
                              <div className="upload-progress-bar">
                                <div className="upload-progress-fill" style={{ width: `${f.progress}%` }} />
                              </div>
                            )}
                            <button
                              type="button"
                              onClick={() => removeFile(f.file_id)}
                              className="upload-remove"
                            >✕</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Submit */}
              <div className="section submit-section">
                <button
                  className="submit-btn"
                  onClick={handleSubmit}
                  disabled={submitting}
                >
                  {submitting ? '◆  SUBMITTING…' : '◆  SUBMIT UPDATED INFORMATION →'}
                </button>
                <p className="submit-hint">
                  Your response will be reviewed by The Stuff Buyers team before being forwarded.
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

// ── State Screens ─────────────────────────────────────────────────────────────

function LoadingState() {
  return (
    <div className="state-screen">
      <div className="wordmark">THE STUFF BUYERS</div>
      <div className="state-text">Loading…</div>
    </div>
  )
}

function MessageState({ icon, heading, text, confirm = false }: { icon: string; heading: string; text: string; confirm?: boolean }) {
  return (
    <div className="state-screen">
      <div className="wordmark">THE STUFF BUYERS</div>
      <div className={`state-icon${confirm ? ' confirm' : ''}`}>{icon}</div>
      <div className="state-heading">{heading}</div>
      <div className="state-text">{text}</div>
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

  .form-container {
    width: 100%;
    max-width: 680px;
    background: #1a1a1a;
    border: 1px solid #333;
  }

  /* ── Header ────────────────────────────────── */
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

  /* ── Banner ────────────────────────────────── */
  .banner {
    background: #C9A84C;
    padding: 10px 40px;
    font-weight: 700;
    font-size: 11px;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: #111;
  }

  /* ── Sections ──────────────────────────────── */
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

  /* ── Item Card ─────────────────────────────── */
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
    grid-template-columns: 1fr 1fr 1fr;
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
  .field-val.highlight { color: #C9A84C; }

  /* ── Notes Block ───────────────────────────── */
  .notes-block {
    background: #111;
    border: 1px solid #2e2e2e;
    border-left: 3px solid #555;
    padding: 16px 20px;
    font-size: 14px;
    font-weight: 300;
    color: #ccc;
    line-height: 1.6;
    white-space: pre-wrap;
  }

  /* ── File Gallery ──────────────────────────── */
  .file-gallery {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
    gap: 10px;
    margin-bottom: 12px;
  }
  .file-card {
    display: flex;
    flex-direction: column;
    background: #111;
    border: 1px solid #2e2e2e;
    text-decoration: none;
    color: #e8e8e8;
    overflow: hidden;
    transition: border-color 0.15s;
  }
  .file-card:hover { border-color: #C9A84C; }
  .file-preview-img-wrap {
    width: 100%;
    aspect-ratio: 1;
    overflow: hidden;
    background: #0d0d0d;
  }
  .file-preview-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
  .file-card-doc {
    padding: 12px;
    align-items: center;
    text-align: center;
  }
  .file-doc-icon { font-size: 24px; margin-bottom: 6px; }
  .file-card-name {
    font-size: 10px;
    font-weight: 600;
    color: #e8e8e8;
    padding: 4px 6px 0;
    word-break: break-all;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .file-card-doc .file-card-name { padding: 0; white-space: normal; overflow: visible; text-overflow: unset; }
  .file-card-size {
    font-family: 'Space Mono', monospace;
    font-size: 8px;
    color: #666;
    padding: 2px 6px 6px;
    text-transform: uppercase;
  }
  .readonly-note {
    font-family: 'Space Mono', monospace;
    font-size: 9px;
    color: #555;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    margin-top: 8px;
  }

  /* ── Form Controls ─────────────────────────── */
  .form-row { margin-bottom: 16px; }
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
    box-shadow: 0 1px 0 0 #C9A84C;
  }
  textarea.form-control {
    resize: vertical;
    min-height: 100px;
    font-size: 14px;
    line-height: 1.5;
  }

  /* ── Upload Zone ───────────────────────────── */
  .upload-zone {
    border: 2px dashed #333;
    padding: 24px;
    text-align: center;
    cursor: pointer;
    transition: border-color 0.15s, background 0.15s;
    background: #161616;
  }
  .upload-zone:hover { border-color: #555; }
  .upload-zone-active { border-color: #C9A84C; background: #1a1600; }
  .upload-zone-text { font-size: 14px; color: #888; }
  .upload-zone-cta { color: #C9A84C; font-weight: 700; }
  .upload-zone-hint {
    font-family: 'Space Mono', monospace;
    font-size: 8px;
    color: #444;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    margin-top: 6px;
  }
  .upload-list { margin-top: 12px; display: flex; flex-direction: column; gap: 8px; }
  .upload-row {
    display: flex;
    align-items: center;
    gap: 10px;
    background: #161616;
    border: 1px solid #2a2a2a;
    padding: 8px 12px;
  }
  .upload-thumb { width: 36px; height: 36px; object-fit: cover; flex-shrink: 0; }
  .upload-icon {
    width: 36px;
    height: 36px;
    flex-shrink: 0;
    background: #222;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: 'Space Mono', monospace;
    font-size: 8px;
    font-weight: 700;
    color: #666;
    letter-spacing: 0.08em;
  }
  .upload-info { flex: 1; min-width: 0; }
  .upload-name { font-size: 13px; font-weight: 600; color: #e8e8e8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .upload-size { font-family: 'Space Mono', monospace; font-size: 8px; color: #666; text-transform: uppercase; margin-top: 2px; }
  .upload-status { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
  .upload-done { color: #4ade80; font-size: 14px; }
  .upload-error { color: #cc4444; font-size: 12px; cursor: help; }
  .upload-progress-bar {
    width: 56px;
    height: 3px;
    background: #222;
    border-radius: 2px;
    overflow: hidden;
  }
  .upload-progress-fill {
    height: 100%;
    background: #C9A84C;
    transition: width 0.2s;
  }
  .upload-remove {
    background: none;
    border: none;
    color: #555;
    cursor: pointer;
    font-size: 12px;
    padding: 2px 4px;
    transition: color 0.15s;
  }
  .upload-remove:hover { color: #cc4444; }

  /* ── Error Banner ──────────────────────────── */
  .error-banner {
    background: #2a1515;
    border: 1px solid #662222;
    border-left: 3px solid #cc4444;
    color: #ff8888;
    font-size: 14px;
    padding: 12px 16px;
    margin-bottom: 20px;
  }

  /* ── Submit ────────────────────────────────── */
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
    transition: background 0.15s ease;
  }
  .submit-btn:hover:not(:disabled) { background: #d4b358; }
  .submit-btn:disabled { opacity: 0.7; cursor: not-allowed; }
  .submit-hint {
    font-family: 'Space Mono', monospace;
    font-size: 8px;
    color: #666;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    margin-top: 8px;
  }

  /* ── Footer ────────────────────────────────── */
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

  /* ── State Screens ─────────────────────────── */
  .state-screen {
    max-width: 480px;
    text-align: center;
    padding: 80px 32px;
  }
  .state-screen .wordmark { margin-bottom: 40px; }
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
  .state-contact {
    font-family: 'Space Mono', monospace;
    font-size: 10px;
    color: #666;
    letter-spacing: 0.08em;
  }
  .state-contact a { color: #C9A84C; text-decoration: none; }
  .state-contact a:hover { text-decoration: underline; }

  /* ── Mobile ────────────────────────────────── */
  @media (max-width: 520px) {
    .form-header, .section { padding: 24px 20px; }
    .banner, .footer { padding-left: 20px; padding-right: 20px; }
    .item-grid { grid-template-columns: 1fr 1fr; }
    .header-row { flex-direction: column; align-items: flex-start; }
    .deal-badge { text-align: left; }
  }
`
