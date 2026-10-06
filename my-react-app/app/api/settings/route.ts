import { NextResponse } from 'next/server'
import { connectToDatabase } from '../../../src/lib/db'
import { Settings } from '../../../server/models/Settings.js'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    await connectToDatabase()
    let settings = await (Settings as any).findOne({ key: 'global_config' }).lean()
    if (!settings) {
      settings = await (Settings as any).create({ key: 'global_config' })
    }
    return NextResponse.json(settings)
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to load settings', details: err.message }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    await connectToDatabase()
    const data = await request.json()
    const updated = await (Settings as any).findOneAndUpdate(
      { key: 'global_config' },
      { $set: data },
      { new: true, upsert: true }
    ).lean()
    return NextResponse.json(updated)
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to save settings', details: err.message }, { status: 400 })
  }
}
