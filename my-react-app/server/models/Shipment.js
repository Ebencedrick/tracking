import mongoose from 'mongoose'

const CheckpointSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    title: { type: String, required: true },
    location: { type: String, required: true },
    timestamp: { type: String, required: true },
    completed: { type: Boolean, default: false },
    current: { type: Boolean, default: false },
    detail: { type: String, default: '' },
  },
  { _id: false }
)

const LocationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    code: { type: String, default: '' },
    lat: { type: Number, default: 0 },
    lng: { type: Number, default: 0 },
  },
  { _id: false }
)

const ShipmentSchema = new mongoose.Schema(
  {
    waybill: { type: String, required: true, unique: true, index: true },
    clientName: { type: String, default: '' },
    clientEmail: { type: String, default: '' },
    clientReference: { type: String, default: '' },
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
    weightKg: { type: Number, default: 1 },
    packageCount: { type: Number, default: 1 },
    declaredValue: { type: Number, default: 1000 },
    rate: { type: Number, default: 100 },
    estimatedDistanceKm: { type: Number, default: 0 },
    eta: { type: String, default: '' },
    bookingDate: { type: String, default: '' },
    assignedDriver: { type: String, default: '' },
    vehicleId: { type: String, default: '' },
    isMovementStopped: { type: Boolean, default: false },
    packageImageUrl: { type: String, default: '' },
    checkpoints: [CheckpointSchema],
  },
  { timestamps: true }
)

export const Shipment = mongoose.models.Shipment || mongoose.model('Shipment', ShipmentSchema)
