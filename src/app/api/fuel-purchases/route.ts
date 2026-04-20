import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const sb = createServiceClient()
  const { searchParams } = req.nextUrl
  const loadId  = searchParams.get('load_id')
  const quarter = searchParams.get('quarter')
  const year    = searchParams.get('year')

  let query = sb.from('fuel_purchases').select('*').order('purchase_date', { ascending: true })

  if (loadId)  query = query.eq('load_id', loadId)
  if (quarter && year) {
    // Q1=Jan-Mar, Q2=Apr-Jun, Q3=Jul-Sep, Q4=Oct-Dec
    const qNum = parseInt(quarter)
    const yr   = parseInt(year)
    const startMonth = (qNum - 1) * 3 + 1
    const endMonth   = qNum * 3
    const start = `${yr}-${String(startMonth).padStart(2,'0')}-01`
    const end   = `${yr}-${String(endMonth).padStart(2,'0')}-${qNum === 1 || qNum === 4 ? 31 : qNum === 2 ? 30 : 30}`
    query = query.gte('purchase_date', start).lte('purchase_date', end)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const sb   = createServiceClient()
  const body = await req.json()
  const amount = parseFloat(body.gallons) * parseFloat(body.price_per_gallon)
  const { data, error } = await sb
    .from('fuel_purchases')
    .insert({ ...body, amount })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Update load fuel_cost sum
  if (body.load_id) {
    const { data: all } = await sb.from('fuel_purchases').select('amount').eq('load_id', body.load_id)
    const total = (all ?? []).reduce((s: number, r: any) => s + parseFloat(r.amount), 0)
    await sb.from('loads').update({ fuel_cost: total }).eq('id', body.load_id)
  }

  return NextResponse.json(data, { status: 201 })
}
