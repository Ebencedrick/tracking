import { useEffect, useRef, useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import L from 'leaflet'
import { useShipments } from '../../context/ShipmentContext'
import type { Shipment, ShippingMode, ShipmentStatus } from '../../types'
import { getShipmentProgressMetrics, getShipmentDistanceKm } from '../../utils/mapApis'

const siteLogo = '/brand-logo.jfif'

interface AdminOutletContext {
  openBroadcastModal: () => void
  openRadarModal: () => void
}

export function AdminDashboard() {
  const { shipments, updateShipment, addAuditLog } = useShipments()
  const { openBroadcastModal, openRadarModal } = useOutletContext<AdminOutletContext>()

  // Computed metrics
  const totalConsignments = shipments.length
  const inTransitCount = shipments.filter((s) => s.status === 'in_transit').length
  const deliveredCount = shipments.filter((s) => s.status === 'delivered').length
  const exceptionCount = shipments.filter((s) => s.status === 'exception' || s.isMovementStopped).length
  const pendingCount = shipments.filter((s) => s.status === 'pending').length

  // Filter for Map View
  const [selectedAssetWaybill, setSelectedAssetWaybill] = useState<string>(
    shipments[0]?.waybill || 'PLOT-70955-JFD'
  )
  const [mapModeFilter, setMapModeFilter] = useState<'all' | ShippingMode>('all')
  const [toastMessage, setToastMessage] = useState('')
  const [isSpaceLinkPinging, setIsSpaceLinkPinging] = useState(false)

  // Fleet Quick Edit Modal State
  const [editingShipment, setEditingShipment] = useState<Shipment | null>(null)
  const [quickForm, setQuickForm] = useState({
    status: 'in_transit' as ShipmentStatus,
    isMovementStopped: false,
    progressPct: 50,
    assignedDriver: '',
    vehicleId: '',
    currentLocationName: '',
    statusNote: '',
    newCheckpointTitle: '',
    newCheckpointLocation: '',
  })

  // Incident states
  const [acknowledgedIncidents, setAcknowledgedIncidents] = useState<Record<string, boolean>>({})

  // Leaflet Map Refs
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<L.Map | null>(null)
  const markersLayerRef = useRef<L.LayerGroup | null>(null)

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(''), 4000)
  }

  // Filtered shipments for the radar map
  const mapShipments = shipments.filter((s) => {
    if (mapModeFilter !== 'all' && s.mode !== mapModeFilter) return false
    return true
  })

  // Initialize Dashboard Radar Map
  useEffect(() => {
    if (!mapContainerRef.current) return
    if (mapInstanceRef.current) return

    const map = L.map(mapContainerRef.current, {
      zoomControl: true,
      attributionControl: false,
    }).setView([42.0, -25.0], 3)

    L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
      {
        subdomains: ['server', 'services'],
        maxZoom: 19,
        attribution: 'Tiles &copy; Esri &mdash; Global Logistics Telemetry',
      }
    ).addTo(map)

    const markersGroup = L.layerGroup().addTo(map)
    markersLayerRef.current = markersGroup
    mapInstanceRef.current = map

    return () => {
      map.remove()
      mapInstanceRef.current = null
      markersLayerRef.current = null
    }
  }, [])

  // Plot all active assets on dashboard radar map
  useEffect(() => {
    const map = mapInstanceRef.current
    const markersGroup = markersLayerRef.current
    if (!map || !markersGroup) return

    markersGroup.clearLayers()

    mapShipments.forEach((s) => {
      const vLat = s.currentLocation?.lat || s.origin.lat
      const vLng = s.currentLocation?.lng || s.origin.lng
      const isSelected = s.waybill === selectedAssetWaybill
      const emoji = s.mode === 'air' ? '✈️' : s.mode === 'sea' ? '🚢' : '🚚'

      const customIcon = L.divIcon({
        className: 'dashboard-radar-marker',
        html: `
          <div style="
            width: ${isSelected ? '32px' : '26px'};
            height: ${isSelected ? '32px' : '26px'};
            background-color: ${s.isMovementStopped ? '#ea580c' : isSelected ? '#0284c7' : '#0f172a'};
            border: 2px solid ${isSelected ? '#38bdf8' : '#ffffff'};
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: ${isSelected ? '14px' : '11px'};
            box-shadow: 0 0 ${isSelected ? '16px rgba(56, 189, 248, 0.9)' : '8px rgba(0,0,0,0.5)'};
            cursor: pointer;
            position: relative;
            transition: all 0.3s ease;
          ">
            ${emoji}
            ${
              isSelected
                ? `<div style="
                    position: absolute;
                    inset: -5px;
                    border: 2px solid #38bdf8;
                    border-radius: 50%;
                    animation: radar-pulse 2s infinite;
                  "></div>`
                : ''
            }
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      })

      const marker = L.marker([vLat, vLng], { icon: customIcon }).addTo(markersGroup)

      marker.bindPopup(`
        <div style="font-family: inherit; font-size: 12px; min-width: 180px;">
          <strong style="color: #0284c7; font-size: 13px;">${s.carrier} (${s.waybill})</strong><br>
          <b>Corridor:</b> ${s.origin.code} ➔ ${s.destination.code}<br>
          <b>Position:</b> ${s.currentLocation?.name || 'In Corridor'}<br>
          <b>Status:</b> ${s.status.toUpperCase()} (${s.progressPct || 45}%)<br>
          <b>Driver:</b> ${s.assignedDriver || 'Linehaul Unit'}<br>
          <b>Movement:</b> ${s.isMovementStopped ? '<span style="color:#ea580c;font-weight:bold;">HOLD (STOPPED)</span>' : '<span style="color:#10b981;font-weight:bold;">ACTIVE</span>'}
        </div>
      `)

      marker.on('click', () => {
        setSelectedAssetWaybill(s.waybill)
      })
    })
  }, [mapShipments, selectedAssetWaybill])

  // Open Fleet Quick Edit Modal
  const handleOpenFleetModal = (s: Shipment) => {
    setSelectedAssetWaybill(s.waybill)
    setEditingShipment(s)
    setQuickForm({
      status: s.status,
      isMovementStopped: !!s.isMovementStopped,
      progressPct: s.progressPct || 45,
      assignedDriver: s.assignedDriver || '',
      vehicleId: s.vehicleId || '',
      currentLocationName: s.currentLocation?.name || '',
      statusNote: s.statusNote || '',
      newCheckpointTitle: '',
      newCheckpointLocation: '',
    })

    if (mapInstanceRef.current) {
      const vLat = s.currentLocation?.lat || s.origin.lat
      const vLng = s.currentLocation?.lng || s.origin.lng
      mapInstanceRef.current.flyTo([vLat, vLng], 6, { duration: 1.2 })
    }
  }

  // Toggle Stop / Resume Movement directly
  const handleToggleMovement = (s: Shipment) => {
    const nextStopped = !s.isMovementStopped
    const nextNote = nextStopped
      ? 'Movement held by Dispatch Operations Command'
      : 'Movement resumed: Corridor telemetry operational'

    updateShipment(s.waybill, {
      isMovementStopped: nextStopped,
      statusNote: nextNote,
    })

    addAuditLog(
      nextStopped ? 'Hold Movement Ordered' : 'Movement Resumed',
      'TELEMETRY',
      `Consignment ${s.waybill} movement ${nextStopped ? 'HALTED (Cargo Hold)' : 'RESUMED (Active Velocity)'} by Dispatch Command`,
      nextStopped ? 'warning' : 'info',
      s.waybill
    )

    showToast(
      nextStopped
        ? `🛑 Movement stopped for ${s.waybill} (Cargo Hold active)`
        : `▶️ Movement resumed for ${s.waybill} (Active Transit)`
    )
  }

  // Save Fleet Quick Updates
  const handleSaveFleetUpdates = (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingShipment) return

    const updates: Partial<Shipment> = {
      status: quickForm.status,
      isMovementStopped: quickForm.isMovementStopped,
      progressPct: Number(quickForm.progressPct),
      assignedDriver: quickForm.assignedDriver,
      vehicleId: quickForm.vehicleId,
      statusNote: quickForm.statusNote,
    }

    if (quickForm.currentLocationName) {
      updates.currentLocation = {
        name: quickForm.currentLocationName,
        lat: editingShipment.currentLocation?.lat || editingShipment.origin.lat,
        lng: editingShipment.currentLocation?.lng || editingShipment.origin.lng,
      }
    }

    if (quickForm.newCheckpointTitle.trim()) {
      const newCp = {
        id: `cp-${Date.now()}`,
        title: quickForm.newCheckpointTitle.trim(),
        location: quickForm.newCheckpointLocation.trim() || quickForm.currentLocationName || editingShipment.destination.name,
        timestamp: new Date().toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
        completed: true,
        current: true,
        detail: 'Checkpoint logged live by Dispatch Operations Controller.',
      }
      const existing = (editingShipment.checkpoints || []).map((cp) => ({ ...cp, current: false }))
      updates.checkpoints = [...existing, newCp]
    }

    updateShipment(editingShipment.waybill, updates)

    addAuditLog(
      'Fleet Telemetry Update',
      'TELEMETRY',
      `Manual telemetry and status update pushed to waybill ${editingShipment.waybill} (Status: ${quickForm.status}, Progress: ${quickForm.progressPct}%)`,
      'info',
      editingShipment.waybill
    )

    showToast(`✓ Telemetry & consignment updates pushed to MongoDB Atlas for ${editingShipment.waybill}!`)
    setEditingShipment(null)
  }

  // Quick Action 1: Ping SpaceLink Telemetry
  const handlePingTelemetry = () => {
    setIsSpaceLinkPinging(true)
    showToast('📡 SpaceLink Global Telemetry ping broadcasted. 4 active transponders synchronized with MongoDB.')
    addAuditLog(
      'Telemetry Ping Broadcast',
      'TELEMETRY',
      'SpaceLink satellite cluster synchronized global coordinates for all active airways & maritime corridors',
      'info'
    )
    setTimeout(() => setIsSpaceLinkPinging(false), 2000)
  }

  // Quick Action 2: Export Manifest Summary
  const handleExportManifest = () => {
    const manifestSummary = shipments.map((s) => ({
      waybill: s.waybill,
      carrier: s.carrier,
      mode: s.mode,
      origin: s.origin.name,
      destination: s.destination.name,
      driver: s.assignedDriver,
      status: s.status,
      isMovementStopped: s.isMovementStopped,
      rate: s.rate,
      eta: s.eta,
    }))
    const jsonBlob = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(manifestSummary, null, 2))
    const downloadAnchor = document.createElement('a')
    downloadAnchor.setAttribute('href', jsonBlob)
    downloadAnchor.setAttribute('download', `Northstar_Manifest_Export_${new Date().toISOString().slice(0, 10)}.json`)
    document.body.appendChild(downloadAnchor)
    downloadAnchor.click()
    downloadAnchor.remove()
    showToast('✓ Operations Manifest exported as JSON!')
  }

  // Quick Action 3: Auto-assign Available Driver
  const handleAutoAssign = () => {
    const unassigned = shipments.filter((s) => !s.assignedDriver || s.assignedDriver === 'Unassigned')
    if (unassigned.length === 0) {
      showToast('All active consignments currently have assigned linehaul drivers!')
      return
    }
    const driverRoster = ['Amina Bello', 'Marcus Vance', 'Capt. C. Lin', 'David O\'Connor', 'Elena Rostova']
    unassigned.forEach((s, idx) => {
      const assigned = driverRoster[idx % driverRoster.length]
      updateShipment(s.waybill, { assignedDriver: assigned, vehicleId: `VEH-${100 + idx}` })
    })
    showToast(`✓ Auto-assigned linehaul operators to ${unassigned.length} pending consignment(s)!`)
  }

  // Incident Acknowledge
  const handleAcknowledgeIncident = (waybill: string) => {
    setAcknowledgedIncidents((prev) => ({ ...prev, [waybill]: true }))
    showToast(`Advisory for ${waybill} acknowledged by Dispatch Command.`)
  }

  // Incident Override / Resume
  const handleClearAdvisory = (s: Shipment) => {
    updateShipment(s.waybill, {
      status: 'in_transit',
      isMovementStopped: false,
      statusNote: 'Advisory resolved and transit corridor resumed',
    })
    showToast(`Corridor advisory cleared for ${s.waybill}. Resumed full velocity!`)
  }

  return (
    <div className="cmd-canvas">
      {/* Toast */}
      {toastMessage && <div className="shipment-toast">✓ {toastMessage}</div>}

      {/* Top Operations Header */}
      <div className="cmd-header">
        <div className="cmd-header-left">
          <div className="cmd-node-status">
            <span className="cmd-node-pulse" />
            <span>COMMAND NODE // MONGODB LIVE CONNECTED</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.25rem' }}>
            <img src={siteLogo} alt="Package Pilot Official" className="cmd-dashboard-header-logo" />
            <div>
              <h1 className="cmd-title" style={{ margin: 0 }}>Operations & Fleet Command</h1>
              <p className="cmd-subtitle">
                Real-time multi-carrier telemetry, interactive live fleets, dispatch controls, and active route progress.
              </p>
            </div>
          </div>
        </div>

        <div className="cmd-header-actions">
          <Link to="/admin/shipments/new" className="cmd-btn cmd-btn-red">
            <span style={{ fontSize: '1.1rem', marginRight: '2px' }}>⊕</span> NEW CONSIGNMENT
          </Link>
          <button type="button" className="cmd-btn cmd-btn-navy" onClick={openBroadcastModal}>
            <span>✉</span> BROADCAST NOTICE
          </button>
          <button type="button" className="cmd-btn cmd-btn-white" onClick={openRadarModal}>
            <span>🗺</span> LIVE RADAR
          </button>
        </div>
      </div>

      {/* 4 Stat Cards Row */}
      <div className="cmd-stats-row">
        {/* Card 1: Total Consignments */}
        <div className="cmd-stat-card">
          <div className="cmd-stat-content">
            <span className="cmd-stat-label">TOTAL CONSIGNMENTS</span>
            <div className="cmd-stat-number">{totalConsignments}</div>
            <span className="cmd-stat-subtext">Recorded in MongoDB</span>
          </div>
          <div className="cmd-stat-icon-box gray" aria-hidden="true">
            <span>📦</span>
          </div>
        </div>

        {/* Card 2: Active In Transit */}
        <div className="cmd-stat-card blue">
          <div className="cmd-stat-content">
            <span className="cmd-stat-label">ACTIVE IN TRANSIT</span>
            <div className="cmd-stat-number">{inTransitCount}</div>
            <span className="cmd-stat-subtext">Live GPS Telemetry</span>
          </div>
          <div className="cmd-stat-icon-box blue" aria-hidden="true">
            <span>🚚</span>
          </div>
        </div>

        {/* Card 3: Delivered Receipt */}
        <div className="cmd-stat-card green">
          <div className="cmd-stat-content">
            <span className="cmd-stat-label">DELIVERED RECEIPT</span>
            <div className="cmd-stat-number">{deliveredCount}</div>
            <span className="cmd-stat-subtext">Successful handoffs</span>
          </div>
          <div className="cmd-stat-icon-box green" aria-hidden="true">
            <span>✓</span>
          </div>
        </div>

        {/* Card 4: Transit Advisories */}
        <div className="cmd-stat-card red">
          <div className="cmd-stat-content">
            <span className="cmd-stat-label">TRANSIT ADVISORIES</span>
            <div className="cmd-stat-number">{exceptionCount}</div>
            <span className="cmd-stat-subtext">Inspection / hold</span>
          </div>
          <div className="cmd-stat-icon-box red" aria-hidden="true">
            <span>⚠️</span>
          </div>
        </div>
      </div>

      {/* Recent Freight Waybills & Consignments Card */}
      <div className="cmd-card" style={{ marginBottom: '2rem' }}>
        <div className="cmd-card-header">
          <h3 className="cmd-card-title">
            <span className="cmd-card-title-icon" aria-hidden="true">📑</span>
            <span>Recent Freight Waybills & Consignments</span>
          </h3>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
              Pending Approval: <strong style={{ color: '#f59e0b' }}>{pendingCount}</strong>
            </span>
            <Link to="/admin/shipments" className="cmd-card-link-red">
              <span>View All Shipments</span>
              <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>

        <div className="cmd-table-wrap">
          <table className="cmd-table">
            <thead>
              <tr>
                <th>TRACKING WAYBILL</th>
                <th>ORIGIN TERMINAL</th>
                <th>DESTINATION HUB</th>
                <th>PROGRESS & HOW FAR GONE</th>
                <th>STATUS & MOVEMENT</th>
                <th>ETA SCHEDULE</th>
                <th style={{ textAlign: 'right' }}>OPERATIONS ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {shipments.map((s) => {
                const metrics = getShipmentProgressMetrics(s)
                return (
                  <tr key={s.waybill}>
                    {/* Waybill + Carrier Badge */}
                    <td>
                      <div className="cmd-waybill-cell">
                        <Link to={`/dashboard/shipments/${s.waybill}`} className="cmd-waybill-code">
                          {s.waybill}
                        </Link>
                        <span
                          className={`cmd-carrier-badge ${
                            s.carrier.toLowerCase().includes('fedex')
                              ? 'fedex'
                              : s.carrier.toLowerCase().includes('ups')
                              ? 'ups'
                              : s.carrier.toLowerCase().includes('maersk')
                              ? 'maersk'
                              : ''
                          }`}
                        >
                          {s.carrier}
                        </span>
                      </div>
                    </td>

                    {/* Origin Terminal */}
                    <td>
                      <div className="cmd-origin-cell">
                        <span className="cmd-origin-pin" aria-hidden="true">📍</span>
                        <span>{s.origin.name}</span>
                      </div>
                    </td>

                    {/* Destination Hub */}
                    <td>
                      <div className="cmd-dest-cell">
                        <span className="cmd-dest-hub-icon" aria-hidden="true">🏢</span>
                        <span>{s.destination.name}</span>
                      </div>
                    </td>

                    {/* Progress & How Far Gone */}
                    <td>
                      <div style={{ minWidth: '150px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                          <strong style={{ fontSize: '0.85rem', color: s.isMovementStopped ? '#ef4444' : s.status === 'delivered' ? '#10b981' : '#0284c7', fontWeight: 800 }}>
                            {metrics.pct}%
                          </strong>
                          <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>
                            {metrics.coveredKm.toLocaleString()} / {metrics.totalKm.toLocaleString()} km
                          </span>
                        </div>
                        <div style={{ width: '100%', height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                          <div
                            style={{
                              width: `${metrics.pct}%`,
                              height: '100%',
                              background: s.isMovementStopped
                                ? '#ef4444'
                                : s.status === 'delivered'
                                ? '#10b981'
                                : 'linear-gradient(90deg, #0284c7 0%, #38bdf8 100%)',
                              borderRadius: '3px',
                              transition: 'width 0.4s ease',
                            }}
                          />
                        </div>
                        <span style={{ fontSize: '0.7rem', color: '#475569', display: 'block', marginTop: '3px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '170px' }}>
                          📍 {s.currentLocation?.name || 'In Corridor'}
                        </span>
                      </div>
                    </td>

                    {/* Status & Movement */}
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        <span className={`cmd-status-pill ${s.status}`}>
                          {s.status === 'in_transit' ? 'In Transit' : s.status.replace('_', ' ')}
                        </span>
                        {s.isMovementStopped ? (
                          <span style={{ fontSize: '0.7rem', fontWeight: 800, padding: '2px 6px', borderRadius: '4px', background: '#fee2e2', color: '#b91c1c' }}>
                            🛑 HOLD
                          </span>
                        ) : s.status === 'pending' ? (
                          <span style={{ fontSize: '0.7rem', fontWeight: 800, padding: '2px 6px', borderRadius: '4px', background: '#fef3c7', color: '#92400e' }}>
                            ⏳ STAGED
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', background: '#dcfce7', color: '#15803d' }}>
                            ▶ {metrics.speedDisplay}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* ETA Schedule */}
                    <td>
                      <span style={{ fontSize: '0.8rem', fontFamily: 'ui-monospace, monospace', color: '#64748b' }}>
                        {s.eta}
                      </span>
                    </td>

                    {/* Actions */}
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '6px' }}>
                        {/* Movement Toggle Button */}
                        <button
                          type="button"
                          onClick={() => handleToggleMovement(s)}
                          className="cmd-action-track"
                          style={{
                            background: s.isMovementStopped ? '#dcfce7' : '#fee2e2',
                            color: s.isMovementStopped ? '#15803d' : '#b91c1c',
                            border: 'none',
                            cursor: 'pointer',
                          }}
                          title={s.isMovementStopped ? 'Resume Movement' : 'Stop Movement (Hold)'}
                        >
                          {s.isMovementStopped ? '▶ Resume' : '🛑 Stop'}
                        </button>

                        {/* Quick Update Button */}
                        <button
                          type="button"
                          onClick={() => handleOpenFleetModal(s)}
                          className="cmd-action-track"
                          style={{ background: '#0284c7', color: '#ffffff', border: 'none', cursor: 'pointer' }}
                          title="Live Fleet Updates & Telemetry"
                        >
                          ⚡ Fleet Update
                        </button>

                        {/* Track Vector Link */}
                        <Link to={`/track?waybill=${encodeURIComponent(s.waybill)}`} className="cmd-action-track">
                          <span>Track</span>
                          <span aria-hidden="true">→</span>
                        </Link>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 1: GLOBAL CORRIDOR LIVE RADAR & CLICKABLE ACTIVE FLEETS */}
      {/* ========================================================================= */}
      <div className="cmd-card" style={{ marginBottom: '2rem' }}>
        <div className="cmd-card-header" style={{ flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <h3 className="cmd-card-title">
              <span className="cmd-card-title-icon" aria-hidden="true">🛰️</span>
              <span>Live Active Fleets & Telemetry Radar</span>
            </h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>
              Click any active fleet asset card to inspect vectors, push status updates, or toggle movement hold.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              type="button"
              className={`cmd-btn ${mapModeFilter === 'all' ? 'cmd-btn-navy' : 'cmd-btn-white'}`}
              style={{ padding: '0.4rem 0.8rem', fontSize: '0.78rem' }}
              onClick={() => setMapModeFilter('all')}
            >
              All Fleets ({shipments.length})
            </button>
            <button
              type="button"
              className={`cmd-btn ${mapModeFilter === 'air' ? 'cmd-btn-navy' : 'cmd-btn-white'}`}
              style={{ padding: '0.4rem 0.8rem', fontSize: '0.78rem' }}
              onClick={() => setMapModeFilter('air')}
            >
              ✈️ Air Express ({shipments.filter((s) => s.mode === 'air').length})
            </button>
            <button
              type="button"
              className={`cmd-btn ${mapModeFilter === 'sea' ? 'cmd-btn-navy' : 'cmd-btn-white'}`}
              style={{ padding: '0.4rem 0.8rem', fontSize: '0.78rem' }}
              onClick={() => setMapModeFilter('sea')}
            >
              🚢 Ocean ({shipments.filter((s) => s.mode === 'sea').length})
            </button>
            <button
              type="button"
              className={`cmd-btn ${mapModeFilter === 'land' ? 'cmd-btn-navy' : 'cmd-btn-white'}`}
              style={{ padding: '0.4rem 0.8rem', fontSize: '0.78rem' }}
              onClick={() => setMapModeFilter('land')}
            >
              🚚 Overland ({shipments.filter((s) => s.mode === 'land').length})
            </button>
          </div>
        </div>

        {/* Map + Sidebar Layout */}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.8fr) minmax(280px, 1fr)', gap: '1.25rem', padding: '1.25rem' }}>
          {/* Leaflet Map Canvas */}
          <div
            style={{
              position: 'relative',
              height: '460px',
              borderRadius: '12px',
              overflow: 'hidden',
              border: '1px solid #e2e8f0',
              boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
            }}
          >
            <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />

            {/* Radar Telemetry Watermark */}
            <div
              style={{
                position: 'absolute',
                top: '12px',
                left: '12px',
                zIndex: 1000,
                background: 'rgba(15, 23, 42, 0.9)',
                backdropFilter: 'blur(8px)',
                color: '#ffffff',
                padding: '6px 12px',
                borderRadius: '8px',
                border: '1px solid rgba(56, 189, 248, 0.4)',
                fontSize: '11px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
              }}
            >
              <span
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: '#10b981',
                  boxShadow: '0 0 8px #10b981',
                }}
              />
              <span>LIVE ESRI LOGISTICS TELEMETRY // CLICK FLEET CARD TO UPDATE</span>
            </div>
          </div>

          {/* Clickable Active Fleet Asset Roster */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.65rem',
              maxHeight: '460px',
              overflowY: 'auto',
              paddingRight: '4px',
            }}
          >
            <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#94a3b8', letterSpacing: '0.5px' }}>
              CLICKABLE ACTIVE FLEETS ({mapShipments.length})
            </span>

            {mapShipments.map((s) => {
              const isSelected = s.waybill === selectedAssetWaybill
              const metrics = getShipmentProgressMetrics(s)
              return (
                <div
                  key={s.waybill}
                  onClick={() => handleOpenFleetModal(s)}
                  style={{
                    background: isSelected ? 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)' : '#f8fafc',
                    border: `1.5px solid ${isSelected ? '#0284c7' : '#e2e8f0'}`,
                    borderRadius: '10px',
                    padding: '0.85rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    boxShadow: isSelected ? '0 4px 12px rgba(2, 132, 199, 0.15)' : 'none',
                  }}
                  title="Click to open Live Fleet Management Modal"
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '1.1rem' }}>{s.mode === 'air' ? '✈️' : s.mode === 'sea' ? '🚢' : '🚚'}</span>
                      <strong style={{ fontSize: '0.85rem', color: '#0f172a' }}>{s.waybill}</strong>
                    </div>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <span
                        style={{
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          padding: '2px 6px',
                          borderRadius: '4px',
                          background: s.status === 'in_transit' ? '#e0f2fe' : '#fef3c7',
                          color: s.status === 'in_transit' ? '#0369a1' : '#b45309',
                        }}
                      >
                        {s.status.toUpperCase()}
                      </span>
                      {s.isMovementStopped && (
                        <span
                          style={{
                            fontSize: '0.7rem',
                            fontWeight: 800,
                            padding: '2px 6px',
                            borderRadius: '4px',
                            background: '#fee2e2',
                            color: '#b91c1c',
                          }}
                        >
                          STOPPED
                        </span>
                      )}
                    </div>
                  </div>

                  <div style={{ fontSize: '0.78rem', color: '#475569', marginBottom: '4px' }}>
                    {s.origin.code} ➔ {s.destination.code} · <span style={{ color: '#64748b' }}>{s.carrier}</span>
                  </div>

                  {/* Progress Bar & Distance */}
                  <div style={{ margin: '6px 0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#64748b', marginBottom: '2px' }}>
                      <strong style={{ color: s.isMovementStopped ? '#ef4444' : '#0284c7' }}>{metrics.pct}% Complete</strong>
                      <span>{metrics.coveredKm.toLocaleString()} / {metrics.totalKm.toLocaleString()} km</span>
                    </div>
                    <div style={{ height: '5px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                      <div
                        style={{
                          width: `${metrics.pct}%`,
                          height: '100%',
                          background: s.isMovementStopped ? '#ef4444' : s.status === 'delivered' ? '#10b981' : 'linear-gradient(90deg, #0284c7, #38bdf8)',
                          borderRadius: '3px',
                          transition: 'width 0.4s ease',
                        }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem', color: '#64748b', marginTop: '4px' }}>
                    <span>Driver: <strong>{s.assignedDriver || 'Linehaul Operator'}</strong></span>
                    <span style={{ color: s.isMovementStopped ? '#ef4444' : '#10b981', fontWeight: 700 }}>{metrics.speedDisplay}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 2: OPERATIONS DISPATCH CONTROL SUITE & ACTIONS */}
      {/* ========================================================================= */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '1.25rem',
          marginBottom: '2rem',
        }}
      >
        {/* Quick Action Suite */}
        <div className="cmd-card" style={{ padding: '1.5rem' }}>
          <h3 className="cmd-card-title" style={{ marginBottom: '0.5rem' }}>
            <span className="cmd-card-title-icon" aria-hidden="true">⚡</span>
            <span>Dispatch Control Actions</span>
          </h3>
          <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '1.25rem' }}>
            Instant automation workflows for flight coordinators and regional linehaul managers.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <button
              type="button"
              onClick={handlePingTelemetry}
              disabled={isSpaceLinkPinging}
              style={{
                background: '#0f172a',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                padding: '0.85rem 1rem',
                fontSize: '0.82rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'background 0.2s',
              }}
            >
              <span>{isSpaceLinkPinging ? '🔄' : '📡'}</span>
              <span>{isSpaceLinkPinging ? 'Pinging...' : 'Ping Telemetry'}</span>
            </button>

            <button
              type="button"
              onClick={handleExportManifest}
              style={{
                background: '#f8fafc',
                color: '#0f172a',
                border: '1.5px solid #cbd5e1',
                borderRadius: '8px',
                padding: '0.85rem 1rem',
                fontSize: '0.82rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <span>📋</span>
              <span>Export Manifest</span>
            </button>

            <button
              type="button"
              onClick={handleAutoAssign}
              style={{
                background: '#f8fafc',
                color: '#0f172a',
                border: '1.5px solid #cbd5e1',
                borderRadius: '8px',
                padding: '0.85rem 1rem',
                fontSize: '0.82rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <span>👤+</span>
              <span>Auto-Assign Drivers</span>
            </button>

            <Link
              to="/admin/rates"
              style={{
                background: '#f8fafc',
                color: '#0f172a',
                border: '1.5px solid #cbd5e1',
                borderRadius: '8px',
                padding: '0.85rem 1rem',
                fontSize: '0.82rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                textDecoration: 'none',
              }}
            >
              <span>💲</span>
              <span>Tariff Schedules</span>
            </Link>
          </div>
        </div>

        {/* Priority Advisory & Incident Center */}
        <div className="cmd-card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <h3 className="cmd-card-title">
              <span className="cmd-card-title-icon" aria-hidden="true">⚠️</span>
              <span>Active Advisories & Exceptions</span>
            </h3>
            <span
              style={{
                fontSize: '0.72rem',
                fontWeight: 800,
                padding: '2px 8px',
                borderRadius: '12px',
                background: exceptionCount > 0 ? '#fee2e2' : '#dcfce7',
                color: exceptionCount > 0 ? '#b91c1c' : '#15803d',
              }}
            >
              {exceptionCount} Open Notice(s)
            </span>
          </div>

          <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '1rem' }}>
            Cargo holds, secondary inspections, and customs border compliance alerts.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {shipments
              .filter((s) => s.status === 'exception' || s.isMovementStopped)
              .slice(0, 3)
              .map((s) => {
                const isAck = acknowledgedIncidents[s.waybill]
                return (
                  <div
                    key={s.waybill}
                    style={{
                      background: '#fff5f5',
                      border: '1px solid #fecaca',
                      borderRadius: '8px',
                      padding: '0.75rem 1rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '0.75rem',
                      flexWrap: 'wrap',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <strong style={{ fontSize: '0.85rem', color: '#991b1b' }}>{s.waybill}</strong>
                        <span style={{ fontSize: '0.72rem', color: '#64748b' }}>({s.carrier})</span>
                      </div>
                      <span style={{ fontSize: '0.78rem', color: '#7f1d1d', display: 'block', marginTop: '2px' }}>
                        {s.statusNote || (s.isMovementStopped ? 'Cargo hold / movement stopped by dispatch' : 'Secondary inspection in progress.')}
                      </span>
                    </div>

                    <div style={{ display: 'flex', gap: '6px' }}>
                      {!isAck && (
                        <button
                          type="button"
                          onClick={() => handleAcknowledgeIncident(s.waybill)}
                          style={{
                            background: '#ffffff',
                            border: '1px solid #cbd5e1',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            fontSize: '0.72rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          Acknowledge
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleClearAdvisory(s)}
                        style={{
                          background: '#10b981',
                          color: '#ffffff',
                          border: 'none',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        ✓ Resume
                      </button>
                    </div>
                  </div>
                )
              })}

            {exceptionCount === 0 && (
              <div
                style={{
                  background: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  borderRadius: '8px',
                  padding: '1.25rem',
                  textAlign: 'center',
                  color: '#166534',
                  fontSize: '0.85rem',
                }}
              >
                ✓ All global air, maritime, and overland corridors operating within normal parameters.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 3: HUB UTILIZATION & CARRIER SLA INDEX */}
      {/* ========================================================================= */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '1.25rem',
        }}
      >
        {/* Global Hub Utilization */}
        <div className="cmd-card" style={{ padding: '1.5rem' }}>
          <h3 className="cmd-card-title" style={{ marginBottom: '0.5rem' }}>
            <span className="cmd-card-title-icon" aria-hidden="true">🏢</span>
            <span>Global Gateway Hub Utilization</span>
          </h3>
          <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '1.25rem' }}>
            Available sorting capacity and volumetric tonnage metrics across primary regional gateways.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '4px' }}>
                <strong>New York (JFK Worldport)</strong>
                <span style={{ color: '#0284c7', fontWeight: 700 }}>88% (35.2 Tons / 40.0 T)</span>
              </div>
              <div style={{ height: '7px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: '88%', height: '100%', background: '#0284c7', borderRadius: '4px' }} />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '4px' }}>
                <strong>London (LHR World Cargo)</strong>
                <span style={{ color: '#10b981', fontWeight: 700 }}>72% (28.8 Tons / 40.0 T)</span>
              </div>
              <div style={{ height: '7px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: '72%', height: '100%', background: '#10b981', borderRadius: '4px' }} />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '4px' }}>
                <strong>Frankfurt (FRA Cargo Hub)</strong>
                <span style={{ color: '#ea580c', fontWeight: 700 }}>94% (37.6 Tons / 40.0 T)</span>
              </div>
              <div style={{ height: '7px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: '94%', height: '100%', background: '#ea580c', borderRadius: '4px' }} />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '4px' }}>
                <strong>Dubai (DXB Mega Terminal)</strong>
                <span style={{ color: '#10b981', fontWeight: 700 }}>61% (24.4 Tons / 40.0 T)</span>
              </div>
              <div style={{ height: '7px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: '61%', height: '100%', background: '#10b981', borderRadius: '4px' }} />
              </div>
            </div>
          </div>
        </div>

        {/* Carrier SLA Reliability Index */}
        <div className="cmd-card" style={{ padding: '1.5rem' }}>
          <h3 className="cmd-card-title" style={{ marginBottom: '0.5rem' }}>
            <span className="cmd-card-title-icon" aria-hidden="true">📈</span>
            <span>Carrier SLA & On-Time Performance</span>
          </h3>
          <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '1.25rem' }}>
            30-day verified transit punctuality, customs clearance speed, and linehaul reliability index.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
            <div style={{ background: '#f8fafc', padding: '0.85rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#d97706' }}>DHL EXPRESS</div>
              <strong style={{ fontSize: '1.3rem', color: '#0f172a', display: 'block', margin: '2px 0' }}>99.4%</strong>
              <span style={{ fontSize: '0.7rem', color: '#10b981', fontWeight: 600 }}>+0.3% vs target</span>
            </div>

            <div style={{ background: '#f8fafc', padding: '0.85rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#7c3aed' }}>FEDEX PRIORITY</div>
              <strong style={{ fontSize: '1.3rem', color: '#0f172a', display: 'block', margin: '2px 0' }}>98.7%</strong>
              <span style={{ fontSize: '0.7rem', color: '#10b981', fontWeight: 600 }}>+0.2% vs target</span>
            </div>

            <div style={{ background: '#f8fafc', padding: '0.85rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0284c7' }}>MAERSK INTERMODAL</div>
              <strong style={{ fontSize: '1.3rem', color: '#0f172a', display: 'block', margin: '2px 0' }}>97.2%</strong>
              <span style={{ fontSize: '0.7rem', color: '#0284c7', fontWeight: 600 }}>On target (97.0%)</span>
            </div>

            <div style={{ background: '#f8fafc', padding: '0.85rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#854d0e' }}>UPS WORLDWIDE</div>
              <strong style={{ fontSize: '1.3rem', color: '#0f172a', display: 'block', margin: '2px 0' }}>99.1%</strong>
              <span style={{ fontSize: '0.7rem', color: '#10b981', fontWeight: 600 }}>+0.5% vs target</span>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL: LIVE FLEET QUICK UPDATE & TELEMETRY CONTROLS */}
      {/* ========================================================================= */}
      {editingShipment && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            backgroundColor: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
          }}
          onClick={() => setEditingShipment(null)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              maxWidth: '620px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)',
              border: '1px solid #e2e8f0',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '1.25rem 1.5rem',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
                color: '#ffffff',
                borderRadius: '16px 16px 0 0',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '1.2rem' }}>
                    {editingShipment.mode === 'air' ? '✈️' : editingShipment.mode === 'sea' ? '🚢' : '🚚'}
                  </span>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#ffffff', fontWeight: 800 }}>
                    Fleet Controller // {editingShipment.waybill}
                  </h3>
                </div>
                <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                  {editingShipment.carrier} · {editingShipment.origin.code} ➔ {editingShipment.destination.code}
                </span>
              </div>

              <button
                type="button"
                onClick={() => setEditingShipment(null)}
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: 'none',
                  color: '#ffffff',
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                ✕
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveFleetUpdates} style={{ padding: '1.5rem' }}>
              {/* Movement Hold Toggle Section */}
              <div
                style={{
                  marginBottom: '1.25rem',
                  padding: '1rem',
                  borderRadius: '10px',
                  background: quickForm.isMovementStopped ? '#fff5f5' : '#f0fdf4',
                  border: `1.5px solid ${quickForm.isMovementStopped ? '#fca5a5' : '#bbf7d0'}`,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <strong style={{ fontSize: '0.9rem', color: quickForm.isMovementStopped ? '#991b1b' : '#166534', display: 'block' }}>
                    {quickForm.isMovementStopped ? '🛑 Consignment Movement is STOPPED (Hold Active)' : '▶️ Consignment is IN MOTION (Transit Active)'}
                  </strong>
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    Toggle this switch to halt vector progression or release holding order.
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setQuickForm((prev) => ({
                      ...prev,
                      isMovementStopped: !prev.isMovementStopped,
                      statusNote: !prev.isMovementStopped
                        ? 'Consignment held at security checkpoint by Dispatch Operations.'
                        : 'Movement resumed: transit corridor clear.',
                    }))
                  }
                  style={{
                    padding: '8px 14px',
                    borderRadius: '8px',
                    background: quickForm.isMovementStopped ? '#10b981' : '#ea580c',
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: '0.8rem',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  {quickForm.isMovementStopped ? '▶ Resume Movement' : '🛑 Stop Movement'}
                </button>
              </div>

              {/* Status & Progress Row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label className="cmd-form-label">Consignment Status</label>
                  <select
                    className="cmd-select"
                    value={quickForm.status}
                    onChange={(e) => setQuickForm((prev) => ({ ...prev, status: e.target.value as ShipmentStatus }))}
                  >
                    <option value="in_transit">In Transit</option>
                    <option value="out_for_delivery">Out For Delivery</option>
                    <option value="delivered">Delivered (Completed)</option>
                    <option value="pending">Pending Dispatch</option>
                    <option value="exception">Transit Advisory / Exception</option>
                  </select>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label className="cmd-form-label" style={{ margin: 0 }}>
                      Progress Percentage ({quickForm.progressPct}%)
                    </label>
                    <span style={{ fontSize: '0.75rem', color: '#0284c7', fontWeight: 700 }}>
                      {Math.round((getShipmentDistanceKm(editingShipment) * quickForm.progressPct) / 100).toLocaleString()} / {getShipmentDistanceKm(editingShipment).toLocaleString()} KM
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={quickForm.progressPct}
                    onChange={(e) => setQuickForm((prev) => ({ ...prev, progressPct: Number(e.target.value) }))}
                    style={{ width: '100%', marginTop: '8px' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#94a3b8' }}>
                    <span>0% (Origin)</span>
                    <span>50% (Midway · {Math.round(getShipmentDistanceKm(editingShipment) / 2).toLocaleString()} km)</span>
                    <span>100% (Delivered)</span>
                  </div>
                </div>
              </div>

              {/* Driver & Vehicle ID Row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label className="cmd-form-label">Assigned Driver / Pilot</label>
                  <input
                    type="text"
                    className="cmd-input"
                    value={quickForm.assignedDriver}
                    onChange={(e) => setQuickForm((prev) => ({ ...prev, assignedDriver: e.target.value }))}
                    placeholder="e.g. Capt. C. Lin"
                  />
                </div>

                <div>
                  <label className="cmd-form-label">Linehaul Vehicle / Flight ID</label>
                  <input
                    type="text"
                    className="cmd-input"
                    value={quickForm.vehicleId}
                    onChange={(e) => setQuickForm((prev) => ({ ...prev, vehicleId: e.target.value }))}
                    placeholder="e.g. DH-709 / VEH-102"
                  />
                </div>
              </div>

              {/* Current Location & Status Note */}
              <div style={{ marginBottom: '1rem' }}>
                <label className="cmd-form-label">Current Telemetry Location</label>
                <input
                  type="text"
                  className="cmd-input"
                  value={quickForm.currentLocationName}
                  onChange={(e) => setQuickForm((prev) => ({ ...prev, currentLocationName: e.target.value }))}
                  placeholder="e.g. Transatlantic Flight Track Alpha (FL345)"
                />
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <label className="cmd-form-label">Status Advisory / Flight Note</label>
                <input
                  type="text"
                  className="cmd-input"
                  value={quickForm.statusNote}
                  onChange={(e) => setQuickForm((prev) => ({ ...prev, statusNote: e.target.value }))}
                  placeholder="e.g. Cruising at 850 km/h, on schedule for terminal handover."
                />
              </div>

              {/* Append Checkpoint Milestone */}
              <div
                style={{
                  background: '#f8fafc',
                  border: '1px dashed #cbd5e1',
                  borderRadius: '10px',
                  padding: '1rem',
                  marginBottom: '1.5rem',
                }}
              >
                <strong style={{ fontSize: '0.82rem', color: '#0f172a', display: 'block', marginBottom: '6px' }}>
                  + Push New Checkpoint Milestone (Optional)
                </strong>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <input
                    type="text"
                    className="cmd-input"
                    placeholder="Milestone title, e.g. Cleared London Customs"
                    value={quickForm.newCheckpointTitle}
                    onChange={(e) => setQuickForm((prev) => ({ ...prev, newCheckpointTitle: e.target.value }))}
                    style={{ fontSize: '0.8rem' }}
                  />
                  <input
                    type="text"
                    className="cmd-input"
                    placeholder="Location, e.g. London Heathrow LHR"
                    value={quickForm.newCheckpointLocation}
                    onChange={(e) => setQuickForm((prev) => ({ ...prev, newCheckpointLocation: e.target.value }))}
                    style={{ fontSize: '0.8rem' }}
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  className="cmd-btn cmd-btn-white"
                  onClick={() => setEditingShipment(null)}
                >
                  Cancel
                </button>
                <button type="submit" className="cmd-btn cmd-btn-navy">
                  💾 Save & Dispatch Live Updates
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Radar pulse keyframe animation */}
      <style>{`
        @keyframes radar-pulse {
          0% { transform: scale(1); opacity: 0.9; }
          50% { transform: scale(1.5); opacity: 0.3; }
          100% { transform: scale(1); opacity: 0.9; }
        }
      `}</style>
    </div>
  )
}
