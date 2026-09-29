import { useState } from 'react'
import { Link } from 'react-router-dom'

interface Message {
  id: string
  sender: 'client' | 'agent'
  text: string
  time: string
}

interface ChatSession {
  id: string
  clientName: string
  company: string
  waybill?: string
  status: 'active' | 'resolved'
  unread: boolean
  messages: Message[]
}

const INITIAL_CHATS: ChatSession[] = [
  {
    id: 'chat-1',
    clientName: 'Sarah Jenkins',
    company: 'Pacific Maritime Corp',
    waybill: 'PLOT-70955-JFD',
    status: 'active',
    unread: true,
    messages: [
      { id: 'm1', sender: 'client', text: 'Hello, what is the estimated touch-down time at London Heathrow for PLOT-70955-JFD?', time: '14:48' },
      { id: 'm2', sender: 'agent', text: 'Cargo flight DH-709 is on final approach to London Heathrow (LHR). Customs green lane pre-clearance is already completed.', time: '14:50' },
      { id: 'm3', sender: 'client', text: 'Great! Will our local brokerage team receive the automated delivery push notification?', time: '14:52' },
    ],
  },
  {
    id: 'chat-2',
    clientName: 'Robert Vance',
    company: 'Acme Corporation',
    waybill: 'PLOT-99420-CT4',
    status: 'active',
    unread: false,
    messages: [
      { id: 'm21', sender: 'client', text: 'Hi, is transatlantic linehaul DH-882 on schedule for London Heathrow?', time: '12:10' },
      { id: 'm22', sender: 'agent', text: 'Yes, cruising at FL380 over waypoint 44N 32W. Estimated arrival 18:30 GMT.', time: '12:12' },
    ],
  },
  {
    id: 'chat-3',
    clientName: 'Marcus Aurelius',
    company: 'Imperial Freight Forwarders',
    waybill: 'PLOT-38190-V42',
    status: 'active',
    unread: false,
    messages: [
      { id: 'm31', sender: 'client', text: 'Please confirm if hazardous materials declaration is logged for container MSK-901.', time: '09:15' },
      { id: 'm32', sender: 'agent', text: 'Yes Marcus, IMO Class 9 lithium declaration is approved by port safety authority.', time: '09:18' },
    ],
  },
]

