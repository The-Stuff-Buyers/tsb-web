import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { verifyOpsPassword } from '../../../../lib/ops-auth'

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
  let body: { password?: string }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid request.' }, { status: 400 }) }

  const password = body.password || ''
  if (!password) return NextResponse.json({ error: 'Password required.' }, { status: 400 })

  if (!verifyOpsPassword(password)) {
    return NextResponse.json({ error: 'Invalid password.' }, { status: 401 })
  }

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const sessionToken = crypto.randomUUID() + '-' + crypto.randomUUID()
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

  await getSupabase().from('ops_sessions').insert({
    username: 'blake',
    session_token: sessionToken,
    expires_at: expiresAt,
    ip_address: ip,
  } as never)

  const res = NextResponse.json({ success: true })
  res.cookies.set('tsb_ops_session', sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 24 * 60 * 60,
  })
  return res
}
