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
    const trackingOnly = new URL(request.url).searchParams.get('tracking') === '1'
    const rawWaybill = decodeURIComponent(waybill || '').trim()
    const cleanWaybill = rawWaybill.replace(/\s+/g, '')
    const bareWaybill = cleanWaybill.replace(/^[A-Za-z]{3,4}-/, '')

    const escapedClean = cleanWaybill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const escapedBare = bareWaybill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

    // Step 1: Indexed exact matches (sub-millisecond B-tree lookup)
    const trackingFields = [
      'id',
      'waybill',
      'carrier',
      'carrierCode',
      'mode',
      'origin',
      'destination',
      'currentLocation',
      'status',
      'weightKg',
      'packageCount',
      'eta',
      'createdAt',
      'checkpoints.id',
      'checkpoints.title',
      'checkpoints.location',
      'checkpoints.timestamp',
      'checkpoints.time',
      'checkpoints.completed',
      'checkpoints.current',
      'checkpoints.lat',
      'checkpoints.lng',
      'checkpoints.eventType',
      'checkpoints.status',
      'transportScope',
      'cargoType',
      'bookingDate',
      'estimatedDistanceKm',
      'progressPct',
      'isMovementStopped',
      'vehicleId',
      'serviceTier',
    ]

    let shipmentQuery = (Shipment as any).findOne({
      $or: [
        { waybill: cleanWaybill },
        { waybill: cleanWaybill.toUpperCase() },
        { waybill: `PLOT-${bareWaybill.toUpperCase()}` },
        { waybill: `NTS-${bareWaybill.toUpperCase()}` },
        { clientReference: cleanWaybill },
        { id: cleanWaybill },
      ],
    })
    if (trackingOnly) shipmentQuery = shipmentQuery.select(trackingFields.join(' '))
    let shipment = await shipmentQuery.lean()

    // Step 2: Fallback to case-insensitive regex only if exact index match yields nothing
    if (!shipment) {
      let fallbackQuery = (Shipment as any).findOne({
        $or: [
          { waybill: { $regex: new RegExp(`^${escapedClean}$`, 'i') } },
          { waybill: { $regex: new RegExp(`^PLOT-${escapedBare}$`, 'i') } },
          { waybill: { $regex: new RegExp(`^NTS-${escapedBare}$`, 'i') } },
          { waybill: { $regex: new RegExp(`${escapedBare}`, 'i') } },
          { clientReference: { $regex: new RegExp(`^${escapedClean}$`, 'i') } },
        ],
      })
      if (trackingOnly) fallbackQuery = fallbackQuery.select(trackingFields.join(' '))
      shipment = await fallbackQuery.lean()
    }

    if (!shipment) {
      return NextResponse.json({ error: 'Shipment not found' }, { status: 404 })
    }

    if (trackingOnly) {
      const { _id, id, ...trackingData } = shipment
      const locationFields = ({ name, code, lat, lng }: Record<string, unknown> = {}) => ({
        name,
        code,
        lat,
        lng,
      })
      return NextResponse.json(
        {
          ...trackingData,
          id: id || _id?.toString() || trackingData.waybill,
          origin: locationFields(trackingData.origin),
          destination: locationFields(trackingData.destination),
          currentLocation: locationFields(trackingData.currentLocation),
          checkpoints: (trackingData.checkpoints || []).map(
            ({ id: checkpointId, title, location, timestamp, time, completed, current, lat, lng, eventType, status }: Record<string, unknown>) => ({
              id: checkpointId,
              title,
              location,
              timestamp,
              time,
              completed,
              current,
              lat,
              lng,
              eventType,
              status,
            })
          ),
        },
        {
          headers: {
            'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=120',
          },
        }
      )
    }

    return NextResponse.json(shipment, {
      headers: {
        'Cache-Control': 'private, no-store',
      },
    })
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
