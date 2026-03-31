import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { validateSubmission, validateBatchSubmission, normalizeWebsite, normalizeUpc } from '@/lib/validation'
import { sendSubmissionConfirmation } from '@/lib/email'

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
      message: "Received. We'll be in touch within 2 business days.",
    })
  }

  // 4. Detect multi-item vs single-item path
  const isMultiItem = Array.isArray(body.items) && (body.items as unknown[]).length > 0

  if (isMultiItem) {
    return handleMultiItem(body)
  }

  // ── Single-item path (unchanged from v1) ──────────────────────────

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
    .eq('location', (body.location as string) ?? '')
    .gte(
      'submitted_at',
      new Date(Date.now() - 5 * 60 * 1000).toISOString()
    )
    .limit(1)

  if (existing && existing.length > 0) {
    return NextResponse.json({
      success: true,
      message: "Received. We'll be in touch within 2 business days.",
    })
  }

  // 7. Insert into form_submissions
  const sessionId = body.session_id ? String(body.session_id) : null
  const sessionItemNumber = body.session_item_number ? Number(body.session_item_number) : null

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
    session_id: sessionId,
    session_item_number: sessionItemNumber,
    raw_payload: body,
  }

  // Cast to never: supabase-js requires generated DB types; untyped client infers never for table rows
  const { data: newSubmission, error: insertError } = await supabase
    .from('form_submissions')
    .insert(insertPayload as never)
    .select('id')
    .single() as { data: { id: string } | null; error: unknown }

  if (insertError || !newSubmission) {
    console.error('Supabase insert error:', insertError)
    return NextResponse.json(
      {
        error: 'Something went wrong. Please try again or contact us directly.',
      },
      { status: 500 }
    )
  }

  // 7b. Associate uploaded files with this submission
  const rawFileIds = body.file_ids
  if (Array.isArray(rawFileIds) && rawFileIds.length > 0) {
    const validFileIds = (rawFileIds as unknown[])
      .slice(0, 10)
      .map(String)
      .filter((id) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))

    if (validFileIds.length > 0) {
      await supabase
        .from('submission_files')
        .update({ form_submission_id: newSubmission.id } as never)
        .in('id', validFileIds)
        .is('form_submission_id', null)

      const { count } = await supabase
        .from('submission_files')
        .select('id', { count: 'exact', head: true })
        .eq('form_submission_id', newSubmission.id)

      await supabase
        .from('form_submissions')
        .update({ file_count: count || 0 } as never)
        .eq('id', newSubmission.id)
    }
  }

  // 8. Send confirmation email (awaited — Vercel kills void promises after response)
  await sendSubmissionConfirmation({
    to: body.email as string,
    contactName: body.contact_name as string | null,
  }).catch(err => console.error('[email] confirmation failed:', err))

  // 9. Return success
  return NextResponse.json({
    success: true,
    message: "Received. We'll be in touch within 2 business days.",
  })
}

// ── Multi-item batch path ─────────────────────────────────────────

async function handleMultiItem(body: Record<string, unknown>): Promise<NextResponse> {
  const items = body.items as Array<Record<string, unknown>>

  const contactFields: Record<string, unknown> = {
    contact_name: body.contact_name,
    email: body.email,
    phone: body.phone,
    company_name: body.company_name,
    website: body.website,
    industry_type: body.industry_type,
  }

  // Validate contact fields + all items
  const validation = validateBatchSubmission(contactFields, items)

  if (!validation.valid) {
    const itemErrors: Record<number, Record<string, string>> = {}

    if (validation.contactErrors.length > 0) {
      itemErrors[0] = itemErrors[0] || {}
      for (const err of validation.contactErrors) {
        itemErrors[0][err.field] = err.message
      }
    }

    for (const [idxStr, errs] of Object.entries(validation.itemErrors)) {
      const idx = parseInt(idxStr)
      itemErrors[idx] = itemErrors[idx] || {}
      for (const err of errs) {
        itemErrors[idx][err.field] = err.message
      }
    }

    return NextResponse.json(
      {
        error: 'Some items have validation errors.',
        itemErrors,
      },
      { status: 400 }
    )
  }

  // Generate batch group ID
  const submission_group_id = crypto.randomUUID()
  const supabase = getSupabase()
  const website = body.website ? normalizeWebsite(String(body.website)) : null

  let items_accepted = 0
  let items_duplicate = 0

  for (const item of items) {
    // Dedup check per item — location included so same item at two locations is NOT deduplicated
    const { data: existing } = await supabase
      .from('form_submissions')
      .select('id')
      .eq('email', body.email as string)
      .eq('item_name', item.item_name as string)
      .eq('company_name', (body.company_name as string) ?? '')
      .eq('location', (item.location as string) ?? '')
      .gte('submitted_at', new Date(Date.now() - 5 * 60 * 1000).toISOString())
      .limit(1)

    if (existing && existing.length > 0) {
      items_duplicate++
      continue
    }

    const upc = item.no_upc
      ? 'No UPC'
      : item.upc
      ? normalizeUpc(String(item.upc))
      : null
    const quantity = parseInt(String(item.quantity), 10)

    const sessionId = body.session_id ? String(body.session_id) : null
    const sessionItemNumber = items_accepted + 1

    const insertPayload = {
      contact_name: body.contact_name || null,
      company_name: body.company_name || null,
      email: body.email,
      phone: body.phone || null,
      website,
      industry_type: body.industry_type || null,
      item_name: item.item_name,
      description: item.description || null,
      condition: item.condition,
      location: item.location,
      upc,
      quantity,
      product_category: item.product_category,
      source: 'web_form',
      submission_group_id,
      session_id: sessionId,
      session_item_number: sessionItemNumber,
      raw_payload: body,
    }

    const { data: newSub, error: insertError } = await supabase
      .from('form_submissions')
      .insert(insertPayload as never)
      .select('id')
      .single() as { data: { id: string } | null; error: unknown }

    if (insertError || !newSub) {
      console.error('Supabase batch insert error:', insertError)
    } else {
      items_accepted++

      // Associate file_ids with this item's submission
      const rawFileIds = (item as Record<string, unknown>).file_ids
      if (Array.isArray(rawFileIds) && rawFileIds.length > 0) {
        const validFileIds = (rawFileIds as unknown[])
          .slice(0, 10)
          .map(String)
          .filter((id) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))

        if (validFileIds.length > 0) {
          await supabase
            .from('submission_files')
            .update({ form_submission_id: newSub.id } as never)
            .in('id', validFileIds)
            .is('form_submission_id', null)

          const { count } = await supabase
            .from('submission_files')
            .select('id', { count: 'exact', head: true })
            .eq('form_submission_id', newSub.id)

          await supabase
            .from('form_submissions')
            .update({ file_count: count || 0 } as never)
            .eq('id', newSub.id)
        }
      }
    }
  }

  if (items_accepted > 0) {
    await sendSubmissionConfirmation({
      to: body.email as string,
      contactName: body.contact_name as string | null,
      itemCount: items_accepted,
    }).catch(err => console.error('[email] batch confirmation failed:', err))
  }

  return NextResponse.json({
    success: true,
    message: "Received. We'll be in touch within 2 business days.",
    items_accepted,
    items_duplicate,
  })
}
