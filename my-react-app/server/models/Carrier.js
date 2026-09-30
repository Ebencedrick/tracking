import mongoose from 'mongoose'

const CarrierSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    code: { type: String, required: true },
    logo: { type: String, default: '' },
    active: { type: Boolean, default: true },
    supportedModes: [{ type: String }],
    sla: { type: String, default: '99.2%' },
    onTimeRate: { type: Number, default: 98.4 },
    rating: { type: Number, default: 4.8 },
    contactEmail: { type: String, default: '' },
    contactPhone: { type: String, default: '' },
  },
  { timestamps: true }
)

export const Carrier = mongoose.models.Carrier || mongoose.model('Carrier', CarrierSchema)
