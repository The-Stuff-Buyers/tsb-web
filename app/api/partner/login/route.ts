import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

let supabaseClient: ReturnType<typeof createClient> | null = null
function getSupabase() {
  if (!supabaseClient) {
    supabaseClient = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  }
  return supabaseClient
}

export async function POST(req: NextRequest) {
  let body: { partner_name?: string; password?: string }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid request.' }, { status: 400 }) }

  const partnerName = (body.partner_name || '').toLowerCase().trim()
  const password = body.password || ''

  if (!partnerName || !password) {
    return NextResponse.json({ error: 'Partner name and password required.' }, { status: 400 })
  }

  const supabase = getSupabase()

  // Look up partner + verify password
  const { data: partner } = await supabase
    .from('partners')
    .select('name, display_name, portal_password, active')
    .eq('name', partnerName)
    .maybeSingle() as { data: { name: string; display_name: string; portal_password: string | null; active: boolean } | null }

  if (!partner || !partner.active) {
    return NextResponse.json({ error: 'Invalid credentials.' }, { status: 401 })
  }

  // Timing-safe compare
  const storedPass = partner.portal_password || ''
  let valid = false
  try {
    const a = Buffer.from(password)
    const b = Buffer.from(storedPass)
    if (a.length === b.length) {
      valid = crypto.timingSafeEqual(a, b)
    } else {
      // Still run comparison to avoid timing leak
      crypto.timingSafeEqual(Buffer.alloc(1), Buffer.alloc(1))
    }
  } catch { valid = false }

  if (!valid) {
    return NextResponse.json({ error: 'Invalid credentials.' }, { status: 401 })
  }

  // Create session
  const sessionToken = crypto.randomUUID() + '-' + crypto.randomUUID()
  const expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'

  await supabase.from('partner_sessions').insert({
    partner_name: partner.name,
    contact_name: partner.display_name,
    session_token: sessionToken,
    expires_at: expiresAt,
    ip_address: ip,
  } as never)

  const res = NextResponse.json({ success: true, partner_name: partner.name })
  res.cookies.set('tsb_partner_session', sessionToken, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    expires: new Date(expiresAt),
  })
  return res
}
