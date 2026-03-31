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

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const sessionId = searchParams.get('session_id')

  if (!sessionId || sessionId.trim().length === 0) {
    return NextResponse.json({ error: 'Missing session_id.' }, { status: 400 })
  }

  // Basic sanity on session_id length to prevent abuse
  if (sessionId.length > 128) {
    return NextResponse.json({ error: 'Invalid session_id.' }, { status: 400 })
  }

  const supabase = getSupabase()

  const { data: files, error } = await supabase
    .from('submission_files')
    .select('id, file_name, file_type, file_size, created_at')
    .eq('session_id', sessionId)
    .is('form_submission_id', null) // Only orphaned (not yet submitted) files
    .order('created_at', { ascending: true })
    .limit(50) as {
      data: { id: string; file_name: string; file_type: string; file_size: number; created_at: string }[] | null
      error: unknown
    }

  if (error) {
    console.error('[session-files] query error:', error)
    return NextResponse.json({ error: 'Failed to fetch session files.' }, { status: 500 })
  }

  const result = (files || []).map((f) => ({
    file_id: f.id,
    file_name: f.file_name,
    file_type: f.file_type,
    file_size: f.file_size,
  }))

  return NextResponse.json({ files: result })
}
