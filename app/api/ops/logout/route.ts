import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

let supabaseClient: ReturnType<typeof createClient> | null = null
function getSupabase() {
  if (!supabaseClient) {
    supabaseClient = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  }
  return supabaseClient
}

export async function POST(req: NextRequest) {
  const sessionToken = req.cookies.get('tsb_ops_session')?.value
  if (sessionToken) {
    await getSupabase().from('ops_sessions').delete().eq('session_token', sessionToken)
  }
  const res = NextResponse.json({ success: true })
  res.cookies.set('tsb_ops_session', '', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 0 })
  return res
}
