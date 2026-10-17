export type ShipmentStatus = 'pending' | 'in_transit' | 'customs' | 'delivered' | 'exception'

export type ShippingMode = 'air' | 'sea' | 'land'

export type CheckpointEventType =
  | 'booked'
  | 'dispatched'
  | 'pickup'
  | 'in_transit'
  | 'customs'
  | 'customs_hold'
  | 'customs_cleared'
  | 'out_for_delivery'
  | 'delivered'
  | 'exception'

export interface Checkpoint {
  id: string
  title: string
  detail?: string
  location: string
  time?: string
  timestamp: string
  lat?: number
  lng?: number
  eventType?: CheckpointEventType
  status?: ShipmentStatus
  completed: boolean
  current?: boolean
}


export interface ShipmentDocument {
  id: string
  name: string
  type: 'invoice' | 'customs' | 'label' | 'pod'
  size: string
  date: string
}

export interface Shipment {
  id: string
  waybill: string
  carrier: string
  carrierCode: string
  mode: ShippingMode
  origin: {
    name: string
    code: string
    lat: number
    lng: number
  }
  destination: {
    name: string
    code: string
    lat: number
    lng: number
  }
  currentLocation: {
    name: string
    lat: number
    lng: number
  }
  status: ShipmentStatus
  statusNote?: string
  weightKg: number
  packageCount: number
  declaredValue: number
  clientReference: string
  clientName: string
  clientEmail?: string
  clientId: string
  rate: number
  eta: string
  createdAt: string
  checkpoints: Checkpoint[]
  documents: ShipmentDocument[]
  assignedDriver?: string
  vehicleId?: string
  telemetryActive?: boolean
  progressPct?: number
  serviceTier?: string
  isCustomerBooking?: boolean
  isMovementStopped?: boolean
  movementStopReason?: string
  movementStoppedAt?: string
  senderName?: string
  senderEmail?: string
  senderPhone?: string
  receiverName?: string
  receiverEmail?: string
  receiverPhone?: string
  packageImageUrl?: string
  transportScope?: 'Domestic' | 'Regional' | 'International'
  cargoType?: string
  bookingDate?: string
  estimatedDistanceKm?: number
  routePolyline?: [number, number][]
  returnRoutePolyline?: [number, number][]
}


export interface Carrier {
  id: string
  name: string
  code: string
  mode: ShippingMode[]
  logoUrl?: string
  slaScore: number
  activeFleet: number
  baseRateMultiplier: number
  status: 'active' | 'maintenance' | 'suspended'
  contact: string
  coverage: string
}

export interface UserAccount {
  id: string
  name: string
  email: string
  role: 'client' | 'ops' | 'admin'
  companyName: string
  billingAddress: string
  taxId: string
  creditBalance: number
  tier: 'Starter' | 'Standard' | 'Enterprise Gold'
  status: 'active' | 'suspended'
  lastLogin?: string
}

export interface RateConfig {
  airPerKg: number
  seaPerKg: number
  landPerKg: number
  fuelSurchargePct: number
  customsClearanceFee: number
  peakSeasonMultiplier: number
}

export interface AuditLog {
  id: string
  timestamp: string
  user: string
  action: string
  category: 'SHIPMENT' | 'CHECKPOINT' | 'RATES' | 'CARRIER' | 'SECURITY' | 'TELEMETRY'
  waybill?: string
  details: string
  severity: 'info' | 'warning' | 'critical'
}

export interface HubNode {
  id: string
  name: string
  code: string
  lat: number
  lng: number
  status: 'ONLINE' | 'DEGRADED' | 'OFFLINE'
  latencyMs: number
  activeConsignments: number
  region: string
}

export interface InquiryMessage {
  id: string
  senderName: string
  senderEmail: string
  subject: string
  message: string
  topic?: string
  waybillRef?: string
  status: 'unread' | 'read' | 'resolved' | 'new' | 'pending' | 'replied'
  replyMessage?: string
  repliedAt?: string
  createdAtStr?: string
}

export interface ChatMessage {
  id: string
  sender: 'client' | 'agent' | 'system'
  text: string
  time: string
}

export interface ChatSession {
  id: string
  clientName: string
  clientEmail?: string
  waybillRef?: string
  status: 'active' | 'waiting' | 'closed'
  lastMessageTime?: string
  unreadCount?: number
  messages: ChatMessage[]
}

export interface TariffSettings {
  key?: string
  airFreightRatePerKg: number
  oceanFreightRatePerCbm: number
  groundLinehaulRatePerKm: number
  customsHandlingFee: number
  fuelSurchargePercent: number
  securityInspectionCharge: number
  priorityExpressMultiplier: number
  freeStorageDays: number
}
