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

    const updateDoc: any = {
      $push: { messages: message },
      $set: {
        lastMessageTime: message.time,
      },
    }

    if (body.sender === 'client') {
      updateDoc.$inc = { unreadCount: 1 }
    } else {
      updateDoc.$set.unreadCount = 0
    }

    const chat = await (ChatSession as any).findOneAndUpdate(
      { id: chatId },
      updateDoc,
      { new: true, upsert: true }
    ).lean()

    return NextResponse.json(chat)
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to append chat message', details: err.message }, { status: 400 })
  }
}
