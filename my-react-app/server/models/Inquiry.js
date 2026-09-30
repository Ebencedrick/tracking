import mongoose from 'mongoose'

const InquirySchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    senderName: { type: String, required: true },
    senderEmail: { type: String, required: true },
    subject: { type: String, required: true },
    message: { type: String, required: true },
    topic: { type: String, default: 'Tracking update' },
    waybillRef: { type: String, default: '' },
    status: { type: String, default: 'new' },
    replyMessage: { type: String, default: '' },
    repliedAt: { type: String, default: '' },
    createdAtStr: { type: String, default: '' },
  },
  { timestamps: true }
)

export const Inquiry = mongoose.models.Inquiry || mongoose.model('Inquiry', InquirySchema)

