import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { randomUUID } from 'crypto'

const TENANT = '00000000-0000-0000-0000-000000000001'
const ADVANCE_RATE_BPS   = 9700 // 97% advance to carrier
const FEE_BPS            = 300  // 3% total fee
const INVESTOR_FEE_BPS   = 200  // 2% → investor yield
const PLATFORM_FEE_BPS   = 100  // 1% → CargoFi revenue

/** GET /api/factoring-requests?load_id=xxx */
export async function GET(req: NextRequest) {
  const loadId = req.nextUrl.searchParams.get('load_id')
  if (!loadId) return NextResponse.json({ error: 'load_id required' }, { status: 400 })

  const sb = createServiceClient()
  const { data, error } = await sb
    .from('factoring_requests')
    .select('*')
    .eq('load_id', loadId)
    .eq('tenant_id', TENANT)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? null)
}

/** POST /api/factoring-requests */
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { load_id, gross_amount_usdc, carrier_wallet, carrier_usdc_account } = body

  if (!load_id || !gross_amount_usdc) {
    return NextResponse.json({ error: 'load_id and gross_amount_usdc required' }, { status: 400 })
  }

  // Generate invoice_id_hex: UUID without dashes (32 hex chars)
  const invoice_id_hex = randomUUID().replace(/-/g, '')

  const sb = createServiceClient()
  const { data, error } = await sb
    .from('factoring_requests')
    .insert({
      load_id,
      tenant_id: TENANT,
      invoice_id_hex,
      gross_amount_usdc: parseFloat(gross_amount_usdc),
      advance_rate_bps:  ADVANCE_RATE_BPS,
      fee_bps:           FEE_BPS,
      investor_fee_bps:  INVESTOR_FEE_BPS,
      platform_fee_bps:  PLATFORM_FEE_BPS,
      carrier_wallet: carrier_wallet ?? null,
      carrier_usdc_account: carrier_usdc_account ?? null,
      status: 'approved',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
