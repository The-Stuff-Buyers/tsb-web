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

export async function POST(req: NextRequest) {
  let body: { token?: string }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid request.' }, { status: 400 }) }

  const token = (body.token || '').trim()
  if (!token) return NextResponse.json({ error: 'Token is required.' }, { status: 400 })

  const supabase = getSupabase()
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'

  // Look up token
  const { data: tokenRow } = await supabase
    .from('partner_login_tokens')
    .select('id, partner_contact_id, expires_at, used_at')
    .eq('token', token)
    .maybeSingle() as {
      data: { id: string; partner_contact_id: string; expires_at: string; used_at: string | null } | null
    }

  if (!tokenRow) return NextResponse.json({ error: 'This link is invalid.' }, { status: 400 })
  if (tokenRow.used_at) return NextResponse.json({ error: 'This link has already been used.' }, { status: 410 })
  if (new Date(tokenRow.expires_at) < new Date()) return NextResponse.json({ error: 'This link has expired. Please request a new one.' }, { status: 410 })

  // Get contact + partner info
  const { data: contact } = await supabase
    .from('partner_contacts')
    .select('id, contact_name, partner_name, active')
    .eq('id', tokenRow.partner_contact_id)
    .eq('active', true)
    .maybeSingle() as {
      data: { id: string; contact_name: string; partner_name: string; active: boolean } | null
    }

  if (!contact) return NextResponse.json({ error: 'Account not found.' }, { status: 404 })

  // Create session (90-day expiry)
  const sessionToken = crypto.randomUUID() + '-' + crypto.randomUUID()
  const expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()

  await supabase.from('partner_sessions').insert({
    partner_contact_id: contact.id,
    partner_name: contact.partner_name,
    contact_name: contact.contact_name,
    session_token: sessionToken,
    expires_at: expiresAt,
    ip_address: ip,
    user_agent: req.headers.get('user-agent') || null,
  } as never)

  // Mark token as used
  await supabase.from('partner_login_tokens').update({
    used_at: new Date().toISOString(),
    used_by_ip: ip,
  } as never).eq('id', tokenRow.id)

  const res = NextResponse.json({
    success: true,
    partner_name: contact.partner_name,
    contact_name: contact.contact_name,
  })

  res.cookies.set('tsb_partner_session', sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 90 * 24 * 60 * 60,
  })

  return res
}
