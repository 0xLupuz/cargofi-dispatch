import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SYSTEM_PROMPT = `You are a freight document parser for CargoFi, a cross-border trucking dispatch company (USA-Mexico routes).

Extract ALL relevant data from the document and return a JSON object.
Also identify any MISSING or INCOMPLETE fields that are important for a dispatcher.

Return ONLY valid JSON with this exact structure:
{
  "doc_type": "bol" | "rate_con" | "pod" | "invoice" | "unknown",
  "extracted": {
    "bol_number": string | null,
    "pedimento": string | null,
    "load_number": string | null,
    "pickup_date": string | null,       // ISO date YYYY-MM-DD
    "delivery_date": string | null,     // ISO date YYYY-MM-DD
    "pickup_appointment": string | null,
    "delivery_appointment": string | null,
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
    "shipper_name": string | null,
    "consignee_name": string | null,
    "consignee_contact": string | null,
    "carrier_name": string | null,
    "carrier_scac": string | null,
    "driver_name": string | null,
    "truck_number": string | null,
    "trailer_number": string | null,
    "broker_name": string | null,
    "broker_mc": string | null,
    "rate": number | null,
    "currency": "USD" | "MXN" | null,
    "commodity": string | null,
    "weight_lbs": number | null,
    "pieces": number | null,
    "pieces_unit": string | null,
    "nmfc": string | null,
    "freight_class": string | null,
    "freight_terms": "prepaid" | "collect" | "third_party" | null,
    "po_number": string | null,
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
