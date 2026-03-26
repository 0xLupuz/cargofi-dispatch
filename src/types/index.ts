// Trip status drives the 3-column Kanban board
export type TripStatus = 'open' | 'in_transit' | 'delivered'

// Legacy — kept for any remaining references; use TripStatus going forward
export type KanbanStatus = TripStatus

export interface OwnerOperator {
  id: string
  tenant_id: string
  name: string
  company_name?: string
  phone_whatsapp: string
  email?: string
  dispatch_fee_pct: number   // e.g. 13.0
  mc_number?: string
  dot_number?: string
  insurance_expiry?: string
  active: boolean
  notes?: string
  created_at: string
}

export interface Driver {
  id: string
  tenant_id: string
  owner_operator_id?: string
  name: string
  phone_whatsapp: string
  cdl_number?: string
  cdl_state?: string
  cdl_expiry?: string
  medical_card_expiry?: string
  active: boolean
  created_at: string
}

export interface Unit {
  id: string
  tenant_id: string
  owner_operator_id?: string
  unit_number: string
  make?: string
  model?: string
  year?: number
  vin?: string
  license_plate?: string
  license_state?: string
  license_plate_mx?: string
  eld_device_id?: string
  active: boolean
}

export interface Stop {
  id: string
  load_id: string
  stop_type: 'pickup' | 'delivery' | 'hook' | 'drop'
  sequence: number
  facility_name?: string
  address?: string
  city: string
  state: string
  zip?: string
  country?: string
  appointment_at?: string
  actual_arrival_at?: string
  actual_departure_at?: string
  notes?: string
}

export interface Deduction {
  id: string
  load_id: string
  description: string
  amount: number
  type: 'fuel_advance' | 'lumper' | 'tolls' | 'escrow' | 'other'
}

export interface Load {
  id: string
  tenant_id: string

  // Identifiers
  load_number: string        // Auto-generated: CF-0001 (CargoFi internal)
  work_order_number?: string // Client/broker's reference #

  // Trip status (3-column Kanban)
  trip_status: TripStatus

  // Accounting checklist (shown as progress dots on card)
  rate_con_ok:  boolean
  pod_ok:       boolean
  invoiced_ok:  boolean
  paid_ok:      boolean
  settled_ok:   boolean

  // Archive (null = visible on board; set when settlement WA sent)
  archived_at?: string | null

  // Parties
  owner_operator_id: string
  driver_id: string
  unit_id?: string

  // Broker/Customer
  broker_name: string
  broker_mc?: string
  broker_contact?: string
  broker_phone?: string
  broker_email?: string
  customer_name?: string

  // Rate
  rate: number
  currency: 'USD' | 'MXN'
  dispatch_fee_pct: number
  dispatch_fee_amount: number
  factoring_fee_pct?: number
  factoring_fee_amount?: number
  oo_gross: number
  oo_settlement: number

  // Documents
  bol_number?: string
  po_number?: string
  rate_con_url?: string
  pod_url?: string

  // Cargo
  commodity?: string
  weight_lbs?: number
  pieces?: number
  temp?: string

  // Cross-border
  mx_carrier?: string
  crossing_point?: string

  // Dates
  pickup_date?: string
  delivery_date?: string
  created_at: string
  updated_at: string

  // Relations (joined)
  owner_operator?: OwnerOperator
  driver?: Driver
  unit?: Unit
  stops?: Stop[]
  deductions?: Deduction[]
}
