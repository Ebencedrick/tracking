import { NextResponse } from 'next/server'
import { connectToDatabase } from '../../../src/lib/db'
import { Inquiry } from '../../../server/models/Inquiry.js'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    await connectToDatabase()
    const inquiries = await Inquiry.find().sort({ createdAt: -1 }).lean()
    return NextResponse.json(inquiries)
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to fetch inquiries', details: err.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    await connectToDatabase()
    const data = await request.json()
    const inquiry = await Inquiry.create({
      id: data.id || `inq-${Date.now()}`,
      senderName: data.senderName || data.name || 'Anonymous Client',
      senderEmail: data.senderEmail || data.email || 'client@example.com',
      subject: data.subject || `Inquiry: ${data.topic || 'General Support'}`,
      message: data.message || '',
      topic: data.topic || 'General',
      waybillRef: data.waybillRef || data.waybill || '',
      status: data.status || 'new',
      createdAtStr: new Date().toLocaleString(),
    })
    return NextResponse.json(inquiry, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to submit inquiry', details: err.message }, { status: 400 })
  }
}
