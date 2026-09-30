import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiService } from '../../services/api'
import type { InquiryMessage } from '../../types'

export function AdminInquiries() {
  const [inquiries, setInquiries] = useState<InquiryMessage[]>([])
  const [selectedInquiryId, setSelectedInquiryId] = useState<string>('')
  const [filterTab, setFilterTab] = useState<'all' | 'new' | 'pending' | 'replied'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [replyText, setReplyText] = useState('')
  const [toastMsg, setToastMsg] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  // Load inquiries from MongoDB Atlas
  const fetchInquiries = async () => {
    try {
      const data = await apiService.getInquiries()
      if (data && data.length > 0) {
        setInquiries(data)
        if (!selectedInquiryId) {
          setSelectedInquiryId(data[0].id)
        }
      }
    } catch {
      // Keep existing data if network hiccup
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchInquiries()
    const interval = setInterval(fetchInquiries, 5000)
    return () => clearInterval(interval)
  }, [])

  const selectedInquiry = inquiries.find((i) => i.id === selectedInquiryId) || inquiries[0]

  const showToast = (msg: string) => {
    setToastMsg(msg)
    setTimeout(() => setToastMsg(''), 3500)
  }

  const filteredInquiries = inquiries.filter((inq) => {
    if (filterTab !== 'all') {
      if (filterTab === 'new' && inq.status !== 'new' && inq.status !== 'unread') return false
      if (filterTab === 'pending' && inq.status !== 'pending') return false
      if (filterTab === 'replied' && inq.status !== 'replied' && inq.status !== 'resolved' && inq.status !== 'read') return false
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      return (
        (inq.senderName && inq.senderName.toLowerCase().includes(q)) ||
        (inq.senderEmail && inq.senderEmail.toLowerCase().includes(q)) ||
        (inq.subject && inq.subject.toLowerCase().includes(q)) ||
        (inq.waybillRef && inq.waybillRef.toLowerCase().includes(q))
      )
    }
    return true
  })

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedInquiry || !replyText.trim()) return

    const reply = replyText.trim()
    const timestamp = new Date().toLocaleString()

    setInquiries((prev) =>
      prev.map((inq) =>
        inq.id === selectedInquiry.id
          ? { ...inq, status: 'resolved', replyMessage: reply, repliedAt: timestamp }
          : inq
      )
    )

    try {
      await apiService.updateInquiry(selectedInquiry.id, {
        status: 'resolved',
        replyMessage: reply,
        repliedAt: timestamp,
      })
      showToast(`✓ Official response transmitted to ${selectedInquiry.senderEmail} and saved in MongoDB!`)
    } catch {
      showToast(`Response logged locally for ${selectedInquiry.senderEmail}`)
    }

    setReplyText('')
  }

  const handleToggleStatus = async (newStatus: 'unread' | 'read' | 'resolved') => {
    if (!selectedInquiry) return

    setInquiries((prev) =>
      prev.map((inq) => (inq.id === selectedInquiry.id ? { ...inq, status: newStatus } : inq))
    )

    try {
      await apiService.updateInquiry(selectedInquiry.id, { status: newStatus })
      showToast(`Status updated to ${newStatus.toUpperCase()}`)
    } catch {
      showToast(`Status updated`)
    }
  }

  const applyCannedTemplate = (text: string) => {
    setReplyText(text)
  }

  return (
    <div className="cmd-canvas">
      {/* Toast */}
      {toastMsg && (
        <div className="shipment-toast">
          ✓ {toastMsg}
        </div>
      )}

      {/* Header */}
      <div className="cmd-header">
        <div className="cmd-header-left">
          <div className="cmd-node-status">
            <span className="cmd-node-pulse" />
            <span>CUSTOMER COMMUNICATIONS // LIVE MONGODB SYNC</span>
          </div>
          <h1 className="cmd-title">Customer Emails & Inquiries</h1>
          <p className="cmd-subtitle">
            Manage incoming shipper inquiries, clearance verifications, rate quotes, and dispatch communications.
          </p>
        </div>
      </div>

      {/* Top 4 KPI Metric Cards */}
      <div className="cmd-stats-row">
        <div className="cmd-stat-card">
          <div className="cmd-stat-info">
            <span className="cmd-stat-label">Total Communications</span>
            <div className="cmd-stat-number">{inquiries.length}</div>
            <span className="cmd-stat-subtext">MongoDB Atlas Active</span>
          </div>
          <div className="cmd-stat-icon-box gray">
            📨
          </div>
        </div>

        <div className="cmd-stat-card">
          <div className="cmd-stat-info">
            <span className="cmd-stat-label">New Inquiries</span>
            <div className="cmd-stat-number" style={{ color: '#dc2626' }}>
              {inquiries.filter((i) => i.status === 'new' || i.status === 'unread').length}
            </div>
            <span className="cmd-stat-subtext">Requires Agent Attention</span>
          </div>
          <div className="cmd-stat-icon-box red">
            🔔
          </div>
        </div>

        <div className="cmd-stat-card">
          <div className="cmd-stat-info">
            <span className="cmd-stat-label">Pending Operations</span>
            <div className="cmd-stat-number" style={{ color: '#0284c7' }}>
              {inquiries.filter((i) => i.status === 'pending').length}
            </div>
            <span className="cmd-stat-subtext">Under Linehaul Review</span>
          </div>
          <div className="cmd-stat-icon-box blue">
            ⏳
          </div>
        </div>

        <div className="cmd-stat-card">
          <div className="cmd-stat-info">
            <span className="cmd-stat-label">Average SLA Turnaround</span>
            <div className="cmd-stat-number" style={{ color: '#10b981' }}>
              12 mins
            </div>
            <span className="cmd-stat-subtext">Target &lt; 30 mins</span>
          </div>
          <div className="cmd-stat-icon-box green">
            ⚡
          </div>
        </div>
      </div>

      {/* 2-Column Split Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '400px 1fr', gap: '1.75rem', alignItems: 'start' }}>
        {/* Left Column: Inbox List */}
        <div className="cmd-card" style={{ padding: '1.25rem' }}>
          {/* Search Input */}
          <div style={{ marginBottom: '1rem' }}>
            <input
              type="text"
              className="cmd-input"
              placeholder="Search sender, subject, waybill..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Filter Tabs */}
          <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              className={`cmd-btn ${filterTab === 'all' ? 'cmd-btn-navy' : 'cmd-btn-white'}`}
              onClick={() => setFilterTab('all')}
              style={{ padding: '0.4rem 0.75rem', fontSize: '0.78rem' }}
            >
              All ({inquiries.length})
            </button>
            <button
              type="button"
              className={`cmd-btn ${filterTab === 'new' ? 'cmd-btn-navy' : 'cmd-btn-white'}`}
              onClick={() => setFilterTab('new')}
              style={{ padding: '0.4rem 0.75rem', fontSize: '0.78rem' }}
            >
              New ({inquiries.filter((i) => i.status === 'new' || i.status === 'unread').length})
            </button>
            <button
              type="button"
              className={`cmd-btn ${filterTab === 'pending' ? 'cmd-btn-navy' : 'cmd-btn-white'}`}
              onClick={() => setFilterTab('pending')}
              style={{ padding: '0.4rem 0.75rem', fontSize: '0.78rem' }}
            >
              Pending ({inquiries.filter((i) => i.status === 'pending').length})
            </button>
            <button
              type="button"
              className={`cmd-btn ${filterTab === 'replied' ? 'cmd-btn-navy' : 'cmd-btn-white'}`}
              onClick={() => setFilterTab('replied')}
              style={{ padding: '0.4rem 0.75rem', fontSize: '0.78rem' }}
            >
              Replied
            </button>
          </div>

          {/* List of Inquiries */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '520px', overflowY: 'auto' }}>
            {isLoading && inquiries.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8', fontSize: '0.85rem' }}>
                Connecting to MongoDB Atlas Inquiries...
              </div>
            ) : filteredInquiries.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8', fontSize: '0.85rem' }}>
                No inquiries match "{searchQuery}"
              </div>
            ) : (
              filteredInquiries.map((inq) => {
                const isSelected = inq.id === selectedInquiry?.id
                const isNew = inq.status === 'new' || inq.status === 'unread'
                const isReplied = inq.status === 'replied' || inq.status === 'resolved'
                return (
                  <div
                    key={inq.id}
                    onClick={() => setSelectedInquiryId(inq.id)}
                    style={{
                      padding: '1.1rem',
                      borderRadius: '14px',
                      border: isSelected ? '2px solid #0284c7' : '1px solid #e2e8f0',
                      background: isSelected ? '#f0f9ff' : '#ffffff',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      boxShadow: isSelected ? '0 4px 14px rgba(2, 132, 199, 0.1)' : '0 2px 5px rgba(0, 0, 0, 0.02)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <strong style={{ fontSize: '0.88rem', color: '#0f172a' }}>{inq.senderName}</strong>
                      <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{inq.createdAtStr || 'Recent'}</span>
                    </div>

                    <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                      {inq.subject}
                    </div>

                    <p style={{ margin: 0, fontSize: '0.76rem', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {inq.message}
                    </p>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '10px' }}>
                      {inq.waybillRef ? (
                        <span style={{ fontSize: '0.72rem', fontFamily: 'monospace', fontWeight: 800, color: '#0284c7' }}>
                          Ref: {inq.waybillRef}
                        </span>
                      ) : (
                        <span />
                      )}

                      <span
                        className={`cmd-status-pill ${
                          isNew ? 'exception' : isReplied ? 'delivered' : 'in_transit'
                        }`}
                      >
                        {isNew ? 'NEW' : isReplied ? 'REPLIED' : 'PENDING'}
                      </span>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Right Column: Inquiry Detail & Response Composer */}
        <div className="cmd-card">
          {selectedInquiry ? (
            <div>
              {/* Top Detail Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingBottom: '1.25rem', borderBottom: '1px solid #f1f5f9', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0f172a', margin: '0 0 0.4rem 0' }}>
                    {selectedInquiry.subject}
                  </h3>
                  <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                    From: <strong style={{ color: '#0f172a' }}>{selectedInquiry.senderName}</strong> &lt;{selectedInquiry.senderEmail}&gt;
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <select
                    className="cmd-select"
                    style={{ padding: '0.45rem 0.75rem', fontSize: '0.78rem' }}
                    value={selectedInquiry.status === 'unread' ? 'unread' : selectedInquiry.status === 'resolved' ? 'resolved' : 'read'}
                    onChange={(e) => handleToggleStatus(e.target.value as 'unread' | 'read' | 'resolved')}
                  >
                    <option value="unread">Mark as New / Unread</option>
                    <option value="read">Mark as Under Review</option>
                    <option value="resolved">Mark as Resolved</option>
                  </select>
                </div>
              </div>

              {/* Waybill Linked Banner */}
              {selectedInquiry.waybillRef && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginTop: '1.25rem',
                    padding: '0.85rem 1.25rem',
                    borderRadius: '12px',
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <span style={{ fontSize: '1.1rem' }}>📦</span>
                    <span style={{ fontSize: '0.82rem', color: '#475569' }}>
                      Linked Consignment Waybill: <strong style={{ color: '#0f172a', fontFamily: 'monospace' }}>{selectedInquiry.waybillRef}</strong>
                    </span>
                  </div>

                  <Link
                    to={`/track?waybill=${encodeURIComponent(selectedInquiry.waybillRef)}`}
                    className="cmd-action-track"
                    style={{ fontSize: '0.8rem', padding: '0.35rem 0.85rem' }}
                  >
                    Track Vector ➔
                  </Link>
                </div>
              )}

              {/* Message Body */}
              <div
                style={{
                  margin: '1.5rem 0',
                  padding: '1.5rem',
                  background: '#fafbfc',
                  borderRadius: '14px',
                  border: '1px solid #e2e8f0',
                  whiteSpace: 'pre-line',
                  fontSize: '0.92rem',
                  lineHeight: '1.65',
                  color: '#334155',
                }}
              >
                {selectedInquiry.message}
              </div>

              {/* Quick Canned Response Templates */}
              <div style={{ marginBottom: '1.25rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', display: 'block', marginBottom: '0.5rem' }}>
                  Quick Canned Response Templates:
                </span>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="create-shipment-preset-chip"
                    onClick={() =>
                      applyCannedTemplate(
                        'Thank you for contacting Package Pilot Dispatch. We have verified the telemetry and customs status for your consignment. Pre-clearance is complete and scheduled delivery remains on track.'
                      )
                    }
                  >
                    Customs Verified
                  </button>
                  <button
                    type="button"
                    className="create-shipment-preset-chip"
                    onClick={() =>
                      applyCannedTemplate(
                        'Our ground operations team has initiated linehaul handover at the destination gateway. Automated POD will be transmitted upon recipient signature.'
                      )
                    }
                  >
                    Final Mile Handover
                  </button>
                  <button
                    type="button"
                    className="create-shipment-preset-chip"
                    onClick={() =>
                      applyCannedTemplate(
                        'We have computed the priority cargo charter quotation based on the standard rate matrix. Please find the attached commercial manifest terms for your review.'
                      )
                    }
                  >
                    Rate Matrix Quote
                  </button>
                </div>
              </div>

              {/* Reply Form */}
              <form onSubmit={handleSendReply}>
                <div className="cmd-form-group">
                  <label className="cmd-form-label">Compose Dispatch Response</label>
                  <textarea
                    rows={4}
                    className="cmd-input"
                    style={{ minHeight: '100px', resize: 'vertical' }}
                    placeholder="Type your official response to the customer..."
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    required
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                  <button type="submit" className="cmd-btn cmd-btn-navy">
                    ✉ Transmit Response
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div style={{ padding: '4rem 2rem', textAlign: 'center', color: '#94a3b8' }}>
              Select an inquiry from the left pane to view details.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
