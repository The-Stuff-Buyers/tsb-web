import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

let supabaseClient: ReturnType<typeof createClient> | null = null
function getSupabase() {
  if (!supabaseClient) {
    supabaseClient = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
  }
  return supabaseClient
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://thestuffbuyers.com'
const RESEND_API_URL = 'https://api.resend.com/emails'
const FROM = 'The Stuff Buyers <quotes@thestuffbuyers.com>'

export async function POST(req: NextRequest) {
  let body: { email?: string }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid request.' }, { status: 400 }) }

  const email = (body.email || '').trim().toLowerCase()
  if (!email || !email.includes('@')) {
    return NextResponse.json({ error: 'A valid email address is required.' }, { status: 400 })
  }

  const supabase = getSupabase()

  // Look up contact — don't reveal whether email exists (security)
  const { data: contact } = await supabase
    .from('partner_contacts')
    .select('id, contact_name, partner_name, active')
    .eq('email', email)
    .eq('active', true)
    .maybeSingle() as {
      data: { id: string; contact_name: string; partner_name: string; active: boolean } | null
    }

  if (contact) {
    // Create magic link token (15 min expiry)
    const token = crypto.randomUUID() + '-' + Date.now().toString(36)
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString()

    await supabase.from('partner_login_tokens').insert({
      partner_contact_id: contact.id,
      token,
      expires_at: expiresAt,
    } as never)

    const verifyUrl = `${SITE_URL}/partner/login/verify?token=${encodeURIComponent(token)}`
    const firstName = contact.contact_name.trim().split(/\s+/)[0] || 'there'

    // Send email (best-effort)
    const apiKey = process.env.RESEND_API_KEY
    if (apiKey) {
      try {
        await fetch(RESEND_API_URL, {
          method: 'POST',
          headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: FROM,
            to: [email],
            subject: 'Your TSB Partner Portal login link',
            html: `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 20px;">
    <tr><td align="center">
      <table width="100%" style="max-width:480px;background:#111111;border-radius:8px;">
        <tr><td style="padding:28px 40px 24px;border-bottom:2px solid #C9A84C;">
          <p style="margin:0;font-size:12px;color:#C9A84C;letter-spacing:2px;text-transform:uppercase;font-weight:700;">The Stuff Buyers · Partner Portal</p>
        </td></tr>
        <tr><td style="padding:32px 40px 40px;">
          <h1 style="margin:0 0 16px;font-size:20px;color:#ffffff;font-weight:600;">Hi ${firstName},</h1>
          <p style="margin:0 0 24px;font-size:15px;color:#cccccc;line-height:1.65;">Click the button below to log into your partner portal. This link expires in <strong style="color:#ffffff;">15 minutes</strong>.</p>
          <a href="${verifyUrl}" style="display:block;text-align:center;background:#C9A84C;color:#111;font-weight:700;font-size:14px;letter-spacing:0.1em;text-transform:uppercase;padding:14px 24px;text-decoration:none;border-radius:2px;">◆ ACCESS PARTNER PORTAL</a>
          <p style="margin:20px 0 0;font-size:12px;color:#666;line-height:1.6;">If you didn't request this, you can safely ignore this email. The link will expire shortly.</p>
          <hr style="border:none;border-top:1px solid #222;margin:24px 0;">
          <p style="margin:0;font-size:12px;color:#555;">The Stuff Buyers · <a href="mailto:quotes@thestuffbuyers.com" style="color:#C9A84C;text-decoration:none;">quotes@thestuffbuyers.com</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`,
            text: `Hi ${firstName},\n\nClick the link below to log into your TSB Partner Portal (expires in 15 minutes):\n\n${verifyUrl}\n\n— The Stuff Buyers\nquotes@thestuffbuyers.com`,
          }),
        })
      } catch (e) {
        console.error('[partner/login] Email send failed:', e)
      }
    } else {
      console.log('[partner/login] RESEND_API_KEY not set. Magic link:', verifyUrl)
    }
  }

  // Always return success — don't reveal whether email exists
  return NextResponse.json({
    success: true,
    message: 'If that email is registered, you\'ll receive a login link shortly.',
  })
}
