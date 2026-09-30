import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useShipments } from '../../context/ShipmentContext'
import type { CheckpointEventType, ShipmentStatus } from '../../types'
import { getShipmentProgressMetrics } from '../../utils/mapApis'

export function AdminDispatch() {
  const {
    shipments,
    pushCheckpoint,
    telemetryActive,
    toggleTelemetry,
  } = useShipments()

  const [selectedWaybill, setSelectedWaybill] = useState<string>(shipments[0]?.waybill || '')
  const currentShipment = shipments.find((s) => s.waybill === selectedWaybill) || shipments[0]

  // Form State
  const [eventType, setEventType] = useState<CheckpointEventType>('in_transit')
  const [title, setTitle] = useState('En route to destination hub gateway')
  const [detail, setDetail] = useState('Package processed through automated sorter and linehaul departed.')
  const [locationName, setLocationName] = useState(currentShipment?.destination.name || 'London Heathrow (LHR)')
  const [lat, setLat] = useState<number>(currentShipment?.destination.lat || 51.47)
  const [lng, setLng] = useState<number>(currentShipment?.destination.lng || -0.4543)
  const [targetStatus, setTargetStatus] = useState<ShipmentStatus>('in_transit')
  const [toastMessage, setToastMessage] = useState('')

  // Exception quick form
  const [exceptionReason, setExceptionReason] = useState('Flight delayed due to severe North Atlantic weather system')

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(''), 3500)
  }

  const handleSelectShipment = (wb: string) => {
    setSelectedWaybill(wb)
    const found = shipments.find((s) => s.waybill === wb)
    if (found) {
      setLocationName(found.destination.name)
      setLat(found.destination.lat)
      setLng(found.destination.lng)
    }
  }

  const handlePushSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentShipment) return

    pushCheckpoint(currentShipment.waybill, {
      title,
      detail,
      location: locationName,
      time: 'Just now · Live Dispatch',
      lat: Number(lat),
      lng: Number(lng),
      eventType,
      status: targetStatus,
      completed: true,
      current: true,
    })

    showToast(`Pushed checkpoint to ${currentShipment.waybill}! Live in Tracker now.`)
  }

  const handleTriggerException = () => {
    if (!currentShipment) return

    pushCheckpoint(currentShipment.waybill, {
      title: 'Transit Exception & Delay Notice',
      detail: exceptionReason,
      location: currentShipment.currentLocation.name,
      time: 'Just now · Exception',
      lat: currentShipment.currentLocation.lat,
      lng: currentShipment.currentLocation.lng,
      eventType: 'exception',
      status: 'exception',
      completed: true,
      current: true,
    })

    showToast(`Logged critical exception on ${currentShipment.waybill}!`)
  }

  return (
    <div className="admin-page">
      {/* Toast */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            background: 'rgba(15, 23, 42, 0.95)',
            border: '1px solid #10b981',
            boxShadow: '0 0 20px rgba(16, 185, 129, 0.3)',
            color: '#ffffff',
            padding: '0.85rem 1.25rem',
            borderRadius: '8px',
            zIndex: 999,
            fontWeight: 600,
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <span>✓</span> {toastMessage}
        </div>
      )}

      {/* Header */}
      <div className="admin-page-header">
        <div>
          <h2>Milestone & Telemetry Dispatcher</h2>
          <p>
            Advance physical checkpoints, push live GPS vector pings, and log customs or exception events directly to the tracking engine.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button
            type="button"
            className={`admin-telemetry-pill ${!telemetryActive ? 'paused' : ''}`}
            onClick={toggleTelemetry}
          >
            <span className="admin-telemetry-pulse" />
            <span>{telemetryActive ? '4s Simulation: Running' : '4s Simulation: Paused'}</span>
          </button>
        </div>
      </div>

      {/* Waybill Selector Ribbon */}
      <div className="admin-card" style={{ marginBottom: '1.5rem', padding: '1rem 1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.82rem', fontWeight: 700, textTransform: 'uppercase', color: '#94a3b8' }}>
            Target Consignment:
          </span>

          <select
            className="admin-select"
            style={{ maxWidth: '400px' }}
            value={selectedWaybill}
            onChange={(e) => handleSelectShipment(e.target.value)}
          >
            {shipments.map((s) => (
              <option key={s.waybill} value={s.waybill}>
                {s.waybill} — {s.carrier} ({s.origin.code} → {s.destination.code}) [{s.status.toUpperCase()}]
              </option>
            ))}
          </select>

          {currentShipment && (() => {
            const metrics = getShipmentProgressMetrics(currentShipment)
            return (
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginLeft: 'auto', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 800, color: currentShipment.isMovementStopped ? '#ef4444' : '#38bdf8' }}>
                  {metrics.pct}% ({metrics.coveredKm.toLocaleString()} / {metrics.totalKm.toLocaleString()} KM)
                </span>
                <span className={`admin-status-pill ${currentShipment.status}`}>
                  {currentShipment.isMovementStopped ? 'STOPPED' : currentShipment.status.replace('_', ' ')}
                </span>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>• {metrics.speedDisplay}</span>
                <Link
                  to={`/track?waybill=${encodeURIComponent(currentShipment.waybill)}`}
                  className="admin-quick-btn"
                  style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem' }}
                >
                  Open in Public Tracker ↗
                </Link>
              </div>
            )
          })()}
        </div>
      </div>

      {/* Main 2-Col Layout */}
      {currentShipment && (
        <div className="admin-grid-2">
          {/* Left Column: Push Checkpoint Form */}
          <div className="admin-card">
            <div className="admin-card-header">
              <div>
                <h3>Push New Telemetry Milestone</h3>
                <p style={{ margin: 0, fontSize: '0.78rem', color: '#94a3b8' }}>
                  Milestones update the public tracking page and client timeline in real time.
                </p>
              </div>
            </div>

            <form onSubmit={handlePushSubmit}>
              <div className="admin-form-row">
                <div className="admin-form-group">
                  <label className="admin-form-label">Event Category</label>
                  <select
                    className="admin-select"
                    value={eventType}
                    onChange={(e) => {
                      const val = e.target.value as CheckpointEventType
                      setEventType(val)
                      if (val === 'customs' || val === 'customs_hold') {
                        setTargetStatus('customs')
                        setTitle('Under customs document examination')
                      } else if (val === 'delivered') {
                        setTargetStatus('delivered')
                        setTitle('Consignment delivered and signed')
                      } else if (val === 'exception') {
                        setTargetStatus('exception')
                        setTitle('Linehaul route delay notice')
                      } else {
                        setTargetStatus('in_transit')
                        setTitle('Departed transit hub gateway')
                      }
                    }}
                  >
                    <option value="in_transit">In Transit (Transit Gateway)</option>
                    <option value="pickup">Collected from Sender</option>
                    <option value="customs">Customs Intake & Review</option>
                    <option value="customs_cleared">Customs Green Lane Cleared</option>
                    <option value="customs_hold">Customs Regulatory Hold</option>
                    <option value="out_for_delivery">Out for Final Delivery</option>
                    <option value="delivered">Delivered (Final POD)</option>
                    <option value="exception">Route Exception / Delay</option>
                  </select>
                </div>

                <div className="admin-form-group">
                  <label className="admin-form-label">Resulting Shipment Status</label>
                  <select
                    className="admin-select"
                    value={targetStatus}
                    onChange={(e) => setTargetStatus(e.target.value as ShipmentStatus)}
                  >
                    <option value="in_transit">In Transit</option>
                    <option value="customs">Customs Hold</option>
                    <option value="delivered">Delivered</option>
                    <option value="exception">Exception / Alert</option>
                    <option value="pending">Pending</option>
                  </select>
                </div>
              </div>

              <div className="admin-form-group">
                <label className="admin-form-label">Milestone Title</label>
                <input
                  type="text"
                  className="admin-input"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>

              <div className="admin-form-group">
                <label className="admin-form-label">Operational Detail / Notes</label>
                <textarea
                  rows={2}
                  className="admin-textarea"
                  value={detail}
                  onChange={(e) => setDetail(e.target.value)}
                  required
                />
              </div>

              <div className="admin-form-row">
                <div className="admin-form-group">
                  <label className="admin-form-label">Location / Gateway Name</label>
                  <input
                    type="text"
                    className="admin-input"
                    value={locationName}
                    onChange={(e) => setLocationName(e.target.value)}
                    required
                  />
                </div>

                <div className="admin-form-group">
                  <label className="admin-form-label">Latitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    className="admin-input"
                    value={lat}
                    onChange={(e) => setLat(Number(e.target.value))}
                    required
                  />
                </div>

                <div className="admin-form-group">
                  <label className="admin-form-label">Longitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    className="admin-input"
                    value={lng}
                    onChange={(e) => setLng(Number(e.target.value))}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
                <button type="submit" className="admin-quick-btn primary" style={{ width: '100%', justifyContent: 'center' }}>
                  🚀 Broadcast & Push Checkpoint
                </button>
              </div>
            </form>

            {/* Emergency Exception Trigger */}
            <div
              style={{
                marginTop: '1.75rem',
                paddingTop: '1.25rem',
                borderTop: '1px solid rgba(239, 68, 68, 0.25)',
                background: 'rgba(239, 68, 68, 0.05)',
                padding: '1rem',
                borderRadius: '8px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: '#f87171', fontWeight: 700 }}>
                <span>⚠️</span> Emergency Exception Logger
              </div>
              <p style={{ fontSize: '0.78rem', color: '#94a3b8', margin: '0 0 0.75rem 0' }}>
                Flags this cargo as requiring operational review, sending automated notifications to the shipper.
              </p>

              <div className="admin-form-group">
                <input
                  type="text"
                  className="admin-input"
                  value={exceptionReason}
                  onChange={(e) => setExceptionReason(e.target.value)}
                  placeholder="Reason for delay or inspection hold..."
                />
              </div>

              <button
                type="button"
                className="admin-quick-btn"
                style={{ background: 'rgba(239, 68, 68, 0.2)', borderColor: '#ef4444', color: '#fca5a5', width: '100%', justifyContent: 'center' }}
                onClick={handleTriggerException}
              >
                Log Critical Exception & Alert Client
              </button>
            </div>
          </div>

          {/* Right Column: Live Timeline of Selected Waybill */}
          <div className="admin-card">
            <div className="admin-card-header">
              {(() => {
                const metrics = getShipmentProgressMetrics(currentShipment)
                return (
                  <div style={{ width: '100%' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h3>Active Milestone Sequence ({currentShipment.checkpoints.length})</h3>
                      <strong style={{ color: currentShipment.isMovementStopped ? '#ef4444' : '#38bdf8', fontSize: '0.85rem' }}>
                        {metrics.pct}% ({metrics.coveredKm.toLocaleString()} / {metrics.totalKm.toLocaleString()} KM)
                      </strong>
                    </div>
                    <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: '#94a3b8' }}>
                      {currentShipment.waybill} • {currentShipment.carrier} • {currentShipment.origin.code} → {currentShipment.destination.code} • {metrics.speedDisplay}
                    </p>
                  </div>
                )
              })()}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', position: 'relative' }}>
              {currentShipment.checkpoints.map((cp, idx) => (
                <div
                  key={cp.id}
                  style={{
                    display: 'flex',
                    gap: '1rem',
                    padding: '0.75rem 1rem',
                    borderRadius: '8px',
                    background: cp.current ? 'rgba(0, 210, 255, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                    border: cp.current ? '1px solid rgba(0, 210, 255, 0.3)' : '1px solid var(--admin-border)',
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div
                      style={{
                        width: '14px',
                        height: '14px',
                        borderRadius: '50%',
                        background: cp.current ? '#00d2ff' : '#10b981',
                        boxShadow: cp.current ? '0 0 10px #00d2ff' : 'none',
                      }}
                    />
                    {idx < currentShipment.checkpoints.length - 1 && (
                      <div style={{ width: '2px', flex: 1, background: 'rgba(255, 255, 255, 0.1)', margin: '4px 0' }} />
                    )}
                  </div>

                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <strong style={{ fontSize: '0.85rem', color: cp.current ? '#38bdf8' : '#ffffff' }}>
                        {cp.title}
                      </strong>
                      <span style={{ fontSize: '0.7rem', color: '#64748b' }}>{cp.time}</span>
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '2px' }}>{cp.detail}</div>
                    <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '4px' }}>
                      📍 {cp.location} {cp.lat && `(${cp.lat.toFixed(2)}°, ${cp.lng?.toFixed(2)}°)`}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
