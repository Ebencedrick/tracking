import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import { connectDB } from './db.js'
import { Shipment } from './models/Shipment.js'
import { Carrier } from './models/Carrier.js'
import { Inquiry } from './models/Inquiry.js'
import { ChatSession } from './models/Chat.js'
import { Settings } from './models/Settings.js'

// Load environment variables from .env
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
dotenv.config({ path: path.resolve(__dirname, '../.env') })

const app = express()
const PORT = process.env.PORT || 5000

// Middlewares
app.use(cors())
app.use(express.json({ limit: '15mb' }))

// Connect to MongoDB
connectDB()

// --- 1. Health Check Endpoint ---
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'Package Pilot Freight Tracking Backend',
    database: 'MongoDB',
  })
})

// --- 2. Shipments Endpoints ---
// GET all shipments
app.get('/api/shipments', async (req, res) => {
  try {
    const { status, carrier, mode, query } = req.query
    const filter = {}

    if (status && status !== 'all') filter.status = status
    if (carrier) filter.carrier = carrier
    if (mode && mode !== 'all') filter.mode = mode

    if (query) {
      const qRegex = new RegExp(query, 'i')
      filter.$or = [
        { waybill: qRegex },
        { clientName: qRegex },
        { 'origin.name': qRegex },
        { 'destination.name': qRegex },
        { carrier: qRegex },
        { assignedDriver: qRegex },
      ]
    }

    const shipments = await Shipment.find(filter).sort({ createdAt: -1 })
    res.json(shipments)
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch shipments', details: err.message })
  }
})

// GET single shipment by waybill
app.get('/api/shipments/:waybill', async (req, res) => {
  try {
    const waybill = req.params.waybill.trim()
    const shipment = await Shipment.findOne({
      waybill: { $regex: new RegExp(`^${waybill}$`, 'i') },
    })

    if (!shipment) {
      return res.status(404).json({ error: 'Shipment not found' })
    }

    res.json(shipment)
  } catch (err) {
    res.status(500).json({ error: 'Error querying shipment', details: err.message })
  }
})

// POST create new shipment
app.post('/api/shipments', async (req, res) => {
  try {
    const data = req.body

    // Ensure unique waybill
    if (!data.waybill) {
      const prefix = (data.carrierCode || 'EXP').toUpperCase().slice(0, 3)
      const randomNum = Math.floor(10000 + Math.random() * 90000)
      const suffix = (data.destination?.code || 'GLB').toUpperCase().slice(0, 3)
      data.waybill = `${prefix}-${randomNum}-${suffix}`
    }

    const created = await Shipment.create(data)
    res.status(201).json(created)
  } catch (err) {
    res.status(400).json({ error: 'Failed to create shipment', details: err.message })
  }
})

// PUT update shipment by waybill
app.put('/api/shipments/:waybill', async (req, res) => {
  try {
    const waybill = req.params.waybill.trim()
    const updated = await Shipment.findOneAndUpdate(
      { waybill: { $regex: new RegExp(`^${waybill}$`, 'i') } },
      { $set: req.body },
      { new: true, runValidators: true }
    )

    if (!updated) {
      return res.status(404).json({ error: 'Shipment not found to update' })
    }

    res.json(updated)
  } catch (err) {
    res.status(400).json({ error: 'Failed to update shipment', details: err.message })
  }
})

// DELETE shipment by waybill
app.delete('/api/shipments/:waybill', async (req, res) => {
  try {
    const waybill = req.params.waybill.trim()
    const deleted = await Shipment.findOneAndDelete({
      waybill: { $regex: new RegExp(`^${waybill}$`, 'i') },
    })

    if (!deleted) {
      return res.status(404).json({ error: 'Shipment not found to delete' })
    }

    res.json({ message: 'Shipment deleted successfully', waybill })
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete shipment', details: err.message })
  }
})

// --- 3. Carriers Endpoints ---
app.get('/api/carriers', async (req, res) => {
  try {
    const carriers = await Carrier.find().sort({ name: 1 })
    res.json(carriers)
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch carriers', details: err.message })
  }
})

