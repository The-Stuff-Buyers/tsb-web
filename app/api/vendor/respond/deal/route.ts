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
    .maybeSingle()

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
    .select('id, deal_id, item_name, condition, quantity, location_raw, category_id, description, stage, submitted_at, categories(display_name)')
    .eq('deal_id', dealId)
    .maybeSingle()

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

  // Category display name
  const category = (deal.categories as { display_name?: string } | null)?.display_name || 'N/A'

  // Calculate deadline: submitted_at + 36 hours
  let deadline = 'TBD'
  if (deal.submitted_at) {
    const dl = new Date(new Date(deal.submitted_at).getTime() + 36 * 60 * 60 * 1000)
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
      contact_name: 'Todd Prewitt',
      email: 'todd@bidfta.com',
      phone: '(615) 430-5271',
    },
  }

  const vendor = vendorInfo[tokenRow.vendor_name] || vendorInfo.bidfta

  return NextResponse.json({
    deal_id: deal.deal_id,
    item_name: deal.item_name,
    condition: deal.condition || 'N/A',
    quantity: deal.quantity,
    location,
    category,
    description: deal.description || '',
    deadline,
    submitted_at: deal.submitted_at,
    vendor,
  })
}
