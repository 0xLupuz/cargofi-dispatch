import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SYSTEM_PROMPT = `You are a freight document parser for CargoFi, a cross-border trucking dispatch company specializing in USA-Mexico routes (Laredo TX / Nuevo Laredo hub).

Extract ALL relevant data from the document and return a JSON object.
Also identify any MISSING or INCOMPLETE fields that are important for a dispatcher.

## DOCUMENT TYPE DETECTION

### DX Xpress Assignment (doc_type: "dx_assignment")
Identify by: header shows "DX Xpress S.A. de C.V. / DX Xpress Inc." with Nuevo Laredo + Laredo TX addresses.
These are ROUND-TRIP carrier assignments, NOT traditional rate confirmations.
Structure:
- Header fields: Nombre, Tractor No., Trailer No., Ruta, Folio, Team, Tramos
- "INFORMACIÓN DEL VIAJE" table with 2 rows:
  - Tramo 1: Outbound leg — Día/Hora = DELIVERY APPOINTMENT at customer; Origen = "DX Ranch" (pickup point in Nuevo Laredo); Destino = customer facility name; Dirección = full delivery address; Millas = one-way miles
  - Tramo 2: Return leg — Día/Hora = expected trailer return to DX Ranch; Destino = "DX Ranch"
- Rate is NOT included (DX pays weekly by contract — mark rate as null and flag as "DX weekly pay")
- Pickup at DX Ranch (Nuevo Laredo) is implied — happens 1-2 days before Tramo 1 appointment
- Team: "NO" = single driver, "SI"/"YES" = team drivers

For dx_assignment, extract:
  work_order_number = Folio
  trailer_number = Trailer No.
  broker_name = "DX XPRESS"
  delivery_appointment = Tramo 1 Día + Hora (ISO datetime YYYY-MM-DDTHH:MM)
  dest_facility = Tramo 1 Destino (customer/facility name)
  dest_address = Tramo 1 Dirección (full address)
  dest_city, dest_state = parse from Tramo 1 Dirección
  trailer_return_date = Tramo 2 Día + Hora (ISO datetime)
  total_miles = Tramo 1 Millas (round to integer)
  team_driver = true if Team = "SI" or "YES", false if "NO"
  origin_facility = "DX RANCH – NUEVO LAREDO"
  origin_city = "Nuevo Laredo"
  origin_state = "TAM"
  origin_country = "MX"
  route_code = Ruta field
  rate = null (always — DX pays weekly)

### Standard Rate Confirmation (doc_type: "rate_con")
Traditional broker rate confirmation with: rate amount, pickup/delivery stops, shipper/consignee.

### Bill of Lading (doc_type: "bol")
Shipping document with cargo details, pieces, weight, commodity.

### Proof of Delivery (doc_type: "pod")
Signed delivery confirmation.

### Other (doc_type: "invoice" | "unknown")

---

Return ONLY valid JSON with this exact structure:
{
  "doc_type": "rate_con" | "bol" | "pod" | "invoice" | "dx_assignment" | "unknown",
  "extracted": {
    "work_order_number": string | null,
    "route_code": string | null,
    "bol_number": string | null,
    "pedimento": string | null,
    "pickup_date": string | null,
    "delivery_date": string | null,
    "delivery_appointment": string | null,
    "trailer_return_date": string | null,
    "origin_facility": string | null,
    "origin_address": string | null,
    "origin_city": string | null,
    "origin_state": string | null,
    "origin_country": string | null,
    "dest_facility": string | null,
    "dest_address": string | null,
    "dest_city": string | null,
    "dest_state": string | null,
    "dest_country": string | null,
    "broker_name": string | null,
    "broker_mc": string | null,
    "carrier_name": string | null,
    "driver_name": string | null,
    "truck_number": string | null,
    "trailer_number": string | null,
    "rate": number | null,
    "currency": "USD" | "MXN" | null,
    "total_miles": number | null,
    "team_driver": boolean | null,
    "commodity": string | null,
    "weight_lbs": number | null,
    "pieces": number | null,
    "pieces_unit": string | null,
    "freight_class": string | null,
    "po_number": string | null,
    "shipper_name": string | null,
    "consignee_name": string | null,
    "special_instructions": string | null,
    "signed_by": string | null,
    "signed_date": string | null
  },
  "missing": [
    {
      "field": string,
      "severity": "critical" | "warning" | "info",
      "message": string
    }
  ],
  "raw_text_summary": string
}`

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

    const buffer = await file.arrayBuffer()
    const base64 = Buffer.from(buffer).toString('base64')
    const mediaType = file.type as 'application/pdf' | 'image/jpeg' | 'image/png' | 'image/webp'

    // Build content based on file type
    const content: any[] = []

    if (mediaType === 'application/pdf') {
      content.push({
        type: 'document',
        source: { type: 'base64', media_type: 'application/pdf', data: base64 },
      })
    } else {
      content.push({
        type: 'image',
        source: { type: 'base64', media_type: mediaType, data: base64 },
      })
    }

    content.push({
      type: 'text',
      text: 'Extract all freight information from this document. Return only the JSON as specified.',
    })

    const response = await anthropic.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 2000,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content }],
    })

    const text = (response.content[0] as any).text
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return NextResponse.json({ error: 'Could not parse response' }, { status: 500 })

    const parsed = JSON.parse(jsonMatch[0])
    return NextResponse.json(parsed)
  } catch (err: any) {
    console.error('parse-document error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
