const RESEND_API_URL = 'https://api.resend.com/emails'
const FROM = 'The Stuff Buyers <quotes@thestuffbuyers.com>'

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function getFirstName(contactName: string | null | undefined): string {
  if (!contactName) return 'there'
  return contactName.trim().split(/\s+/)[0]
}

async function sendResendEmail(payload: {
  to: string
  subject: string
  html: string
  text: string
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.error('[email] RESEND_API_KEY not set')
    return
  }
  try {
    const res = await fetch(RESEND_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM,
        to: [payload.to],
        subject: payload.subject,
        html: payload.html,
        text: payload.text,
      }),
    })
    if (!res.ok) {
      const body = await res.text()
      console.error(`[email] Resend API error ${res.status}: ${body}`)
    }
  } catch (err) {
    console.error('[email] fetch error:', err)
  }
}

function emailLayout(bodyContent: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 20px;">
    <tr><td align="center">
      <table width="100%" style="max-width:560px;background:#111111;border-radius:8px;overflow:hidden;">
        <tr><td style="padding:28px 40px 24px;border-bottom:2px solid #C9A84C;">
          <p style="margin:0;font-size:12px;color:#C9A84C;letter-spacing:2px;text-transform:uppercase;font-weight:700;">The Stuff Buyers</p>
        </td></tr>
        <tr><td style="padding:32px 40px 40px;">
          ${bodyContent}
          <hr style="border:none;border-top:1px solid #222222;margin:28px 0 24px;">
          <p style="margin:0;font-size:13px;color:#666666;line-height:1.7;">
            The Stuff Buyers team<br>
            <a href="mailto:quotes@thestuffbuyers.com" style="color:#C9A84C;text-decoration:none;">quotes@thestuffbuyers.com</a>&nbsp;&nbsp;·&nbsp;&nbsp;(314) 358-5293
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

// ── Email 1: Submission Received ──────────────────────────────────────────────

export async function sendSubmissionConfirmation(params: {
  to: string
  contactName?: string | null
  itemCount?: number
}): Promise<void> {
  const firstName = getFirstName(params.contactName)
  const safeFirstName = escapeHtml(firstName)
  const itemCount = params.itemCount ?? 1
  const isMulti = itemCount > 1

  const itemLine = isMulti
    ? `We've received your request covering ${itemCount} items and our team is reviewing everything.`
    : `We've received your quote request and our team is on it.`

  const text = `Hi ${firstName},

${itemLine}

We'll get back to you within 24–48 hours with next steps.

— The Stuff Buyers team
quotes@thestuffbuyers.com | (314) 358-5293`

  const html = emailLayout(`
    <h1 style="margin:0 0 20px;font-size:22px;color:#ffffff;font-weight:600;">Hi ${safeFirstName},</h1>
    <p style="margin:0 0 16px;font-size:16px;color:#cccccc;line-height:1.65;">${itemLine}</p>
    <p style="margin:0;font-size:16px;color:#cccccc;line-height:1.65;">We'll get back to you within <strong style="color:#ffffff;">24–48 hours</strong> with next steps.</p>
  `)

  await sendResendEmail({
    to: params.to,
    subject: 'We received your quote request — The Stuff Buyers',
    html,
    text,
  })
}

// ── Email 2: Quote Forwarded (Gate 1 approved) ────────────────────────────────

export async function sendQuoteForwarded(params: {
  to: string
  contactName?: string | null
}): Promise<void> {
  const firstName = getFirstName(params.contactName)
  const safeFirstName = escapeHtml(firstName)

  const text = `Hi ${firstName},

Good news — we've reviewed your submission and forwarded your items to our evaluation team for pricing.

You can expect to hear back from us within 3–5 business days. We'll reach out directly once we have a quote ready.

No action needed on your end.

— The Stuff Buyers team
quotes@thestuffbuyers.com | (314) 358-5293`

  const html = emailLayout(`
    <h1 style="margin:0 0 20px;font-size:22px;color:#ffffff;font-weight:600;">Hi ${safeFirstName},</h1>
    <p style="margin:0 0 16px;font-size:16px;color:#cccccc;line-height:1.65;">Good news — we've reviewed your submission and forwarded your items to our evaluation team for pricing.</p>
    <p style="margin:0 0 16px;font-size:16px;color:#cccccc;line-height:1.65;">You can expect to hear back from us within <strong style="color:#ffffff;">3–5 business days</strong>. We'll reach out directly once we have a quote ready.</p>
    <p style="margin:0;font-size:16px;color:#cccccc;line-height:1.65;">No action needed on your end.</p>
  `)

  await sendResendEmail({
    to: params.to,
    subject: 'Your quote request is being evaluated — The Stuff Buyers',
    html,
    text,
  })
}

// ── Email 3: Quote Under Review (Gate 2 pending) ──────────────────────────────

export async function sendQuoteUnderReview(params: {
  to: string
  contactName?: string | null
}): Promise<void> {
  const firstName = getFirstName(params.contactName)
  const safeFirstName = escapeHtml(firstName)

  const text = `Hi ${firstName},

A quote has been prepared for your inventory and is currently under review by our team.

You'll hear from us shortly with the details.

— The Stuff Buyers team
quotes@thestuffbuyers.com | (314) 358-5293`

  const html = emailLayout(`
    <h1 style="margin:0 0 20px;font-size:22px;color:#ffffff;font-weight:600;">Hi ${safeFirstName},</h1>
    <p style="margin:0 0 16px;font-size:16px;color:#cccccc;line-height:1.65;">A quote has been prepared for your inventory and is currently under review by our team.</p>
    <p style="margin:0;font-size:16px;color:#cccccc;line-height:1.65;">You'll hear from us shortly with the details.</p>
  `)

  await sendResendEmail({
    to: params.to,
    subject: 'We have a quote ready for your items — The Stuff Buyers',
    html,
    text,
  })
}
