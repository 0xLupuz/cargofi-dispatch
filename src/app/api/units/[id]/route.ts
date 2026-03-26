import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = createServiceClient()
  const { id } = await params
  const body = await req.json()
  const { data, error } = await supabase.from('units').update(body).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// Soft delete (table row button)
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = createServiceClient()
  const { id } = await params
  const { error } = await supabase.from('units').update({ active: false }).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

// Hard delete (edit modal — full wipe)
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = createServiceClient()
  const { id } = await params

  // 1. Get all entity_documents for this unit (need file_path for Storage)
  const { data: docs } = await supabase
    .from('entity_documents')
    .select('file_path')
    .eq('entity_type', 'unit')
    .eq('entity_id', id)

  // 2. Delete files from Storage
  if (docs && docs.length > 0) {
    const paths = docs.map((d: any) => d.file_path).filter(Boolean)
    if (paths.length > 0) {
      await supabase.storage.from('cargofi-docs').remove(paths)
    }
  }

  // 3. Delete entity_documents records
  await supabase.from('entity_documents')
    .delete()
    .eq('entity_type', 'unit')
    .eq('entity_id', id)

  // 4. Hard delete the unit
  const { error } = await supabase.from('units').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, hard: true })
}
