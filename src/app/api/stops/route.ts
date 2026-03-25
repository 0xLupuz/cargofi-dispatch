import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const supabase = createServiceClient()
  const { load_id, stops } = await req.json()

  const { data, error } = await supabase
    .from('stops')
    .insert(stops.map((s: any) => ({ ...s, load_id })))
    .select()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
