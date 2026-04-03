import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { validateOpsSession } from '../../../../lib/ops-auth'

let supabaseClient: ReturnType<typeof createClient> | null = null
function getSupabase() {
  if (!supabaseClient) {
    supabaseClient = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  }
  return supabaseClient
}

export async function GET(req: NextRequest) {
  const session = await validateOpsSession(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: partners } = await getSupabase()
    .from('partners')
    .select('name, display_name, has_first_refusal, first_refusal_hours')
    .order('display_name') as { data: { name: string; display_name: string; has_first_refusal: boolean; first_refusal_hours: number }[] | null }

  return NextResponse.json({ partners: partners || [] })
}
