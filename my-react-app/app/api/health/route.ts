import { NextResponse } from 'next/server'
import { connectToDatabase } from '../../../src/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    await connectToDatabase()
    return NextResponse.json({
      status: 'ok',
      service: 'Package Pilot Freight Tracking System',
      database: 'MongoDB Atlas',
      timestamp: new Date().toISOString(),
    })
  } catch (err: any) {
    return NextResponse.json(
      { status: 'error', database: 'disconnected', error: err.message },
      { status: 500 }
    )
  }
}
