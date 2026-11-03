import { NextResponse } from 'next/server'
import { connectToDatabase } from '../../../src/lib/db'
import { Shipment } from '../../../server/models/Shipment.js'
import { Settings } from '../../../server/models/Settings.js'
import { sendConsignmentCreationNotifications, ConsignmentEmailPayload } from '../../../src/lib/email'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    await connectToDatabase()
    const body = await request.json()
    const { waybill, target, customRecipientEmail } = body

    if (!waybill) {
      return NextResponse.json({ error: 'Waybill is required' }, { status: 400 })
    }

    const cleanWaybill = waybill.trim()
    const shipment = await (Shipment as any).findOne({
      $or: [
        { waybill: { $regex: new RegExp(`^${cleanWaybill}$`, 'i') } },
        { id: cleanWaybill },
      ],
    }).lean()

    if (!shipment) {
      return NextResponse.json({ error: `Shipment with waybill ${waybill} not found.` }, { status: 404 })
    }

    const payload: ConsignmentEmailPayload = {
      waybill: shipment.waybill,
      carrier: shipment.carrier || 'Global Express',
      mode: shipment.mode || 'air',
      origin: shipment.origin || { name: 'Origin Hub' },
      destination: shipment.destination || { name: 'Destination Gateway' },
      senderName: shipment.senderName || 'Shipper',
      senderEmail: customRecipientEmail && target === 'custom' ? customRecipientEmail : (shipment.senderEmail || ''),
      receiverName: shipment.receiverName || shipment.clientName || 'Consignee',
      receiverEmail: customRecipientEmail && target === 'custom' ? customRecipientEmail : (shipment.receiverEmail || shipment.clientEmail || ''),
      cargoType: shipment.cargoType,
      weightKg: shipment.weightKg,
      packageCount: shipment.packageCount,
      declaredValue: shipment.declaredValue,
      serviceTier: shipment.serviceTier,
      eta: shipment.eta,
      status: shipment.status,
      statusNote: shipment.statusNote,
    }

    const dbSettings = await (Settings as any).findOne({ key: 'global_config' }).lean().catch(() => null)
    const result = await sendConsignmentCreationNotifications(payload, {
      resendApiKey: dbSettings?.resendApiKey,
      brevoApiKey: dbSettings?.brevoApiKey,
      emailFrom: dbSettings?.emailFrom,
    })
    return NextResponse.json({ success: result.success, result })
  } catch (err: any) {
    console.error('[API /api/send-email POST Error]:', err)
    return NextResponse.json(
      { error: 'Failed to process email dispatch request', details: err?.message || err },
      { status: 500 }
    )
  }
}
