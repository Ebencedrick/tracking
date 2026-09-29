import { useEffect, useMemo, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useShipments } from '../../context/ShipmentContext'
import type { Shipment, ShippingMode } from '../../types'
import { WaybillLabelModal } from './WaybillLabelModal'
import {
  MAP_TILE_PROVIDERS,
  type MapTileKey,
  fetchLiveRouteGeometry,
} from '../../utils/mapApis'

export function AdminLiveTracking() {
  const { shipments, updateShipment } = useShipments()

  // Filter active / in-transit shipments
  const activeShipments = useMemo(() => {
    const active = shipments.filter(
      (s) => s.status === 'in_transit' || s.status === 'customs' || s.status === 'pending'
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
          width: 16px;
          height: 16px;
          background-color: #10b981;
          border: 3px solid #ffffff;
          border-radius: 50%;
          box-shadow: 0 2px 10px rgba(0,0,0,0.4);
        "></div>
      `,
      iconSize: [16, 16],
      iconAnchor: [8, 8],
    })

    // Vehicle Marker (Pulsing Icon)
    const modeEmoji = selectedShipment.mode === 'air' ? '✈️' : selectedShipment.mode === 'sea' ? '🚢' : '🚚'
    const vehicleIcon = L.divIcon({
      className: 'leaflet-custom-marker-vehicle',
      html: `
        <div style="
          width: 28px;
          height: 28px;
          background-color: ${selectedShipment.isMovementStopped ? '#ef4444' : '#0284c7'};
          border: 3px solid #ffffff;
          border-radius: 50%;
          box-shadow: 0 0 16px ${selectedShipment.isMovementStopped ? 'rgba(239, 68, 68, 0.8)' : 'rgba(2, 132, 199, 0.8)'};
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
        ">
          ${modeEmoji}
        </div>
      `,
      iconSize: [28, 28],
      iconAnchor: [14, 14],
    })

    // Destination Marker (Red Pin)
    const destIcon = L.divIcon({
      className: 'leaflet-custom-marker-dest',
      html: `
        <div style="
          width: 16px;
          height: 16px;
          background-color: #ef4444;
          border: 3px solid #ffffff;
          border-radius: 50%;
          box-shadow: 0 2px 10px rgba(0,0,0,0.4);
        "></div>
      `,
      iconSize: [16, 16],
      iconAnchor: [8, 8],
    })

    // Add Markers to Layer
    const startMarker = L.marker(startCoord, { icon: startIcon }).bindPopup(
      `<b>Origin Gateway:</b> ${selectedShipment.origin.name}<br/>Lat: ${startLat.toFixed(4)}, Lng: ${startLng.toFixed(4)}`
    )
    const vehicleMarker = L.marker(vehicleCoord, { icon: vehicleIcon }).bindPopup(
      `<b>Active Telemetry Vector:</b> ${selectedShipment.waybill}<br/>Status: <b>${selectedShipment.status.toUpperCase()}</b><br/>Carrier: ${selectedShipment.carrier}<br/>Current: ${selectedShipment.currentLocation?.name || 'In Transit'}`
    )
    const destMarker = L.marker(destCoord, { icon: destIcon }).bindPopup(
      `<b>Destination Hub:</b> ${selectedShipment.destination.name}<br/>Lat: ${destLat.toFixed(4)}, Lng: ${destLng.toFixed(4)}`
    )

    markersGroup.addLayer(startMarker)
    markersGroup.addLayer(vehicleMarker)
    markersGroup.addLayer(destMarker)

    // Calculate Real Route Geometry via OSRM / Geodesic Arc
    let isCancelled = false
    fetchLiveRouteGeometry(startCoord, destCoord, selectedShipment.mode).then((res) => {
      if (isCancelled || !map) return
      const polyline = L.polyline(res.coordinates, {
        color: selectedShipment.isMovementStopped ? '#ea580c' : '#0284c7',
        weight: 3.5,
        opacity: 0.85,
        dashArray: '6, 6',
      }).addTo(map)
      routeLayerRef.current = polyline
    })

    // Fit map bounds
    try {
      const bounds = L.latLngBounds([startCoord, destCoord])
      map.fitBounds(bounds, { padding: [70, 70], maxZoom: 9 })
    } catch {
      // ignore
    }

    return () => {
      isCancelled = true
    }
  }, [selectedShipment])

  const handleCenterVehicle = () => {
    if (!mapInstanceRef.current || !selectedShipment) return
    const lat = selectedShipment.currentLocation?.lat || selectedShipment.origin.lat || 40.6413
    const lng = selectedShipment.currentLocation?.lng || selectedShipment.origin.lng || -73.7781
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
        ? `Halted movement telemetry for ${selectedShipment.waybill}`
        : `Resumed linehaul telemetry for ${selectedShipment.waybill}`
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
              <div style={{ display: 'inline-flex', background: 'rgba(15, 23, 42, 0.75)', padding: '2px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.15)' }}>
                {(['voyager', 'satellite', 'dark'] as MapTileKey[]).map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setActiveTileKey(k)}
                    style={{
                      padding: '3px 7px',
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      background: activeTileKey === k ? '#0284c7' : 'transparent',
                      color: activeTileKey === k ? '#ffffff' : '#94a3b8',
                    }}
                  >
                    {k === 'voyager' ? '🗺️ Street' : k === 'satellite' ? '🛰️ Satellite' : '🌙 Radar'}
                  </button>
                ))}
              </div>

              <button
                type="button"
                className="live-track-hud-btn"
                onClick={handleCenterVehicle}
                title="Focus on Vehicle"
              >
                🎯 Vehicle
              </button>
              <button
                type="button"
                className="live-track-hud-btn"
                onClick={handleFitCorridor}
                title="Fit Route Corridor"
              >
                🗺️ Route
              </button>
              <button
                type="button"
                className={`live-track-hud-btn ${selectedShipment.isMovementStopped ? 'resume' : 'hold'}`}
                onClick={handleToggleHold}
              >
                {selectedShipment.isMovementStopped ? '▶️ Resume' : '⏸️ Stop Movement'}
              </button>
              <button
                type="button"
                className="live-track-hud-btn primary"
                onClick={() => setLabelModalWaybill(selectedShipment.waybill)}
              >
                🏷️ Print Label
              </button>
            </div>
          </div>
        )}

        {/* Floating Top-Right Legend Box */}
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
      </div>

      {/* Right Sidebar: Active Shipments */}
      <div className="live-track-sidebar">
        {/* Sidebar Header */}
        <div className="live-track-sidebar-header">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span className="live-track-pulse-beacon" />
              <h2 className="live-track-title">Live Active Fleet</h2>
            </div>
            <span className="live-track-count-badge">
              {filteredShipments.length} Active
            </span>
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

        {/* Shipment Cards List */}
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
                  onClick={() => setSelectedWaybill(s.waybill)}
                >
                  {/* Card Row 1: Waybill, Mode, Carrier, Status */}
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

                    <span className={`cmd-status-pill ${s.status}`}>
                      {s.status.replace('_', ' ').toUpperCase()}
                    </span>
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

