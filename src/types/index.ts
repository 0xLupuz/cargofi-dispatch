export type KanbanStatus =
  | 'available'      // OO disponible
  | 'rate_con'       // Rate con recibida, pendiente de confirmar
  | 'confirmed'      // Carga confirmada
  | 'in_transit'     // En ruta
  | 'delivered'      // Entregada, POD pendiente
  | 'pod_received'   // POD recibido
  | 'invoiced'       // Factura enviada al broker
  | 'paid'           // Broker pagó
  | 'settled'        // OO liquidado

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
  owner_operator_id?: string  // nullable — driver puede ser independiente
  name: string
  phone_whatsapp: string     // para check-ins
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
  amount: number   // negative = deduction from OO settlement
  type: 'fuel_advance' | 'lumper' | 'tolls' | 'escrow' | 'other'
}

export interface Load {
  id: string
  tenant_id: string
  load_number: string
  kanban_status: KanbanStatus

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
  oo_gross: number         // rate - factoring
  oo_settlement: number   // oo_gross - dispatch_fee - deductions

  // Documents
  bol_number?: string
  po_number?: string
  rate_con_url?: string
  pod_url?: string

  // Cargo
  commodity?: string
  weight_lbs?: number
  pieces?: number
  temp?: string   // for reefer

  // Cross-border
  mx_carrier?: string   // CAAT / permiso México
  crossing_point?: string  // e.g. "Laredo/Nuevo Laredo"

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
