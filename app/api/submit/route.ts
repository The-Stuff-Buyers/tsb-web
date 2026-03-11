import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const body = await req.json()

  // Validate required fields
  const required = ['name', 'email', 'company_name', 'contact_name', 'phone', 'item_name', 'description', 'condition', 'location', 'quantity', 'product_category']
  for (const field of required) {
    if (!body[field]) {
      return NextResponse.json({ error: `Missing field: ${field}` }, { status: 400 })
    }
  }

  // UPC: either value or no_upc must be set
  if (!body.upc && !body.no_upc) {
    return NextResponse.json({ error: 'UPC required or check No UPC' }, { status: 400 })
  }

  const { error } = await supabase.from('form_submissions').insert({
    name: body.name,
    email: body.email,
    company_name: body.company_name,
    contact_name: body.contact_name,
    phone: body.phone,
    website: body.website || null,
    item_name: body.item_name,
    description: body.description,
    condition: body.condition,
    location: body.location,
    upc: body.no_upc ? 'No UPC' : body.upc,
    quantity: parseInt(body.quantity),
    product_category: body.product_category,
    source: 'web_form',
    submitted_at: new Date().toISOString()
  })

  if (error) {
    console.error('Supabase insert error:', error)
    return NextResponse.json({ error: 'Submission failed' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
