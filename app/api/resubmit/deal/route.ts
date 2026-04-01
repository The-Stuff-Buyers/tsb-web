import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

function getSupabase() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

const STORAGE_BUCKET = 'deal-attachments'

// Note: STORAGE_BUCKET used below for signed URL generation
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const dealId = searchParams.get('deal')
  const token = searchParams.get('token')

  if (!dealId || !token) {
    return NextResponse.json({ error: 'Missing deal or token parameter.' }, { status: 400 })
  }

  const supabase = getSupabase()

  // Validate token
  const { data: tokenRow, error: tokenErr } = await supabase
    .from('seller_resubmit_tokens')
    .select('id, deal_id, token, expires_at, used_at')
    .eq('token', token)
    .maybeSingle() as {
      data: {
        id: string
        deal_id: string
        token: string
        expires_at: string
        used_at: string | null
      } | null
      error: { message: string; code: string } | null
    }

  if (tokenErr || !tokenRow) {
    return NextResponse.json({ 
      error: 'This link is invalid or has expired.',
      debug: tokenErr?.message || 'no row found',
      debug_code: tokenErr?.code,
    }, { status: 404 })
  }

  if (tokenRow.used_at) {
    return NextResponse.json({ error: 'token_used', message: 'This resubmission has already been submitted.' }, { status: 410 })
  }

  if (new Date(tokenRow.expires_at) < new Date()) {
    return NextResponse.json({ error: 'token_expired', message: 'This resubmission link has expired.' }, { status: 410 })
  }

  // Fetch deal with latest quote notes
  const { data: deal } = await supabase
    .from('deals')
    .select('id, deal_id, item_name, condition, quantity, location_raw, stage, latest_quote_id')
    .eq('id', tokenRow.deal_id)
    .maybeSingle() as {
      data: {
        id: string
        deal_id: string
        item_name: string
        condition: string | null
        quantity: number
        location_raw: string | null
        stage: string
        latest_quote_id: string | null
      } | null
    }

  if (!deal) {
    return NextResponse.json({ error: 'Deal not found.' }, { status: 404 })
  }

  // Verify the deal_id param matches
  if (deal.deal_id !== dealId) {
    return NextResponse.json({ error: 'This link is invalid or has expired.' }, { status: 404 })
  }

  // Fetch BidFTA notes from latest quote
  let bidftaNotes = ''
  if (deal.latest_quote_id) {
    const { data: quote } = await supabase
      .from('quotes')
      .select('notes')
      .eq('id', deal.latest_quote_id)
      .maybeSingle() as { data: { notes: string | null } | null }
    bidftaNotes = quote?.notes || ''
  }

  // Fetch existing deal attachments with signed URLs
  const { data: attachments } = await supabase
    .from('deal_attachments')
    .select('id, file_name, file_type, file_size, file_url')
    .eq('deal_id', deal.id)
    .order('created_at', { ascending: true }) as {
      data: { id: string; file_name: string; file_type: string; file_size: number; file_url: string }[] | null
    }

  const existing_files = []
  if (attachments && attachments.length > 0) {
    for (const att of attachments) {
      const { data: signedData } = await supabase.storage
        .from(STORAGE_BUCKET)
        .createSignedUrl(att.file_url, 3600)

      if (signedData?.signedUrl) {
        existing_files.push({
          id: att.id,
          file_name: att.file_name,
          file_type: att.file_type,
          file_size: att.file_size,
          url: signedData.signedUrl,
          is_image: ['image/jpeg', 'image/png', 'image/webp', 'image/heic'].includes(att.file_type) || att.file_type === 'photo',
        })
      }
    }
  }

  return NextResponse.json({
    deal_id: deal.deal_id,
    item_name: deal.item_name,
    condition: deal.condition || 'N/A',
    quantity: deal.quantity,
    location: deal.location_raw || 'N/A',
    bidfta_notes: bidftaNotes,
    existing_files,
  })
}
