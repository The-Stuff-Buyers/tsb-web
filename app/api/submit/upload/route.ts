import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

// Allowed MIME types for file uploads
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'text/csv',
])

const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024 // 25 MB
const STORAGE_BUCKET = 'deal-attachments'

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

// Sanitize filename: strip path separators, keep safe chars
function sanitizeFilename(name: string): string {
  return name
    .replace(/[/\\]/g, '')
    .replace(/[^a-zA-Z0-9._\- ]/g, '_')
    .slice(0, 200)
}

export async function POST(req: NextRequest) {
  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid multipart request.' }, { status: 400 })
  }

  const file = formData.get('file')
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: 'No file provided.' }, { status: 400 })
  }

  const sessionId = formData.get('session_id')?.toString() || null

  // Validate MIME type
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return NextResponse.json(
      {
        error: `File type not allowed. Accepted: JPEG, PNG, WEBP, HEIC, PDF, Excel, CSV. Got: ${file.type || 'unknown'}`,
      },
      { status: 400 }
    )
  }

  // Validate file size
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return NextResponse.json(
      { error: `File too large. Maximum size is 25 MB.` },
      { status: 400 }
    )
  }

  if (file.size === 0) {
    return NextResponse.json({ error: 'File is empty.' }, { status: 400 })
  }

  const supabase = getSupabase()

  // Generate unique file ID and storage path
  const fileId = crypto.randomUUID()
  const sanitized = sanitizeFilename(file.name)
  const storagePath = `submissions/pending/${fileId}_${sanitized}`

  // Upload to Supabase Storage
  const fileBuffer = await file.arrayBuffer()
  const { error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(storagePath, fileBuffer, {
      contentType: file.type,
      upsert: false,
    })

  if (uploadError) {
    console.error('[upload] Storage upload error:', uploadError)
    return NextResponse.json(
      { error: 'File upload failed. Please try again.' },
      { status: 500 }
    )
  }

  // Insert submission_files row (form_submission_id is NULL until form is submitted)
  const insertRow = {
    id: fileId,
    file_name: file.name,
    file_type: file.type,
    file_size: file.size,
    storage_path: storagePath,
    session_id: sessionId,
    form_submission_id: null,
    copied_to_deal: false,
  }

  const { error: dbError } = await supabase
    .from('submission_files')
    .insert(insertRow as never)

  if (dbError) {
    console.error('[upload] DB insert error:', dbError)
    // Clean up the uploaded file since DB insert failed
    await supabase.storage.from(STORAGE_BUCKET).remove([storagePath])
    return NextResponse.json(
      { error: 'File upload failed. Please try again.' },
      { status: 500 }
    )
  }

  return NextResponse.json({
    file_id: fileId,
    file_name: file.name,
    storage_path: storagePath,
    file_size: file.size,
    file_type: file.type,
  })
}
