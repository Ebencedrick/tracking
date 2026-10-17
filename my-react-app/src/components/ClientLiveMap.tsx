import { useEffect, useRef, useState, useMemo, useCallback } from 'react'
import L from 'leaflet'
import {
  Map as MapIcon,
  Globe as GlobeIcon,
  Compass as CompassIcon,
  Crosshair as CrosshairIcon,
  Maximize2 as RouteIcon,
  Clock as ClockIcon,
  Info as InfoIcon,
  Radio as RadioIcon,
  Plane as PlaneIcon,
  Ship as ShipIcon,
  Truck as TruckIcon,
} from 'lucide-react'
import type { Shipment } from '../types'
import {
  fetchLiveRouteGeometry,
  generateCurvedFlightArc,
  calculateDynamicETA,
  calculateRealtimeJourneyTelemetry,
  getShipmentDistanceKm,
  interpolatePositionAlongRoute,
  NORMAL_SPEEDS,
  MAP_TILE_PROVIDERS,
  type MapTileKey,
} from '../utils/mapApis'

function getVehicleIconSvg(mode: string = 'land') {
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

interface ClientLiveMapProps {
  shipment: Shipment
  height?: string
}

export function ClientLiveMap({ shipment, height = '460px' }: ClientLiveMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<L.Map | null>(null)
  const tileLayerRef = useRef<L.TileLayer | null>(null)
  const markersLayerRef = useRef<L.LayerGroup | null>(null)
  const baseCorridorPolylineRef = useRef<L.Polyline | null>(null)
  const coveredPolylineRef = useRef<L.Polyline | null>(null)
  const remainingPolylineRef = useRef<L.Polyline | null>(null)
  const vehicleMarkerRef = useRef<L.Marker | null>(null)

  const [activeTileKey] = useState<MapTileKey>('satellite')
  const [routeCoordinates, setRouteCoordinates] = useState<[number, number][]>(() => {
    if (shipment.routePolyline && shipment.routePolyline.length >= 2) {
      return shipment.routePolyline
    }
    return []
  })
  const [showMobileDetails, setShowMobileDetails] = useState(false)

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

  // 3. Fetch Full Corridor Route Geometry (OSRM real road turn-by-turn or curved flight arc)
  useEffect(() => {
    // If the shipment already has a full precomputed route polyline, use it immediately
    if (shipment.routePolyline && shipment.routePolyline.length >= 2) {
      setRouteCoordinates(shipment.routePolyline)
      return
    }

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
  }, [
    shipment.waybill,
    shipment.routePolyline,
    shipment.origin?.lat,
    shipment.origin?.lng,
    shipment.destination?.lat,
    shipment.destination?.lng,
    shipment.mode,
  ])

  // 4. Render Route Polylines and Waypoint Markers
  useEffect(() => {
    const map = mapInstanceRef.current
    const markersGroup = markersLayerRef.current
    if (!map || !markersGroup || !shipment) return

    markersGroup.clearLayers()
    if (baseCorridorPolylineRef.current) {
      map.removeLayer(baseCorridorPolylineRef.current)
      baseCorridorPolylineRef.current = null
    }
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

    // Start Marker (Origin Pin - Small & Clean)
    const startIcon = L.divIcon({
      className: 'live-map-custom-marker-start',
      html: `
        <div style="
          width: 12px;
          height: 12px;
          background-color: #10b981;
          border: 1.5px solid #ffffff;
          border-radius: 50%;
          box-shadow: 0 0 8px rgba(16, 185, 129, 0.6);
          position: relative;
        ">
          <div class="live-map-pin-label" style="
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
          ">${shipment.origin.code || 'DEP'}</div>
        </div>
      `,
      iconSize: [12, 12],
      iconAnchor: [6, 6],
    })

    // Destination Marker (Destination Pin - Small & Clean)
    const destIcon = L.divIcon({
      className: 'live-map-custom-marker-dest',
      html: `
        <div style="
          width: 12px;
          height: 12px;
          background-color: #f43f5e;
          border: 1.5px solid #ffffff;
          border-radius: 50%;
          box-shadow: 0 0 8px rgba(244, 63, 94, 0.6);
          position: relative;
        ">
          <div class="live-map-pin-label" style="
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
          ">${shipment.destination.code || 'ARR'}</div>
        </div>
      `,
      iconSize: [12, 12],
      iconAnchor: [6, 6],
    })

    L.marker(startCoord, { icon: startIcon })
      .addTo(markersGroup)
      .bindPopup(`
        <div style="font-family: inherit; font-size: 11px; line-height: 1.5; color: #334155; font-weight: 300;">
          <div style="color: #10b981; font-size: 11px; font-weight: 400; margin-bottom: 2px; letter-spacing: 0.02em;">ORIGIN HUB</div>
          <div><span style="color: #64748b; font-weight: 300;">Location:</span> <span style="color: #0f172a; font-weight: 400;">${shipment.origin.name}</span></div>
          <div><span style="color: #64748b; font-weight: 300;">GPS:</span> <span style="color: #0f172a; font-weight: 400;">${startLat.toFixed(3)}°, ${startLng.toFixed(3)}°</span></div>
        </div>
      `)

    L.marker(destCoord, { icon: destIcon })
      .addTo(markersGroup)
      .bindPopup(`
        <div style="font-family: inherit; font-size: 11px; line-height: 1.5; color: #334155; font-weight: 300;">
          <div style="color: #f43f5e; font-size: 11px; font-weight: 400; margin-bottom: 2px; letter-spacing: 0.02em;">DESTINATION HUB</div>
          <div><span style="color: #64748b; font-weight: 300;">Location:</span> <span style="color: #0f172a; font-weight: 400;">${shipment.destination.name}</span></div>
          <div><span style="color: #64748b; font-weight: 300;">GPS:</span> <span style="color: #0f172a; font-weight: 400;">${destLat.toFixed(3)}°, ${destLng.toFixed(3)}°</span></div>
        </div>
      `)

    // Realistic curved/road route coordinates (never a straight line)
    const rawCoords =
      routeCoordinates.length >= 2
        ? routeCoordinates
        : (shipment.routePolyline && shipment.routePolyline.length >= 2
            ? shipment.routePolyline
            : generateCurvedFlightArc(startCoord, destCoord, 80))

    const fraction = currentProgressPct / 100
    const interp = interpolatePositionAlongRoute(rawCoords, fraction)

    // Base corridor route line (subtle guiding track along the realistic curve)
    const baseCorridorLine = L.polyline(rawCoords as L.LatLngTuple[], {
      color: '#63d72a',
      weight: 2,
      opacity: 0.22,
      smoothFactor: 1.2,
      lineCap: 'round',
      lineJoin: 'round',
    }).addTo(map)
    baseCorridorPolylineRef.current = baseCorridorLine

    // Covered path (solid vibrant AtlasTrack green along actual road/arc curve)
    const coveredLine = L.polyline(interp.coveredCoordinates as L.LatLngTuple[], {
      color: shipment.isMovementStopped ? '#ea580c' : '#63d72a',
      weight: 4,
      opacity: 0.95,
      smoothFactor: 1.2,
      lineCap: 'round',
      lineJoin: 'round',
    }).addTo(map)
    coveredPolylineRef.current = coveredLine

    // Remaining path (dashed ahead along actual road/arc curve)
    const remainingLine = L.polyline(interp.remainingCoordinates as L.LatLngTuple[], {
      color: shipment.isMovementStopped ? '#ea580c' : '#63d72a',
      weight: 3,
      opacity: 0.55,
      dashArray: '4, 8',
      smoothFactor: 1.2,
      lineCap: 'round',
      lineJoin: 'round',
    }).addTo(map)
    remainingPolylineRef.current = remainingLine

    // Vehicle Marker Icon (Small, Crisp SVG, Smooth Rotation)
    const vehicleIcon = L.divIcon({
      className: 'live-map-custom-marker-vehicle',
      html: `
        <div id="vehicle-marker-wrapper" style="
          width: 24px;
          height: 24px;
          background: ${shipment.isMovementStopped ? 'linear-gradient(135deg, #c2410c, #ea580c)' : 'linear-gradient(135deg, #15803d, #22c55e)'};
          border: 1.5px solid #ffffff;
          border-radius: 50%;
          box-shadow: 0 0 10px ${shipment.isMovementStopped ? 'rgba(234, 88, 12, 0.7)' : 'rgba(34, 197, 94, 0.7)'}, 0 2px 6px rgba(0,0,0,0.4);
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          <span id="vehicle-icon-rotator" style="display:inline-flex; align-items:center; justify-content:center; transform: rotate(${interp.bearingAngle}deg); transition: transform 0.45s ease-out;">
            ${getVehicleIconSvg(shipment.mode)}
          </span>
          <div style="
            position: absolute;
            inset: -3px;
            border: 1px solid ${shipment.isMovementStopped ? '#ea580c' : '#63d72a'};
            border-radius: 50%;
            animation: pulse-ring 2.2s cubic-bezier(0.215, 0.61, 0.355, 1) infinite;
          "></div>
        </div>
      `,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    })

    const vMarker = L.marker([interp.lat, interp.lng], { icon: vehicleIcon })
      .addTo(markersGroup)
      .bindPopup(`
        <div style="font-family: inherit; font-size: 11px; line-height: 1.5; color: #334155; font-weight: 300; min-width: 170px;">
          <div style="color: #0284c7; font-size: 11px; font-weight: 400; margin-bottom: 2px; letter-spacing: 0.02em;">${shipment.carrier} · ${shipment.waybill}</div>
          <div><span style="color: #64748b; font-weight: 300;">Location:</span> <span style="color: #0f172a; font-weight: 400;">${shipment.currentLocation?.name || 'In Corridor'}</span></div>
          <div><span style="color: #64748b; font-weight: 300;">Speed:</span> <span style="color: #0f172a; font-weight: 400;">${liveSpeedDisplay}</span></div>
          <div><span style="color: #64748b; font-weight: 300;">Status:</span> <span style="color: #0f172a; font-weight: 400;">${shipment.status.toUpperCase()} (${Math.round(currentProgressPct)}%)</span></div>
          <div><span style="color: #64748b; font-weight: 300;">ETA:</span> <span style="color: #0f172a; font-weight: 400;">${shipment.eta || dynamicEtaString}</span></div>
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
          const rotElement = document.getElementById('vehicle-icon-rotator')
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
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                backgroundColor: shipment.isMovementStopped ? '#ea580c' : '#10b981',
                boxShadow: shipment.isMovementStopped ? '0 0 8px #ea580c' : '0 0 8px #10b981',
              }}
            />
            <span
              style={{
                fontSize: '11px',
                fontWeight: 400,
                color: shipment.isMovementStopped ? '#fdba74' : '#6ee7b7',
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
              }}
            >
              {shipment.isMovementStopped ? 'HOLD ACTIVE' : 'LIVE GPS'}
            </span>
          </div>

          <span className="live-map-hud-divider">|</span>

          <div style={{ fontSize: '11px', color: '#e2e8f0', fontWeight: 300 }}>
            <span style={{ color: '#94a3b8' }}>Speed:</span>{' '}
            <span style={{ color: '#38bdf8', fontWeight: 400 }}>{liveSpeedDisplay}</span>
          </div>

          <span className="live-map-hud-divider">|</span>

          <div style={{ fontSize: '11px', color: '#e2e8f0', fontWeight: 300 }}>
            <span style={{ color: '#94a3b8' }}>Heading:</span>{' '}
            <span style={{ color: '#f1f5f9', fontWeight: 400 }}>{bearingCardinal}</span>
          </div>

          <span className="live-map-hud-divider">|</span>

          <div style={{ fontSize: '11px', color: '#e2e8f0', fontWeight: 300 }}>
            <span style={{ color: '#94a3b8' }}>Coords:</span>{' '}
            <span style={{ color: '#f1f5f9', fontWeight: 400 }}>
              {liveCoords.lat.toFixed(2)}°N, {liveCoords.lng.toFixed(2)}°E
            </span>
          </div>
        </div>

        {/* Right Controls: Satellite Badge & Fly Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '10px', color: '#94a3b8', background: 'rgba(15, 23, 42, 0.92)', border: '1px solid rgba(255, 255, 255, 0.12)', borderRadius: '6px', padding: '4px 8px', fontWeight: 300 }}>
            <GlobeIcon size={11} strokeWidth={1.5} style={{ color: '#38bdf8' }} />
            <span>Satellite</span>
          </div>

          <button
            type="button"
            onClick={handleCenterVehicle}
            className="live-map-action-btn"
            title="Center Vehicle"
          >
            <CrosshairIcon size={11} strokeWidth={1.5} />
            Center
          </button>

          <button
            type="button"
            onClick={handleFitCorridor}
            className="live-map-action-btn"
            title="Fit Entire Route Corridor"
          >
            <RouteIcon size={11} strokeWidth={1.5} />
            Corridor
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
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: shipment.isMovementStopped ? '#ea580c' : '#10b981',
              boxShadow: shipment.isMovementStopped ? '0 0 6px #ea580c' : '0 0 6px #10b981',
            }}
          />
          <span style={{ fontWeight: 400, color: shipment.isMovementStopped ? '#fdba74' : '#6ee7b7', fontSize: '10px' }}>
            {shipment.isMovementStopped ? 'HOLD' : 'LIVE'}
          </span>
          <span style={{ color: 'rgba(255,255,255,0.3)' }}>•</span>
          <span style={{ color: '#38bdf8', fontWeight: 300, display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '10.5px' }}>
            {shipment.mode === 'air' ? (
              <PlaneIcon size={11} strokeWidth={1.5} />
            ) : shipment.mode === 'sea' ? (
              <ShipIcon size={11} strokeWidth={1.5} />
            ) : (
              <TruckIcon size={11} strokeWidth={1.5} />
            )}
            {shipment.isMovementStopped ? '0 km/h' : shipment.status === 'pending' ? 'Staged' : '80 km/h'}
          </span>
          <InfoIcon size={10} strokeWidth={1.5} style={{ color: '#94a3b8', marginLeft: '2px' }} />
        </button>

        {/* Floating Quick Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <button
            type="button"
            onClick={handleCenterVehicle}
            className="live-map-mobile-icon-btn"
            title="Center Vehicle"
          >
            <CrosshairIcon size={13} strokeWidth={1.5} />
          </button>

          <button
            type="button"
            onClick={handleFitCorridor}
            className="live-map-mobile-icon-btn"
            title="Fit Route Corridor"
          >
            <RouteIcon size={13} strokeWidth={1.5} />
          </button>
        </div>
      </div>

      {/* Mobile Detailed Specs Drawer Modal */}
      {showMobileDetails && (
        <div className="live-map-mobile-drawer">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ color: '#38bdf8', fontSize: '11px', fontWeight: 400, display: 'flex', alignItems: 'center', gap: '4px' }}>
              <RadioIcon size={12} strokeWidth={1.5} /> Live Consignment Telemetry
            </span>
            <button
              type="button"
              onClick={() => setShowMobileDetails(false)}
              style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '13px', cursor: 'pointer' }}
            >
              ✕
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', fontSize: '11px', fontWeight: 300 }}>
            <div><span style={{ color: '#94a3b8' }}>Speed:</span> <span style={{ color: '#f8fafc', fontWeight: 400 }}>{liveSpeedDisplay}</span></div>
            <div><span style={{ color: '#94a3b8' }}>Heading:</span> <span style={{ color: '#f8fafc', fontWeight: 400 }}>{bearingCardinal}</span></div>
            <div><span style={{ color: '#94a3b8' }}>Vehicle:</span> <span style={{ color: '#f8fafc', fontWeight: 400 }}>{shipment.vehicleId || 'Linehaul 101'}</span></div>
            <div><span style={{ color: '#94a3b8' }}>Driver:</span> <span style={{ color: '#f8fafc', fontWeight: 400 }}>{shipment.assignedDriver || 'Assigned'}</span></div>
            <div style={{ gridColumn: 'span 2' }}>
              <span style={{ color: '#94a3b8' }}>Coords:</span> <span style={{ color: '#f8fafc', fontWeight: 400 }}>{liveCoords.lat.toFixed(4)}°N, {liveCoords.lng.toFixed(4)}°E</span>
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
            <span style={{ color: '#38bdf8', fontSize: '11px', fontWeight: 400 }}>
              {Math.round(currentProgressPct)}% Covered
            </span>
            <span style={{ color: 'rgba(255,255,255,0.2)' }}>•</span>
            <span style={{ color: '#94a3b8', fontSize: '11px', fontWeight: 300 }}>
              {Math.max(0, 100 - Math.round(currentProgressPct))}% To Go
            </span>
            <span style={{ color: 'rgba(255,255,255,0.2)' }}>•</span>
            <span style={{ color: '#34d399', fontSize: '11px', fontWeight: 300 }}>
              {coveredDistanceKm.toLocaleString()} km covered
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ color: '#f8fafc', fontSize: '11px', fontWeight: 300 }}>
              <span style={{ color: '#cbd5e1', fontWeight: 400 }}>{remainingDistanceKm.toLocaleString()} km to destination</span>
            </span>
            <span className="live-map-desktop-only" style={{ color: 'rgba(255,255,255,0.2)' }}>•</span>
            <span className="live-map-desktop-only" style={{ color: '#94a3b8', fontSize: '11px', fontWeight: 300 }}>
              ETA: <span style={{ color: '#34d399', fontWeight: 400 }}>{dynamicEtaString}</span>
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
          <span style={{ display: 'flex', alignItems: 'center', gap: '3px', fontWeight: 300 }}>
            <ClockIcon size={10} strokeWidth={1.5} style={{ color: '#34d399' }} />
            ETA: <span style={{ color: '#34d399', fontWeight: 400 }}>{dynamicEtaString}</span>
          </span>
          <span style={{ fontWeight: 300 }}>{liveSpeedDisplay}</span>
        </div>
      </div>

      {/* Scoped CSS Styles for Fluid Mobile & Desktop Aesthetics */}
      <style>{`
        .client-live-map-wrapper {
          position: relative;
          user-select: none;
        }

        /* Smooth Vehicle Hardware Transition */
        .leaflet-marker-icon.live-map-custom-marker-vehicle {
          transition: transform 0.95s linear !important;
          will-change: transform;
        }
        .leaflet-zoom-anim .leaflet-marker-icon.live-map-custom-marker-vehicle {
          transition: none !important;
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
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 8px;
          padding: 5px 10px;
          display: flex;
          align-items: center;
          gap: 8px;
          box-shadow: 0 4px 16px rgba(0,0,0,0.5);
          pointer-events: auto;
        }

        .live-map-hud-divider {
          color: rgba(255, 255, 255, 0.2);
        }

        .live-map-layer-selector {
          background: rgba(15, 23, 42, 0.92);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.12);
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
          padding: 3px 7px;
          font-size: 10px;
          font-weight: 300;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          transition: all 0.2s ease;
        }

        .live-map-layer-btn.active {
          background: #0284c7;
          color: #ffffff;
          font-weight: 400;
        }

        .live-map-action-btn {
          background: rgba(15, 23, 42, 0.92);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 6px;
          padding: 4px 8px;
          font-size: 10px;
          font-weight: 300;
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
          top: 44px;
          left: 8px;
          right: 8px;
          background: rgba(15, 23, 42, 0.96);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(56, 189, 248, 0.3);
          border-radius: 10px;
          padding: 8px 10px;
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
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 8px;
          padding: 6px 12px;
          z-index: 1000;
          box-shadow: 0 4px 20px rgba(0,0,0,0.5);
          display: flex;
          flex-direction: column;
          gap: 5px;
        }

        .live-map-progress-topline {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 6px;
        }

        .live-map-progress-track {
          height: 4px;
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

        /* Leaflet Popup Styling - Clean & Thin */
        .leaflet-popup-content-wrapper {
          border-radius: 8px !important;
          box-shadow: 0 6px 20px rgba(0,0,0,0.4) !important;
          padding: 2px !important;
        }
        .leaflet-popup-content {
          margin: 8px 10px !important;
          line-height: 1.45 !important;
        }

        /* Responsive Media Queries for Mobile (< 768px) */
        @media (max-width: 768px) {
          .client-live-map-wrapper {
            height: 480px !important;
            min-height: 440px !important;
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
            border: 1px solid rgba(255, 255, 255, 0.15);
            border-radius: 20px;
            padding: 4px 8px;
            display: flex;
            align-items: center;
            gap: 5px;
            font-size: 10px;
            font-weight: 300;
            color: #f8fafc;
            cursor: pointer;
            pointer-events: auto;
            box-shadow: 0 2px 10px rgba(0,0,0,0.5);
          }

          .live-map-mobile-icon-btn {
            background: rgba(15, 23, 42, 0.92);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.15);
            border-radius: 50%;
            width: 28px;
            height: 28px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #cbd5e1;
            cursor: pointer;
            pointer-events: auto;
            box-shadow: 0 2px 8px rgba(0,0,0,0.5);
          }

          .live-map-mobile-layer-menu {
            position: absolute;
            top: 32px;
            right: 0;
            background: rgba(15, 23, 42, 0.96);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.15);
            border-radius: 8px;
            padding: 3px;
            display: flex;
            flex-direction: column;
            gap: 2px;
            z-index: 1002;
            box-shadow: 0 4px 16px rgba(0,0,0,0.6);
            min-width: 90px;
            pointer-events: auto;
          }

          .live-map-mobile-layer-menu button {
            background: transparent;
            color: #cbd5e1;
            border: none;
            border-radius: 4px;
            padding: 5px 7px;
            font-size: 10px;
            font-weight: 300;
            display: flex;
            align-items: center;
            text-align: left;
            cursor: pointer;
          }

          .live-map-mobile-layer-menu button.active {
            background: #0284c7;
            color: #ffffff;
            font-weight: 400;
          }

          .live-map-bottom-progress-hud {
            bottom: 6px;
            left: 6px;
            right: 6px;
            padding: 5px 8px;
            border-radius: 6px;
          }

          .live-map-mobile-bottom-footnote {
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 10px;
            color: #94a3b8;
            font-weight: 300;
            margin-top: 1px;
          }

          .live-map-pin-label {
            font-size: 7.5px !important;
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
