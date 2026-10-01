import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useShipments } from '../../context/ShipmentContext'
import type { Shipment, ShipmentStatus } from '../../types'
import { getShipmentProgressMetrics } from '../../utils/mapApis'

export function AdminShipments() {
  const {
    shipments,
    updateShipment,
    deleteShipment,
    updateShipmentStatus,
  } = useShipments()

  const [activeTab, setActiveTab] = useState<'all' | 'booking' | 'in_transit' | 'delivered'>('all')
  const [toastMessage, setToastMessage] = useState('')

  // Modals state
  const [reassignShipment, setReassignShipment] = useState<Shipment | null>(null)

  // Status select temporary states per waybill
  const [selectedStatuses, setSelectedStatuses] = useState<Record<string, ShipmentStatus>>({})

  // Reassign Driver Form State
  const [newDriverName, setNewDriverName] = useState('Amina Bello')
  const [newVehicleCode, setNewVehicleCode] = useState('VEH-101')

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(''), 3500)
  }

  // Counts
  const allCount = shipments.length
  const bookingCount = shipments.filter((s) => s.isCustomerBooking || s.status === 'pending').length
  const inTransitCount = shipments.filter((s) => s.status === 'in_transit').length
  const deliveredCount = shipments.filter((s) => s.status === 'delivered').length

  // Filtered shipments
  const filteredShipments = shipments.filter((s) => {
    if (activeTab === 'booking') return s.isCustomerBooking || s.status === 'pending'
    if (activeTab === 'in_transit') return s.status === 'in_transit'
    if (activeTab === 'delivered') return s.status === 'delivered'
    return true
  })

  const handleApproveAndDispatch = (s: Shipment) => {
    updateShipment(s.waybill, {
      status: 'in_transit',
      progressPct: 30,
      statusNote: 'Approved by dispatch control and released into active transit corridor',
    })
    showToast(`Shipment ${s.waybill} approved & dispatched into active transit!`)
  }

  const handleOpenReassign = (s: Shipment) => {
    setReassignShipment(s)
    setNewDriverName(s.assignedDriver || 'Amina Bello')
    setNewVehicleCode(s.vehicleId || 'VEH-101')
  }

  const handleSaveReassign = (e: FormEvent) => {
    e.preventDefault()
    if (!reassignShipment) return

    updateShipment(reassignShipment.waybill, {
      assignedDriver: newDriverName,
      vehicleId: newVehicleCode,
    })

    setReassignShipment(null)
    showToast(`Assigned ${newDriverName} (${newVehicleCode}) to ${reassignShipment.waybill}`)
  }

  const handleToggleStopMovement = (s: Shipment) => {
    const isStopped = !s.isMovementStopped
    updateShipment(s.waybill, {
      isMovementStopped: isStopped,
      status: isStopped ? 'exception' : 'in_transit',
      statusNote: isStopped ? 'Movement halted by dispatch control' : 'Movement resumed',
    })
    showToast(isStopped ? `Movement stopped for ${s.waybill}` : `Movement resumed for ${s.waybill}`)
  }

  const handleStatusSelectChange = (waybill: string, status: ShipmentStatus) => {
    setSelectedStatuses((prev) => ({ ...prev, [waybill]: status }))
  }

  const handleApplyStatus = (s: Shipment) => {
    const newStatus = selectedStatuses[s.waybill] || s.status
    updateShipmentStatus(s.waybill, newStatus, `Status updated to ${newStatus}`)
    showToast(`Status updated to "${newStatus}" for ${s.waybill}`)
  }

  const handleCopyWaybill = (s: Shipment) => {
    navigator.clipboard?.writeText(s.waybill)
    showToast(`Copied ${s.waybill} to clipboard!`)
  }

  const handleDelete = async (s: Shipment) => {
    if (!window.confirm(`Are you sure you want to delete shipment ${s.waybill}?`)) return

    try {
      await deleteShipment(s.waybill)
      showToast(`Deleted ${s.waybill}`)
    } catch {
      showToast(`Could not delete ${s.waybill}. The shipment is still listed.`)
    }
  }

  const formatStatusDisplay = (status: ShipmentStatus) => {
    if (status === 'in_transit') return 'In Transit'
    if (status === 'delivered') return 'Delivered'
    if (status === 'customs') return 'Customs'
    if (status === 'exception') return 'Exception'
    return 'Pending'
  }

  return (
    <div className="shipment-mgmt-canvas">
      {/* Toast */}
      {toastMessage && (
        <div className="shipment-toast">
          ✓ {toastMessage}
        </div>
      )}

      {/* Top Header */}
      <div className="shipment-mgmt-header">
        <div>
          <h1 className="shipment-mgmt-title">Shipment Management</h1>
          <p className="shipment-mgmt-subtitle">
            Manage all shipments and consignments from this panel.
          </p>
        </div>

        <Link
          to="/admin/shipments/new"
          className="shipment-create-btn"
        >
          <span className="shipment-create-btn-icon">⊞</span>
          <span>Create Shipment</span>
        </Link>
      </div>

      {/* Sub-header & Filter Tabs Row */}
      <div className="shipment-tabs-row">
        <h2 className="shipment-section-title">
          Shipments & Consignments ({filteredShipments.length})
        </h2>

        <div className="shipment-tabs-group" role="tablist">
          <button
            type="button"
            className={`shipment-tab-btn ${activeTab === 'all' ? 'active' : ''}`}
            onClick={() => setActiveTab('all')}
          >
            All ({allCount})
          </button>
          <button
            type="button"
            className={`shipment-tab-btn ${activeTab === 'booking' ? 'active' : ''}`}
            onClick={() => setActiveTab('booking')}
          >
            Booking Requests ({bookingCount})
          </button>
          <button
            type="button"
            className={`shipment-tab-btn ${activeTab === 'in_transit' ? 'active' : ''}`}
            onClick={() => setActiveTab('in_transit')}
          >
            In Transit ({inTransitCount})
          </button>
          <button
            type="button"
            className={`shipment-tab-btn ${activeTab === 'delivered' ? 'active' : ''}`}
            onClick={() => setActiveTab('delivered')}
          >
            Delivered ({deliveredCount})
          </button>
        </div>
      </div>

      {/* Shipment Cards */}
      <div className="shipment-cards-list">
        {filteredShipments.length === 0 ? (
          <div className="shipment-card-empty">
            <p>No shipments found in this category.</p>
          </div>
        ) : (
          filteredShipments.map((s) => {
            const currentSelectedStatus = selectedStatuses[s.waybill] || s.status
            const isStopped = s.isMovementStopped || false

            return (
              <div key={s.waybill} className="shipment-mgmt-card">
                {/* Header Row of Card */}
                <div className="shipment-card-top-row">
                  <div className="shipment-card-badges-left">
                    <strong className="shipment-card-waybill">{s.waybill}</strong>

                    <span className="shipment-badge-carrier">{s.carrier}</span>

                    <span className="shipment-badge-tier">
                      {s.serviceTier || 'STANDARD'}
                    </span>

                    <span className="shipment-badge-mode">
                      🌍 International
                    </span>

                    {s.status === 'pending' ? (
                      <span className="shipment-badge-booking" style={{ background: '#fef3c7', color: '#92400e', borderColor: '#fde68a' }}>
                        <span className="shipment-badge-booking-dot" style={{ background: '#f59e0b' }} />
                        Pending Admin Approval
                      </span>
                    ) : (
                      <span className="shipment-badge-booking">
                        <span className="shipment-badge-booking-dot" />
                        Customer Booking Request
                      </span>
                    )}

                    <span className="shipment-badge-price">
                      ${s.rate ? s.rate.toFixed(0) : '46'} USD
                    </span>
                  </div>

                  <div className="shipment-card-badges-right">
                    <span className={`shipment-status-tag ${s.status}`}>
                      {formatStatusDisplay(s.status)}
                    </span>

                    <Link
                      to={`/track?waybill=${encodeURIComponent(s.waybill)}`}
                      className="shipment-track-link-btn"
                    >
                      <span>Track</span>
                      <span aria-hidden="true">→</span>
                    </Link>
                  </div>
                </div>

                {/* Customer & Route Line */}
                <div className="shipment-card-client-line">
                  <strong>{s.clientName}</strong> · <span>{s.clientEmail || s.clientReference}</span>
                </div>

                <div className="shipment-card-route-line">
                  <span className="shipment-pin-red">📍</span>
                  <span className="shipment-route-origin">{s.origin.name}</span>
                  <span className="shipment-route-arrow">→</span>
                  <span className="shipment-hub-icon">🏁</span>
                  <span className="shipment-route-dest">{s.destination.name}</span>
                </div>

                {/* Progress & Distance Covered Bar */}
                {(() => {
                  const metrics = getShipmentProgressMetrics(s)
                  return (
                    <div style={{ margin: '0.85rem 0 1rem', padding: '0.75rem 1rem', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: 800, color: s.isMovementStopped ? '#b91c1c' : '#0284c7', textTransform: 'uppercase' }}>
                            {s.isMovementStopped ? '🛑 MOVEMENT STOPPED (HOLD)' : s.status === 'delivered' ? '✅ DELIVERED' : s.status === 'pending' ? '⏳ PENDING DISPATCH' : '▶ IN TRANSIT'}
                          </span>
                          <span style={{ fontSize: '0.72rem', color: '#64748b' }}>• {metrics.speedDisplay}</span>
                        </div>
                        <strong style={{ fontSize: '0.88rem', color: s.isMovementStopped ? '#b91c1c' : '#0284c7' }}>
                          {metrics.pct}% ({metrics.coveredKm.toLocaleString()} / {metrics.totalKm.toLocaleString()} KM)
                        </strong>
                      </div>
                      <div style={{ width: '100%', height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                        <div
                          style={{
                            width: `${metrics.pct}%`,
                            height: '100%',
                            background: s.isMovementStopped
                              ? '#ef4444'
                              : s.status === 'delivered'
                              ? '#10b981'
                              : 'linear-gradient(90deg, #0284c7 0%, #38bdf8 100%)',
                            borderRadius: '4px',
                            transition: 'width 0.4s ease',
                          }}
                        />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#64748b', marginTop: '4px' }}>
                        <span>Origin: {s.origin.code} (0 km)</span>
                        <span>{metrics.remainingKm.toLocaleString()} KM to destination ({s.destination.code})</span>
                      </div>
                    </div>
                  )
                })()}

                {/* Metrics Grid */}
                {(() => {
                  const metrics = getShipmentProgressMetrics(s)
                  return (
                    <div className="shipment-card-metrics-grid">
                      <div className="shipment-metric-col">
                        <span className="shipment-metric-label">DRIVER / VEHICLE</span>
                        <strong className="shipment-metric-val">
                          {s.assignedDriver || 'Amina Bello'} · {s.vehicleId || 'VEH-101'}
                        </strong>
                      </div>

                      <div className="shipment-metric-col">
                        <span className="shipment-metric-label">CURRENT LOCATION</span>
                        <strong className="shipment-metric-val">
                          {s.currentLocation?.name || 'In Transit'}
                        </strong>
                      </div>

                      <div className="shipment-metric-col">
                        <span className="shipment-metric-label">ETA</span>
                        <strong className="shipment-metric-val">{s.eta}</strong>
                      </div>

                      <div className="shipment-metric-col">
                        <span className="shipment-metric-label">PROGRESS & DISTANCE</span>
                        <strong className="shipment-metric-val progress">
                          {metrics.pct}% ({metrics.coveredKm.toLocaleString()} km)
                        </strong>
                      </div>
                    </div>
                  )
                })()}

                {/* Action Buttons Bar */}
                <div className="shipment-card-actions-bar">
                  {/* Approve & Dispatch Button for Pending Shipments */}
                  {s.status === 'pending' && (
                    <button
                      type="button"
                      className="shipment-action-btn"
                      style={{
                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                        color: '#ffffff',
                        border: 'none',
                        fontWeight: 600,
                        boxShadow: '0 2px 8px rgba(16, 185, 129, 0.35)',
                      }}
                      onClick={() => handleApproveAndDispatch(s)}
                    >
                      <span>✓</span>
                      <span>Approve & Dispatch</span>
                    </button>
                  )}

                  {/* Reassign Driver */}
                  <button
                    type="button"
                    className="shipment-action-btn reassign"
                    onClick={() => handleOpenReassign(s)}
                  >
                    <span>👤+</span>
                    <span>Reassign Driver</span>
                  </button>

                  {/* Edit Information: links directly to Create Shipment studio pre-populated */}
                  <Link
                    to={`/admin/shipments/new?edit=${encodeURIComponent(s.waybill)}`}
                    className="shipment-action-btn edit"
                    style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}
                  >
                    <span>✏️</span>
                    <span>Edit Information</span>
                  </Link>

                  {/* Stop / Resume Movement */}
                  <button
                    type="button"
                    className={`shipment-action-btn ${isStopped ? 'resume' : 'stop'}`}
                    onClick={() => handleToggleStopMovement(s)}
                  >
                    <span>{isStopped ? '▶️' : '⏸️'}</span>
                    <span>{isStopped ? 'Resume Movement' : 'Stop Movement'}</span>
                  </button>

                  {/* Status Dropdown & Update */}
                  <select
                    className="shipment-action-select"
                    value={currentSelectedStatus}
                    onChange={(e) =>
                      handleStatusSelectChange(s.waybill, e.target.value as ShipmentStatus)
                    }
                  >
                    <option value="pending">Pending</option>
                    <option value="in_transit">In Transit</option>
                    <option value="customs">Customs</option>
                    <option value="delivered">Delivered</option>
                    <option value="exception">Exception</option>
                  </select>

                  <button
                    type="button"
                    className="shipment-action-btn update-status"
                    onClick={() => handleApplyStatus(s)}
                  >
                    Update Status
                  </button>

                  {/* Copy Button */}
                  <button
                    type="button"
                    className="shipment-action-btn copy"
                    onClick={() => handleCopyWaybill(s)}
                  >
                    Copy
                  </button>

                  {/* Delete Button */}
                  <button
                    type="button"
                    className="shipment-action-btn delete"
                    onClick={() => handleDelete(s)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Edit Information Modal */}
      {/* Reassign Driver Modal */}
      {reassignShipment && (
        <div className="admin-modal-overlay" onClick={() => setReassignShipment(null)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3>Reassign Driver & Fleet Vehicle ({reassignShipment.waybill})</h3>
              <button
                type="button"
                className="admin-modal-close"
                onClick={() => setReassignShipment(null)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveReassign}>
              <div className="admin-form-group">
                <label className="admin-form-label">Select Driver / Captain</label>
                <select
                  className="admin-select"
                  value={newDriverName}
                  onChange={(e) => setNewDriverName(e.target.value)}
                >
                  <option value="Amina Bello">Amina Bello (Lead Linehaul Specialist)</option>
                  <option value="Marcus Vance">Marcus Vance (Express Dispatch)</option>
                  <option value="Capt. C. Lin">Capt. C. Lin (Airway Corridor DH-709)</option>
                  <option value="David O'Connor">David O'Connor (Port Gateway Transport)</option>
                  <option value="Elena Rostova">Elena Rostova (Trans-Euro Courier)</option>
                </select>
              </div>

              <div className="admin-form-group">
                <label className="admin-form-label">Assigned Vehicle / Airframe ID</label>
                <input
                  type="text"
                  className="admin-input"
                  value={newVehicleCode}
                  onChange={(e) => setNewVehicleCode(e.target.value)}
                  placeholder="e.g. VEH-101, Boeing 767-300F / N-709DH"
                  required
                />
              </div>

              <div className="admin-modal-actions">
                <button
                  type="button"
                  className="admin-quick-btn"
                  onClick={() => setReassignShipment(null)}
                >
                  Cancel
                </button>
                <button type="submit" className="admin-quick-btn primary">
                  Confirm Assignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
