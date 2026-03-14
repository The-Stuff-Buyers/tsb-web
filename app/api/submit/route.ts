import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { validateSubmission, normalizeWebsite, normalizeUpc } from '@/lib/validation'

// ── In-memory rate limiter (no external deps) ──────────────────────
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT_MAX = 10
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000 // 1 hour

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(ip)
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    return true
  }
  if (entry.count >= RATE_LIMIT_MAX) {
    return false
  }
  entry.count++
  return true
}

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

export async function POST(req: NextRequest) {
  // 1. Rate limit check
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: 'Too many submissions. Please try again later.' },
      { status: 429 }
    )
  }

  // 2. Parse body with try/catch
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json(
      { error: 'Invalid request format.' },
      { status: 400 }
    )
  }

  // 3. Honeypot check — silent 200, no insert
  if (body.company_url) {
    return NextResponse.json({
      success: true,
      message: "Received. We'll be in touch within 24–48 hours.",
    })
  }

  // 4. Validate using shared contract
  const result = validateSubmission(body)
  if (!result.valid) {
    const fieldErrors: Record<string, string> = {}
    for (const err of result.errors) {
      fieldErrors[err.field] = err.message
    }
    return NextResponse.json(
      {
        error: 'Please fix the following fields before submitting.',
        fieldErrors,
      },
      { status: 400 }
    )
  }

  // 5. Normalize fields
  const website = body.website ? normalizeWebsite(String(body.website)) : null
  const upc = body.no_upc
    ? 'No UPC'
    : body.upc
    ? normalizeUpc(String(body.upc))
    : null
  const quantity = parseInt(String(body.quantity), 10)

  if (isNaN(quantity) || quantity < 1) {
    return NextResponse.json(
      {
        error: 'Please fix the following fields before submitting.',
        fieldErrors: { quantity: 'Quantity must be a whole number (1 or more).' },
      },
      { status: 400 }
    )
  }

  const supabase = getSupabase()

  // 6. Dedup check — idempotent within 5 minutes
  const { data: existing } = await supabase
    .from('form_submissions')
    .select('id')
    .eq('email', body.email as string)
    .eq('item_name', body.item_name as string)
    .eq('company_name', (body.company_name as string) ?? '')
    .gte(
      'submitted_at',
      new Date(Date.now() - 5 * 60 * 1000).toISOString()
    )
    .limit(1)

  if (existing && existing.length > 0) {
    return NextResponse.json({
      success: true,
      message: "Received. We'll be in touch within 24–48 hours.",
    })
  }

  // 7. Insert into form_submissions
  const insertPayload = {
    contact_name: body.contact_name || null,
    company_name: body.company_name || null,
    email: body.email,
    phone: body.phone || null,
    website,
    item_name: body.item_name,
    description: body.description || null,
    condition: body.condition,
    location: body.location,
    upc,
    quantity,
    product_category: body.product_category,
    industry_type: body.industry_type || null,
    source: 'web_form',
    raw_payload: body,
  }

  // Cast to never: supabase-js requires generated DB types; untyped client infers never for table rows
  const { error: insertError } = await supabase
    .from('form_submissions')
    .insert(insertPayload as never)

  if (insertError) {
    console.error('Supabase insert error:', insertError)
    return NextResponse.json(
      {
        error: 'Something went wrong. Please try again or contact us directly.',
      },
      { status: 500 }
    )
  }

  // 8. Return success
  return NextResponse.json({
    success: true,
    message: "Received. We'll be in touch within 24–48 hours.",
  })
}
