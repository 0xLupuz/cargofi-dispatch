import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

const TENANT_ID = '00000000-0000-0000-0000-000000000001'

// IFTA fuel tax rates per state (¢/gallon) — 2024 Q1 rates
// Source: IFTA Inc. — update quarterly
const IFTA_RATES: Record<string, number> = {
  AL:0.280, AR:0.245, AZ:0.260, CA:0.533, CO:0.205, CT:0.400, DE:0.220,
  FL:0.336, GA:0.312, IA:0.325, ID:0.320, IL:0.455, IN:0.530, KS:0.240,
  KY:0.246, LA:0.200, MA:0.240, MD:0.363, ME:0.312, MI:0.272, MN:0.285,
  MO:0.195, MS:0.185, MT:0.295, NC:0.395, ND:0.230, NE:0.299, NH:0.223,
  NJ:0.418, NM:0.210, NV:0.230, NY:0.471, OH:0.385, OK:0.190, OR:0.348,
  PA:0.741, RI:0.340, SC:0.260, SD:0.280, TN:0.270, TX:0.200, UT:0.313,
  VA:0.262, VT:0.270, WA:0.494, WI:0.327, WV:0.357, WY:0.240,
  // Canada
  AB:0.130, BC:0.145, MB:0.143, NB:0.153, NL:0.165, NS:0.155,
  ON:0.143, QC:0.202, SK:0.150,
}

// GET /api/ifta?quarter=1&year=2026
export async function GET(req: NextRequest) {
  const sb = createServiceClient()
  const { searchParams } = req.nextUrl
  const quarter = parseInt(searchParams.get('quarter') ?? String(Math.ceil((new Date().getMonth() + 1) / 3)))
  const year    = parseInt(searchParams.get('year')    ?? String(new Date().getFullYear()))

  // 1. State miles for the quarter
  const { data: milesData } = await sb
    .from('ifta_state_miles')
    .select('state, miles, load_id')
    .eq('quarter', quarter)
    .eq('year', year)

  // 2. Fuel purchases for the quarter
  const startMonth = (quarter - 1) * 3 + 1
  const endMonth   = quarter * 3
  const startDate  = `${year}-${String(startMonth).padStart(2,'0')}-01`
  const endDate    = `${year}-${String(endMonth).padStart(2,'0')}-31`

  const { data: fuelData } = await sb
    .from('fuel_purchases')
    .select('state, gallons, amount')
    .gte('purchase_date', startDate)
    .lte('purchase_date', endDate)

  // 3. Aggregate by state
  const stateMap: Record<string, { miles: number; gallons_purchased: number; fuel_cost: number }> = {}

  for (const row of milesData ?? []) {
    if (!stateMap[row.state]) stateMap[row.state] = { miles: 0, gallons_purchased: 0, fuel_cost: 0 }
    stateMap[row.state].miles += parseFloat(row.miles)
  }

  for (const row of fuelData ?? []) {
    if (!stateMap[row.state]) stateMap[row.state] = { miles: 0, gallons_purchased: 0, fuel_cost: 0 }
    stateMap[row.state].gallons_purchased += parseFloat(row.gallons)
    stateMap[row.state].fuel_cost += parseFloat(row.amount)
  }

  // 4. Calculate IFTA for each state
  const totalMiles   = Object.values(stateMap).reduce((s, r) => s + r.miles, 0)
  const totalGallons = Object.values(stateMap).reduce((s, r) => s + r.gallons_purchased, 0)
  const avgMpg       = totalGallons > 0 ? totalMiles / totalGallons : 0

  const rows = Object.entries(stateMap).map(([state, data]) => {
    const gallons_consumed  = avgMpg > 0 ? data.miles / avgMpg : 0
    const tax_rate          = IFTA_RATES[state] ?? 0
    const tax_paid          = data.gallons_purchased * tax_rate
    const tax_owed          = gallons_consumed * tax_rate
    const net_tax           = tax_owed - tax_paid  // positive = owe, negative = refund

    return {
      state,
      miles:               Math.round(data.miles * 10) / 10,
      gallons_purchased:   Math.round(data.gallons_purchased * 1000) / 1000,
      gallons_consumed:    Math.round(gallons_consumed * 1000) / 1000,
      tax_rate_cents:      tax_rate,
      tax_paid:            Math.round(tax_paid * 100) / 100,
      tax_owed:            Math.round(tax_owed * 100) / 100,
      net_tax:             Math.round(net_tax * 100) / 100,  // + = owe, - = credit
    }
  })

  // Sort: states with miles first, then by state name
  rows.sort((a, b) => (b.miles - a.miles) || a.state.localeCompare(b.state))

  const totals = {
    total_miles:            Math.round(totalMiles * 10) / 10,
    total_gallons_purchased: Math.round(totalGallons * 1000) / 1000,
    avg_mpg:                Math.round(avgMpg * 100) / 100,
    total_net_tax:          Math.round(rows.reduce((s, r) => s + r.net_tax, 0) * 100) / 100,
  }

  return NextResponse.json({ quarter, year, states: rows, totals })
}
