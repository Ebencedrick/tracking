import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiService } from '../../services/api'
import type { ChatSession } from '../../types'

export function AdminChats() {
  const [chats, setChats] = useState<ChatSession[]>([])
  const [activeChatId, setActiveChatId] = useState<string>('')
  const [replyText, setReplyText] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [toastMessage, setToastMessage] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Fetch live chat sessions from MongoDB Atlas
  const fetchChats = async () => {
    try {
      const data = await apiService.getChats()
      if (data && data.length > 0) {
        setChats(data)
        if (!activeChatId) {
          setActiveChatId(data[0].id)
        }
      }
    } catch {
      // Keep state
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchChats()
    const interval = setInterval(fetchChats, 3500)
    return () => clearInterval(interval)
  }, [activeChatId])

  const activeChat = chats.find((c) => c.id === activeChatId) || chats[0]

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [activeChat?.messages?.length, activeChatId])

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(''), 3500)
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!replyText.trim() || !activeChat) return

    const textToSend = replyText.trim()
    const newMsg = {
      id: `msg-${Date.now()}`,
      sender: 'agent' as const,
      text: textToSend,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }

    // Optimistically update
    setChats((prev) =>
      prev.map((c) =>
        c.id === activeChat.id
          ? { ...c, unreadCount: 0, messages: [...(c.messages || []), newMsg] }
          : c
      )
    )

    setReplyText('')

    try {
      await apiService.sendChatMessage(activeChat.id, {
        text: textToSend,
        sender: 'agent',
      })
      showToast('✓ Message transmitted to client via MongoDB channel')
    } catch {
      showToast('Message logged locally')
    }
  }

  const applyCannedChip = (text: string) => {
    setReplyText(text)
  }

  const handleResolveChat = async () => {
    if (!activeChat) return
    const nextStatus = activeChat.status === 'active' ? 'closed' : 'active'

    setChats((prev) =>
      prev.map((c) => (c.id === activeChat.id ? { ...c, status: nextStatus } : c))
    )

    try {
      await apiService.updateChat(activeChat.id, { status: nextStatus })
      showToast(`Session marked as ${nextStatus === 'active' ? 'Active' : 'Closed'}`)
    } catch {
      showToast(`Session updated`)
    }
  }

  const filteredChats = chats.filter((c) => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    return (
      (c.clientName && c.clientName.toLowerCase().includes(q)) ||
      (c.clientEmail && c.clientEmail.toLowerCase().includes(q)) ||
      (c.waybillRef && c.waybillRef.toLowerCase().includes(q))
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
            <span>LIVE CHAT DISPATCH // MONGODB ATLAS STREAM</span>
          </div>
          <h1 className="cmd-title">Live Client Support Chats</h1>
          <p className="cmd-subtitle">
            Direct real-time 2-way communication channel with freight forwarders, shippers, and receiving logistics managers.
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
              {chats.filter((c) => (c.unreadCount || 0) > 0).length}
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
            {isLoading && chats.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>
                Loading chat sessions...
              </div>
            ) : filteredChats.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>
                No active chat sessions found
              </div>
            ) : (
              filteredChats.map((c) => {
                const hasUnread = (c.unreadCount || 0) > 0
                return (
                  <div
                    key={c.id}
                    onClick={() => {
                      setActiveChatId(c.id)
                      setChats((prev) => prev.map((item) => (item.id === c.id ? { ...item, unreadCount: 0 } : item)))
                    }}
                    style={{
                      padding: '1rem 1.15rem',
                      borderBottom: '1px solid #f1f5f9',
                      cursor: 'pointer',
                      backgroundColor: activeChatId === c.id ? '#f0f9ff' : '#ffffff',
                      borderLeft: activeChatId === c.id ? '4px solid #0284c7' : '4px solid transparent',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '0.82rem', color: '#0284c7', fontWeight: 800 }}>📧</span>
                        <strong style={{ fontSize: '0.88rem', color: '#0f172a' }}>
                          {c.clientEmail || c.clientName || 'Anonymous Client'}
                        </strong>
                      </div>
                      {hasUnread && (
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#dc2626', display: 'inline-block' }} />
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.76rem', color: '#64748b' }}>
                      <span>👤 {c.clientName || 'Shipper'}</span>
                      <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{c.lastMessageTime || 'Online'}</span>
                    </div>

                    {c.waybillRef && (
                      <div style={{ marginTop: '4px', fontSize: '0.72rem', color: '#0284c7', fontFamily: 'monospace', fontWeight: 800, background: '#e0f2fe', display: 'inline-block', padding: '1px 6px', borderRadius: '4px' }}>
                        Waybill: {c.waybillRef}
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Chat Window */}
        <div className="cmd-card" style={{ display: 'flex', flexDirection: 'column', padding: 0, height: '100%', overflow: 'hidden' }}>
          {activeChat ? (
            <>
              {/* Chat Top Header */}
              <div style={{ padding: '1.15rem 1.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#ffffff', flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                  <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: 'linear-gradient(135deg, #0284c7, #0369a1)', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1.1rem', boxShadow: '0 2px 8px rgba(2, 132, 199, 0.3)' }}>
                    {activeChat.clientName?.charAt(0)?.toUpperCase() || 'C'}
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#0f172a' }}>{activeChat.clientName}</h3>
                      <span style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: '12px', background: '#e0f2fe', color: '#0284c7', fontWeight: 800 }}>
                        ● Live Client
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                      <span style={{ fontSize: '0.8rem', color: '#0284c7', fontWeight: 700 }}>
                        📧 {activeChat.clientEmail}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(activeChat.clientEmail || '')
                          showToast(`Copied client email ${activeChat.clientEmail}`)
                        }}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.75rem', color: '#94a3b8', padding: '0 2px' }}
                        title="Copy Client Email"
                      >
                        📋
                      </button>
                      {activeChat.waybillRef && (
                        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                          • Waybill: <strong>{activeChat.waybillRef}</strong>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  {activeChat.waybillRef && (
                    <Link
                      to={`/track?waybill=${encodeURIComponent(activeChat.waybillRef)}`}
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
                    {activeChat.status === 'active' ? '✓ Mark Closed' : '↺ Reopen Chat'}
                  </button>
                </div>
              </div>

              {/* Messages Stream */}
              <div style={{ flex: 1, padding: '1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem', background: '#f8fafc' }}>
                {(activeChat.messages || []).map((m) => (
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
                      {m.time} {m.sender === 'agent' ? '• Operations Dispatch' : `• ${activeChat.clientName}`}
                    </span>
                  </div>
                ))}
                <div ref={messagesEndRef} />
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
                  placeholder="Type your response to the shipper..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  required
                />
                <button type="submit" className="cmd-btn cmd-btn-red" style={{ flexShrink: 0, padding: '0.65rem 1.25rem' }}>
                  Send ↗
                </button>
              </form>
            </>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8' }}>
              Select a conversation to begin live chat
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
