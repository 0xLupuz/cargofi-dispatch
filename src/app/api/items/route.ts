import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
const T = '00000000-0000-0000-0000-000000000001'
export async function GET(req: NextRequest) {
  const type = req.nextUrl.searchParams.get('type')
  const q    = req.nextUrl.searchParams.get('q')
  let query = createServiceClient().from('items').select('*').eq('tenant_id',T).order('code')
  if (type && type !== 'All') query = query.eq('item_type', type)
  if (q) query = query.or(`code.ilike.%${q}%,item.ilike.%${q}%,description.ilike.%${q}%`)
  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
export async function POST(req: NextRequest) {
  const { data, error } = await createServiceClient().from('items').insert({ ...await req.json(), tenant_id: T }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
