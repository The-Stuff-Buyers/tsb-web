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
  const dealId = searchParams.get('deal')
  const token = searchParams.get('token')

  if (!dealId || !token) {
    return NextResponse.json(
      { error: 'Missing deal or token parameter.' },
      { status: 400 }
    )
  }

  const supabase = getSupabase()

  // Validate token
  const { data: tokenRow, error: tokenErr } = await supabase
    .from('vendor_response_tokens')
    .select('id, deal_id, token, vendor_name, expires_at, used_at')
    .eq('token', token)
    .maybeSingle() as { data: { id: string; deal_id: string; token: string; vendor_name: string; expires_at: string; used_at: string | null } | null; error: unknown }

  if (tokenErr || !tokenRow) {
    return NextResponse.json(
      { error: 'This link is invalid or has expired.' },
      { status: 404 }
    )
  }

  // Check if already used
  if (tokenRow.used_at) {
    return NextResponse.json(
      { error: 'already_submitted', message: 'A quote has already been submitted for this deal.' },
      { status: 410 }
    )
  }

  // Check expiry
  if (new Date(tokenRow.expires_at) < new Date()) {
    return NextResponse.json(
      { error: 'This link has expired. Please contact quotes@thestuffbuyers.com for a new link.' },
      { status: 410 }
    )
  }

  // Fetch deal by deal_id string (not UUID)
  const { data: deal, error: dealErr } = await supabase
    .from('deals')
    .select('id, deal_id, item_name, condition, quantity, location_raw, category_id, description, stage, created_at, submitted_to_bidfta')
    .eq('deal_id', dealId)
    .maybeSingle() as { data: { id: string; deal_id: string; item_name: string; condition: string | null; quantity: number; location_raw: string | null; category_id: string | null; description: string | null; stage: string; created_at: string; submitted_to_bidfta: string | null } | null; error: unknown }

  if (dealErr || !deal) {
    return NextResponse.json(
      { error: 'Deal not found.' },
      { status: 404 }
    )
  }

  // Verify the token belongs to this deal
  if (tokenRow.deal_id !== deal.id) {
    return NextResponse.json(
      { error: 'This link is invalid or has expired.' },
      { status: 404 }
    )
  }

  // Build location string
  const location = deal.location_raw || 'N/A'

  // Category display name — fetch separately to avoid join issues
  let category = 'N/A'
  if (deal.category_id) {
    const { data: cat } = await supabase
      .from('categories')
      .select('display_name')
      .eq('id', deal.category_id)
      .maybeSingle() as { data: { display_name: string } | null }
    if (cat?.display_name) category = cat.display_name
  }

  // Calculate deadline: submitted_to_bidfta + 36 hours
  let deadline = 'TBD'
  const deadlineBase = deal.submitted_to_bidfta || deal.created_at
  if (deadlineBase) {
    const dl = new Date(new Date(deadlineBase).getTime() + 36 * 60 * 60 * 1000)
    const dayStr = dl.toLocaleDateString('en-US', {
      weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
      timeZone: 'America/Chicago',
    })
    deadline = `${dayStr} by 5:00 PM CT`
  }


  // Vendor info based on vendor_name
  const vendorInfo: Record<string, { company: string; contact_name: string; email: string; phone: string }> = {
    bidfta: {
      company: 'BidFTA',
      contact_name: 'Todd Pewitt',
      email: 'todd.pewitt@bidfta.com',
      phone: '(615) 430-5271',
    },
  }

  const vendor = vendorInfo[tokenRow.vendor_name] || vendorInfo.bidfta

  // Fetch deal attachments and generate 1-hour signed URLs
  // IMPORTANT: deal_attachments.file_url stores a Supabase Storage PATH, not a URL.
  // Always generate a signed URL before rendering — never use file_url directly.
  const { data: attachments } = await supabase
    .from('deal_attachments')
    .select('id, file_name, file_type, file_size, file_url')
    .eq('deal_id', deal.id)
    .order('created_at', { ascending: true }) as {
      data: { id: string; file_name: string; file_type: string; file_size: number; file_url: string }[] | null
    }

  const files = []
  if (attachments && attachments.length > 0) {
    for (const att of attachments) {
      const { data: signedData } = await supabase.storage
        .from('deal-attachments')
        .createSignedUrl(att.file_url, 3600) // 1-hour expiry

      if (signedData?.signedUrl) {
        files.push({
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
    location,
    category,
    description: deal.description || '',
    deadline,
    submitted_at: deal.submitted_to_bidfta || deal.created_at,
    vendor,
    files,
  })
}
