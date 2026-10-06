import { useEffect, useRef, useState, useMemo } from 'react'
import L from 'leaflet'
import type { Shipment } from '../types'
import {
  fetchLiveRouteGeometry,
  calculateBearing,
  calculateDynamicETA,
  calculateRealtimeJourneyTelemetry,
  getShipmentDistanceKm,
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
  const routePolylineRef = useRef<L.Polyline | null>(null)
  const coveredPolylineRef = useRef<L.Polyline | null>(null)
  const vehicleMarkerRef = useRef<L.Marker | null>(null)

  const [activeTileKey, setActiveTileKey] = useState<MapTileKey>('voyager')
  const [routeCoordinates, setRouteCoordinates] = useState<[number, number][]>([])
  
  // Calculate initial metrics
  const totalDistanceKm = useMemo(() => getShipmentDistanceKm(shipment), [shipment])
  
  const initialTelemetry = useMemo(() => {
    return calculateRealtimeJourneyTelemetry(shipment)
  }, [shipment])

  const [currentProgressPct, setCurrentProgressPct] = useState<number>(initialTelemetry.progressPct)
  const [liveCoords, setLiveCoords] = useState<{ lat: number; lng: number }>(() => ({
    lat: shipment.currentLocation?.lat || shipment.origin.lat || 40.6413,
    lng: shipment.currentLocation?.lng || shipment.origin.lng || -73.7781,
  }))

  const [liveSpeed, setLiveSpeed] = useState<string>(initialTelemetry.speedDisplay)
  const [liveAltitude, setLiveAltitude] = useState<string>(() => {
    if (shipment.mode === 'air') return '34,500 FT (FL345)'
    if (shipment.mode === 'sea') return '0 FT (SEA LEVEL)'
    return '640 FT (HIGHWAY)'
  })
  const [headingBearing, setHeadingBearing] = useState<string>('072° ENE')
  const [bearingAngle, setBearingAngle] = useState<number>(0)

  // Dynamic ETA calculation
  const etaInfo = useMemo(() => {
    return calculateDynamicETA(
      totalDistanceKm,
      shipment.mode,
      shipment.createdAt || shipment.bookingDate
    )
  }, [totalDistanceKm, shipment.mode, shipment.createdAt, shipment.bookingDate])

  // 1. Initialize Map Container
  useEffect(() => {
    if (!mapContainerRef.current) return
    if (mapInstanceRef.current) return

    const initialLat = shipment.currentLocation?.lat || shipment.origin.lat || 40.6413
    const initialLng = shipment.currentLocation?.lng || shipment.origin.lng || -73.7781

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
      routePolylineRef.current = null
      coveredPolylineRef.current = null
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
    if (routePolylineRef.current) {
      map.removeLayer(routePolylineRef.current)
      routePolylineRef.current = null
    }
    if (coveredPolylineRef.current) {
      map.removeLayer(coveredPolylineRef.current)
      coveredPolylineRef.current = null
    }

    const startLat = shipment.origin.lat || 40.6413
    const startLng = shipment.origin.lng || -73.7781
    const destLat = shipment.destination.lat || 51.47
    const destLng = shipment.destination.lng || -0.4543

    const startCoord: [number, number] = [startLat, startLng]
    const destCoord: [number, number] = [destLat, destLng]

    // Start Marker (Origin Pin)
    const startIcon = L.divIcon({
      className: 'leaflet-custom-marker-start',
      html: `
        <div style="
          width: 20px;
          height: 20px;
          background-color: #10b981;
          border: 3px solid #ffffff;
          border-radius: 50%;
          box-shadow: 0 2px 10px rgba(0,0,0,0.6);
          position: relative;
        ">
          <div style="
            position: absolute;
            top: -24px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(15, 23, 42, 0.95);
            color: #34d399;
            font-weight: 700;
            font-size: 10px;
            padding: 2px 6px;
            border-radius: 4px;
            white-space: nowrap;
            border: 1px solid rgba(52, 211, 153, 0.4);
            box-shadow: 0 4px 10px rgba(0,0,0,0.5);
          ">ORIGIN: ${shipment.origin.code || 'DEP'}</div>
        </div>
      `,
      iconSize: [20, 20],
      iconAnchor: [10, 10],
    })

    // Destination Marker (Destination Pin)
    const destIcon = L.divIcon({
      className: 'leaflet-custom-marker-dest',
      html: `
        <div style="
          width: 20px;
          height: 20px;
          background-color: #ef4444;
          border: 3px solid #ffffff;
          border-radius: 50%;
          box-shadow: 0 2px 10px rgba(0,0,0,0.6);
          position: relative;
        ">
          <div style="
            position: absolute;
            top: -24px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(15, 23, 42, 0.95);
            color: #f87171;
            font-weight: 700;
            font-size: 10px;
            padding: 2px 6px;
            border-radius: 4px;
            white-space: nowrap;
            border: 1px solid rgba(248, 113, 113, 0.4);
            box-shadow: 0 4px 10px rgba(0,0,0,0.5);
          ">DEST: ${shipment.destination.code || 'ARR'}</div>
        </div>
      `,
      iconSize: [20, 20],
      iconAnchor: [10, 10],
    })

    L.marker(startCoord, { icon: startIcon })
      .addTo(markersGroup)
      .bindPopup(`<b>Origin Hub:</b> ${shipment.origin.name}<br>Lat: ${startLat.toFixed(4)}, Lng: ${startLng.toFixed(4)}`)

    L.marker(destCoord, { icon: destIcon })
      .addTo(markersGroup)
      .bindPopup(`<b>Destination Hub:</b> ${shipment.destination.name}<br>Lat: ${destLat.toFixed(4)}, Lng: ${destLng.toFixed(4)}`)

    // Draw Entire Corridor Polyline (Dashed Path ahead)
    const fullRouteCoords: L.LatLngTuple[] =
      routeCoordinates.length > 0
        ? (routeCoordinates as L.LatLngTuple[])
        : [startCoord, [liveCoords.lat, liveCoords.lng], destCoord]

    const remainingPolyline = L.polyline(fullRouteCoords, {
      color: shipment.isMovementStopped ? '#ea580c' : '#0284c7',
      weight: 4,
      opacity: 0.6,
      dashArray: '8, 8',
      lineCap: 'round',
      lineJoin: 'round',
    }).addTo(map)

    routePolylineRef.current = remainingPolyline

    // Vehicle Icon
    const modeEmoji = shipment.mode === 'air' ? '✈️' : shipment.mode === 'sea' ? '🚢' : '🚚'
    const vehicleIcon = L.divIcon({
      className: 'leaflet-custom-marker-vehicle',
      html: `
        <div id="vehicle-marker-wrapper" style="
          width: 38px;
          height: 38px;
          background-color: ${shipment.isMovementStopped ? '#ea580c' : '#0284c7'};
          border: 3px solid #ffffff;
          border-radius: 50%;
          box-shadow: 0 0 20px ${shipment.isMovementStopped ? 'rgba(234, 88, 12, 0.95)' : 'rgba(2, 132, 199, 0.95)'}, 0 2px 10px rgba(0,0,0,0.5);
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          transition: transform 0.8s ease-in-out;
        ">
          <span style="display:inline-block; transform: rotate(${bearingAngle}deg); transition: transform 0.6s ease;">${modeEmoji}</span>
          <div style="
            position: absolute;
            inset: -6px;
            border: 2px solid ${shipment.isMovementStopped ? '#ea580c' : '#38bdf8'};
            border-radius: 50%;
            animation: pulse-ring 2s cubic-bezier(0.215, 0.61, 0.355, 1) infinite;
          "></div>
          <div style="
            position: absolute;
            bottom: -24px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(15, 23, 42, 0.94);
            color: #ffffff;
            font-weight: 700;
            font-size: 10px;
            padding: 2px 6px;
            border-radius: 4px;
            white-space: nowrap;
            border: 1px solid rgba(56, 189, 248, 0.4);
            box-shadow: 0 4px 12px rgba(0,0,0,0.5);
          ">LIVE: ${shipment.currentLocation?.name || (shipment.status === 'delivered' ? shipment.destination.name : 'In Corridor')}</div>
        </div>
      `,
      iconSize: [38, 38],
      iconAnchor: [19, 19],
    })

    const vMarker = L.marker([liveCoords.lat, liveCoords.lng], { icon: vehicleIcon })
      .addTo(markersGroup)
      .bindPopup(`
        <div style="font-family: inherit; font-size: 12px;">
          <strong style="color: #0284c7; font-size: 13px;">${shipment.carrier} (${shipment.waybill})</strong><br>
          <b>Current Position:</b> ${shipment.currentLocation?.name || 'In Corridor Vector'}<br>
          <b>Live Coordinates:</b> ${liveCoords.lat.toFixed(4)}°N, ${liveCoords.lng.toFixed(4)}°E<br>
          <b>Operator / Linehaul:</b> ${shipment.assignedDriver || 'Linehaul Team'}<br>
          <b>Status:</b> ${shipment.status.toUpperCase()} (${Math.round(currentProgressPct)}%)<br>
          <b>ETA:</b> ${shipment.eta || etaInfo.etaString}
        </div>
      `)

    vehicleMarkerRef.current = vMarker

    // Fit map bounds
    try {
      const bounds = L.latLngBounds([startCoord, [liveCoords.lat, liveCoords.lng], destCoord])
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 11 })
    } catch {
      map.setView([liveCoords.lat, liveCoords.lng], 5)
    }
  }, [shipment, routeCoordinates])

  // 5. Active Movement & Real-time Live Telemetry Animation Engine
  useEffect(() => {
    if (shipment.status === 'delivered') {
      setLiveSpeed('0 km/h (Delivered & Cleared)')
      setHeadingBearing('Terminal Final Arrival')
      setCurrentProgressPct(100)
      if (shipment.destination) {
        setLiveCoords({ lat: shipment.destination.lat, lng: shipment.destination.lng })
        vehicleMarkerRef.current?.setLatLng([shipment.destination.lat, shipment.destination.lng])
      }
      return
    }

    if (shipment.isMovementStopped) {
      setLiveSpeed('0 km/h (Movement Halted by Dispatch)')
      setHeadingBearing(shipment.movementStopReason ? `Hold: ${shipment.movementStopReason}` : 'Stationary Security Hold')
      return
    }

    if (shipment.status === 'pending') {
      setLiveSpeed('0 km/h (Awaiting Intake Dispatch)')
      setHeadingBearing('Staged at Origin Terminal')
      setCurrentProgressPct(5)
      return
    }

    // High-precision smooth animation interval
    const intervalId = setInterval(() => {
      // 1. Calculate live progress based on real-time elapsed duration
      const telemetry = calculateRealtimeJourneyTelemetry(shipment)
      
      // Add subtle real-time forward micro-drift while viewing the page
      const livePct = Math.min(98, telemetry.progressPct + ((Date.now() / 2000) % 2) * 0.15)
      setCurrentProgressPct(livePct)

      // 2. Interpolate coordinates along route geometry
      if (routeCoordinates && routeCoordinates.length >= 2) {
        const totalPoints = routeCoordinates.length
        const targetIndex = Math.min(
          totalPoints - 1,
          Math.max(0, Math.floor((livePct / 100) * totalPoints))
        )
        const currentCoord = routeCoordinates[targetIndex]
        const nextCoord = routeCoordinates[Math.min(totalPoints - 1, targetIndex + 1)]

        if (currentCoord) {
          setLiveCoords({ lat: currentCoord[0], lng: currentCoord[1] })
          
          if (vehicleMarkerRef.current) {
            vehicleMarkerRef.current.setLatLng([currentCoord[0], currentCoord[1]])
          }

          if (nextCoord) {
            const bearing = calculateBearing(currentCoord[0], currentCoord[1], nextCoord[0], nextCoord[1])
            setHeadingBearing(bearing.cardinal)
            setBearingAngle(bearing.degrees)
          }
        }
      }

      // 3. Simulate realistic speed and telemetry fluctuations
      if (shipment.mode === 'air') {
        const spd = 840 + Math.floor(Math.random() * 25)
        setLiveSpeed(`${spd} km/h (Air Corridor FL345)`)
        setLiveAltitude(`${34200 + Math.floor(Math.random() * 500)} FT`)
      } else if (shipment.mode === 'sea') {
        const spd = (20.5 + Math.random() * 2.0).toFixed(1)
        setLiveSpeed(`${spd} knots (Ocean Linehaul)`)
      } else {
        const spd = 76 + Math.floor(Math.random() * 14)
        setLiveSpeed(`${spd} km/h (Highway Linehaul)`)
        setLiveAltitude(`${580 + Math.floor(Math.random() * 80)} FT`)
      }
    }, 2000)

    return () => clearInterval(intervalId)
  }, [shipment, routeCoordinates])

  const handleCenterVehicle = () => {
    if (!mapInstanceRef.current) return
    mapInstanceRef.current.flyTo([liveCoords.lat, liveCoords.lng], 7, { duration: 1.2 })
  }

  const handleFitCorridor = () => {
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
    mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 11 })
  }

  const coveredDistanceKm = Math.round((totalDistanceKm * currentProgressPct) / 100)
  const remainingDistanceKm = Math.max(0, totalDistanceKm - coveredDistanceKm)

  return (
    <div
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

      {/* Floating Top Telemetry HUD */}
      <div
        style={{
          position: 'absolute',
          top: '12px',
          left: '12px',
          right: '12px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '8px',
          zIndex: 1000,
          pointerEvents: 'none',
        }}
      >
        {/* Left Telemetry Card */}
        <div
          style={{
            background: 'rgba(15, 23, 42, 0.94)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: '8px',
            padding: '7px 12px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
            pointerEvents: 'auto',
          }}
        >
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

          <span style={{ color: 'rgba(255,255,255,0.2)' }}>|</span>

          <div style={{ fontSize: '11px', color: '#e2e8f0' }}>
            <span style={{ color: '#94a3b8' }}>Speed:</span>{' '}
            <strong style={{ color: '#38bdf8' }}>{shipment.isMovementStopped ? '0 km/h (Hold)' : liveSpeed}</strong>
          </div>

          <span style={{ color: 'rgba(255,255,255,0.2)' }}>|</span>

          <div style={{ fontSize: '11px', color: '#e2e8f0' }}>
            <span style={{ color: '#94a3b8' }}>Heading:</span>{' '}
            <strong style={{ color: '#f1f5f9' }}>{headingBearing}</strong>
          </div>

          {shipment.mode === 'air' && (
            <>
              <span style={{ color: 'rgba(255,255,255,0.2)' }}>|</span>
              <div style={{ fontSize: '11px', color: '#e2e8f0' }}>
                <span style={{ color: '#94a3b8' }}>Alt:</span>{' '}
                <strong style={{ color: '#facc15' }}>{liveAltitude}</strong>
              </div>
            </>
          )}

          <span style={{ color: 'rgba(255,255,255,0.2)' }}>|</span>

          <div style={{ fontSize: '11px', color: '#e2e8f0' }}>
            <span style={{ color: '#94a3b8' }}>Coords:</span>{' '}
            <strong style={{ color: '#f1f5f9' }}>
              {liveCoords.lat.toFixed(2)}°N, {liveCoords.lng.toFixed(2)}°E
            </strong>
          </div>
        </div>

        {/* Right Controls: Layer Switcher & Camera Fly */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            pointerEvents: 'auto',
          }}
        >
          <div
            style={{
              background: 'rgba(15, 23, 42, 0.94)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '6px',
              padding: '2px',
              display: 'flex',
              gap: '2px',
            }}
          >
            <button
              type="button"
              onClick={() => setActiveTileKey('voyager')}
              style={{
                background: activeTileKey === 'voyager' ? '#0284c7' : 'transparent',
                color: '#ffffff',
                border: 'none',
                borderRadius: '4px',
                padding: '4px 8px',
                fontSize: '10px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              🗺️ Street
            </button>
            <button
              type="button"
              onClick={() => setActiveTileKey('satellite')}
              style={{
                background: activeTileKey === 'satellite' ? '#0284c7' : 'transparent',
                color: '#ffffff',
                border: 'none',
                borderRadius: '4px',
                padding: '4px 8px',
                fontSize: '10px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              🛰️ Satellite
            </button>
            <button
              type="button"
              onClick={() => setActiveTileKey('dark')}
              style={{
                background: activeTileKey === 'dark' ? '#0284c7' : 'transparent',
                color: '#ffffff',
                border: 'none',
                borderRadius: '4px',
                padding: '4px 8px',
                fontSize: '10px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              🌙 Radar
            </button>
          </div>

          <button
            type="button"
            onClick={handleCenterVehicle}
            style={{
              background: 'rgba(15, 23, 42, 0.94)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '6px',
              padding: '6px 10px',
              fontSize: '11px',
              fontWeight: 600,
              color: '#f8fafc',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <span>🎯</span> Center
          </button>

          <button
            type="button"
            onClick={handleFitCorridor}
            style={{
              background: 'rgba(15, 23, 42, 0.94)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '6px',
              padding: '6px 10px',
              fontSize: '11px',
              fontWeight: 600,
              color: '#f8fafc',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <span>🗺️</span> Corridor
          </button>
        </div>
      </div>

      {/* Floating Bottom Progress & ETA Bar */}
      <div
        style={{
          position: 'absolute',
          bottom: '12px',
          left: '12px',
          right: '12px',
          background: 'rgba(15, 23, 42, 0.94)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          borderRadius: '10px',
          padding: '8px 14px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          zIndex: 1000,
          boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: '240px' }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px' }}>
              <span style={{ color: '#94a3b8' }}>
                Progress: <strong style={{ color: '#38bdf8' }}>{Math.round(currentProgressPct)}%</strong>
              </span>
              <span style={{ color: '#cbd5e1' }}>
                {coveredDistanceKm.toLocaleString()} km / {totalDistanceKm.toLocaleString()} km
              </span>
            </div>
            <div style={{ height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '999px', overflow: 'hidden' }}>
              <div
                style={{
                  height: '100%',
                  width: `${currentProgressPct}%`,
                  background: shipment.isMovementStopped
                    ? '#ea580c'
                    : 'linear-gradient(90deg, #0284c7, #38bdf8)',
                  transition: 'width 0.8s ease-in-out',
                }}
              />
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '11px' }}>
          <div>
            <span style={{ color: '#94a3b8' }}>Remaining:</span>{' '}
            <strong style={{ color: '#f8fafc' }}>{remainingDistanceKm.toLocaleString()} km</strong>
          </div>
          <span style={{ color: 'rgba(255,255,255,0.2)' }}>|</span>
          <div>
            <span style={{ color: '#94a3b8' }}>Calculated ETA:</span>{' '}
            <strong style={{ color: '#34d399' }}>{shipment.eta || etaInfo.etaString}</strong>
          </div>
        </div>
      </div>

      {/* Pulse ring animation */}
      <style>{`
        @keyframes pulse-ring {
          0% { transform: scale(0.95); opacity: 0.8; }
          50% { transform: scale(1.4); opacity: 0.2; }
          100% { transform: scale(0.95); opacity: 0.8; }
        }
      `}</style>
    </div>
  )
}
