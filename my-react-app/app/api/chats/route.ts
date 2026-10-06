import { NextResponse } from 'next/server'
import { connectToDatabase } from '../../../src/lib/db'
import { ChatSession } from '../../../server/models/Chat.js'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    await connectToDatabase()
    const chats = await (ChatSession as any).find().sort({ updatedAt: -1 }).lean()
    return NextResponse.json(chats)
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to fetch chats', details: err.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    await connectToDatabase()
    const data = await request.json()
    const chatId = data.id || `chat-${Date.now()}`
    const chat = await (ChatSession as any).findOneAndUpdate(
      { id: chatId },
      { $set: { ...data, id: chatId } },
      { new: true, upsert: true }
    ).lean()
    return NextResponse.json(chat, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to save chat', details: err.message }, { status: 400 })
  }
}
