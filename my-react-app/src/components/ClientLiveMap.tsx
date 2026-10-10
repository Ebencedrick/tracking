import { useEffect, useRef, useState, useMemo, useCallback } from 'react'
import L from 'leaflet'
import type { Shipment } from '../types'
import {
  fetchLiveRouteGeometry,
  calculateDynamicETA,
  calculateRealtimeJourneyTelemetry,
  getShipmentDistanceKm,
  interpolatePositionAlongRoute,
  NORMAL_SPEEDS,
  MAP_TILE_PROVIDERS,
  type MapTileKey,
} from '../utils/mapApis'

interface ClientLiveMapProps {
  shipment: Shipment
  height?: string
}

export function ClientLiveMap({ shipment, height = '460px' }: ClientLiveMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<L.Map | null>(null)
  const tileLayerRef = useRef<L.TileLayer | null>(null)
  const markersLayerRef = useRef<L.LayerGroup | null>(null)
  const coveredPolylineRef = useRef<L.Polyline | null>(null)
  const remainingPolylineRef = useRef<L.Polyline | null>(null)
  const vehicleMarkerRef = useRef<L.Marker | null>(null)

  const [activeTileKey, setActiveTileKey] = useState<MapTileKey>('voyager')
  const [routeCoordinates, setRouteCoordinates] = useState<[number, number][]>([])
  const [showMobileDetails, setShowMobileDetails] = useState(false)
  const [layerDropdownOpen, setLayerDropdownOpen] = useState(false)

  // Calculate base metrics
  const totalDistanceKm = useMemo(() => getShipmentDistanceKm(shipment), [shipment])
  const initialTelemetry = useMemo(() => calculateRealtimeJourneyTelemetry(shipment), [shipment])

  const [currentProgressPct, setCurrentProgressPct] = useState<number>(initialTelemetry.progressPct)
  const [coveredDistanceKm, setCoveredDistanceKm] = useState<number>(initialTelemetry.coveredKm)
  const [remainingDistanceKm, setRemainingDistanceKm] = useState<number>(initialTelemetry.remainingKm)
  const [liveSpeedDisplay, setLiveSpeedDisplay] = useState<string>(initialTelemetry.speedDisplay)
  const [dynamicEtaString, setDynamicEtaString] = useState<string>(shipment.eta || initialTelemetry.etaString)

  const [liveCoords, setLiveCoords] = useState<{ lat: number; lng: number }>(() => ({
    lat: shipment.currentLocation?.lat || shipment.origin.lat || 40.6413,
    lng: shipment.currentLocation?.lng || shipment.origin.lng || -73.7781,
  }))

  const [bearingAngle, setBearingAngle] = useState<number>(0)
  const [bearingCardinal, setBearingCardinal] = useState<string>('072° ENE')

  // Mode Emoji
  const modeEmoji = shipment.mode === 'air' ? '✈️' : shipment.mode === 'sea' ? '🚢' : '🚚'

  // 1. Initialize Map Container
  useEffect(() => {
    if (!mapContainerRef.current) return
    if (mapInstanceRef.current) return

    const initialLat = shipment.currentLocation?.lat || shipment.origin.lat || 40.6413
    const initialLng = shipment.currentLocation?.lng || shipment.origin.lng || -73.7781

    const map = L.map(mapContainerRef.current, {
      zoomControl: false, // Cleaner custom UI controls
      attributionControl: false,
    }).setView([initialLat, initialLng], 4)

    // Add zoom control at bottom right on desktop
    L.control.zoom({ position: 'bottomright' }).addTo(map)

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
      coveredPolylineRef.current = null
      remainingPolylineRef.current = null
      vehicleMarkerRef.current = null
    }
  }, [])

  // 2. Switch Tile Layers Dynamically
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

  // 3. Fetch Full Corridor Route Geometry (OSRM / Great-Circle Arc)
  useEffect(() => {
    let isCancelled = false

    const startCoord: [number, number] = [
      shipment.origin.lat || 40.6413,
      shipment.origin.lng || -73.7781,
    ]
    const endCoord: [number, number] = [
      shipment.destination.lat || 51.47,
      shipment.destination.lng || -0.4543,
    ]

    fetchLiveRouteGeometry(startCoord, endCoord, shipment.mode).then((result) => {
      if (isCancelled) return
      setRouteCoordinates(result.coordinates)
    })

    return () => {
      isCancelled = true
    }
  }, [shipment])

  // 4. Render Route Polylines and Waypoint Markers
  useEffect(() => {
    const map = mapInstanceRef.current
    const markersGroup = markersLayerRef.current
    if (!map || !markersGroup || !shipment) return

    markersGroup.clearLayers()
    if (coveredPolylineRef.current) {
      map.removeLayer(coveredPolylineRef.current)
      coveredPolylineRef.current = null
    }
    if (remainingPolylineRef.current) {
      map.removeLayer(remainingPolylineRef.current)
      remainingPolylineRef.current = null
    }

    const startLat = shipment.origin.lat || 40.6413
    const startLng = shipment.origin.lng || -73.7781
    const destLat = shipment.destination.lat || 51.47
    const destLng = shipment.destination.lng || -0.4543

    const startCoord: [number, number] = [startLat, startLng]
    const destCoord: [number, number] = [destLat, destLng]

    // Start Marker (Origin Pin)
    const startIcon = L.divIcon({
      className: 'live-map-custom-marker-start',
      html: `
        <div style="
          width: 18px;
          height: 18px;
          background-color: #10b981;
          border: 2px solid #ffffff;
          border-radius: 50%;
          box-shadow: 0 2px 8px rgba(0,0,0,0.6);
          position: relative;
        ">
          <div class="live-map-pin-label" style="
            position: absolute;
            top: -22px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(15, 23, 42, 0.95);
            color: #34d399;
            font-weight: 700;
            font-size: 9px;
            padding: 1px 5px;
            border-radius: 4px;
            white-space: nowrap;
            border: 1px solid rgba(52, 211, 153, 0.4);
            box-shadow: 0 2px 6px rgba(0,0,0,0.5);
            pointer-events: none;
          ">${shipment.origin.code || 'DEP'}</div>
        </div>
      `,
      iconSize: [18, 18],
      iconAnchor: [9, 9],
    })

    // Destination Marker (Destination Pin)
    const destIcon = L.divIcon({
      className: 'live-map-custom-marker-dest',
      html: `
        <div style="
          width: 18px;
          height: 18px;
          background-color: #ef4444;
          border: 2px solid #ffffff;
          border-radius: 50%;
          box-shadow: 0 2px 8px rgba(0,0,0,0.6);
          position: relative;
        ">
          <div class="live-map-pin-label" style="
            position: absolute;
            top: -22px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(15, 23, 42, 0.95);
            color: #f87171;
            font-weight: 700;
            font-size: 9px;
            padding: 1px 5px;
            border-radius: 4px;
            white-space: nowrap;
            border: 1px solid rgba(248, 113, 113, 0.4);
            box-shadow: 0 2px 6px rgba(0,0,0,0.5);
            pointer-events: none;
          ">${shipment.destination.code || 'ARR'}</div>
        </div>
      `,
      iconSize: [18, 18],
      iconAnchor: [9, 9],
    })

    L.marker(startCoord, { icon: startIcon })
      .addTo(markersGroup)
      .bindPopup(`<b>Origin Hub:</b> ${shipment.origin.name}<br>Lat: ${startLat.toFixed(4)}, Lng: ${startLng.toFixed(4)}`)

    L.marker(destCoord, { icon: destIcon })
      .addTo(markersGroup)
      .bindPopup(`<b>Destination Hub:</b> ${shipment.destination.name}<br>Lat: ${destLat.toFixed(4)}, Lng: ${destLng.toFixed(4)}`)

    // Initial Path rendering
    const rawCoords =
      routeCoordinates.length > 0
        ? routeCoordinates
        : ([startCoord, [liveCoords.lat, liveCoords.lng], destCoord] as [number, number][])

    const fraction = currentProgressPct / 100
    const interp = interpolatePositionAlongRoute(rawCoords, fraction)

    // Covered path (solid cyan/blue)
    const coveredLine = L.polyline(interp.coveredCoordinates as L.LatLngTuple[], {
      color: shipment.isMovementStopped ? '#ea580c' : '#0284c7',
      weight: 4,
      opacity: 0.9,
      lineCap: 'round',
      lineJoin: 'round',
    }).addTo(map)
    coveredPolylineRef.current = coveredLine

    // Remaining path (dashed ahead)
    const remainingLine = L.polyline(interp.remainingCoordinates as L.LatLngTuple[], {
      color: shipment.isMovementStopped ? '#ea580c' : '#38bdf8',
      weight: 3,
      opacity: 0.6,
      dashArray: '6, 8',
      lineCap: 'round',
      lineJoin: 'round',
    }).addTo(map)
    remainingPolylineRef.current = remainingLine

    // Vehicle Marker Icon
    const vehicleIcon = L.divIcon({
      className: 'live-map-custom-marker-vehicle',
      html: `
        <div id="vehicle-marker-wrapper" style="
          width: 36px;
          height: 36px;
          background: ${shipment.isMovementStopped ? 'linear-gradient(135deg, #c2410c, #ea580c)' : 'linear-gradient(135deg, #0369a1, #0284c7)'};
          border: 2px solid #ffffff;
          border-radius: 50%;
          box-shadow: 0 0 16px ${shipment.isMovementStopped ? 'rgba(234, 88, 12, 0.9)' : 'rgba(2, 132, 199, 0.9)'}, 0 2px 8px rgba(0,0,0,0.5);
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 17px;
          transition: transform 0.4s ease;
        ">
          <span id="vehicle-emoji-rotator" style="display:inline-block; transform: rotate(${interp.bearingAngle}deg); transition: transform 0.4s ease;">${modeEmoji}</span>
          <div style="
            position: absolute;
            inset: -5px;
            border: 2px solid ${shipment.isMovementStopped ? '#ea580c' : '#38bdf8'};
            border-radius: 50%;
            animation: pulse-ring 2s cubic-bezier(0.215, 0.61, 0.355, 1) infinite;
          "></div>
        </div>
      `,
      iconSize: [36, 36],
      iconAnchor: [18, 18],
    })

    const vMarker = L.marker([interp.lat, interp.lng], { icon: vehicleIcon })
      .addTo(markersGroup)
      .bindPopup(`
        <div style="font-family: inherit; font-size: 12px; line-height: 1.4;">
          <strong style="color: #0284c7; font-size: 13px;">${shipment.carrier} (${shipment.waybill})</strong><br>
          <b>Location:</b> ${shipment.currentLocation?.name || 'In Corridor'}<br>
          <b>Speed:</b> ${liveSpeedDisplay}<br>
          <b>Status:</b> ${shipment.status.toUpperCase()} (${Math.round(currentProgressPct)}%)<br>
          <b>ETA:</b> ${shipment.eta || dynamicEtaString}
        </div>
      `)

    vehicleMarkerRef.current = vMarker

    // Fit map bounds smoothly with responsive padding
    try {
      const isMobile = window.innerWidth < 768
      const bounds = L.latLngBounds([startCoord, [interp.lat, interp.lng], destCoord])
      map.fitBounds(bounds, { padding: isMobile ? [25, 20] : [45, 45], maxZoom: 11 })
    } catch {
      map.setView([interp.lat, interp.lng], 5)
    }
  }, [shipment, routeCoordinates])

  // 5. Accurate Real-Time Normal Vehicle Speed & Distance Movement Engine
  useEffect(() => {
    // Delivery State: Fixed at destination
    if (shipment.status === 'delivered') {
      setLiveSpeedDisplay('0 km/h (Delivered)')
      setBearingCardinal('Terminal Final Arrival')
      setCurrentProgressPct(100)
      setCoveredDistanceKm(totalDistanceKm)
      setRemainingDistanceKm(0)
      setDynamicEtaString('Delivered & Confirmed')
      if (shipment.destination) {
        setLiveCoords({ lat: shipment.destination.lat, lng: shipment.destination.lng })
        vehicleMarkerRef.current?.setLatLng([shipment.destination.lat, shipment.destination.lng])
      }
      return
    }

    // Hold State: Stationary
    if (shipment.isMovementStopped) {
      setLiveSpeedDisplay('0 km/h (Hold Active)')
      setBearingCardinal(shipment.movementStopReason ? `Hold: ${shipment.movementStopReason}` : 'Stationary Hold')
      return
    }

    // Pending Intake: Staged at Origin
    if (shipment.status === 'pending') {
      setLiveSpeedDisplay('0 km/h (Awaiting Dispatch)')
      setBearingCardinal('Staged at Origin Terminal')
      setCurrentProgressPct(0)
      setCoveredDistanceKm(0)
      setRemainingDistanceKm(totalDistanceKm)
      if (shipment.origin) {
        setLiveCoords({ lat: shipment.origin.lat, lng: shipment.origin.lng })
        vehicleMarkerRef.current?.setLatLng([shipment.origin.lat, shipment.origin.lng])
      }
      return
    }

    // Active In-Transit Movement Engine
    // Real-time normal vehicle driving speed (80 km/h for land car/truck, 850 km/h for air, 38 km/h for sea)
    const mode = shipment.mode || 'land'
    const normalSpeedKmH = NORMAL_SPEEDS[mode] || NORMAL_SPEEDS.land

    // Recalculate and update on 1-second ticks for smooth, mathematically exact movement
    const intervalId = setInterval(() => {
      // 1. Calculate latest telemetry based on elapsed time & speed
      const telemetry = calculateRealtimeJourneyTelemetry(shipment)
      const pct = telemetry.progressPct
      setCurrentProgressPct(pct)
      setCoveredDistanceKm(telemetry.coveredKm)
      setRemainingDistanceKm(telemetry.remainingKm)
      setLiveSpeedDisplay(telemetry.speedDisplay)
      setDynamicEtaString(shipment.eta || telemetry.etaString)

      // 2. Interpolate exact physical vehicle position along route geometry
      if (routeCoordinates && routeCoordinates.length >= 2) {
        const fraction = pct / 100
        const interp = interpolatePositionAlongRoute(routeCoordinates, fraction)

        setLiveCoords({ lat: interp.lat, lng: interp.lng })
        setBearingAngle(interp.bearingAngle)
        setBearingCardinal(interp.bearingCardinal)

        // Update Vehicle Marker Position & Bearing
        if (vehicleMarkerRef.current) {
          vehicleMarkerRef.current.setLatLng([interp.lat, interp.lng])
          const rotElement = document.getElementById('vehicle-emoji-rotator')
          if (rotElement) {
            rotElement.style.transform = `rotate(${interp.bearingAngle}deg)`
          }
        }

        // Update Polylines dynamically
        if (coveredPolylineRef.current) {
          coveredPolylineRef.current.setLatLngs(interp.coveredCoordinates as L.LatLngTuple[])
        }
        if (remainingPolylineRef.current) {
          remainingPolylineRef.current.setLatLngs(interp.remainingCoordinates as L.LatLngTuple[])
        }
      }
    }, 1000)

    return () => clearInterval(intervalId)
  }, [shipment, routeCoordinates, totalDistanceKm])

  const handleCenterVehicle = useCallback(() => {
    if (!mapInstanceRef.current) return
    mapInstanceRef.current.flyTo([liveCoords.lat, liveCoords.lng], 8, { duration: 1.2 })
  }, [liveCoords])

  const handleFitCorridor = useCallback(() => {
    if (!mapInstanceRef.current || !shipment) return
    const startLat = shipment.origin.lat || 40.6413
    const startLng = shipment.origin.lng || -73.7781
    const destLat = shipment.destination.lat || 51.47
    const destLng = shipment.destination.lng || -0.4543

    const bounds = L.latLngBounds([
      [startLat, startLng],
      [liveCoords.lat, liveCoords.lng],
      [destLat, destLng],
    ])
    const isMobile = window.innerWidth < 768
    mapInstanceRef.current.fitBounds(bounds, { padding: isMobile ? [25, 20] : [45, 45], maxZoom: 11 })
  }, [shipment, liveCoords])

  return (
    <div
      className="client-live-map-wrapper"
      style={{
        position: 'relative',
        width: '100%',
        height,
        borderRadius: '14px',
        overflow: 'hidden',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        boxShadow: '0 12px 36px rgba(0, 0, 0, 0.35)',
        background: '#0f172a',
      }}
    >
      {/* Leaflet Map Canvas */}
      <div
        ref={mapContainerRef}
        style={{
          width: '100%',
          height: '100%',
          zIndex: 1,
        }}
      />

      {/* ========================================================================= */}
      {/* TOP DESKTOP HUD (Hidden on Mobile) */}
      {/* ========================================================================= */}
      <div className="live-map-desktop-top-hud">
        {/* Left Telemetry Card */}
        <div className="live-map-hud-pill">
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: shipment.isMovementStopped ? '#ea580c' : '#10b981',
                boxShadow: shipment.isMovementStopped ? '0 0 10px #ea580c' : '0 0 10px #10b981',
              }}
            />
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                color: shipment.isMovementStopped ? '#fdba74' : '#6ee7b7',
                letterSpacing: '0.5px',
                textTransform: 'uppercase',
              }}
            >
              {shipment.isMovementStopped ? 'HOLD ACTIVE' : 'LIVE GPS ACTIVE'}
            </span>
          </div>

          <span className="live-map-hud-divider">|</span>

          <div style={{ fontSize: '11px', color: '#e2e8f0' }}>
            <span style={{ color: '#94a3b8' }}>Speed:</span>{' '}
            <strong style={{ color: '#38bdf8' }}>{liveSpeedDisplay}</strong>
          </div>

          <span className="live-map-hud-divider">|</span>

          <div style={{ fontSize: '11px', color: '#e2e8f0' }}>
            <span style={{ color: '#94a3b8' }}>Heading:</span>{' '}
            <strong style={{ color: '#f1f5f9' }}>{bearingCardinal}</strong>
          </div>

          <span className="live-map-hud-divider">|</span>

          <div style={{ fontSize: '11px', color: '#e2e8f0' }}>
            <span style={{ color: '#94a3b8' }}>Coords:</span>{' '}
            <strong style={{ color: '#f1f5f9' }}>
              {liveCoords.lat.toFixed(2)}°N, {liveCoords.lng.toFixed(2)}°E
            </strong>
          </div>
        </div>

        {/* Right Controls: Layer Switcher & Fly Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div className="live-map-layer-selector">
            <button
              type="button"
              onClick={() => setActiveTileKey('voyager')}
              className={`live-map-layer-btn ${activeTileKey === 'voyager' ? 'active' : ''}`}
            >
              🗺️ Street
            </button>
            <button
              type="button"
              onClick={() => setActiveTileKey('satellite')}
              className={`live-map-layer-btn ${activeTileKey === 'satellite' ? 'active' : ''}`}
            >
              🛰️ Satellite
            </button>
            <button
              type="button"
              onClick={() => setActiveTileKey('dark')}
              className={`live-map-layer-btn ${activeTileKey === 'dark' ? 'active' : ''}`}
            >
              🌙 Radar
            </button>
          </div>

          <button
            type="button"
            onClick={handleCenterVehicle}
            className="live-map-action-btn"
            title="Center Vehicle"
          >
            <span>🎯</span> Center
          </button>

          <button
            type="button"
            onClick={handleFitCorridor}
            className="live-map-action-btn"
            title="Fit Entire Route Corridor"
          >
            <span>🗺️</span> Corridor
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TOP MOBILE HUD (Clean, Minimalist, Zero Screen Clutter) */}
      {/* ========================================================================= */}
      <div className="live-map-mobile-top-hud">
        {/* Compact Mobile Live Pill */}
        <button
          type="button"
          onClick={() => setShowMobileDetails((prev) => !prev)}
          className="live-map-mobile-status-pill"
          title="Tap for Live Specs"
        >
          <span
            style={{
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              backgroundColor: shipment.isMovementStopped ? '#ea580c' : '#10b981',
              boxShadow: shipment.isMovementStopped ? '0 0 8px #ea580c' : '0 0 8px #10b981',
            }}
          />
          <span style={{ fontWeight: 700, color: shipment.isMovementStopped ? '#fdba74' : '#6ee7b7' }}>
            {shipment.isMovementStopped ? 'HOLD' : 'LIVE'}
          </span>
          <span style={{ color: 'rgba(255,255,255,0.3)' }}>•</span>
          <span style={{ color: '#38bdf8', fontWeight: 600 }}>
            {modeEmoji} {shipment.isMovementStopped ? '0 km/h' : shipment.status === 'pending' ? 'Staged' : '80 km/h'}
          </span>
          <span style={{ fontSize: '10px', color: '#94a3b8', marginLeft: '2px' }}>ℹ️</span>
        </button>

        {/* Floating Quick Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <button
            type="button"
            onClick={handleCenterVehicle}
            className="live-map-mobile-icon-btn"
            title="Center Vehicle"
          >
            🎯
          </button>

          <button
            type="button"
            onClick={handleFitCorridor}
            className="live-map-mobile-icon-btn"
            title="Fit Route Corridor"
          >
            🗺️
          </button>

          <div style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={() => setLayerDropdownOpen((prev) => !prev)}
              className="live-map-mobile-icon-btn"
              title="Change Map Tile"
            >
              🛰️
            </button>
            {layerDropdownOpen && (
              <div className="live-map-mobile-layer-menu">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTileKey('voyager')
                    setLayerDropdownOpen(false)
                  }}
                  className={activeTileKey === 'voyager' ? 'active' : ''}
                >
                  🗺️ Street
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTileKey('satellite')
                    setLayerDropdownOpen(false)
                  }}
                  className={activeTileKey === 'satellite' ? 'active' : ''}
                >
                  🛰️ Satellite
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTileKey('dark')
                    setLayerDropdownOpen(false)
                  }}
                  className={activeTileKey === 'dark' ? 'active' : ''}
                >
                  🌙 Radar
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Detailed Specs Drawer Modal (Optional Expansion) */}
      {showMobileDetails && (
        <div className="live-map-mobile-drawer">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <strong style={{ color: '#38bdf8', fontSize: '12px' }}>🛰️ Live Consignment Telemetry</strong>
            <button
              type="button"
              onClick={() => setShowMobileDetails(false)}
              style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '14px', cursor: 'pointer' }}
            >
              ✕
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', fontSize: '11px' }}>
            <div><span style={{ color: '#94a3b8' }}>Speed:</span> <strong style={{ color: '#f8fafc' }}>{liveSpeedDisplay}</strong></div>
            <div><span style={{ color: '#94a3b8' }}>Heading:</span> <strong style={{ color: '#f8fafc' }}>{bearingCardinal}</strong></div>
            <div><span style={{ color: '#94a3b8' }}>Vehicle:</span> <strong style={{ color: '#f8fafc' }}>{shipment.vehicleId || 'Linehaul 101'}</strong></div>
            <div><span style={{ color: '#94a3b8' }}>Driver:</span> <strong style={{ color: '#f8fafc' }}>{shipment.assignedDriver || 'Assigned'}</strong></div>
            <div style={{ gridColumn: 'span 2' }}>
              <span style={{ color: '#94a3b8' }}>Coords:</span> <strong style={{ color: '#f8fafc' }}>{liveCoords.lat.toFixed(4)}°N, {liveCoords.lng.toFixed(4)}°E</strong>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* BOTTOM PROGRESS & DISTANCE HUD (Responsive Desktop & Mobile) */}
      {/* ========================================================================= */}
      <div className="live-map-bottom-progress-hud">
        {/* Top metrics row */}
        <div className="live-map-progress-topline">
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ color: '#38bdf8', fontSize: '11px', fontWeight: 700 }}>
              {Math.round(currentProgressPct)}% Covered
            </span>
            <span style={{ color: 'rgba(255,255,255,0.2)' }}>•</span>
            <span style={{ color: '#94a3b8', fontSize: '11px', fontWeight: 600 }}>
              {Math.max(0, 100 - Math.round(currentProgressPct))}% To Go
            </span>
            <span style={{ color: 'rgba(255,255,255,0.2)' }}>•</span>
            <span style={{ color: '#34d399', fontSize: '11px', fontWeight: 600 }}>
              {coveredDistanceKm.toLocaleString()} km covered
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ color: '#f8fafc', fontSize: '11px' }}>
              <strong style={{ color: '#cbd5e1' }}>{remainingDistanceKm.toLocaleString()} km to destination</strong>
            </span>
            <span className="live-map-desktop-only" style={{ color: 'rgba(255,255,255,0.2)' }}>•</span>
            <span className="live-map-desktop-only" style={{ color: '#94a3b8', fontSize: '11px' }}>
              ETA: <strong style={{ color: '#34d399' }}>{dynamicEtaString}</strong>
            </span>
          </div>
        </div>

        {/* Smooth Linear Progress Track */}
        <div className="live-map-progress-track">
          <div
            className="live-map-progress-fill"
            style={{
              width: `${currentProgressPct}%`,
              background: shipment.isMovementStopped
                ? '#ea580c'
                : 'linear-gradient(90deg, #0284c7, #38bdf8, #34d399)',
            }}
          />
        </div>

        {/* Mobile secondary info line */}
        <div className="live-map-mobile-only live-map-mobile-bottom-footnote">
          <span>⏱️ ETA: <strong style={{ color: '#34d399' }}>{dynamicEtaString}</strong></span>
          <span>{liveSpeedDisplay}</span>
        </div>
      </div>

      {/* Scoped CSS Styles for Fluid Mobile & Desktop Aesthetics */}
      <style>{`
        .client-live-map-wrapper {
          position: relative;
          user-select: none;
        }

        /* Desktop Top HUD */
        .live-map-desktop-top-hud {
          position: absolute;
          top: 10px;
          left: 10px;
          right: 10px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 8px;
          z-index: 1000;
          pointer-events: none;
        }

        .live-map-hud-pill {
          background: rgba(15, 23, 42, 0.92);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 8px;
          padding: 6px 12px;
          display: flex;
          align-items: center;
          gap: 10px;
          box-shadow: 0 4px 16px rgba(0,0,0,0.5);
          pointer-events: auto;
        }

        .live-map-hud-divider {
          color: rgba(255, 255, 255, 0.2);
        }

        .live-map-layer-selector {
          background: rgba(15, 23, 42, 0.92);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 6px;
          padding: 2px;
          display: flex;
          gap: 2px;
          pointer-events: auto;
        }

        .live-map-layer-btn {
          background: transparent;
          color: #94a3b8;
          border: none;
          border-radius: 4px;
          padding: 4px 8px;
          font-size: 10px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .live-map-layer-btn.active {
          background: #0284c7;
          color: #ffffff;
        }

        .live-map-action-btn {
          background: rgba(15, 23, 42, 0.92);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 6px;
          padding: 5px 10px;
          font-size: 11px;
          font-weight: 600;
          color: #f8fafc;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 4px;
          pointer-events: auto;
          box-shadow: 0 2px 8px rgba(0,0,0,0.4);
          transition: all 0.2s ease;
        }

        .live-map-action-btn:hover {
          background: rgba(30, 41, 59, 0.96);
          border-color: #38bdf8;
        }

        /* Mobile Top HUD (Hidden on desktop) */
        .live-map-mobile-top-hud {
          display: none;
        }

        /* Mobile Drawer */
        .live-map-mobile-drawer {
          position: absolute;
          top: 48px;
          left: 10px;
          right: 10px;
          background: rgba(15, 23, 42, 0.96);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(56, 189, 248, 0.4);
          border-radius: 10px;
          padding: 10px 12px;
          z-index: 1001;
          box-shadow: 0 8px 24px rgba(0,0,0,0.6);
          animation: fadeIn 0.2s ease;
        }

        /* Bottom Progress HUD */
        .live-map-bottom-progress-hud {
          position: absolute;
          bottom: 10px;
          left: 10px;
          right: 10px;
          background: rgba(15, 23, 42, 0.92);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 10px;
          padding: 8px 14px;
          z-index: 1000;
          box-shadow: 0 4px 20px rgba(0,0,0,0.5);
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .live-map-progress-topline {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 6px;
        }

        .live-map-progress-track {
          height: 5px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 999px;
          overflow: hidden;
        }

        .live-map-progress-fill {
          height: 100%;
          border-radius: 999px;
          transition: width 0.6s ease-in-out;
        }

        .live-map-desktop-only {
          display: inline;
        }

        .live-map-mobile-only {
          display: none;
        }

        /* ========================================================================= */
        /* RESPONSIVE MEDIA QUERIES FOR MOBILE (< 768px) */
        /* ========================================================================= */
        @media (max-width: 768px) {
          .client-live-map-wrapper {
            height: 520px !important;
            min-height: 480px !important;
          }

          .live-map-desktop-top-hud {
            display: none !important;
          }

          .live-map-desktop-only {
            display: none !important;
          }

          .live-map-mobile-only {
            display: flex !important;
          }

          .live-map-mobile-top-hud {
            position: absolute;
            top: 8px;
            left: 8px;
            right: 8px;
            display: flex !important;
            justify-content: space-between;
            align-items: center;
            z-index: 1000;
            pointer-events: none;
          }

          .live-map-mobile-status-pill {
            background: rgba(15, 23, 42, 0.92);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 20px;
            padding: 5px 10px;
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 11px;
            color: #f8fafc;
            cursor: pointer;
            pointer-events: auto;
            box-shadow: 0 2px 10px rgba(0,0,0,0.5);
          }

          .live-map-mobile-icon-btn {
            background: rgba(15, 23, 42, 0.92);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 50%;
            width: 32px;
            height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 14px;
            cursor: pointer;
            pointer-events: auto;
            box-shadow: 0 2px 8px rgba(0,0,0,0.5);
          }

          .live-map-mobile-layer-menu {
            position: absolute;
            top: 36px;
            right: 0;
            background: rgba(15, 23, 42, 0.96);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 8px;
            padding: 4px;
            display: flex;
            flex-direction: column;
            gap: 2px;
            z-index: 1002;
            box-shadow: 0 4px 16px rgba(0,0,0,0.6);
            min-width: 100px;
            pointer-events: auto;
          }

          .live-map-mobile-layer-menu button {
            background: transparent;
            color: #cbd5e1;
            border: none;
            border-radius: 4px;
            padding: 6px 8px;
            font-size: 11px;
            font-weight: 600;
            text-align: left;
            cursor: pointer;
          }

          .live-map-mobile-layer-menu button.active {
            background: #0284c7;
            color: #ffffff;
          }

          .live-map-bottom-progress-hud {
            bottom: 8px;
            left: 8px;
            right: 8px;
            padding: 6px 10px;
            border-radius: 8px;
          }

          .live-map-mobile-bottom-footnote {
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 10px;
            color: #94a3b8;
            margin-top: 1px;
          }

          .live-map-pin-label {
            font-size: 8px !important;
            padding: 1px 3px !important;
          }
        }

        @keyframes pulse-ring {
          0% { transform: scale(0.95); opacity: 0.8; }
          50% { transform: scale(1.35); opacity: 0.2; }
          100% { transform: scale(0.95); opacity: 0.8; }
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
