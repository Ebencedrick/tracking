import { NextResponse } from 'next/server'
import { connectToDatabase } from '../../../../../src/lib/db'
import { ChatSession } from '../../../../../server/models/Chat.js'

export const dynamic = 'force-dynamic'

interface Params {
  params: Promise<{ id: string }>
}

export async function POST(request: Request, context: Params) {
  try {
    await connectToDatabase()
    const { id } = await context.params
    const chatId = decodeURIComponent(id)
    const body = await request.json()

    const message = {
      id: body.id || `msg-${Date.now()}`,
      sender: body.sender || 'agent',
      text: body.text || '',
      time: body.time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }

    const chat = await (ChatSession as any).findOneAndUpdate(
      { id: chatId },
      {
        $push: { messages: message },
        $set: {
          lastMessageTime: message.time,
          ...(body.sender === 'client' ? { $inc: { unreadCount: 1 } } : { unreadCount: 0 }),
        },
      },
      { new: true, upsert: true }
    ).lean()

    return NextResponse.json(chat)
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to append chat message', details: err.message }, { status: 400 })
  }
}
