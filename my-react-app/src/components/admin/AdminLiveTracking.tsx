import { useEffect, useMemo, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useShipments } from '../../context/ShipmentContext'
import type { Shipment, ShippingMode, ShipmentStatus } from '../../types'
import { WaybillLabelModal } from './WaybillLabelModal'
import {
  MAP_TILE_PROVIDERS,
  type MapTileKey,
  fetchLiveRouteGeometry,
} from '../../utils/mapApis'

export function AdminLiveTracking() {
  const { shipments, updateShipment, addAuditLog } = useShipments()

  // Filter active / in-transit shipments
  const activeShipments = useMemo(() => {
    const active = shipments.filter(
      (s) => s.status === 'in_transit' || s.status === 'customs' || s.status === 'pending' || s.status === 'exception'
    )
    return active.length > 0 ? active : shipments
  }, [shipments])

  const [searchQuery, setSearchQuery] = useState('')
  const [modeFilter, setModeFilter] = useState<'all' | ShippingMode>('all')
  const [selectedWaybill, setSelectedWaybill] = useState<string>(
    activeShipments[0]?.waybill || 'PLOT-70955-JFD'
  )
  const [labelModalWaybill, setLabelModalWaybill] = useState<string | null>(null)
  const [toastMessage, setToastMessage] = useState('')
  const [activeTileKey, setActiveTileKey] = useState<MapTileKey>('voyager')
  const [isFleetSidebarOpen, setIsFleetSidebarOpen] = useState(true)

  // Invalidate map size when sidebar opens or closes
  useEffect(() => {
    const timer = setTimeout(() => {
      mapInstanceRef.current?.invalidateSize({ animate: true })
    }, 280)
    return () => clearTimeout(timer)
  }, [isFleetSidebarOpen])

  // Fleet Edit Modal State
  const [editingShipment, setEditingShipment] = useState<Shipment | null>(null)
  const [editForm, setEditForm] = useState({
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

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(''), 3500)
  }

  const selectedShipment: Shipment | undefined = useMemo(() => {
    return (
      activeShipments.find((s) => s.waybill === selectedWaybill) ||
      shipments.find((s) => s.waybill === selectedWaybill) ||
      activeShipments[0]
    )
  }, [activeShipments, shipments, selectedWaybill])

  // Filtered list based on search query & mode filter
  const filteredShipments = useMemo(() => {
    return activeShipments.filter((s) => {
      if (modeFilter !== 'all' && s.mode !== modeFilter) return false
      if (!searchQuery.trim()) return true
      const query = searchQuery.toLowerCase()
      return (
        s.waybill.toLowerCase().includes(query) ||
        s.origin.name.toLowerCase().includes(query) ||
        s.destination.name.toLowerCase().includes(query) ||
        s.carrier.toLowerCase().includes(query) ||
        s.clientName.toLowerCase().includes(query) ||
        (s.assignedDriver && s.assignedDriver.toLowerCase().includes(query))
      )
    })
  }, [activeShipments, searchQuery, modeFilter])

  // Leaflet Map Refs
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<L.Map | null>(null)
  const tileLayerRef = useRef<L.TileLayer | null>(null)
  const markersLayerRef = useRef<L.LayerGroup | null>(null)
  const routeLayerRef = useRef<L.Polyline | null>(null)

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return
    if (mapInstanceRef.current) return

    const initialLat = selectedShipment?.currentLocation?.lat || 40.6413
    const initialLng = selectedShipment?.currentLocation?.lng || -73.7781

    const map = L.map(mapContainerRef.current, {
      zoomControl: true,
      attributionControl: false,
    }).setView([initialLat, initialLng], 4)

    const provider = MAP_TILE_PROVIDERS[activeTileKey]
    const tileLayer = L.tileLayer(provider.url, {
      subdomains: provider.subdomains as any,
      maxZoom: provider.maxZoom,
      attribution: provider.attribution,
    }).addTo(map)

    tileLayerRef.current = tileLayer

    const markersGroup = L.layerGroup().addTo(map)
    markersLayerRef.current = markersGroup
    mapInstanceRef.current = map

    return () => {
      map.remove()
      mapInstanceRef.current = null
      tileLayerRef.current = null
      markersLayerRef.current = null
      routeLayerRef.current = null
    }
  }, [])

  // Switch Tile Layer dynamically
  useEffect(() => {
    const map = mapInstanceRef.current
    if (!map) return

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current)
    }

    const provider = MAP_TILE_PROVIDERS[activeTileKey]
    const nextLayer = L.tileLayer(provider.url, {
      subdomains: provider.subdomains as any,
      maxZoom: provider.maxZoom,
      attribution: provider.attribution,
    }).addTo(map)

    tileLayerRef.current = nextLayer
  }, [activeTileKey])

  // Update Markers and Polyline when selected shipment changes
  useEffect(() => {
    const map = mapInstanceRef.current
    const markersGroup = markersLayerRef.current
    if (!map || !markersGroup || !selectedShipment) return

    markersGroup.clearLayers()
    if (routeLayerRef.current) {
      map.removeLayer(routeLayerRef.current)
      routeLayerRef.current = null
    }

    const startLat = selectedShipment.origin.lat || 40.6413
    const startLng = selectedShipment.origin.lng || -73.7781
    const vehicleLat = selectedShipment.currentLocation?.lat || ((startLat + (selectedShipment.destination.lat || 51.47)) / 2)
    const vehicleLng = selectedShipment.currentLocation?.lng || ((startLng + (selectedShipment.destination.lng || -0.4543)) / 2)
    const destLat = selectedShipment.destination.lat || 51.4700
    const destLng = selectedShipment.destination.lng || -0.4543

    const startCoord: [number, number] = [startLat, startLng]
    const vehicleCoord: [number, number] = [vehicleLat, vehicleLng]
    const destCoord: [number, number] = [destLat, destLng]

    // Start Marker (Green Pin)
    const startIcon = L.divIcon({
      className: 'leaflet-custom-marker-start',
      html: `
        <div style="
          width: 28px; height: 28px;
          background: #10b981;
          border: 3px solid #ffffff;
          border-radius: 50%;
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.6);
          display: flex; align-items: center; justify-content: center;
          color: #ffffff; font-size: 13px; font-weight: 800;
        ">
          🟢
        </div>
      `,
      iconSize: [28, 28],
      iconAnchor: [14, 14],
    })

    const startMarker = L.marker(startCoord, { icon: startIcon }).addTo(markersGroup)
    startMarker.bindPopup(`
      <div style="font-family: inherit; font-size: 12px;">
        <strong style="color: #10b981; font-size: 13px;">ORIGIN TERMINAL</strong><br>
        <b>Location:</b> ${selectedShipment.origin.name}<br>
        <b>Code:</b> ${selectedShipment.origin.code}
      </div>
    `)

    // Vehicle Marker (Moving Beacon)
    const vehicleEmoji = selectedShipment.mode === 'air' ? '✈️' : selectedShipment.mode === 'sea' ? '🚢' : '🚚'
    const vehicleIcon = L.divIcon({
      className: 'leaflet-custom-marker-vehicle',
      html: `
        <div style="
          width: 38px; height: 38px;
          background: ${selectedShipment.isMovementStopped ? '#ea580c' : '#0284c7'};
          border: 3px solid #ffffff;
          border-radius: 50%;
          box-shadow: 0 0 20px ${selectedShipment.isMovementStopped ? 'rgba(234, 88, 12, 0.9)' : 'rgba(2, 132, 199, 0.9)'};
          display: flex; align-items: center; justify-content: center;
          font-size: 18px;
          position: relative;
          cursor: pointer;
        ">
          ${vehicleEmoji}
          <div style="
            position: absolute;
            inset: -6px;
            border: 2px solid ${selectedShipment.isMovementStopped ? '#ea580c' : '#38bdf8'};
            border-radius: 50%;
            animation: radar-pulse 2s infinite;
          "></div>
        </div>
      `,
      iconSize: [38, 38],
      iconAnchor: [19, 19],
    })

    const vehicleMarker = L.marker(vehicleCoord, { icon: vehicleIcon }).addTo(markersGroup)
    vehicleMarker.bindPopup(`
      <div style="font-family: inherit; font-size: 12px; min-width: 190px;">
        <strong style="color: #0284c7; font-size: 13px;">${selectedShipment.carrier} (${selectedShipment.waybill})</strong><br>
        <b>Status:</b> ${selectedShipment.status.toUpperCase()} (${selectedShipment.progressPct || 50}%)<br>
        <b>Position:</b> ${selectedShipment.currentLocation?.name || 'In Corridor'}<br>
        <b>Driver:</b> ${selectedShipment.assignedDriver || 'Linehaul Operator'}<br>
        <b>Vehicle:</b> ${selectedShipment.vehicleId || 'Active Fleet'}<br>
        <b>Movement:</b> ${selectedShipment.isMovementStopped ? '<span style="color:#ea580c;font-weight:bold;">HOLD (STOPPED)</span>' : '<span style="color:#10b981;font-weight:bold;">ACTIVE</span>'}
      </div>
    `)

    // Destination Marker (Red Pin)
    const destIcon = L.divIcon({
      className: 'leaflet-custom-marker-dest',
      html: `
        <div style="
          width: 28px; height: 28px;
          background: #ef4444;
          border: 3px solid #ffffff;
          border-radius: 50%;
          box-shadow: 0 4px 12px rgba(239, 68, 68, 0.6);
          display: flex; align-items: center; justify-content: center;
          color: #ffffff; font-size: 13px; font-weight: 800;
        ">
          🔴
        </div>
      `,
      iconSize: [28, 28],
      iconAnchor: [14, 14],
    })

    const destMarker = L.marker(destCoord, { icon: destIcon }).addTo(markersGroup)
    destMarker.bindPopup(`
      <div style="font-family: inherit; font-size: 12px;">
        <strong style="color: #ef4444; font-size: 13px;">DESTINATION HUB</strong><br>
        <b>Location:</b> ${selectedShipment.destination.name}<br>
        <b>Code:</b> ${selectedShipment.destination.code}<br>
        <b>ETA:</b> ${selectedShipment.eta}
      </div>
    `)

    // Fetch and Draw Real Route Polyline
    fetchLiveRouteGeometry(startCoord, destCoord, selectedShipment.mode)
      .then((res) => {
        if (!mapInstanceRef.current) return
        if (routeLayerRef.current) {
          mapInstanceRef.current.removeLayer(routeLayerRef.current)
        }

        const polyline = L.polyline(res.coordinates, {
          color: selectedShipment.isMovementStopped ? '#ea580c' : '#0284c7',
          weight: 4,
          opacity: 0.85,
          dashArray: selectedShipment.mode === 'air' ? '8, 8' : undefined,
        }).addTo(mapInstanceRef.current)

        routeLayerRef.current = polyline
      })
      .catch(() => {
        // Fallback direct geodesic line
        if (!mapInstanceRef.current) return
        const polyline = L.polyline([startCoord, vehicleCoord, destCoord], {
          color: '#0284c7',
          weight: 3.5,
          dashArray: '6, 6',
        }).addTo(mapInstanceRef.current)
        routeLayerRef.current = polyline
      })
  }, [selectedShipment])

  const handleCenterVehicle = () => {
    if (!mapInstanceRef.current || !selectedShipment) return
    const lat = selectedShipment.currentLocation?.lat || selectedShipment.origin.lat
    const lng = selectedShipment.currentLocation?.lng || selectedShipment.origin.lng
    mapInstanceRef.current.flyTo([lat, lng], 8, { animate: true, duration: 1.2 })
    showToast(`Centered map on ${selectedShipment.waybill}`)
  }

  const handleFitCorridor = () => {
    if (!mapInstanceRef.current || !selectedShipment) return
    const startLat = selectedShipment.origin.lat || 40.6413
    const startLng = selectedShipment.origin.lng || -73.7781
    const destLat = selectedShipment.destination.lat || 51.4700
    const destLng = selectedShipment.destination.lng || -0.4543
    const bounds = L.latLngBounds([[startLat, startLng], [destLat, destLng]])
    mapInstanceRef.current.fitBounds(bounds, { padding: [80, 80], animate: true })
    showToast('Corridor bounds adjusted')
  }

  // Open Edit Modal
  const handleOpenEditModal = (s: Shipment) => {
    setSelectedWaybill(s.waybill)
    setEditingShipment(s)
    setEditForm({
      status: s.status,
      isMovementStopped: !!s.isMovementStopped,
      progressPct: s.progressPct || 50,
      assignedDriver: s.assignedDriver || '',
      vehicleId: s.vehicleId || '',
      currentLocationName: s.currentLocation?.name || '',
      statusNote: s.statusNote || '',
      newCheckpointTitle: '',
      newCheckpointLocation: '',
    })
  }

  // Save Modal Updates
  const handleSaveFleetUpdates = (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingShipment) return

    const updates: Partial<Shipment> = {
      status: editForm.status,
      isMovementStopped: editForm.isMovementStopped,
      progressPct: Number(editForm.progressPct),
      assignedDriver: editForm.assignedDriver,
      vehicleId: editForm.vehicleId,
      statusNote: editForm.statusNote,
    }

    if (editForm.currentLocationName) {
      updates.currentLocation = {
        name: editForm.currentLocationName,
        lat: editingShipment.currentLocation?.lat || editingShipment.origin.lat,
        lng: editingShipment.currentLocation?.lng || editingShipment.origin.lng,
      }
    }

    if (editForm.newCheckpointTitle.trim()) {
      const newCp = {
        id: `cp-${Date.now()}`,
        title: editForm.newCheckpointTitle.trim(),
        location: editForm.newCheckpointLocation.trim() || editForm.currentLocationName || editingShipment.destination.name,
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
      'Live Fleet Telemetry Update',
      'TELEMETRY',
      `Manual fleet status update pushed to waybill ${editingShipment.waybill} (Status: ${editForm.status}, Progress: ${editForm.progressPct}%)`,
      'info',
      editingShipment.waybill
    )

    showToast(`✓ Telemetry & consignment updates saved for ${editingShipment.waybill}!`)
    setEditingShipment(null)
  }

  const handleToggleHold = () => {
    if (!selectedShipment) return
    const nextStopped = !selectedShipment.isMovementStopped
    updateShipment(selectedShipment.waybill, {
      isMovementStopped: nextStopped,
      status: nextStopped ? 'exception' : 'in_transit',
      statusNote: nextStopped ? 'Movement halted by dispatch control' : 'En route active',
    })
    showToast(
      nextStopped
        ? `🛑 Halted movement telemetry for ${selectedShipment.waybill}`
        : `▶️ Resumed linehaul telemetry for ${selectedShipment.waybill}`
    )
  }

  const copyWaybill = (wb: string) => {
    navigator.clipboard.writeText(wb)
    showToast(`Copied waybill ${wb} to clipboard!`)
  }

  const getModeEmoji = (m: ShippingMode) => {
    return m === 'air' ? '✈️' : m === 'sea' ? '🚢' : '🚚'
  }

  return (
    <div className="live-track-layout">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="shipment-toast">
          ✓ {toastMessage}
        </div>
      )}

      {/* Map Canvas Column */}
      <div className="live-track-map-wrapper">
        <div ref={mapContainerRef} className="live-track-leaflet-container" />

        {/* Floating Top Telemetry HUD Bar */}
        {selectedShipment && (
          <div className="live-track-hud-bar">
            <div className="live-track-hud-left">
              <div className="live-track-hud-waybill-row">
                <span className="live-track-hud-mode-icon">
                  {getModeEmoji(selectedShipment.mode)}
                </span>
                <strong className="live-track-hud-code">
                  {selectedShipment.waybill}
                </strong>
                <button
                  type="button"
                  className="live-track-hud-copy-btn"
                  onClick={() => copyWaybill(selectedShipment.waybill)}
                  title="Copy Waybill"
                >
                  📋
                </button>
                <span className={`cmd-status-pill ${selectedShipment.status}`}>
                  {selectedShipment.status.replace('_', ' ').toUpperCase()}
                </span>
                {selectedShipment.isMovementStopped && (
                  <span className="live-track-stopped-badge">
                    ⏸️ MOVEMENT HOLD
                  </span>
                )}
              </div>

              <div className="live-track-hud-route-row">
                <span className="live-track-hud-corridor">
                  <strong>{selectedShipment.origin.name.split(',')[0]}</strong> ({selectedShipment.origin.code})
                  <span style={{ color: '#94a3b8', margin: '0 6px' }}>➔</span>
                  <strong>{selectedShipment.destination.name.split(',')[0]}</strong> ({selectedShipment.destination.code})
                </span>
                <span className="live-track-hud-driver">
                  👤 {selectedShipment.assignedDriver || 'Amina Bello'} • {selectedShipment.vehicleId || 'VEH-101'}
                </span>
              </div>
            </div>

            <div className="live-track-hud-actions">
              {/* Map Tile Switcher */}
              <div className="live-track-tile-group">
                {(['voyager', 'satellite', 'dark'] as MapTileKey[]).map((k) => (
                  <button
                    key={k}
                    type="button"
                    className={`live-track-tile-btn ${activeTileKey === k ? 'active' : ''}`}
                    onClick={() => setActiveTileKey(k)}
                  >
                    {k === 'voyager' ? '🗺️ Street' : k === 'satellite' ? '🛰️ Satellite' : '🌙 Radar'}
                  </button>
                ))}
              </div>

              {/* Map Telemetry Group */}
              <div className="live-track-btn-group">
                <button
                  type="button"
                  className="live-track-hud-btn"
                  onClick={handleCenterVehicle}
                  title="Focus map on Vehicle"
                >
                  🎯 Vehicle
                </button>
                <button
                  type="button"
                  className="live-track-hud-btn"
                  onClick={handleFitCorridor}
                  title="Fit whole Route Corridor"
                >
                  🗺️ Route
                </button>
              </div>

              {/* Operations Control Group */}
              <div className="live-track-btn-group">
                <button
                  type="button"
                  className="live-track-hud-btn primary"
                  onClick={() => handleOpenEditModal(selectedShipment)}
                  title="Edit Fleet Status & Telemetry"
                >
                  ✏️ Edit Fleet
                </button>
                <button
                  type="button"
                  className={`live-track-hud-btn ${selectedShipment.isMovementStopped ? 'resume' : 'hold'}`}
                  onClick={handleToggleHold}
                  title={selectedShipment.isMovementStopped ? 'Resume Linehaul Movement' : 'Halt Consignment Movement'}
                >
                  {selectedShipment.isMovementStopped ? '▶️ Resume' : '⏸️ Stop Movement'}
                </button>
                <button
                  type="button"
                  className="live-track-hud-btn label-btn"
                  onClick={() => setLabelModalWaybill(selectedShipment.waybill)}
                  title="Print Consignment Label"
                >
                  🏷️ Label
                </button>
              </div>

              {/* Collapsible Fleets Sidebar Toggle Button */}
              <button
                type="button"
                className={`live-track-hud-btn fleet-toggle-btn ${isFleetSidebarOpen ? 'active' : ''}`}
                onClick={() => setIsFleetSidebarOpen(!isFleetSidebarOpen)}
                title={isFleetSidebarOpen ? 'Collapse active fleets panel' : 'Open active fleets panel'}
              >
                {isFleetSidebarOpen ? '◀ Hide Fleets' : `▶ Active Fleets (${filteredShipments.length})`}
              </button>
            </div>
          </div>
        )}

        {/* Floating Bottom-Left Legend Box */}
        <div className="live-track-legend">
          <div className="live-track-legend-item">
            <span className="live-track-dot green" />
            <span>Origin</span>
          </div>
          <div className="live-track-legend-item">
            <span className="live-track-dot blue" />
            <span>Vehicle Node</span>
          </div>
          <div className="live-track-legend-item">
            <span className="live-track-dot red" />
            <span>Destination</span>
          </div>
        </div>

        {/* Floating Right Handle/Button to Reopen Fleets Sidebar when closed */}
        {!isFleetSidebarOpen && (
          <button
            type="button"
            className="live-track-floating-open-btn"
            onClick={() => setIsFleetSidebarOpen(true)}
            title="Open Live Active Fleets Panel"
            aria-label="Open Live Active Fleets Panel"
          >
            <span className="floating-tab-icon">📋</span>
            <span className="floating-tab-text">Active Fleets ({filteredShipments.length})</span>
            <span className="floating-tab-arrow">◀</span>
          </button>
        )}
      </div>

      {/* Right Sidebar: Active Shipments (Collapsible) */}
      <div className={`live-track-sidebar ${isFleetSidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
        {/* Sidebar Header */}
        <div className="live-track-sidebar-header">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span className="live-track-pulse-beacon" />
              <h2 className="live-track-title">Live Active Fleet</h2>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span className="live-track-count-badge">
                {filteredShipments.length} Active
              </span>
              <button
                type="button"
                className="live-track-sidebar-collapse-btn"
                onClick={() => setIsFleetSidebarOpen(false)}
                title="Collapse Fleets Panel"
                aria-label="Collapse Fleets Panel"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Search Box */}
          <div className="live-track-search-box">
            <span className="live-track-search-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="15" height="15" stroke="#64748b" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
            </span>
            <input
              type="text"
              className="live-track-search-input"
              placeholder="Search waybill, city, carrier..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                className="live-track-search-clear"
                onClick={() => setSearchQuery('')}
              >
                ✕
              </button>
            )}
          </div>

          {/* Filter Pills */}
          <div className="live-track-filter-tabs">
            <button
              type="button"
              className={`live-track-filter-pill ${modeFilter === 'all' ? 'active' : ''}`}
              onClick={() => setModeFilter('all')}
            >
              All Modes
            </button>
            <button
              type="button"
              className={`live-track-filter-pill ${modeFilter === 'air' ? 'active' : ''}`}
              onClick={() => setModeFilter('air')}
            >
              ✈️ Air
            </button>
            <button
              type="button"
              className={`live-track-filter-pill ${modeFilter === 'sea' ? 'active' : ''}`}
              onClick={() => setModeFilter('sea')}
            >
              🚢 Sea
            </button>
            <button
              type="button"
              className={`live-track-filter-pill ${modeFilter === 'land' ? 'active' : ''}`}
              onClick={() => setModeFilter('land')}
            >
              🚚 Land
            </button>
          </div>
        </div>

        {/* Clickable & Editable Shipment Cards List */}
        <div className="live-track-list">
          {filteredShipments.length === 0 ? (
            <div className="live-track-empty">
              <p>No active consignments match filter criteria</p>
            </div>
          ) : (
            filteredShipments.map((s) => {
              const isSelected = s.waybill === selectedShipment?.waybill
              const speedText = s.mode === 'air' ? '850 km/h' : s.mode === 'sea' ? '22 kts' : '65 km/h'

              return (
                <div
                  key={s.waybill}
                  className={`live-track-card ${isSelected ? 'selected' : ''}`}
                  onClick={() => {
                    setSelectedWaybill(s.waybill)
                    // Fly to vehicle on map
                    const lat = s.currentLocation?.lat || s.origin.lat
                    const lng = s.currentLocation?.lng || s.origin.lng
                    mapInstanceRef.current?.flyTo([lat, lng], 6, { animate: true, duration: 1.0 })
                  }}
                  title="Click to track consignment on map"
                >
                  {/* Card Row 1: Waybill, Mode, Carrier, Status, and Edit Action Button */}
                  <div className="live-track-card-header">
                    <div className="live-track-card-id-group">
                      <span className="live-track-mode-badge" title={s.mode.toUpperCase()}>
                        {getModeEmoji(s.mode)}
                      </span>
                      <div>
                        <strong className="live-track-waybill">
                          {s.waybill}
                        </strong>
                        <div className="live-track-carrier-text">
                          {s.carrier} {s.serviceTier && `• ${s.serviceTier}`}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      <span className={`cmd-status-pill ${s.status}`}>
                        {s.status.replace('_', ' ').toUpperCase()}
                      </span>
                      <button
                        type="button"
                        className="live-track-card-edit-btn"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleOpenEditModal(s)
                        }}
                        title={`Edit Fleet Telemetry & Driver for ${s.waybill}`}
                      >
                        ✏️ Edit
                      </button>
                    </div>
                  </div>

                  {/* Card Row 2: Route Corridor */}
                  <div className="live-track-corridor-box">
                    <div className="live-track-corridor-node">
                      <span className="live-track-corridor-code">{s.origin.code}</span>
                      <span className="live-track-corridor-city" title={s.origin.name}>
                        {s.origin.name.split(',')[0]}
                      </span>
                    </div>

                    <div className="live-track-corridor-arrow">
                      ➔
                    </div>

                    <div className="live-track-corridor-node right">
                      <span className="live-track-corridor-code dest">{s.destination.code}</span>
                      <span className="live-track-corridor-city dest" title={s.destination.name}>
                        {s.destination.name.split(',')[0]}
                      </span>
                    </div>
                  </div>

                  {/* Card Row 3: Driver & Cargo */}
                  <div className="live-track-driver-row">
                    <span className="live-track-driver-tag">
                      👤 {s.assignedDriver || 'Amina Bello'} ({s.vehicleId || 'VEH-101'})
                    </span>
                    {s.isMovementStopped && (
                      <span className="live-track-card-hold-badge">
                        ⏸️ HOLD
                      </span>
                    )}
                  </div>

                  {/* Card Row 4: ETA & Speed Metric */}
                  <div className="live-track-card-footer">
                    <span className="live-track-eta">
                      ⏱️ ETA: <strong>{s.eta}</strong>
                    </span>
                    <span className="live-track-speed">
                      ⚡ {s.isMovementStopped ? '0 km/h' : speedText}
                    </span>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Interactive Fleet Quick Edit Modal */}
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
                    Live Fleet Controller // {editingShipment.waybill}
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
                  background: editForm.isMovementStopped ? '#fff5f5' : '#f0fdf4',
                  border: `1.5px solid ${editForm.isMovementStopped ? '#fca5a5' : '#bbf7d0'}`,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <strong style={{ fontSize: '0.9rem', color: editForm.isMovementStopped ? '#991b1b' : '#166534', display: 'block' }}>
                    {editForm.isMovementStopped ? '🛑 Consignment Movement is STOPPED (Hold Active)' : '▶️ Consignment is IN MOTION (Transit Active)'}
                  </strong>
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    Toggle this switch to halt vector progression or release holding order.
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setEditForm((prev) => ({
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
                    background: editForm.isMovementStopped ? '#10b981' : '#ea580c',
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: '0.8rem',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  {editForm.isMovementStopped ? '▶ Resume Movement' : '🛑 Stop Movement'}
                </button>
              </div>

              {/* Status & Progress Row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label className="cmd-form-label">Consignment Status</label>
                  <select
                    className="cmd-select"
                    value={editForm.status}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, status: e.target.value as ShipmentStatus }))}
                  >
                    <option value="in_transit">In Transit</option>
                    <option value="out_for_delivery">Out For Delivery</option>
                    <option value="delivered">Delivered (Completed)</option>
                    <option value="pending">Pending Dispatch</option>
                    <option value="exception">Transit Advisory / Exception</option>
                  </select>
                </div>

                <div>
                  <label className="cmd-form-label">
                    Progress Percentage ({editForm.progressPct}%)
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={editForm.progressPct}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, progressPct: Number(e.target.value) }))}
                    style={{ width: '100%', marginTop: '8px' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#94a3b8' }}>
                    <span>0% (Origin)</span>
                    <span>50% (Midway)</span>
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
                    value={editForm.assignedDriver}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, assignedDriver: e.target.value }))}
                    placeholder="e.g. Capt. C. Lin"
                  />
                </div>

                <div>
                  <label className="cmd-form-label">Linehaul Vehicle / Flight ID</label>
                  <input
                    type="text"
                    className="cmd-input"
                    value={editForm.vehicleId}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, vehicleId: e.target.value }))}
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
                  value={editForm.currentLocationName}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, currentLocationName: e.target.value }))}
                  placeholder="e.g. Transatlantic Flight Track Alpha (FL345)"
                />
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <label className="cmd-form-label">Status Advisory / Flight Note</label>
                <input
                  type="text"
                  className="cmd-input"
                  value={editForm.statusNote}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, statusNote: e.target.value }))}
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
                    value={editForm.newCheckpointTitle}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, newCheckpointTitle: e.target.value }))}
                    style={{ fontSize: '0.8rem' }}
                  />
                  <input
                    type="text"
                    className="cmd-input"
                    placeholder="Location, e.g. London Heathrow LHR"
                    value={editForm.newCheckpointLocation}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, newCheckpointLocation: e.target.value }))}
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

      {/* Waybill Label Modal */}
      {labelModalWaybill && (
        <WaybillLabelModal
          shipment={selectedShipment || null}
          isOpen={Boolean(labelModalWaybill)}
          onClose={() => setLabelModalWaybill(null)}
        />
      )}
    </div>
  )
}
