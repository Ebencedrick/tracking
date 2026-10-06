import { NextResponse } from 'next/server'
import { connectToDatabase } from '../../../../src/lib/db'
import { ChatSession } from '../../../../server/models/Chat.js'

export const dynamic = 'force-dynamic'

interface Params {
  params: Promise<{ id: string }>
}

export async function GET(request: Request, context: Params) {
  try {
    await connectToDatabase()
    const { id } = await context.params
    const chat = await (ChatSession as any).findOne({ id: decodeURIComponent(id) }).lean()
    if (!chat) return NextResponse.json({ error: 'Chat not found' }, { status: 404 })
    return NextResponse.json(chat)
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to fetch chat', details: err.message }, { status: 500 })
  }
}

export async function PUT(request: Request, context: Params) {
  try {
    await connectToDatabase()
    const { id } = await context.params
    const data = await request.json()
    const chat = await (ChatSession as any).findOneAndUpdate(
      { id: decodeURIComponent(id) },
      { $set: data },
      { new: true, upsert: true }
    ).lean()
    return NextResponse.json(chat)
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to update chat', details: err.message }, { status: 400 })
  }
}
