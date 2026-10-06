import { NextResponse } from 'next/server'
import { connectToDatabase } from '../../../src/lib/db'
import { Carrier } from '../../../server/models/Carrier.js'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    await connectToDatabase()
    const carriers = await (Carrier as any).find().sort({ name: 1 }).lean()
    return NextResponse.json(carriers)
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to fetch carriers', details: err.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    await connectToDatabase()
    const body = await request.json()
    const carrier = await (Carrier as any).findOneAndUpdate(
      { id: body.id || `c-${Date.now()}` },
      { $set: body },
      { upsert: true, new: true }
    ).lean()
    return NextResponse.json(carrier, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to create carrier', details: err.message }, { status: 400 })
  }
}
