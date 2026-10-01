import type { Shipment, Carrier, InquiryMessage, ChatSession, TariffSettings } from '../types'

const RAW_API_URL = process.env.NEXT_PUBLIC_API_URL
const API_BASE = RAW_API_URL ? `${RAW_API_URL.replace(/\/$/, '')}/api` : '/api'

export const apiService = {
  // --- Shipments ---
  async getShipments(): Promise<Shipment[]> {
    const res = await fetch(`${API_BASE}/shipments`)
    if (!res.ok) throw new Error('Failed to fetch shipments')
    return res.json()
  },

  async getShipment(waybill: string): Promise<Shipment> {
    const res = await fetch(`${API_BASE}/shipments/${encodeURIComponent(waybill)}`)
    if (!res.ok) throw new Error('Shipment not found')
    return res.json()
  },

  async createShipment(shipment: Partial<Shipment>): Promise<Shipment> {
    const res = await fetch(`${API_BASE}/shipments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(shipment),
    })
    if (!res.ok) throw new Error('Failed to create shipment')
    return res.json()
  },

  async updateShipment(waybill: string, updates: Partial<Shipment>): Promise<Shipment> {
    const res = await fetch(`${API_BASE}/shipments/${encodeURIComponent(waybill)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })
    if (!res.ok) throw new Error('Failed to update shipment')
    return res.json()
  },

  async deleteShipment(waybill: string): Promise<{ message: string; waybill: string }> {
    const res = await fetch(`${API_BASE}/shipments/${encodeURIComponent(waybill)}`, {
      method: 'DELETE',
    })
    if (res.status === 404) {
      return { message: 'Shipment was not present in the database', waybill }
    }
    if (!res.ok) throw new Error('Failed to delete shipment')
    return res.json()
  },

  // --- Carriers ---
  async getCarriers(): Promise<Carrier[]> {
    const res = await fetch(`${API_BASE}/carriers`)
    if (!res.ok) throw new Error('Failed to fetch carriers')
    return res.json()
  },

  async createCarrier(carrier: Partial<Carrier>): Promise<Carrier> {
    const res = await fetch(`${API_BASE}/carriers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(carrier),
    })
    if (!res.ok) throw new Error('Failed to create carrier')
    return res.json()
  },

  // --- Inquiries ---
  async getInquiries(): Promise<InquiryMessage[]> {
    const res = await fetch(`${API_BASE}/inquiries`)
    if (!res.ok) throw new Error('Failed to fetch inquiries')
    return res.json()
  },

  async createInquiry(inquiry: Partial<InquiryMessage>): Promise<InquiryMessage> {
    const res = await fetch(`${API_BASE}/inquiries`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(inquiry),
    })
    if (!res.ok) throw new Error('Failed to submit inquiry')
    return res.json()
  },

  async updateInquiry(id: string, updates: Partial<InquiryMessage>): Promise<InquiryMessage> {
    const res = await fetch(`${API_BASE}/inquiries/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })
    if (!res.ok) throw new Error('Failed to update inquiry')
    return res.json()
  },

  // --- Chats ---
  async getChats(): Promise<ChatSession[]> {
    const res = await fetch(`${API_BASE}/chats`)
    if (!res.ok) throw new Error('Failed to fetch chats')
    return res.json()
  },

  async createChat(chat: Partial<ChatSession>): Promise<ChatSession> {
    const res = await fetch(`${API_BASE}/chats`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(chat),
    })
    if (!res.ok) throw new Error('Failed to create chat')
    return res.json()
  },

  async updateChat(id: string, updates: Partial<ChatSession>): Promise<ChatSession> {
    const res = await fetch(`${API_BASE}/chats/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })
    if (!res.ok) throw new Error('Failed to update chat')
    return res.json()
  },

  async sendChatMessage(chatId: string, message: { text: string; sender?: string }): Promise<ChatSession> {
    const res = await fetch(`${API_BASE}/chats/${encodeURIComponent(chatId)}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message),
    })
    if (!res.ok) throw new Error('Failed to send chat message')
    return res.json()
  },

  // --- Settings ---
  async getSettings(): Promise<TariffSettings> {
    const res = await fetch(`${API_BASE}/settings`)
    if (!res.ok) throw new Error('Failed to fetch settings')
    return res.json()
  },

  async updateSettings(settings: Partial<TariffSettings>): Promise<TariffSettings> {
    const res = await fetch(`${API_BASE}/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    })
    if (!res.ok) throw new Error('Failed to save settings')
    return res.json()
  },

  // --- Health Check ---
  async checkHealth(): Promise<{ status: string; database: string }> {
    const res = await fetch(`${API_BASE}/health`)
    if (!res.ok) throw new Error('Backend health check failed')
    return res.json()
  },
}
