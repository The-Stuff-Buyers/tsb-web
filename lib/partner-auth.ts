import { createClient } from '@supabase/supabase-js'
import { NextRequest } from 'next/server'

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

export interface PartnerSession {
  sessionId: string
  partnerName: string
  contactName: string
  partnerContactId: string
}

export async function validatePartnerSession(req: NextRequest): Promise<PartnerSession | null> {
  const sessionToken = req.cookies.get('tsb_partner_session')?.value
  if (!sessionToken) return null

  const supabase = getSupabase()
  const { data: session } = await supabase
    .from('partner_sessions')
    .select('id, partner_name, contact_name, partner_contact_id, expires_at')
    .eq('session_token', sessionToken)
    .maybeSingle() as {
      data: {
        id: string
        partner_name: string
        contact_name: string
        partner_contact_id: string
        expires_at: string
      } | null
    }

  if (!session) return null
  if (new Date(session.expires_at) < new Date()) return null

  // Slide expiry (90-day rolling)
  const newExpiry = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()
  await supabase
    .from('partner_sessions')
    .update({ expires_at: newExpiry, last_accessed_at: new Date().toISOString() } as never)
    .eq('id', session.id)

  return {
    sessionId: session.id,
    partnerName: session.partner_name,
    contactName: session.contact_name,
    partnerContactId: session.partner_contact_id,
  }
}
