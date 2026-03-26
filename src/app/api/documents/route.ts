import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

const TENANT_ID = '00000000-0000-0000-0000-000000000001'
const BUCKET = 'cargofi-docs'

export async function GET(req: NextRequest) {
  const supabase = createServiceClient()
  const { searchParams } = new URL(req.url)
  const entity_type = searchParams.get('entity_type')
  const entity_id = searchParams.get('entity_id')
  if (!entity_type || !entity_id)
    return NextResponse.json({ error: 'entity_type and entity_id required' }, { status: 400 })

  const { data, error } = await supabase
    .from('entity_documents')
    .select('*')
    .eq('entity_type', entity_type)
    .eq('entity_id', entity_id)
    .order('uploaded_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const supabase = createServiceClient()
  const formData = await req.formData()

  const file        = formData.get('file') as File
  const entity_type = formData.get('entity_type') as string
  const entity_id   = formData.get('entity_id') as string
  const doc_category = formData.get('doc_category') as string
  const doc_name    = formData.get('doc_name') as string
  const expiry_date = formData.get('expiry_date') as string | null
  const notes       = formData.get('notes') as string | null

  if (!file || !entity_type || !entity_id || !doc_category || !doc_name)
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })

  // Upload to Supabase Storage
  const ext = file.name.split('.').pop()
  const path = `${entity_type}/${entity_id}/${doc_category}-${Date.now()}.${ext}`
  const buffer = Buffer.from(await file.arrayBuffer())

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, buffer, { contentType: file.type, upsert: false })

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })

  // Get signed URL (valid 10 years — effectively permanent for internal use)
  const { data: urlData } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, 60 * 60 * 24 * 365 * 10)

  // Save record to DB
  const { data, error } = await supabase
    .from('entity_documents')
    .insert({
      tenant_id: TENANT_ID,
      entity_type, entity_id, doc_category, doc_name,
      file_url: urlData?.signedUrl ?? '',
      file_path: path,
      expiry_date: expiry_date || null,
      notes: notes || null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

export async function DELETE(req: NextRequest) {
  const supabase = createServiceClient()
  const { id, file_path } = await req.json()

  if (file_path) {
    await supabase.storage.from(BUCKET).remove([file_path])
  }
  const { error } = await supabase.from('entity_documents').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
