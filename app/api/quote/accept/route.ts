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

const CYCLOPS_WEBHOOK_URL = process.env.CYCLOPS_WEBHOOK_URL || 'http://localhost:3001'
const CYCLOPS_WEBHOOK_SECRET = process.env.CYCLOPS_WEBHOOK_SECRET

export async function POST(req: NextRequest) {
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'

  let body: { deal?: string; token?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }

  const { deal: dealId, token } = body
  if (!dealId || !token) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }

  const supabase = getSupabase()

  // 1. Validate token — join to deals to verify human-readable deal_id
  const { data: tokenRow, error: tokenErr } = await supabase
    .from('customer_acceptance_tokens')
    .select('id, deal_id, token, expires_at, used_at, deals!inner(id, deal_id)')
    .eq('token', token)
    .maybeSingle() as {
      data: {
        id: string
        deal_id: string
        token: string
        expires_at: string
        used_at: string | null
        deals: { id: string; deal_id: string }
      } | null
      error: unknown
    }

  if (tokenErr || !tokenRow) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }

  // 2. Confirm token belongs to the requested deal
  if (tokenRow.deals.deal_id !== dealId) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }

  // 3. Check already used
  if (tokenRow.used_at) {
    return NextResponse.json({ error: 'already_accepted' }, { status: 410 })
  }

  // 4. Check expired
  if (new Date(tokenRow.expires_at) < new Date()) {
    return NextResponse.json({ error: 'expired' }, { status: 410 })
  }

  const dealUuid = tokenRow.deal_id // UUID foreign key to deals.id

  // 5. Mark token used
  await supabase
    .from('customer_acceptance_tokens')
    .update({ used_at: new Date().toISOString(), used_by_ip: ip } as never)
    .eq('id', tokenRow.id)

  // 6. Advance deal stage → quote_accepted
  await supabase
    .from('deals')
    .update({ stage: 'quote_accepted' } as never)
    .eq('id', dealUuid)

  // 7. Insert deal_events row
  await supabase.from('deal_events').insert({
    deal_id: dealUuid,
    event_type: 'quote_accepted',
    actor: 'customer',
    metadata: { ip },
  } as never)

  // 8. Fire Cyclops webhook (best-effort — failure does not block acceptance)
  if (CYCLOPS_WEBHOOK_SECRET) {
    try {
      const webhookRes = await fetch(`${CYCLOPS_WEBHOOK_URL}/webhook/quote-accepted`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${CYCLOPS_WEBHOOK_SECRET}`,
        },
        body: JSON.stringify({ deal_id: dealId }),
      })
      if (webhookRes.ok) {
        await supabase
          .from('customer_acceptance_tokens')
          .update({ webhook_fired_at: new Date().toISOString() } as never)
          .eq('id', tokenRow.id)
      }
    } catch (err) {
      // Log but do not block — webhook_fired_at remains null for retry surfacing
      console.error('[quote/accept] Cyclops webhook failed:', err)
    }
  }

  return NextResponse.json({ success: true, deal_id: dealId })
}
