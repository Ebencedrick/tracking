import { useState } from 'react'
import { Link } from 'react-router-dom'

interface Inquiry {
  id: string
  fromName: string
  fromEmail: string
  subject: string
  date: string
  preview: string
  status: 'new' | 'replied' | 'pending'
  waybill?: string
  message: string
}

const SAMPLE_INQUIRIES: Inquiry[] = [
  {
    id: 'inq-1',
    fromName: 'Jessica Wong (Apex Bio)',
    fromEmail: 'jessica.w@apexbiotech.com',
    subject: 'Cold-chain telemetry report verification for ORD-DXB',
    date: '10 mins ago',
    preview: 'Requesting signed continuous temp logger data for PLOT-77812-QA1 prior to audit sign-off.',
    status: 'new',
    waybill: 'PLOT-70955-JFD',
    message:
      'Hello Dispatch Team,\n\nWe require the full calibrated 4-second GPS telemetry and temperature logger download for our shipment PLOT-70955-JFD before customs clearance handover at London Heathrow (LHR).\n\nPlease provide confirmation of temperature range preservation during the transatlantic airfreight leg.\n\nBest regards,\nJessica Wong\nDirector of Quality Assurance, Apex Biotech',
  },
  {
    id: 'inq-2',
    fromName: 'David Miller (Maersk Logistics)',
    fromEmail: 'd.miller@maersk-intermodal.com',
    subject: 'Port of Rotterdam customs green-lane berth update',
    date: '1 hour ago',
    preview: 'Container vessel Madrid Maersk arriving at Maasvlakte gateway. Clearance manifest submitted.',
    status: 'pending',
    waybill: 'PLOT-99420-CT4',
    message:
      'Hi Operations,\n\nMadrid Maersk has arrived at Rotterdam Maasvlakte terminal. Pre-clearance customs documentation has been synchronized with the Northstar linehaul gateway. We anticipate offload completion within 3 hours.\n\nRegards,\nDavid Miller',
  },
  {
    id: 'inq-3',
    fromName: 'Arthur Pendelton (Acme Corp)',
    fromEmail: 'a.pendelton@acme-corp.com',
    subject: 'High-value air freight priority rate quote for Q4 linehaul',
    date: '3 hours ago',
    preview: 'Inquiring about dedicated charter space for 40 pallets transatlantic corridor NYC to LHR.',
    status: 'replied',
    message:
      'Good morning,\n\nAcme Corporation is scheduling 40 high-security cargo pallets for delivery from JFK to London Heathrow next month. Please confirm rate matrix tiers and dedicated airframe options.\n\nThank you,\nArthur Pendelton',
  },
]

export function AdminInquiries() {
  const [inquiries, setInquiries] = useState<Inquiry[]>(SAMPLE_INQUIRIES)
  const [selectedInquiryId, setSelectedInquiryId] = useState<string>(SAMPLE_INQUIRIES[0].id)
  const [filterTab, setFilterTab] = useState<'all' | 'new' | 'pending' | 'replied'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [replyText, setReplyText] = useState('')
  const [toastMsg, setToastMsg] = useState('')

  const selectedInquiry = inquiries.find((i) => i.id === selectedInquiryId) || inquiries[0]

  const showToast = (msg: string) => {
    setToastMsg(msg)
    setTimeout(() => setToastMsg(''), 3500)
  }

  const filteredInquiries = inquiries.filter((inq) => {
    if (filterTab !== 'all' && inq.status !== filterTab) return false
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      return (
        inq.fromName.toLowerCase().includes(q) ||
        inq.fromEmail.toLowerCase().includes(q) ||
        inq.subject.toLowerCase().includes(q) ||
        (inq.waybill && inq.waybill.toLowerCase().includes(q))
      )
    }
    return true
  })

  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedInquiry || !replyText.trim()) return

    setInquiries((prev) =>
      prev.map((inq) => (inq.id === selectedInquiry.id ? { ...inq, status: 'replied' } : inq))
    )
    showToast(`Reply transmitted to ${selectedInquiry.fromEmail}!`)
    setReplyText('')
  }

  const handleToggleStatus = (newStatus: 'new' | 'pending' | 'replied') => {
    if (!selectedInquiry) return
    setInquiries((prev) =>
      prev.map((inq) => (inq.id === selectedInquiry.id ? { ...inq, status: newStatus } : inq))
    )
    showToast(`Status marked as ${newStatus.toUpperCase()}`)
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
            <span>CUSTOMER COMMUNICATIONS // OPERATIONAL</span>
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
            <span className="cmd-stat-subtext">All Channels Active</span>
          </div>
          <div className="cmd-stat-icon-box gray">
            📨
          </div>
        </div>

        <div className="cmd-stat-card">
          <div className="cmd-stat-info">
            <span className="cmd-stat-label">New Inquiries</span>
            <div className="cmd-stat-number" style={{ color: '#dc2626' }}>
              {inquiries.filter((i) => i.status === 'new').length}
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
              New ({inquiries.filter((i) => i.status === 'new').length})
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
            {filteredInquiries.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8', fontSize: '0.85rem' }}>
                No inquiries match "{searchQuery}"
              </div>
            ) : (
              filteredInquiries.map((inq) => {
                const isSelected = inq.id === selectedInquiry?.id
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
                      <strong style={{ fontSize: '0.88rem', color: '#0f172a' }}>{inq.fromName}</strong>
                      <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{inq.date}</span>
                    </div>

                    <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                      {inq.subject}
                    </div>

                    <p style={{ margin: 0, fontSize: '0.76rem', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {inq.preview}
                    </p>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '10px' }}>
                      {inq.waybill ? (
                        <span style={{ fontSize: '0.72rem', fontFamily: 'monospace', fontWeight: 800, color: '#0284c7' }}>
                          Ref: {inq.waybill}
                        </span>
                      ) : (
                        <span />
                      )}

                      <span
                        className={`cmd-status-pill ${
                          inq.status === 'new' ? 'exception' : inq.status === 'replied' ? 'delivered' : 'in_transit'
                        }`}
                      >
                        {inq.status.toUpperCase()}
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
                    From: <strong style={{ color: '#0f172a' }}>{selectedInquiry.fromName}</strong> &lt;{selectedInquiry.fromEmail}&gt;
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <select
                    className="cmd-select"
                    style={{ padding: '0.45rem 0.75rem', fontSize: '0.78rem' }}
                    value={selectedInquiry.status}
                    onChange={(e) => handleToggleStatus(e.target.value as 'new' | 'pending' | 'replied')}
                  >
                    <option value="new">Mark as New</option>
                    <option value="pending">Mark as Pending</option>
                    <option value="replied">Mark as Replied</option>
                  </select>
                </div>
              </div>

              {/* Waybill Linked Banner */}
              {selectedInquiry.waybill && (
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
                      Linked Consignment Waybill: <strong style={{ color: '#0f172a', fontFamily: 'monospace' }}>{selectedInquiry.waybill}</strong>
                    </span>
                  </div>

                  <Link
                    to={`/track?waybill=${encodeURIComponent(selectedInquiry.waybill)}`}
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
