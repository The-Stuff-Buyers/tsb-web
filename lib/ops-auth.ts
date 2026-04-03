import { createClient } from '@supabase/supabase-js'
import { NextRequest } from 'next/server'
import crypto from 'crypto'

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

export interface OpsSession {
  sessionId: string
  username: string
}

export async function validateOpsSession(req: NextRequest): Promise<OpsSession | null> {
  const sessionToken = req.cookies.get('tsb_ops_session')?.value
  if (!sessionToken) return null

  const supabase = getSupabase()
  const { data: session } = await supabase
    .from('ops_sessions')
    .select('id, username, expires_at')
    .eq('session_token', sessionToken)
    .maybeSingle() as {
      data: { id: string; username: string; expires_at: string } | null
    }

  if (!session) return null
  if (new Date(session.expires_at) < new Date()) return null

  // Slide expiry (24-hour rolling)
  const newExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  await supabase
    .from('ops_sessions')
    .update({ expires_at: newExpiry, last_accessed_at: new Date().toISOString() } as never)
    .eq('id', session.id)

  return { sessionId: session.id, username: session.username }
}

/**
 * Verify an ops password against OPS_PASSWORD env var.
 * Supports plain text (timing-safe) or SHA-256 hex hash (prefix: sha256:).
 * Example .env.local: OPS_PASSWORD=mysecret  OR  OPS_PASSWORD=sha256:<hex>
 */
export function verifyOpsPassword(inputPassword: string): boolean {
  const stored = process.env.OPS_PASSWORD || ''
  if (!stored) return false

  if (stored.startsWith('sha256:')) {
    const expectedHash = stored.slice(7)
    const inputHash = crypto.createHash('sha256').update(inputPassword).digest('hex')
    try {
      return crypto.timingSafeEqual(Buffer.from(inputHash, 'hex'), Buffer.from(expectedHash, 'hex'))
    } catch {
      return false
    }
  }

  // Plain text — timing-safe comparison
  try {
    const a = Buffer.from(inputPassword)
    const b = Buffer.from(stored)
    if (a.length !== b.length) {
      // Still do comparison to avoid timing leak on length
      crypto.timingSafeEqual(Buffer.alloc(a.length), Buffer.alloc(a.length))
      return false
    }
    return crypto.timingSafeEqual(a, b)
  } catch {
    return false
  }
}
