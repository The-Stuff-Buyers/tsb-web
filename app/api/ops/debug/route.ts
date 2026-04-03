import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { data, error, count } = await supabase
    .from('deals')
    .select('id, deal_id, stage', { count: 'exact' })
    .limit(5)
  return NextResponse.json({ data, error, count, url: process.env.SUPABASE_URL })
}
