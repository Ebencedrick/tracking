import { NextResponse } from 'next/server'
import { connectToDatabase } from '../../../../src/lib/db'
import { Shipment } from '../../../../server/models/Shipment.js'

export const dynamic = 'force-dynamic'

interface Params {
  params: Promise<{ waybill: string }>
}

export async function GET(request: Request, context: Params) {
  try {
    await connectToDatabase()
    const { waybill } = await context.params
    const rawWaybill = decodeURIComponent(waybill || '').trim()
    const cleanWaybill = rawWaybill.replace(/\s+/g, '')
    const bareWaybill = cleanWaybill.replace(/^[A-Za-z]{3,4}-/, '')

    const escapedClean = cleanWaybill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const escapedBare = bareWaybill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

    const shipment = await (Shipment as any).findOne({
      $or: [
        { waybill: { $regex: new RegExp(`^${escapedClean}$`, 'i') } },
        { waybill: { $regex: new RegExp(`^PLOT-${escapedBare}$`, 'i') } },
        { waybill: { $regex: new RegExp(`^NTS-${escapedBare}$`, 'i') } },
        { waybill: { $regex: new RegExp(`${escapedBare}`, 'i') } },
        { clientReference: { $regex: new RegExp(`^${escapedClean}$`, 'i') } },
        { id: cleanWaybill },
      ],
    }).lean()

    if (!shipment) {
      return NextResponse.json({ error: 'Shipment not found' }, { status: 404 })
    }

    return NextResponse.json(shipment)
  } catch (err: any) {
    console.error('[API /api/shipments/[waybill] GET Error]:', err)
    return NextResponse.json(
      { error: 'Failed to fetch shipment', details: err.message },
      { status: 500 }
    )
  }
}


export async function PUT(request: Request, context: Params) {
  try {
    await connectToDatabase()
    const { waybill } = await context.params
    const rawWaybill = decodeURIComponent(waybill || '').trim()
    const cleanWaybill = rawWaybill.replace(/\s+/g, '')
    const bareWaybill = cleanWaybill.replace(/^[A-Za-z]{3,4}-/, '')

    const escapedClean = cleanWaybill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const escapedBare = bareWaybill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const data = await request.json()

    const updated = await (Shipment as any).findOneAndUpdate(
      {
        $or: [
          { waybill: { $regex: new RegExp(`^${escapedClean}$`, 'i') } },
          { waybill: { $regex: new RegExp(`^PLOT-${escapedBare}$`, 'i') } },
          { waybill: { $regex: new RegExp(`^NTS-${escapedBare}$`, 'i') } },
          { waybill: { $regex: new RegExp(`${escapedBare}`, 'i') } },
          { clientReference: { $regex: new RegExp(`^${escapedClean}$`, 'i') } },
          { id: cleanWaybill },
        ],
      },
      { $set: data },
      { new: true, upsert: true, runValidators: false }
    ).lean()

    return NextResponse.json(updated)
  } catch (err: any) {
    console.error('[API /api/shipments/[waybill] PUT Error]:', err)
    return NextResponse.json(
      { error: 'Failed to update shipment', details: err.message },
      { status: 400 }
    )
  }
}

export async function DELETE(request: Request, context: Params) {
  try {
    await connectToDatabase()
    const { waybill } = await context.params
    const rawWaybill = decodeURIComponent(waybill || '').trim()
    const cleanWaybill = rawWaybill.replace(/\s+/g, '')
    const bareWaybill = cleanWaybill.replace(/^[A-Za-z]{3,4}-/, '')

    const escapedClean = cleanWaybill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const escapedBare = bareWaybill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

    const deleted = await (Shipment as any).findOneAndDelete({
      $or: [
        { waybill: { $regex: new RegExp(`^${escapedClean}$`, 'i') } },
        { waybill: { $regex: new RegExp(`^PLOT-${escapedBare}$`, 'i') } },
        { waybill: { $regex: new RegExp(`^NTS-${escapedBare}$`, 'i') } },
        { waybill: { $regex: new RegExp(`${escapedBare}`, 'i') } },
        { clientReference: { $regex: new RegExp(`^${escapedClean}$`, 'i') } },
        { id: cleanWaybill },
      ],
    })

    if (!deleted) {
      return NextResponse.json({ error: 'Shipment not found to delete' }, { status: 404 })
    }

    return NextResponse.json({ message: 'Shipment deleted successfully', waybill: cleanWaybill })
  } catch (err: any) {
    console.error('[API /api/shipments/[waybill] DELETE Error]:', err)
    return NextResponse.json(
      { error: 'Failed to delete shipment', details: err.message },
      { status: 500 }
    )
  }
}
