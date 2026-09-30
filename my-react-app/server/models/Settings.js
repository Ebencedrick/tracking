import mongoose from 'mongoose'

const SettingsSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, default: 'global_config' },
    airFreightRatePerKg: { type: Number, default: 8.5 },
    oceanFreightRatePerCbm: { type: Number, default: 4.2 },
    groundLinehaulRatePerKm: { type: Number, default: 1.85 },
    customsHandlingFee: { type: Number, default: 45.0 },
    fuelSurchargePercent: { type: Number, default: 14.2 },
    securityInspectionCharge: { type: Number, default: 25.0 },
    priorityExpressMultiplier: { type: Number, default: 1.5 },
    freeStorageDays: { type: Number, default: 3 },
  },
  { timestamps: true }
)

export const Settings = mongoose.models.Settings || mongoose.model('Settings', SettingsSchema)
