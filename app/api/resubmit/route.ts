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

const _STORAGE_BUCKET = 'deal-attachments' // eslint-disable-line @typescript-eslint/no-unused-vars
const CYCLOPS_WEBHOOK_URL = process.env.CYCLOPS_WEBHOOK_URL || ''

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request format.' }, { status: 400 })
  }

  const { deal_id, token, additional_info, file_ids } = body

  if (!deal_id || !token || typeof deal_id !== 'string' || typeof token !== 'string') {
    return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 })
  }

  const supabase = getSupabase()

  // Validate token
  const { data: tokenRow } = await supabase
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
    }

  if (!tokenRow) {
    return NextResponse.json({ error: 'This link is invalid.' }, { status: 404 })
  }

  if (tokenRow.used_at) {
    return NextResponse.json({ error: 'This resubmission has already been submitted.' }, { status: 410 })
  }

  if (new Date(tokenRow.expires_at) < new Date()) {
    return NextResponse.json({ error: 'This resubmission link has expired.' }, { status: 410 })
  }

  // Fetch deal to verify deal_id matches
  const { data: deal } = await supabase
    .from('deals')
    .select('id, deal_id')
    .eq('id', tokenRow.deal_id)
    .maybeSingle() as { data: { id: string; deal_id: string } | null }

  if (!deal || deal.deal_id !== deal_id) {
    return NextResponse.json({ error: 'This link is invalid.' }, { status: 404 })
  }

  // Process new file uploads — fetch submission_files rows and copy to deal_attachments
  const rawFileIds = Array.isArray(file_ids) ? file_ids : []
  const validFileIds = rawFileIds
    .slice(0, 10)
    .map(String)
    .filter((id) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))

  if (validFileIds.length > 0) {
    const { data: submissionFiles } = await supabase
      .from('submission_files')
      .select('id, file_name, file_type, file_size, storage_path')
      .in('id', validFileIds)
      .is('form_submission_id', null) as {
        data: { id: string; file_name: string; file_type: string; file_size: number; storage_path: string }[] | null
      }

    if (submissionFiles && submissionFiles.length > 0) {
      const MIME_TO_FILE_TYPE: Record<string, string> = {
        'image/jpeg': 'photo',
        'image/png': 'photo',
        'image/webp': 'photo',
        'image/heic': 'photo',
        'application/pdf': 'other',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'other',
        'application/vnd.ms-excel': 'other',
        'text/csv': 'other',
      }

      for (const sf of submissionFiles) {
        const mappedType = MIME_TO_FILE_TYPE[sf.file_type] || 'photo'

        const { data: attachmentRow } = await supabase
          .from('deal_attachments')
          .insert({
            deal_id: deal.id,
            file_name: sf.file_name,
            file_type: mappedType,
            file_size: sf.file_size,
            file_url: sf.storage_path, // file_url stores the storage path
            uploaded_by: 'seller',
            notes: 'Uploaded via seller resubmission',
          } as never)
          .select('id')
          .single() as { data: { id: string } | null }

        if (attachmentRow) {
          // Mark the submission_file as copied
          await supabase
            .from('submission_files')
            .update({ copied_to_deal: true } as never)
            .eq('id', sf.id)
        }
      }
    }
  }

  // Mark token as used
  await supabase
    .from('seller_resubmit_tokens')
    .update({ used_at: new Date().toISOString() } as never)
    .eq('id', tokenRow.id)

  // Store additional info on token row (or as a note)
  if (additional_info && typeof additional_info === 'string' && additional_info.trim()) {
    // Generate a signed URL for reading the storage file — but store as path per convention
    // Store notes on a deal_event via pipeline; here we just fire the webhook
  }

  // Fire Cyclops webhook for seller resubmission
  if (CYCLOPS_WEBHOOK_URL) {
    const webhookPayload = {
      deal_id: deal.deal_id,
      deal_uuid: deal.id,
      additional_info: additional_info && typeof additional_info === 'string' ? additional_info.trim() : '',
      file_count: validFileIds.length,
      submitted_at: new Date().toISOString(),
    }

    fetch(`${CYCLOPS_WEBHOOK_URL}/webhook/seller-resubmission`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(webhookPayload),
    }).catch((err) => console.error('[resubmit] webhook fire failed:', err))
  }

  return NextResponse.json({
    success: true,
    message: 'Resubmission received. We will be in touch shortly.',
  })
}


