import mongoose from 'mongoose'

const CheckpointSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    title: { type: String, required: true },
    location: { type: String, required: true },
    timestamp: { type: String, required: true },
    time: { type: String, default: '' },
    completed: { type: Boolean, default: false },
    current: { type: Boolean, default: false },
    detail: { type: String, default: '' },
    lat: { type: Number },
    lng: { type: Number },
    eventType: { type: String, default: 'in_transit' },
    status: { type: String, default: 'in_transit' },
  },
  { _id: false, strict: false }
)

const LocationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    code: { type: String, default: '' },
    lat: { type: Number, default: 0 },
    lng: { type: Number, default: 0 },
  },
  { _id: false, strict: false }
)

const DocumentSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    name: { type: String, required: true },
    type: { type: String, default: 'label' },
    size: { type: String, default: '220 KB' },
    date: { type: String, default: 'Just now' },
  },
  { _id: false, strict: false }
)

const ShipmentSchema = new mongoose.Schema(
  {
    waybill: { type: String, required: true, unique: true, index: true },
    clientName: { type: String, default: '' },
    clientEmail: { type: String, default: '' },
    clientReference: { type: String, default: '' },
    clientId: { type: String, default: 'u2' },
    senderName: { type: String, default: '' },
    senderEmail: { type: String, default: '' },
    senderPhone: { type: String, default: '' },
    receiverName: { type: String, default: '' },
    receiverEmail: { type: String, default: '' },
    receiverPhone: { type: String, default: '' },
    origin: { type: LocationSchema, required: true },
    destination: { type: LocationSchema, required: true },
    currentLocation: { type: LocationSchema },
    status: {
      type: String,
      enum: ['pending', 'in_transit', 'customs', 'delivered', 'exception'],
      default: 'pending',
      index: true,
    },
    statusNote: { type: String, default: '' },
    mode: {
      type: String,
      enum: ['air', 'sea', 'land'],
      default: 'air',
    },
    carrier: { type: String, default: 'DHL Express' },
    carrierCode: { type: String, default: 'DHL' },
    transportScope: { type: String, default: 'International' },
    cargoType: { type: String, default: 'Commercial Goods' },
    serviceTier: { type: String, default: 'STANDARD' },
    isCustomerBooking: { type: Boolean, default: true },
    weightKg: { type: Number, default: 1 },
    packageCount: { type: Number, default: 1 },
    declaredValue: { type: Number, default: 1000 },
    rate: { type: Number, default: 100 },
    estimatedDistanceKm: { type: Number, default: 0 },
    eta: { type: String, default: '' },
    bookingDate: { type: String, default: '' },
    assignedDriver: { type: String, default: '' },
    vehicleId: { type: String, default: '' },
    progressPct: { type: Number, default: 5 },
    telemetryActive: { type: Boolean, default: true },
    isMovementStopped: { type: Boolean, default: false },
    movementStopReason: { type: String, default: '' },
    movementStoppedAt: { type: String, default: '' },
    packageImageUrl: { type: String, default: '' },
    checkpoints: [CheckpointSchema],
    documents: [DocumentSchema],
  },
  { timestamps: true, strict: false }
)

export const Shipment = mongoose.models.Shipment || mongoose.model('Shipment', ShipmentSchema)

