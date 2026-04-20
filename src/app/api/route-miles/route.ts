import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

// US state boundaries — simplified bounding boxes for fast lookup
// Format: [minLng, minLat, maxLng, maxLat]
// Used as a first-pass filter; actual routing uses polyline sampling
const STATE_BOXES: Record<string, [number, number, number, number]> = {
  AL: [-88.47, 30.14, -84.89, 35.01], AK: [-179.15, 51.21, -129.98, 71.54],
  AZ: [-114.82, 31.33, -109.04, 37.00], AR: [-94.62, 33.00, -89.64, 36.50],
  CA: [-124.41, 32.53, -114.13, 42.01], CO: [-109.06, 36.99, -102.04, 41.00],
  CT: [-73.73, 40.98, -71.79, 42.05], DE: [-75.79, 38.45, -75.05, 39.84],
  FL: [-87.63, 24.40, -79.97, 31.00], GA: [-85.61, 30.36, -80.84, 35.00],
  HI: [-160.25, 18.86, -154.80, 22.24], ID: [-117.24, 41.99, -111.04, 49.00],
  IL: [-91.51, 36.97, -87.02, 42.51], IN: [-88.10, 37.77, -84.78, 41.76],
  IA: [-96.64, 40.37, -90.14, 43.50], KS: [-102.05, 36.99, -94.59, 40.00],
  KY: [-89.57, 36.50, -81.96, 39.15], LA: [-94.04, 28.93, -88.82, 33.02],
  ME: [-71.08, 43.06, -66.95, 47.46], MD: [-79.49, 37.91, -74.98, 39.72],
  MA: [-73.51, 41.24, -69.93, 42.89], MI: [-90.42, 41.70, -82.12, 48.19],
  MN: [-97.24, 43.50, -89.49, 49.38], MS: [-91.65, 30.17, -88.10, 35.00],
  MO: [-95.77, 35.99, -89.10, 40.61], MT: [-116.05, 44.36, -104.04, 49.00],
  NE: [-104.05, 40.00, -95.31, 43.00], NV: [-120.01, 35.00, -114.04, 42.00],
  NH: [-72.56, 42.70, -70.61, 45.31], NJ: [-75.56, 38.93, -73.90, 41.36],
  NM: [-109.05, 31.33, -103.00, 37.00], NY: [-79.76, 40.50, -71.86, 45.01],
  NC: [-84.32, 33.84, -75.46, 36.59], ND: [-104.05, 45.93, -96.56, 49.00],
  OH: [-84.82, 38.40, -80.52, 42.00], OK: [-103.00, 33.62, -94.43, 37.00],
  OR: [-124.57, 41.99, -116.46, 46.24], PA: [-80.52, 39.72, -74.69, 42.27],
  RI: [-71.91, 41.15, -71.12, 42.01], SC: [-83.35, 32.05, -78.55, 35.22],
  SD: [-104.06, 42.48, -96.44, 45.94], TN: [-90.31, 34.98, -81.65, 36.68],
  TX: [-106.65, 25.84, -93.51, 36.50], UT: [-114.05, 36.99, -109.04, 42.00],
  VT: [-73.44, 42.73, -71.46, 45.02], VA: [-83.68, 36.54, -75.24, 39.47],
  WA: [-124.73, 45.54, -116.92, 49.00], WV: [-82.64, 37.20, -77.72, 40.64],
  WI: [-92.89, 42.49, -86.25, 47.08], WY: [-111.06, 40.99, -104.05, 45.01],
}

function getStateForPoint(lat: number, lng: number): string | null {
  for (const [state, [minLng, minLat, maxLng, maxLat]] of Object.entries(STATE_BOXES)) {
    if (lng >= minLng && lng <= maxLng && lat >= minLat && lat <= maxLat) return state
  }
  return null
}

