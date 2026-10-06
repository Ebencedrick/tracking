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
    const cleanWaybill = decodeURIComponent(waybill || '').trim()
    const bareWaybill = cleanWaybill.replace(/^PLOT-/, '').replace(/^NTS-/, '')

    const shipment = await (Shipment as any).findOne({
      $or: [
        { waybill: { $regex: new RegExp(`^${cleanWaybill}$`, 'i') } },
        { waybill: { $regex: new RegExp(`^PLOT-${bareWaybill}$`, 'i') } },
        { waybill: { $regex: new RegExp(`^NTS-${bareWaybill}$`, 'i') } },
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
    const cleanWaybill = decodeURIComponent(waybill || '').trim()
    const bareWaybill = cleanWaybill.replace(/^PLOT-/, '').replace(/^NTS-/, '')
    const data = await request.json()

    const updated = await (Shipment as any).findOneAndUpdate(
      {
        $or: [
          { waybill: { $regex: new RegExp(`^${cleanWaybill}$`, 'i') } },
          { waybill: { $regex: new RegExp(`^PLOT-${bareWaybill}$`, 'i') } },
          { waybill: { $regex: new RegExp(`^NTS-${bareWaybill}$`, 'i') } },
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
    const cleanWaybill = decodeURIComponent(waybill || '').trim()
    const bareWaybill = cleanWaybill.replace(/^PLOT-/, '').replace(/^NTS-/, '')

    const deleted = await (Shipment as any).findOneAndDelete({
      $or: [
        { waybill: { $regex: new RegExp(`^${cleanWaybill}$`, 'i') } },
        { waybill: { $regex: new RegExp(`^PLOT-${bareWaybill}$`, 'i') } },
        { waybill: { $regex: new RegExp(`^NTS-${bareWaybill}$`, 'i') } },
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
