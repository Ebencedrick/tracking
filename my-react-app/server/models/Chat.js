import mongoose from 'mongoose'

const MessageSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    sender: { type: String, enum: ['client', 'agent', 'system'], required: true },
    text: { type: String, required: true },
    time: { type: String, required: true },
  },
  { _id: false }
)

const ChatSessionSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    clientName: { type: String, required: true },
    clientEmail: { type: String, default: '' },
    waybillRef: { type: String, default: '' },
    status: { type: String, enum: ['active', 'waiting', 'closed'], default: 'active' },
    lastMessageTime: { type: String, default: '' },
    unreadCount: { type: Number, default: 0 },
    messages: [MessageSchema],
  },
  { timestamps: true }
)

export const ChatSession = mongoose.models.ChatSession || mongoose.model('ChatSession', ChatSessionSchema)
