import { useEffect, useMemo, useRef, useState } from 'react'
import L from 'leaflet'
import {
  Plane,
  Ship,
  Truck,
  Crosshair,
  Maximize2 as Route,
  Edit,
  Play,
  Pause,
  Tag,
  Copy,
  ChevronLeft,
  ChevronRight,
  List,
} from 'lucide-react'
import { useShipments } from '../../context/ShipmentContext'
import type { Shipment, ShippingMode, ShipmentStatus } from '../../types'
import { WaybillLabelModal } from './WaybillLabelModal'
import {
  MAP_TILE_PROVIDERS,
  type MapTileKey,
  fetchLiveRouteGeometry,
  generateCurvedFlightArc,
  getShipmentProgressMetrics,
} from '../../utils/mapApis'

function getAdminVehicleIconSvg(mode: string = 'land') {
  if (mode === 'air') {
    return `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.3c.4-.2.6-.6.5-1.1z"/>
    </svg>`
  }
  if (mode === 'sea') {
    return `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <path d="M2 21c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1 .6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/>
      <path d="M19.38 20A11.6 11.6 0 0 0 21 14l-9-4-9 4c0 2.9.94 5.34 2.81 7.76"/>
      <path d="M19 13V7a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v6"/>
      <path d="M12 10V2"/>
    </svg>`
  }
  return `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
    <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/>
    <path d="M15 18H9"/>
    <path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/>
    <circle cx="17" cy="18.5" r="2.5"/>
    <circle cx="7" cy="18.5" r="2.5"/>
  </svg>`
}

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
  const [activeTileKey, setActiveTileKey] = useState<MapTileKey>('satellite')
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
        (s.waybill && s.waybill.toLowerCase().includes(query)) ||
        (s.origin?.name && s.origin.name.toLowerCase().includes(query)) ||
        (s.destination?.name && s.destination.name.toLowerCase().includes(query)) ||
        (s.carrier && s.carrier.toLowerCase().includes(query)) ||
        (s.clientName && s.clientName.toLowerCase().includes(query)) ||
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

    // Start Marker (Origin Pin - Small & Clean)
    const startIcon = L.divIcon({
      className: 'leaflet-custom-marker-start',
      html: `
        <div style="
          width: 12px; height: 12px;
          background: #10b981;
          border: 1.5px solid #ffffff;
          border-radius: 50%;
          box-shadow: 0 0 8px rgba(16, 185, 129, 0.6);
          position: relative;
        ">
          <div style="
            position: absolute;
            top: -18px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(15, 23, 42, 0.92);
            color: #6ee7b7;
            font-weight: 300;
            font-size: 8.5px;
            letter-spacing: 0.04em;
            padding: 1px 4px;
            border-radius: 3px;
            white-space: nowrap;
            border: 1px solid rgba(52, 211, 153, 0.3);
            pointer-events: none;
          ">${selectedShipment.origin.code || 'DEP'}</div>
        </div>
      `,
      iconSize: [12, 12],
      iconAnchor: [6, 6],
    })

    const startMarker = L.marker(startCoord, { icon: startIcon }).addTo(markersGroup)
    startMarker.bindPopup(`
      <div style="font-family: inherit; font-size: 11px; line-height: 1.5; color: #334155; font-weight: 300;">
        <div style="color: #10b981; font-size: 11px; font-weight: 400; margin-bottom: 2px; letter-spacing: 0.02em;">ORIGIN TERMINAL</div>
        <div><span style="color: #64748b; font-weight: 300;">Location:</span> <span style="color: #0f172a; font-weight: 400;">${selectedShipment.origin.name}</span></div>
        <div><span style="color: #64748b; font-weight: 300;">Code:</span> <span style="color: #0f172a; font-weight: 400;">${selectedShipment.origin.code}</span></div>
      </div>
    `)

    // Vehicle Marker (Small, Crisp SVG, Smooth Rotation)
    const vehicleIcon = L.divIcon({
      className: 'leaflet-custom-marker-vehicle',
      html: `
        <div style="
          width: 24px; height: 24px;
          background: ${selectedShipment.isMovementStopped ? 'linear-gradient(135deg, #c2410c, #ea580c)' : 'linear-gradient(135deg, #15803d, #22c55e)'};
          border: 1.5px solid #ffffff;
          border-radius: 50%;
          box-shadow: 0 0 10px ${selectedShipment.isMovementStopped ? 'rgba(234, 88, 12, 0.7)' : 'rgba(34, 197, 94, 0.7)'};
          display: flex; align-items: center; justify-content: center;
          position: relative;
          cursor: pointer;
        ">
          ${getAdminVehicleIconSvg(selectedShipment.mode)}
          <div style="
            position: absolute;
            inset: -3px;
            border: 1px solid ${selectedShipment.isMovementStopped ? '#ea580c' : '#63d72a'};
            border-radius: 50%;
            animation: radar-pulse 2.2s infinite;
          "></div>
        </div>
      `,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    })

    const vehicleMarker = L.marker(vehicleCoord, { icon: vehicleIcon }).addTo(markersGroup)
    vehicleMarker.bindPopup(`
      <div style="font-family: inherit; font-size: 11px; line-height: 1.5; color: #334155; font-weight: 300; min-width: 180px;">
        <div style="color: #0284c7; font-size: 11px; font-weight: 400; margin-bottom: 2px; letter-spacing: 0.02em;">${selectedShipment.carrier} · ${selectedShipment.waybill}</div>
        <div><span style="color: #64748b; font-weight: 300;">Status:</span> <span style="color: #0f172a; font-weight: 400;">${selectedShipment.status.toUpperCase()} (${selectedShipment.progressPct || 50}%)</span></div>
        <div><span style="color: #64748b; font-weight: 300;">Position:</span> <span style="color: #0f172a; font-weight: 400;">${selectedShipment.currentLocation?.name || 'In Corridor'}</span></div>
        <div><span style="color: #64748b; font-weight: 300;">Driver:</span> <span style="color: #0f172a; font-weight: 400;">${selectedShipment.assignedDriver || 'Linehaul Operator'}</span></div>
        <div><span style="color: #64748b; font-weight: 300;">Vehicle:</span> <span style="color: #0f172a; font-weight: 400;">${selectedShipment.vehicleId || 'Active Fleet'}</span></div>
        <div><span style="color: #64748b; font-weight: 300;">Movement:</span> <span style="color:${selectedShipment.isMovementStopped ? '#ea580c' : '#10b981'}; font-weight: 400;">${selectedShipment.isMovementStopped ? 'HOLD (STOPPED)' : 'ACTIVE'}</span></div>
      </div>
    `)

    // Destination Marker (Destination Pin - Small & Clean)
    const destIcon = L.divIcon({
      className: 'leaflet-custom-marker-dest',
      html: `
        <div style="
          width: 12px; height: 12px;
          background: #f43f5e;
          border: 1.5px solid #ffffff;
          border-radius: 50%;
          box-shadow: 0 0 8px rgba(244, 63, 94, 0.6);
          position: relative;
        ">
          <div style="
            position: absolute;
            top: -18px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(15, 23, 42, 0.92);
            color: #fda4af;
            font-weight: 300;
            font-size: 8.5px;
            letter-spacing: 0.04em;
            padding: 1px 4px;
            border-radius: 3px;
            white-space: nowrap;
            border: 1px solid rgba(244, 63, 94, 0.3);
            pointer-events: none;
          ">${selectedShipment.destination.code || 'ARR'}</div>
        </div>
      `,
      iconSize: [12, 12],
      iconAnchor: [6, 6],
    })

    const destMarker = L.marker(destCoord, { icon: destIcon }).addTo(markersGroup)
    destMarker.bindPopup(`
      <div style="font-family: inherit; font-size: 11px; line-height: 1.5; color: #334155; font-weight: 300;">
        <div style="color: #f43f5e; font-size: 11px; font-weight: 400; margin-bottom: 2px; letter-spacing: 0.02em;">DESTINATION HUB</div>
        <div><span style="color: #64748b; font-weight: 300;">Location:</span> <span style="color: #0f172a; font-weight: 400;">${selectedShipment.destination.name}</span></div>
        <div><span style="color: #64748b; font-weight: 300;">Code:</span> <span style="color: #0f172a; font-weight: 400;">${selectedShipment.destination.code}</span></div>
        <div><span style="color: #64748b; font-weight: 300;">ETA:</span> <span style="color: #0f172a; font-weight: 400;">${selectedShipment.eta || 'Scheduled'}</span></div>
      </div>
    `)

    // Draw Real Route Polyline (Turn-by-turn road or realistic curved flight corridor)
    const drawPolyline = (coords: [number, number][]) => {
      if (!mapInstanceRef.current) return
      if (routeLayerRef.current) {
        mapInstanceRef.current.removeLayer(routeLayerRef.current)
      }
      const polyline = L.polyline(coords, {
        color: selectedShipment.isMovementStopped ? '#ea580c' : '#63d72a',
        weight: 4,
        opacity: 0.92,
        smoothFactor: 1.2,
        dashArray: selectedShipment.mode === 'air' ? '6, 6' : undefined,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(mapInstanceRef.current)
      routeLayerRef.current = polyline
    }

    if (selectedShipment.routePolyline && selectedShipment.routePolyline.length >= 2) {
      drawPolyline(selectedShipment.routePolyline)
    } else {
      fetchLiveRouteGeometry(startCoord, destCoord, selectedShipment.mode)
        .then((res) => {
          drawPolyline(res.coordinates)
        })
        .catch(() => {
          // Fallback realistic curved corridor (never a straight line)
          const curved = generateCurvedFlightArc(startCoord, destCoord, 80)
          drawPolyline(curved)
        })
    }
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
        ? `Halted movement telemetry for ${selectedShipment.waybill}`
        : `▶️ Resumed linehaul telemetry for ${selectedShipment.waybill}`
    )
  }

  const copyWaybill = (wb: string) => {
    navigator.clipboard.writeText(wb)
    showToast(`Copied waybill ${wb} to clipboard!`)
  }

  const renderModeIcon = (m: ShippingMode, size = 12) => {
    if (m === 'air') return <Plane size={size} strokeWidth={1.5} />
    if (m === 'sea') return <Ship size={size} strokeWidth={1.5} />
    return <Truck size={size} strokeWidth={1.5} />
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
                <span className="live-track-hud-mode-icon" style={{ display: 'inline-flex', alignItems: 'center' }}>
                  {renderModeIcon(selectedShipment.mode, 13)}
                </span>
                <span className="live-track-hud-code" style={{ fontWeight: 400 }}>
                  {selectedShipment.waybill}
                </span>
                <button
                  type="button"
                  className="live-track-hud-copy-btn"
                  onClick={() => copyWaybill(selectedShipment.waybill)}
                  title="Copy Waybill"
                  style={{ display: 'inline-flex', alignItems: 'center' }}
                >
                  <Copy size={11} strokeWidth={1.5} />
                </button>
                <span className={`cmd-status-pill ${selectedShipment.status}`} style={{ fontWeight: 300, fontSize: '0.72rem' }}>
                  {selectedShipment.status.replace('_', ' ').toUpperCase()}
                </span>
                {selectedShipment.isMovementStopped && (
                  <span className="live-track-stopped-badge" style={{ fontWeight: 400, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                    <Pause size={10} strokeWidth={1.5} /> HOLD ACTIVE
                  </span>
                )}
              </div>

              {(() => {
                const hudMetrics = getShipmentProgressMetrics(selectedShipment)
                return (
                  <div>
                    <div className="live-track-hud-route-row" style={{ fontWeight: 300 }}>
                      <span className="live-track-hud-corridor">
                        <span style={{ fontWeight: 400 }}>{selectedShipment.origin.name.split(',')[0]}</span> ({selectedShipment.origin.code})
                        <span style={{ color: '#94a3b8', margin: '0 6px' }}>→</span>
                        <span style={{ fontWeight: 400 }}>{selectedShipment.destination.name.split(',')[0]}</span> ({selectedShipment.destination.code})
                      </span>
                      <span className="live-track-hud-driver" style={{ color: '#94a3b8' }}>
                        {selectedShipment.assignedDriver || 'Assigned Driver'} • {selectedShipment.vehicleId || 'Active Fleet'}
                      </span>
                      <span style={{ color: selectedShipment.isMovementStopped ? '#fca5a5' : '#38bdf8', fontWeight: 400, fontSize: '0.76rem' }}>
                        {hudMetrics.pct}% ({hudMetrics.coveredKm.toLocaleString()} / {hudMetrics.totalKm.toLocaleString()} KM)
                      </span>
                    </div>

                    {/* Progress Bar in HUD */}
                    <div style={{ marginTop: '4px', width: '100%', height: '3px', background: 'rgba(255, 255, 255, 0.12)', borderRadius: '2px', overflow: 'hidden' }}>
                      <div
                        style={{
                          width: `${hudMetrics.pct}%`,
                          height: '100%',
                          background: selectedShipment.isMovementStopped ? '#ef4444' : selectedShipment.status === 'delivered' ? '#10b981' : '#38bdf8',
                          borderRadius: '2px',
                          transition: 'width 0.4s ease',
                        }}
                      />
                    </div>
                  </div>
                )
              })()}
            </div>

            <div className="live-track-hud-actions">
              {/* Map Tile: Satellite */}
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '0.72rem', color: '#cbd5e1', background: 'rgba(15, 23, 42, 0.92)', border: '1px solid rgba(255, 255, 255, 0.12)', borderRadius: '6px', padding: '4px 8px', fontWeight: 300 }}>
                <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: '#38bdf8' }} />
                <span>Satellite</span>
              </div>

              {/* Map Telemetry Group */}
              <div className="live-track-btn-group">
                <button
                  type="button"
                  className="live-track-hud-btn"
                  onClick={handleCenterVehicle}
                  title="Focus map on Vehicle"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 300 }}
                >
                  <Crosshair size={11} strokeWidth={1.5} /> Vehicle
                </button>
                <button
                  type="button"
                  className="live-track-hud-btn"
                  onClick={handleFitCorridor}
                  title="Fit whole Route Corridor"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 300 }}
                >
                  <Route size={11} strokeWidth={1.5} /> Route
                </button>
              </div>

              {/* Operations Control Group */}
              <div className="live-track-btn-group">
                <button
                  type="button"
                  className="live-track-hud-btn primary"
                  onClick={() => handleOpenEditModal(selectedShipment)}
                  title="Edit Fleet Status & Telemetry"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 300 }}
                >
                  <Edit size={11} strokeWidth={1.5} /> Edit Fleet
                </button>
                <button
                  type="button"
                  className={`live-track-hud-btn ${selectedShipment.isMovementStopped ? 'resume' : 'hold'}`}
                  onClick={handleToggleHold}
                  title={selectedShipment.isMovementStopped ? 'Resume Linehaul Movement' : 'Halt Consignment Movement'}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 300 }}
                >
                  {selectedShipment.isMovementStopped ? (
                    <>
                      <Play size={11} strokeWidth={1.5} /> Resume
                    </>
                  ) : (
                    <>
                      <Pause size={11} strokeWidth={1.5} /> Stop Movement
                    </>
                  )}
                </button>
                <button
                  type="button"
                  className="live-track-hud-btn label-btn"
                  onClick={() => setLabelModalWaybill(selectedShipment.waybill)}
                  title="Print Consignment Label"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 300 }}
                >
                  <Tag size={11} strokeWidth={1.5} /> Label
                </button>
              </div>

              {/* Collapsible Fleets Sidebar Toggle Button */}
              <button
                type="button"
                className={`live-track-hud-btn fleet-toggle-btn ${isFleetSidebarOpen ? 'active' : ''}`}
                onClick={() => setIsFleetSidebarOpen(!isFleetSidebarOpen)}
                title={isFleetSidebarOpen ? 'Collapse active fleets panel' : 'Open active fleets panel'}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 300 }}
              >
                {isFleetSidebarOpen ? (
                  <>
                    <ChevronLeft size={11} strokeWidth={1.5} /> Hide Fleets
                  </>
                ) : (
                  <>
                    <ChevronRight size={11} strokeWidth={1.5} /> Active Fleets ({filteredShipments.length})
                  </>
                )}
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
                ×
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
                ×
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
              Air
            </button>
            <button
              type="button"
              className={`live-track-filter-pill ${modeFilter === 'sea' ? 'active' : ''}`}
              onClick={() => setModeFilter('sea')}
            >
              Sea
            </button>
            <button
              type="button"
              className={`live-track-filter-pill ${modeFilter === 'land' ? 'active' : ''}`}
              onClick={() => setModeFilter('land')}
            >
              Land
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
                      <span className="live-track-mode-badge" title={s.mode.toUpperCase()} style={{ display: 'inline-flex', alignItems: 'center' }}>
                        {renderModeIcon(s.mode, 12)}
                      </span>
                      <div>
                        <span className="live-track-waybill" style={{ fontWeight: 400 }}>
                          {s.waybill}
                        </span>
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
                        Edit
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
                      →
                    </div>

                    <div className="live-track-corridor-node right">
                      <span className="live-track-corridor-code dest">{s.destination.code}</span>
                      <span className="live-track-corridor-city dest" title={s.destination.name}>
                        {s.destination.name.split(',')[0]}
                      </span>
                    </div>
                  </div>

                  {/* Card Row 2.5: Progress Bar & Distance */}
                  {(() => {
                    const cardMetrics = getShipmentProgressMetrics(s)
                    return (
                      <div style={{ margin: '6px 0' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#64748b', marginBottom: '2px' }}>
                          <strong style={{ color: s.isMovementStopped ? '#ef4444' : '#0284c7' }}>
                            {cardMetrics.pct}% Complete
                          </strong>
                          <span>{cardMetrics.coveredKm.toLocaleString()} / {cardMetrics.totalKm.toLocaleString()} KM</span>
                        </div>
                        <div style={{ height: '4px', background: '#e2e8f0', borderRadius: '2px', overflow: 'hidden' }}>
                          <div
                            style={{
                              width: `${cardMetrics.pct}%`,
                              height: '100%',
                              background: s.isMovementStopped
                                ? '#ef4444'
                                : s.status === 'delivered'
                                ? '#10b981'
                                : 'linear-gradient(90deg, #0284c7 0%, #38bdf8 100%)',
                              borderRadius: '2px',
                              transition: 'width 0.4s ease',
                            }}
                          />
                        </div>
                      </div>
                    )
                  })()}

                  {/* Card Row 3: Driver & Cargo */}
                  <div className="live-track-driver-row">
                    <span className="live-track-driver-tag">
                      {s.assignedDriver || 'Amina Bello'} ({s.vehicleId || 'VEH-101'})
                    </span>
                    {s.isMovementStopped && (
                      <span className="live-track-card-hold-badge">
                        HOLD
                      </span>
                    )}
                  </div>

                  {/* Card Row 4: ETA & Speed Metric */}
                  {(() => {
                    const cardMetrics = getShipmentProgressMetrics(s)
                    return (
                      <div className="live-track-card-footer">
                        <span className="live-track-eta">
                          ETA: <strong>{s.eta}</strong>
                        </span>
                        <span className="live-track-speed">
                          {cardMetrics.speedDisplay}
                        </span>
                      </div>
                    )
                  })()}
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
                    editingShipment.mode.toUpperCase()
                  </span>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#ffffff', fontWeight: 400 }}>
                    Live Fleet Controller // {editingShipment.waybill}
                  </h3>
                </div>
                <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                  {editingShipment.carrier} · {editingShipment.origin.code} → {editingShipment.destination.code}
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
                ×
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
                    {editForm.isMovementStopped ? 'Consignment Movement is STOPPED (Hold Active)' : 'Consignment is IN MOTION (Transit Active)'}
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
                    fontWeight: 400,
                    fontSize: '0.8rem',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  {editForm.isMovementStopped ? 'Resume Movement' : 'Stop Movement'}
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
                  Save & Dispatch Live Updates
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
