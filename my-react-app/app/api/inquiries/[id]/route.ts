import { NextResponse } from 'next/server'
import { connectToDatabase } from '../../../../src/lib/db'
import { Inquiry } from '../../../../server/models/Inquiry.js'

export const dynamic = 'force-dynamic'

interface Params {
  params: Promise<{ id: string }>
}

export async function PUT(request: Request, context: Params) {
  try {
    await connectToDatabase()
    const { id } = await context.params
    const data = await request.json()
    const updated = await (Inquiry as any).findOneAndUpdate(
      { id: decodeURIComponent(id) },
      { $set: data },
      { new: true, upsert: true }
    ).lean()
    return NextResponse.json(updated)
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to update inquiry', details: err.message }, { status: 400 })
  }
}