app.post('/api/carriers', async (req, res) => {
  try {
    const carrier = await Carrier.create(req.body)
    res.status(201).json(carrier)
  } catch (err) {
    res.status(400).json({ error: 'Failed to create carrier', details: err.message })
  }
})

// --- 4. Inquiries Endpoints ---
app.get('/api/inquiries', async (req, res) => {
  try {
    const inquiries = await Inquiry.find().sort({ createdAt: -1 })
    res.json(inquiries)
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch inquiries', details: err.message })
  }
})

app.post('/api/inquiries', async (req, res) => {
  try {
    const data = req.body
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
    res.status(201).json(inquiry)
  } catch (err) {
    res.status(400).json({ error: 'Failed to submit inquiry', details: err.message })
  }
})

app.put('/api/inquiries/:id', async (req, res) => {
  try {
    const id = req.params.id.trim()
    const updated = await Inquiry.findOneAndUpdate(
      { id },
      { $set: req.body },
      { new: true, upsert: true }
    )
    res.json(updated)
  } catch (err) {
    res.status(400).json({ error: 'Failed to update inquiry', details: err.message })
  }
})

// --- 5. Live Chats Endpoints ---
app.get('/api/chats', async (req, res) => {
  try {
    const chats = await ChatSession.find().sort({ updatedAt: -1 })
    res.json(chats)
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch chats', details: err.message })
  }
})

app.get('/api/chats/:id', async (req, res) => {
  try {
    const chat = await ChatSession.findOne({ id: req.params.id })
    if (!chat) return res.status(404).json({ error: 'Chat not found' })
    res.json(chat)
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch chat', details: err.message })
  }
})

app.post('/api/chats', async (req, res) => {
  try {
    const data = req.body
    const chatId = data.id || `chat-${Date.now()}`
    const chat = await ChatSession.findOneAndUpdate(
      { id: chatId },
      { $set: { ...data, id: chatId } },
      { new: true, upsert: true }
    )
    res.status(201).json(chat)
  } catch (err) {
    res.status(400).json({ error: 'Failed to save chat', details: err.message })
  }
})

app.put('/api/chats/:id', async (req, res) => {
  try {
    const chatId = req.params.id
    const chat = await ChatSession.findOneAndUpdate(
      { id: chatId },
      { $set: req.body },
      { new: true, upsert: true }
    )
    res.json(chat)
  } catch (err) {
    res.status(400).json({ error: 'Failed to update chat', details: err.message })
  }
})

app.post('/api/chats/:id/messages', async (req, res) => {
  try {
    const chatId = req.params.id
    const message = {
      id: req.body.id || `msg-${Date.now()}`,
      sender: req.body.sender || 'agent',
      text: req.body.text || '',
      time: req.body.time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }

    const chat = await ChatSession.findOneAndUpdate(
      { id: chatId },
      {
        $push: { messages: message },
        $set: {
          lastMessageTime: message.time,
          ...(req.body.sender === 'client' ? { $inc: { unreadCount: 1 } } : { unreadCount: 0 }),
        },
      },
      { new: true, upsert: true }
    )
    res.json(chat)
  } catch (err) {
    res.status(400).json({ error: 'Failed to append chat message', details: err.message })
  }
})

// --- 6. Settings Endpoints ---
app.get('/api/settings', async (req, res) => {
  try {
    let settings = await Settings.findOne({ key: 'global_config' })
    if (!settings) {
      settings = await Settings.create({ key: 'global_config' })
    }
    res.json(settings)
  } catch (err) {
    res.status(500).json({ error: 'Failed to load settings', details: err.message })
  }
})

app.put('/api/settings', async (req, res) => {
  try {
    const updated = await Settings.findOneAndUpdate(
      { key: 'global_config' },
      { $set: req.body },
      { new: true, upsert: true }
    )
    res.json(updated)
  } catch (err) {
    res.status(400).json({ error: 'Failed to save settings', details: err.message })
  }
})

// Start Server
app.listen(PORT, () => {
  console.log(`[Express Backend] Package Pilot Server running on http://localhost:${PORT}`)
})