function decodePolyline(encoded: string): [number, number][] {
  const points: [number, number][] = []
  let idx = 0, lat = 0, lng = 0
  while (idx < encoded.length) {
    let b, shift = 0, result = 0
    do { b = encoded.charCodeAt(idx++) - 63; result |= (b & 0x1f) << shift; shift += 5 } while (b >= 0x20)
    lat += (result & 1) ? ~(result >> 1) : result >> 1
    shift = 0; result = 0
    do { b = encoded.charCodeAt(idx++) - 63; result |= (b & 0x1f) << shift; shift += 5 } while (b >= 0x20)
    lng += (result & 1) ? ~(result >> 1) : result >> 1
    points.push([lat / 1e5, lng / 1e5])
  }
  return points
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371, dLat = (lat2 - lat1) * Math.PI / 180, dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
}

// POST /api/route-miles { load_id, origin_coords, dest_coords }
// or { load_id, origin: "City, State", destination: "City, State" }
export async function POST(req: NextRequest) {
  const sb   = createServiceClient()
  const body = await req.json()
  const { load_id, origin, destination } = body

  try {
    // 1. Geocode origin + destination using Nominatim (free OSM)
    async function geocode(place: string): Promise<[number, number] | null> {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(place)}&format=json&limit=1&countrycodes=us,mx`
      const res = await fetch(url, { headers: { 'User-Agent': 'CargoFi-Dispatch/1.0' } })
      const data = await res.json()
      if (!data?.[0]) return null
      return [parseFloat(data[0].lat), parseFloat(data[0].lon)]
    }

    const [originCoords, destCoords] = await Promise.all([
      body.origin_coords ?? geocode(origin),
      body.dest_coords   ?? geocode(destination),
    ])

    if (!originCoords || !destCoords) {
      return NextResponse.json({ error: 'Could not geocode locations' }, { status: 400 })
    }

    // 2. Call OpenRoute Service for truck route
    const ORS_KEY = process.env.ORS_API_KEY ?? '5b3ce3597851110001cf62481849aba1e8274a1fa9462ca6d86f553b'
    const orsRes = await fetch('https://api.openrouteservice.org/v2/directions/driving-hgv', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': ORS_KEY },
      body: JSON.stringify({
        coordinates: [[originCoords[1], originCoords[0]], [destCoords[1], destCoords[0]]],
        format: 'json',
      }),
    })

    if (!orsRes.ok) {
      const err = await orsRes.text()
      return NextResponse.json({ error: `ORS error: ${err}` }, { status: 502 })
    }

    const orsData = await orsRes.json()
    const route   = orsData.routes?.[0]
    if (!route) return NextResponse.json({ error: 'No route found' }, { status: 404 })

    const totalMiles = route.summary.distance / 1609.34  // meters → miles

    // 3. Decode polyline and sample every ~20 miles
    const points = decodePolyline(route.geometry)
    const stateMiles: Record<string, number> = {}

    for (let i = 1; i < points.length; i++) {
      const [lat1, lng1] = points[i - 1]
      const [lat2, lng2] = points[i]
      const segMiles = haversineKm(lat1, lng1, lat2, lng2) * 0.621371
      const state = getStateForPoint((lat1 + lat2) / 2, (lng1 + lng2) / 2)
      if (state) stateMiles[state] = (stateMiles[state] ?? 0) + segMiles
    }

    // 4. Persist to ifta_state_miles + update load total_miles
    if (load_id) {
      const now    = new Date()
      const quarter = Math.ceil((now.getMonth() + 1) / 3)
      const year    = now.getFullYear()

      // Upsert per state
      const rows = Object.entries(stateMiles).map(([state, miles]) => ({
        load_id, state, miles: Math.round(miles * 10) / 10, quarter, year, auto_calculated: true,
      }))

      // Delete old rows for this load then insert fresh
      await sb.from('ifta_state_miles').delete().eq('load_id', load_id)
      if (rows.length > 0) await sb.from('ifta_state_miles').insert(rows)

      await sb.from('loads').update({ total_miles: Math.round(totalMiles * 10) / 10 }).eq('id', load_id)
    }

    return NextResponse.json({ total_miles: totalMiles, state_miles: stateMiles })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
