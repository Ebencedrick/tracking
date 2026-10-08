import { useEffect, useRef, useState, type FormEvent } from 'react'
import { apiService } from '../services/api'
import type { ChatSession, ChatMessage } from '../types'

export function LiveSupportChat() {
  const [isOpen, setIsOpen] = useState(false)
  const [hasStarted, setHasStarted] = useState(() => {
    if (typeof window !== 'undefined') {
      return Boolean(localStorage.getItem('northstar_chat_email'))
    }
    return false
  })
  const [userEmail, setUserEmail] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('northstar_chat_email') || ''
    }
    return ''
  })
  const [userName, setUserName] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('northstar_chat_name') || ''
    }
    return ''
  })
  const [waybillRef, setWaybillRef] = useState('')
  const [inputText, setInputText] = useState('')
  const [sessionId, setSessionId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const savedEmail = localStorage.getItem('northstar_chat_email')
      if (savedEmail) return `chat-${savedEmail.toLowerCase().replace(/[^a-z0-9]/g, '_')}`
    }
    return `chat-${Date.now()}`
  })
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-1',
      sender: 'system',
      text: 'Welcome to Package Pilot Global Dispatch Support. Please identify with your email address to connect.',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ])
  const [isAgentTyping, setIsAgentTyping] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom of chat
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isOpen, isAgentTyping])

  // Load existing session history on mount or email change
  useEffect(() => {
    if (!hasStarted || !userEmail) return

    apiService
      .getChats()
      .then((chats) => {
        const found = chats.find(
          (c) => c.id === sessionId || (c.clientEmail && c.clientEmail.toLowerCase() === userEmail.toLowerCase())
        )
        if (found && found.messages && found.messages.length > 0) {
          setMessages(found.messages)
        }
      })
      .catch(() => {})
  }, [hasStarted, userEmail, sessionId])

  // Poll for agent responses if chat is active
  useEffect(() => {
    if (!hasStarted || !userEmail) return

    const interval = setInterval(() => {
      apiService
        .getChats()
        .then((chats) => {
          const current = chats.find(
            (c) => c.id === sessionId || (c.clientEmail && c.clientEmail.toLowerCase() === userEmail.toLowerCase())
          )
          if (current && current.messages && current.messages.length > messages.length) {
            setMessages(current.messages)
          }
        })
        .catch(() => {})
    }, 3500)

    return () => clearInterval(interval)
  }, [hasStarted, sessionId, userEmail, messages.length])

  const handleStartChat = async (e: FormEvent) => {
    e.preventDefault()
    if (!userEmail.trim()) return

    const cleanEmail = userEmail.trim().toLowerCase()
    const cleanName = userName.trim() || cleanEmail.split('@')[0]
    const activeSessionId = `chat-${cleanEmail.replace(/[^a-z0-9]/g, '_')}`

    localStorage.setItem('northstar_chat_email', cleanEmail)
    localStorage.setItem('northstar_chat_name', cleanName)
    setSessionId(activeSessionId)

    const initialSession: Partial<ChatSession> = {
      id: activeSessionId,
      clientName: cleanName,
      clientEmail: cleanEmail,
      waybillRef: waybillRef.trim(),
      status: 'active',
      lastMessageTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      unreadCount: 1,
      messages: [
        {
          id: `msg-sys-${Date.now()}`,
          sender: 'system',
          text: `Verified client identity: ${cleanEmail}${waybillRef ? ` • Waybill Ref: ${waybillRef.trim()}` : ''}`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
        {
          id: `msg-agent-${Date.now()}`,
          sender: 'agent',
          text: `Hello! An operations controller has identified your email (${cleanEmail}). How can we assist your consignment today?`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ],
    }

    setHasStarted(true)
    setMessages(initialSession.messages || [])

    try {
      await apiService.createChat(initialSession)
    } catch {
      // Offline fallback
    }
  }

  const handleSendMessage = async (e: FormEvent) => {
    e.preventDefault()
    if (!inputText.trim() || !userEmail.trim()) return

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'client',
      text: inputText.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }

    const updatedMessages = [...messages, userMsg]
    setMessages(updatedMessages)
    setInputText('')

    try {
      await apiService.createChat({
        id: sessionId,
        clientName: userName || userEmail.split('@')[0],
        clientEmail: userEmail.trim(),
        waybillRef: waybillRef,
        status: 'active',
        lastMessageTime: userMsg.time,
        unreadCount: 1,
        messages: updatedMessages,
      })
    } catch {
      // Offline sync
    }

    // Smart auto-assistant suggestions
    const lower = userMsg.text.toLowerCase()
    if (lower.includes('tariff') || lower.includes('cost') || lower.includes('price') || lower.includes('quote') || lower.includes('rate')) {
      setTimeout(() => {
        setIsAgentTyping(true)
        setTimeout(() => {
          setIsAgentTyping(false)
          const reply: ChatMessage = {
            id: `msg-rep-${Date.now()}`,
            sender: 'agent',
            text: `Our operations controller is reviewing your cargo route. A custom commercial tariff quotation and booking manifest will be confirmed directly with ${userEmail}.`,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          }
          setMessages((prev) => [...prev, reply])
        }, 1400)
      }, 700)
    }
  }

  const handleSwitchEmail = () => {
    localStorage.removeItem('northstar_chat_email')
    localStorage.removeItem('northstar_chat_name')
    setHasStarted(false)
    setUserEmail('')
    setUserName('')
  }

  return (
    <>
      {/* Floating Chat Trigger Button */}
      <button
        type="button"
        className="live-support-chat-trigger"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Open Live Support Chat"
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 9999,
          background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
          color: '#ffffff',
          border: '2px solid rgba(255, 255, 255, 0.2)',
          borderRadius: '30px',
          padding: '12px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          boxShadow: '0 8px 32px rgba(2, 132, 199, 0.4), 0 2px 8px rgba(0,0,0,0.3)',
          cursor: 'pointer',
          fontWeight: 700,
          fontSize: '0.9rem',
          transition: 'all 0.25s ease',
        }}
      >
        <span
          style={{
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            backgroundColor: '#10b981',
            boxShadow: '0 0 10px #10b981',
          }}
        />
        <span>💬 24/7 Live Support</span>
        {isOpen && <span style={{ marginLeft: '4px', fontSize: '0.8rem' }}>✕</span>}
      </button>

      {/* Floating Chat Window Modal */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            bottom: '84px',
            right: '24px',
            width: '390px',
            maxWidth: 'calc(100vw - 32px)',
            height: '530px',
            maxHeight: 'calc(100vh - 120px)',
            zIndex: 9999,
            background: 'rgba(15, 23, 42, 0.96)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: '16px',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6), 0 0 30px rgba(2, 132, 199, 0.2)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            fontFamily: 'sans-serif',
          }}
        >
          {/* Top Chat Header */}
          <div
            style={{
              padding: '0.9rem 1.25rem',
              background: 'linear-gradient(135deg, rgba(2, 132, 199, 0.25) 0%, rgba(15, 23, 42, 0.8) 100%)',
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #0284c7, #38bdf8)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.1rem',
                }}
              >
                ✈️
              </div>
              <div>
                <strong style={{ fontSize: '0.92rem', color: '#f8fafc', display: 'block' }}>
                  Dispatch Operations Desk
                </strong>
                <span style={{ fontSize: '0.72rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  ● 24/7 Live Controller Online
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {hasStarted && (
                <button
                  type="button"
                  onClick={handleSwitchEmail}
                  title="Switch Email ID"
                  style={{
                    background: 'rgba(255,255,255,0.08)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    color: '#94a3b8',
                    fontSize: '0.7rem',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                  }}
                >
                  Switch
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#94a3b8',
                  fontSize: '1.2rem',
                  cursor: 'pointer',
                  padding: '4px 6px',
                }}
              >
                ✕
              </button>
            </div>
          </div>

          {/* User Email Identification Badge */}
          {hasStarted && userEmail && (
            <div
              style={{
                background: 'rgba(2, 132, 199, 0.15)',
                borderBottom: '1px solid rgba(2, 132, 199, 0.3)',
                padding: '4px 12px',
                fontSize: '0.72rem',
                color: '#38bdf8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span>📧 Connected Client ID: <strong>{userEmail}</strong></span>
              {waybillRef && <span style={{ fontFamily: 'monospace' }}>Ref: {waybillRef}</span>}
            </div>
          )}

          {/* Chat Body */}
          {!hasStarted ? (
            /* Email Gatekeeper Start Form */
            <form
              onSubmit={handleStartChat}
              style={{
                padding: '1.25rem 1.25rem 1.5rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.85rem',
                justifyContent: 'flex-start',
                flex: 1,
                overflowY: 'auto',
                boxSizing: 'border-box',
              }}
            >
              <div style={{ textAlign: 'center', marginBottom: '0.15rem' }}>
                <span style={{ fontSize: '2rem' }}>💬</span>
                <h3 style={{ fontSize: '1.1rem', color: '#f8fafc', margin: '4px 0', fontWeight: 800 }}>
                  Client Support Verification
                </h3>
                <p style={{ fontSize: '0.78rem', color: '#94a3b8', margin: 0, lineHeight: 1.4 }}>
                  Please enter your <strong>email address</strong> so our dispatch team can identify your consignments and assist you directly.
                </p>
              </div>

              {/* Primary Email Input (Required) */}
              <div>
                <label style={{ fontSize: '0.75rem', color: '#38bdf8', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                  Your Email Address * (Client Identifier)
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. client@company.com"
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    background: 'rgba(255, 255, 255, 0.08)',
                    border: '1.5px solid #0284c7',
                    color: '#ffffff',
                    fontSize: '0.88rem',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* Name (Optional) */}
              <div>
                <label style={{ fontSize: '0.75rem', color: '#cbd5e1', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                  Your Name / Organization (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Alex Henderson"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    color: '#ffffff',
                    fontSize: '0.85rem',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* Waybill (Optional) */}
              <div>
                <label style={{ fontSize: '0.75rem', color: '#cbd5e1', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                  Tracking Waybill Number (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. PLOT-70955-JFD"
                  value={waybillRef}
                  onChange={(e) => setWaybillRef(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    color: '#ffffff',
                    fontSize: '0.85rem',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* Explicit Send / Connect Action Button */}
              <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <button
                  type="submit"
                  id="start-live-chat-submit-btn"
                  style={{
                    width: '100%',
                    padding: '12px 18px',
                    borderRadius: '10px',
                    background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                    color: '#ffffff',
                    fontWeight: 800,
                    fontSize: '0.92rem',
                    letterSpacing: '0.02em',
                    border: '1px solid rgba(255, 255, 255, 0.25)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    boxShadow: '0 6px 20px rgba(2, 132, 199, 0.5), 0 2px 6px rgba(0,0,0,0.3)',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <span>💬</span>
                  <span>Start Live Chat & Send Info ➔</span>
                </button>
                <span style={{ fontSize: '0.7rem', color: '#94a3b8', textAlign: 'center' }}>
                  🔒 Instant connection to active logistics dispatch controllers
                </span>
              </div>
            </form>
          ) : (
            /* Active Live Messaging Stream */
            <>
              <div
                style={{
                  flex: 1,
                  padding: '1rem',
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                }}
              >
                {messages.map((m) => (
                  <div
                    key={m.id}
                    style={{
                      alignSelf: m.sender === 'client' ? 'flex-end' : m.sender === 'agent' ? 'flex-start' : 'center',
                      maxWidth: m.sender === 'system' ? '90%' : '80%',
                      background:
                        m.sender === 'client'
                          ? '#0284c7'
                          : m.sender === 'agent'
                          ? 'rgba(255, 255, 255, 0.08)'
                          : 'rgba(255, 255, 255, 0.03)',
                      border:
                        m.sender === 'agent'
                          ? '1px solid rgba(255, 255, 255, 0.12)'
                          : m.sender === 'system'
                          ? '1px solid rgba(255, 255, 255, 0.06)'
                          : 'none',
                      color: '#f8fafc',
                      padding: '0.65rem 0.9rem',
                      borderRadius:
                        m.sender === 'client'
                          ? '12px 12px 2px 12px'
                          : m.sender === 'agent'
                          ? '12px 12px 12px 2px'
                          : '8px',
                      fontSize: m.sender === 'system' ? '0.74rem' : '0.84rem',
                      lineHeight: 1.4,
                      textAlign: m.sender === 'system' ? 'center' : 'left',
                    }}
                  >
                    {m.sender === 'agent' && (
                      <div style={{ fontSize: '0.7rem', color: '#38bdf8', fontWeight: 700, marginBottom: '2px' }}>
                        Operations Agent
                      </div>
                    )}
                    <div>{m.text}</div>
                    {m.time && m.sender !== 'system' && (
                      <span
                        style={{
                          display: 'block',
                          fontSize: '0.68rem',
                          color: m.sender === 'client' ? '#bae6fd' : '#64748b',
                          textAlign: 'right',
                          marginTop: '3px',
                        }}
                      >
                        {m.time}
                      </span>
                    )}
                  </div>
                ))}

                {isAgentTyping && (
                  <div
                    style={{
                      alignSelf: 'flex-start',
                      background: 'rgba(255, 255, 255, 0.08)',
                      padding: '6px 12px',
                      borderRadius: '12px',
                      fontSize: '0.75rem',
                      color: '#94a3b8',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <span className="network-pulse" style={{ width: '6px', height: '6px', backgroundColor: '#38bdf8' }} />
                    Controller is reviewing message...
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input Bar */}
              <form
                onSubmit={handleSendMessage}
                style={{
                  padding: '0.75rem 1rem',
                  borderTop: '1px solid rgba(255, 255, 255, 0.12)',
                  background: 'rgba(15, 23, 42, 0.98)',
                  display: 'flex',
                  gap: '8px',
                  alignItems: 'center',
                  flexShrink: 0,
                }}
              >
                <input
                  type="text"
                  placeholder="Type a message to the operations desk..."
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  style={{
                    flex: 1,
                    padding: '9px 12px',
                    borderRadius: '8px',
                    background: 'rgba(255, 255, 255, 0.07)',
                    border: '1px solid rgba(255, 255, 255, 0.18)',
                    color: '#ffffff',
                    fontSize: '0.85rem',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
                <button
                  type="submit"
                  disabled={!inputText.trim()}
                  style={{
                    padding: '9px 15px',
                    borderRadius: '8px',
                    background: inputText.trim() ? 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)' : 'rgba(255, 255, 255, 0.1)',
                    color: inputText.trim() ? '#ffffff' : '#64748b',
                    border: inputText.trim() ? '1px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.1)',
                    fontWeight: 800,
                    fontSize: '0.85rem',
                    cursor: inputText.trim() ? 'pointer' : 'default',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    boxShadow: inputText.trim() ? '0 4px 12px rgba(2, 132, 199, 0.4)' : 'none',
                    transition: 'all 0.15s ease',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <span>Send</span>
                  <span>➔</span>
                </button>
              </form>
            </>
          )}
        </div>
      )}
    </>
  )
}