export function AdminChats() {
  const [chats, setChats] = useState<ChatSession[]>(INITIAL_CHATS)
  const [activeChatId, setActiveChatId] = useState(INITIAL_CHATS[0].id)
  const [replyText, setReplyText] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [toastMessage, setToastMessage] = useState('')

  const activeChat = chats.find((c) => c.id === activeChatId) || chats[0]

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(''), 3500)
  }

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault()
    if (!replyText.trim() || !activeChat) return

    const newMsg: Message = {
      id: `msg-${Date.now()}`,
      sender: 'agent',
      text: replyText,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }

    setChats((prev) =>
      prev.map((c) =>
        c.id === activeChat.id
          ? { ...c, unread: false, messages: [...c.messages, newMsg] }
          : c
      )
    )

    setReplyText('')
    showToast('Message transmitted to client')
  }

  const applyCannedChip = (text: string) => {
    setReplyText(text)
  }

  const handleResolveChat = () => {
    if (!activeChat) return
    setChats((prev) =>
      prev.map((c) =>
        c.id === activeChat.id
          ? { ...c, status: c.status === 'active' ? 'resolved' : 'active' }
          : c
      )
    )
    showToast(`Session marked as ${activeChat.status === 'active' ? 'Resolved' : 'Active'}`)
  }

  const filteredChats = chats.filter((c) => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    return (
      c.clientName.toLowerCase().includes(q) ||
      c.company.toLowerCase().includes(q) ||
      (c.waybill && c.waybill.toLowerCase().includes(q))
    )
  })

  return (
    <div className="cmd-canvas">
      {/* Toast */}
      {toastMessage && (
        <div className="shipment-toast">
          ✓ {toastMessage}
        </div>
      )}

      {/* Header */}
      <div className="cmd-header">
        <div className="cmd-header-left">
          <div className="cmd-node-status">
            <span className="cmd-node-pulse" />
            <span>LIVE CHAT DISPATCH // ONLINE</span>
          </div>
          <h1 className="cmd-title">Live Client Support Chats</h1>
          <p className="cmd-subtitle">
            Direct real-time communication channel with freight forwarders, shippers, and receiving logistics managers.
          </p>
        </div>
      </div>

      {/* Top 4 KPI Metric Cards */}
      <div className="cmd-stats-row">
        <div className="cmd-stat-card">
          <div className="cmd-stat-info">
            <span className="cmd-stat-label">Active Support Channels</span>
            <div className="cmd-stat-number">{chats.filter((c) => c.status === 'active').length}</div>
            <span className="cmd-stat-subtext">Real-Time Streams</span>
          </div>
          <div className="cmd-stat-icon-box gray">
            💬
          </div>
        </div>

        <div className="cmd-stat-card">
          <div className="cmd-stat-info">
            <span className="cmd-stat-label">Unread Messages</span>
            <div className="cmd-stat-number" style={{ color: '#dc2626' }}>
              {chats.filter((c) => c.unread).length}
            </div>
            <span className="cmd-stat-subtext">Requires Immediate Reply</span>
          </div>
          <div className="cmd-stat-icon-box red">
            🔔
          </div>
        </div>

        <div className="cmd-stat-card">
          <div className="cmd-stat-info">
            <span className="cmd-stat-label">Dispatch Operators Online</span>
            <div className="cmd-stat-number" style={{ color: '#10b981' }}>
              4 Active
            </div>
            <span className="cmd-stat-subtext">24/7 Global Fleet Desk</span>
          </div>
          <div className="cmd-stat-icon-box green">
            🎧
          </div>
        </div>

        <div className="cmd-stat-card">
          <div className="cmd-stat-info">
            <span className="cmd-stat-label">Average Response Speed</span>
            <div className="cmd-stat-number" style={{ color: '#0284c7' }}>
              48 sec
            </div>
            <span className="cmd-stat-subtext">SLA Target &lt; 2 min</span>
          </div>
          <div className="cmd-stat-icon-box blue">
            ⚡
          </div>
        </div>
      </div>

      {/* 2-Column Split: Chat List + Chat Stream Window */}
      <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: '1.75rem', height: '640px', alignItems: 'stretch' }}>
        {/* Chat List */}
        <div className="cmd-card" style={{ padding: 0, display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div style={{ padding: '1.25rem 1.25rem 0.75rem', borderBottom: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <strong style={{ fontSize: '0.95rem', color: '#0f172a' }}>Active Sessions ({filteredChats.length})</strong>
              <span className="live-track-count-badge">● Online</span>
            </div>

            <input
              type="text"
              className="cmd-input"
              placeholder="Search shipper or waybill..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ fontSize: '0.8rem', padding: '0.45rem 0.75rem' }}
            />
          </div>

          <div style={{ flex: 1, overflowY: 'auto' }}>
            {filteredChats.map((c) => (
              <div
                key={c.id}
                onClick={() => {
                  setActiveChatId(c.id)
                  setChats((prev) => prev.map((item) => (item.id === c.id ? { ...item, unread: false } : item)))
                }}
                style={{
                  padding: '1.1rem 1.25rem',
                  borderBottom: '1px solid #f1f5f9',
                  cursor: 'pointer',
                  backgroundColor: activeChatId === c.id ? '#f0f9ff' : '#ffffff',
                  borderLeft: activeChatId === c.id ? '4px solid #0284c7' : '4px solid transparent',
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
                  <strong style={{ fontSize: '0.9rem', color: '#0f172a' }}>{c.clientName}</strong>
                  {c.unread && (
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#dc2626', display: 'inline-block' }} />
                  )}
                </div>
                <div style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: '4px' }}>{c.company}</div>
                {c.waybill && (
                  <div style={{ fontSize: '0.72rem', color: '#0284c7', fontFamily: 'monospace', fontWeight: 800 }}>
                    Ref: {c.waybill}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Chat Window */}
        <div className="cmd-card" style={{ display: 'flex', flexDirection: 'column', padding: 0, height: '100%', overflow: 'hidden' }}>
          {/* Chat Top Header */}
          <div style={{ padding: '1.15rem 1.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#ffffff', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#0284c7', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1rem' }}>
                {activeChat.clientName.charAt(0)}
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#0f172a' }}>{activeChat.clientName}</h3>
                <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                  {activeChat.company} {activeChat.waybill && `• Consignment ${activeChat.waybill}`}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              {activeChat.waybill && (
                <Link
                  to={`/track?waybill=${encodeURIComponent(activeChat.waybill)}`}
                  className="cmd-action-track"
                  style={{ fontSize: '0.78rem', padding: '0.35rem 0.75rem' }}
                >
                  Live Vector ➔
                </Link>
              )}

              <button
                type="button"
                className={`cmd-btn ${activeChat.status === 'active' ? 'cmd-btn-white' : 'cmd-btn-navy'}`}
                style={{ padding: '0.4rem 0.75rem', fontSize: '0.75rem' }}
                onClick={handleResolveChat}
              >
                {activeChat.status === 'active' ? '✓ Mark Resolved' : '↺ Reopen Chat'}
              </button>
            </div>
          </div>

          {/* Messages Stream */}
          <div style={{ flex: 1, padding: '1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem', background: '#f8fafc' }}>
            {activeChat.messages.map((m) => (
              <div
                key={m.id}
                style={{
                  alignSelf: m.sender === 'agent' ? 'flex-end' : 'flex-start',
                  maxWidth: '75%',
                }}
              >
                <div
                  style={{
                    padding: '0.85rem 1.15rem',
                    borderRadius: m.sender === 'agent' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                    backgroundColor: m.sender === 'agent' ? '#0f172a' : '#ffffff',
                    color: m.sender === 'agent' ? '#ffffff' : '#0f172a',
                    border: m.sender === 'client' ? '1px solid #e2e8f0' : 'none',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                    fontSize: '0.9rem',
                    lineHeight: '1.5',
                  }}
                >
                  {m.text}
                </div>
                <span
                  style={{
                    fontSize: '0.7rem',
                    color: '#94a3b8',
                    marginTop: '4px',
                    display: 'block',
                    textAlign: m.sender === 'agent' ? 'right' : 'left',
                  }}
                >
                  {m.time} {m.sender === 'agent' ? '• Operations Dispatch' : ''}
                </span>
              </div>
            ))}
          </div>

          {/* Canned Quick Response Chips */}
          <div style={{ padding: '0.65rem 1.25rem', background: '#f1f5f9', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '0.4rem', overflowX: 'auto', flexShrink: 0 }}>
            <button
              type="button"
              className="create-shipment-preset-chip"
              onClick={() => applyCannedChip('Flight on approach to destination terminal. Customs green lane cleared.')}
            >
              ✈️ Flight on Approach
            </button>
            <button
              type="button"
              className="create-shipment-preset-chip"
              onClick={() => applyCannedChip('Driver is 15 minutes away from recipient facility for final handover.')}
            >
              🚚 Driver Out for Delivery
            </button>
            <button
              type="button"
              className="create-shipment-preset-chip"
              onClick={() => applyCannedChip('Continuous temperature log shows 4.2°C compliant throughout transit.')}
            >
              ❄️ Cold-Chain Verified
            </button>
          </div>

          {/* Chat Input */}
          <form onSubmit={handleSendMessage} style={{ padding: '1rem 1.25rem', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '0.75rem', background: '#ffffff', flexShrink: 0 }}>
            <input
              type="text"
              className="cmd-input"
              placeholder="Type your response to the forwarder..."
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              required
            />
            <button type="submit" className="cmd-btn cmd-btn-red" style={{ flexShrink: 0, padding: '0.65rem 1.25rem' }}>
              Send ↗
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
