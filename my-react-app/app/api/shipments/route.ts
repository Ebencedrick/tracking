import { NextResponse } from 'next/server'
import { connectToDatabase } from '../../../src/lib/db'
import { Shipment } from '../../../server/models/Shipment.js'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    await connectToDatabase()
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const carrier = searchParams.get('carrier')
    const mode = searchParams.get('mode')
    const query = searchParams.get('query')

    const filter: Record<string, any> = {}

    if (status && status !== 'all') filter.status = status
    if (carrier) filter.carrier = carrier
    if (mode && mode !== 'all') filter.mode = mode

    if (query) {
      const qRegex = new RegExp(query, 'i')
      filter.$or = [
        { waybill: qRegex },
        { clientName: qRegex },
        { clientEmail: qRegex },
        { receiverName: qRegex },
        { receiverEmail: qRegex },
        { senderName: qRegex },
        { 'origin.name': qRegex },
        { 'destination.name': qRegex },
        { carrier: qRegex },
        { assignedDriver: qRegex },
      ]
    }

    const shipments = await (Shipment as any).find(filter).sort({ createdAt: -1 }).lean()
    return NextResponse.json(shipments)
  } catch (err: any) {
    console.error('[API /api/shipments GET Error]:', err)
    return NextResponse.json(
      { error: 'Failed to fetch shipments', details: err.message },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    await connectToDatabase()
    const data = await request.json()

    if (!data.waybill) {
      const prefix = (data.carrierCode || 'EXP').toUpperCase().slice(0, 3)
      const randomNum = Math.floor(10000 + Math.random() * 90000)
      const suffix = (data.destination?.code || 'GLB').toUpperCase().slice(0, 3)
      data.waybill = `${prefix}-${randomNum}-${suffix}`
    }

    const cleanWaybill = data.waybill.trim()
    const bareWaybill = cleanWaybill.replace(/^PLOT-/, '').replace(/^NTS-/, '')

    const created = await (Shipment as any).findOneAndUpdate(
      {
        $or: [
          { waybill: { $regex: new RegExp(`^${cleanWaybill}$`, 'i') } },
          { waybill: { $regex: new RegExp(`^PLOT-${bareWaybill}$`, 'i') } },
          { waybill: { $regex: new RegExp(`^NTS-${bareWaybill}$`, 'i') } },
        ],
      },
      { $set: data },
      { upsert: true, new: true, runValidators: false }
    ).lean()

    return NextResponse.json(created, { status: 201 })
  } catch (err: any) {
    console.error('[API /api/shipments POST Error]:', err)
    return NextResponse.json(
      { error: 'Failed to create shipment in database', details: err.message },
      { status: 400 }
    )
  }
}
