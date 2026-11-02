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
  Copy as CopyIcon,
  Pause as PauseIcon,
  Play as PlayIcon,
  ChevronUp,
  ChevronDown,
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
  getPersistedMapTile,
  setPersistedMapTile,
} from '../utils/mapApis'
import { ALT_70568_884_ROUTE } from '../data/atlastrackRoute'

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

  const [activeTileKey, setActiveTileKeyState] = useState<MapTileKey>(getPersistedMapTile)
  const [isHudMinimized, setIsHudMinimized] = useState(false)

  const handleSelectTile = (key: MapTileKey) => {
    setActiveTileKeyState(key)
    setPersistedMapTile(key)
  }

  // Synchronize when map tile mode changes anywhere across admin or client
  useEffect(() => {
    const handleTileChanged = (e: Event) => {
      const customEvent = e as CustomEvent<MapTileKey>
      if (customEvent.detail && customEvent.detail !== activeTileKey) {
        setActiveTileKeyState(customEvent.detail)
      }
    }
    window.addEventListener('packagepilot_map_tile_changed', handleTileChanged)
    return () => {
      window.removeEventListener('packagepilot_map_tile_changed', handleTileChanged)
    }
  }, [activeTileKey])

  const initialRoute = useMemo<[number, number][]>(() => {
    if (shipment.waybill === 'ALT-70568-884') {
      return ALT_70568_884_ROUTE
    }
    if (shipment.routePolyline && shipment.routePolyline.length >= 2) {
      return shipment.routePolyline
    }
    const startCoord: [number, number] = [
      shipment.origin.lat || 40.6413,
      shipment.origin.lng || -73.7781,
    ]
    const endCoord: [number, number] = [
      shipment.destination.lat || 51.47,
      shipment.destination.lng || -0.4543,
    ]
    return generateCurvedFlightArc(startCoord, endCoord, 80)
  }, [shipment.waybill, shipment.routePolyline, shipment.origin, shipment.destination])

  const [routeCoordinates, setRouteCoordinates] = useState<[number, number][]>(initialRoute)

  useEffect(() => {
    setRouteCoordinates(initialRoute)
  }, [initialRoute])

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
          width: 10px;
          height: 10px;
          background-color: #10b981;
          border: 1.5px solid #ffffff;
          border-radius: 50%;
          box-shadow: 0 0 6px rgba(16, 185, 129, 0.6);
          position: relative;
        ">
          <div class="live-map-pin-label" style="
            position: absolute;
            top: -16px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(15, 23, 42, 0.88);
            color: #6ee7b7;
            font-weight: 400;
            font-size: 7.5px;
            letter-spacing: 0.04em;
            padding: 0.5px 3px;
            border-radius: 3px;
            white-space: nowrap;
            border: 1px solid rgba(52, 211, 153, 0.3);
            pointer-events: none;
          ">${shipment.origin.code || 'DEP'}</div>
        </div>
      `,
      iconSize: [10, 10],
      iconAnchor: [5, 5],
    })

    // Destination Marker (Destination Pin - Small & Clean)
    const destIcon = L.divIcon({
      className: 'live-map-custom-marker-dest',
      html: `
        <div style="
          width: 10px;
          height: 10px;
          background-color: #f43f5e;
          border: 1.5px solid #ffffff;
          border-radius: 50%;
          box-shadow: 0 0 6px rgba(244, 63, 94, 0.6);
          position: relative;
        ">
          <div class="live-map-pin-label" style="
            position: absolute;
            top: -16px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(15, 23, 42, 0.88);
            color: #fda4af;
            font-weight: 400;
            font-size: 7.5px;
            letter-spacing: 0.04em;
            padding: 0.5px 3px;
            border-radius: 3px;
            white-space: nowrap;
            border: 1px solid rgba(244, 63, 94, 0.3);
            pointer-events: none;
          ">${shipment.destination.code || 'ARR'}</div>
        </div>
      `,
      iconSize: [10, 10],
      iconAnchor: [5, 5],
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
      shipment.waybill === 'ALT-70568-884'
        ? ALT_70568_884_ROUTE
        : shipment.routePolyline && shipment.routePolyline.length >= 2
          ? shipment.routePolyline
          : routeCoordinates.length >= 2
            ? routeCoordinates
            : generateCurvedFlightArc(startCoord, destCoord, 80)

    const fraction = Math.min(1, Math.max(0, currentProgressPct / 100))
    const interp = interpolatePositionAlongRoute(rawCoords, fraction)

    // Full Continuous Route Corridor Polyline (Matching Admin Live Tracking: bold, high-visibility #0284c7 corridor)
    const corridorLine = L.polyline(rawCoords as L.LatLngTuple[], {
      color: shipment.isMovementStopped ? '#ea580c' : '#0284c7',
      weight: 5,
      opacity: 0.95,
      smoothFactor: 1.2,
      dashArray: shipment.mode === 'air' ? '6, 6' : undefined,
      lineCap: 'round',
      lineJoin: 'round',
    }).addTo(map)
    baseCorridorPolylineRef.current = corridorLine

    // Covered Progression Path (vibrant sky-blue overlay showing active live progress up to vehicle)
    const coveredLine = L.polyline(interp.coveredCoordinates as L.LatLngTuple[], {
      color: shipment.isMovementStopped ? '#ea580c' : '#38bdf8',
      weight: 5,
      opacity: 0.98,
      smoothFactor: 1.2,
      dashArray: shipment.mode === 'air' ? '6, 6' : undefined,
      lineCap: 'round',
      lineJoin: 'round',
    }).addTo(map)
    coveredPolylineRef.current = coveredLine

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
      const activeRoute = (routeCoordinates && routeCoordinates.length >= 2) ? routeCoordinates : initialRoute
      if (activeRoute && activeRoute.length >= 2) {
        const fraction = pct / 100
        const interp = interpolatePositionAlongRoute(activeRoute, fraction)

        setLiveCoords({ lat: interp.lat, lng: interp.lng })
        setBearingAngle(interp.bearingAngle)
        setBearingCardinal(interp.bearingCardinal)

        // Update Vehicle Marker Position & Bearing with smooth gliding
        if (vehicleMarkerRef.current) {
          vehicleMarkerRef.current.setLatLng([interp.lat, interp.lng])
          const rotElement = document.getElementById('vehicle-icon-rotator')
          if (rotElement) {
            rotElement.style.transform = `rotate(${interp.bearingAngle}deg)`
          }
        }

        // Update live progression along the corridor
        if (coveredPolylineRef.current) {
          coveredPolylineRef.current.setLatLngs(interp.coveredCoordinates as L.LatLngTuple[])
        }
      }
    }, 1000)

    return () => clearInterval(intervalId)
  }, [shipment, routeCoordinates, totalDistanceKm])

  const [toastMessage, setToastMessage] = useState('')
  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(''), 3000)
  }

  const handleCopyWaybill = (code?: string) => {
    const target = code || shipment.waybill
    navigator.clipboard.writeText(target)
    showToast(`Copied waybill ${target} to clipboard!`)
  }

  const renderModeIcon = (m: string = 'land', size = 13) => {
    if (m === 'air') return <PlaneIcon size={size} strokeWidth={1.5} />
    if (m === 'sea') return <ShipIcon size={size} strokeWidth={1.5} />
    return <TruckIcon size={size} strokeWidth={1.5} />
  }

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

      {/* Toast Notification */}
      {toastMessage && (
        <div
          style={{
            position: 'absolute',
            top: '70px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 1050,
            background: 'rgba(15, 23, 42, 0.95)',
            color: '#38bdf8',
            border: '1px solid rgba(56, 189, 248, 0.3)',
            borderRadius: '8px',
            padding: '6px 14px',
            fontSize: '11px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
            backdropFilter: 'blur(8px)',
            pointerEvents: 'none',
          }}
        >
          ✓ {toastMessage}
        </div>
      )}

      {/* Floating Top Telemetry HUD Bar (Compact & Sleek for Clear Map Visibility) */}
      {isHudMinimized ? (
        <button
          type="button"
          onClick={() => setIsHudMinimized(false)}
          className="live-track-hud-minimized-chip"
          title="Click to expand telemetry controls"
        >
          <span className="live-track-dot green" style={{ width: '6px', height: '6px' }} />
          <span className="live-track-hud-code" style={{ fontSize: '0.72rem' }}>
            {shipment.waybill}
          </span>
          <span style={{ fontSize: '0.68rem', color: '#38bdf8', fontWeight: 500 }}>
            {Math.round(currentProgressPct)}%
          </span>
          <span style={{ fontSize: '0.62rem', color: '#94a3b8', display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
            Controls <ChevronDown size={10} />
          </span>
        </button>
      ) : (
        <div className="live-track-hud-bar compact">
          <div className="live-track-hud-left">
            <div className="live-track-hud-main-line">
              <span className="live-track-hud-mode-icon" style={{ display: 'inline-flex', alignItems: 'center' }}>
                {renderModeIcon(shipment.mode, 11)}
              </span>
              <span className="live-track-hud-code" style={{ fontSize: '0.74rem' }}>
                {shipment.waybill}
              </span>
              <button
                type="button"
                className="live-track-hud-copy-btn"
                onClick={() => handleCopyWaybill(shipment.waybill)}
                title="Copy Waybill"
              >
                <CopyIcon size={9} strokeWidth={1.5} />
              </button>
              <span className={`cmd-status-pill ${shipment.status}`}>
                {shipment.status.replace('_', ' ').toUpperCase()}
              </span>
              {shipment.isMovementStopped && (
                <span className="live-track-stopped-badge">
                  <PauseIcon size={8} strokeWidth={1.5} /> HOLD
                </span>
              )}
              <span className="hud-sep">•</span>
              <span className="live-track-hud-corridor">
                {shipment.origin.code || shipment.origin.name.split(',')[0]}
                <span style={{ color: '#94a3b8', margin: '0 3px' }}>→</span>
                {shipment.destination.code || shipment.destination.name.split(',')[0]}
              </span>
              <span className="hud-sep">•</span>
              <span style={{ color: shipment.isMovementStopped ? '#fca5a5' : '#38bdf8', fontSize: '0.68rem', fontWeight: 500 }}>
                {Math.round(currentProgressPct)}% ({coveredDistanceKm.toLocaleString()} KM)
              </span>
            </div>

            {/* Hairline 2px progress bar */}
            <div style={{ marginTop: '3px', width: '100%', height: '2px', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '2px', overflow: 'hidden' }}>
              <div
                style={{
                  width: `${currentProgressPct}%`,
                  height: '100%',
                  background: shipment.isMovementStopped ? '#ef4444' : shipment.status === 'delivered' ? '#10b981' : '#38bdf8',
                  borderRadius: '2px',
                  transition: 'width 0.4s ease',
                }}
              />
            </div>
          </div>

          <div className="live-track-hud-actions">
            {/* Map Layer Switcher: Route / Satellite / Dark */}
            <div className="live-track-tile-group compact">
              <button
                type="button"
                onClick={() => handleSelectTile('voyager')}
                className={`live-track-tile-btn ${activeTileKey === 'voyager' ? 'active' : ''}`}
                title="Route Navigation Map"
              >
                <RouteIcon size={9} strokeWidth={1.5} /> Route
              </button>
              <button
                type="button"
                onClick={() => handleSelectTile('satellite')}
                className={`live-track-tile-btn ${activeTileKey === 'satellite' ? 'active' : ''}`}
                title="Live Satellite Map"
              >
                <GlobeIcon size={9} strokeWidth={1.5} /> Sat
              </button>
              <button
                type="button"
                onClick={() => handleSelectTile('dark')}
                className={`live-track-tile-btn ${activeTileKey === 'dark' ? 'active' : ''}`}
                title="Tactical Dark Radar Map"
              >
                <CompassIcon size={9} strokeWidth={1.5} /> Dark
              </button>
            </div>

            {/* Map Telemetry Group */}
            <div className="live-track-btn-group">
              <button
                type="button"
                className="live-track-hud-btn"
                onClick={handleCenterVehicle}
                title="Focus map on Vehicle"
              >
                <CrosshairIcon size={9} strokeWidth={1.5} /> Vehicle
              </button>
              <button
                type="button"
                className="live-track-hud-btn"
                onClick={handleFitCorridor}
                title="Fit whole Route Corridor"
              >
                <RouteIcon size={9} strokeWidth={1.5} /> Route
              </button>
              <button
                type="button"
                className="live-track-hud-btn minimize"
                onClick={() => setIsHudMinimized(true)}
                title="Minimize overlay for 100% full clear map view"
              >
                <ChevronUp size={10} strokeWidth={1.5} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Bottom-Left Micro Legend (Unobtrusive) */}
      <div className="live-track-legend compact">
        <div className="live-track-legend-item">
          <span className="live-track-dot green" />
          <span>Origin</span>
        </div>
        <div className="live-track-legend-item">
          <span className="live-track-dot blue" />
          <span>Vehicle</span>
        </div>
        <div className="live-track-legend-item">
          <span className="live-track-dot red" />
          <span>Destination</span>
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

        /* Floating Top Telemetry HUD Bar (Compact & Sleek for Clear Map Visibility) */
        .live-track-hud-bar.compact {
          position: absolute;
          top: 8px;
          left: 8px;
          right: 8px;
          background: rgba(15, 23, 42, 0.88);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 8px;
          padding: 4px 8px;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
          z-index: 500;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 6px;
          flex-wrap: wrap;
          transition: all 0.2s ease;
        }

        .live-track-hud-minimized-chip {
          position: absolute;
          top: 8px;
          left: 8px;
          background: rgba(15, 23, 42, 0.88);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 6px;
          padding: 3px 8px;
          z-index: 500;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          box-shadow: 0 4px 14px rgba(0,0,0,0.35);
          transition: all 0.2s ease;
          border: none;
        }
        .live-track-hud-minimized-chip:hover {
          background: rgba(30, 41, 59, 0.95);
          border-color: #38bdf8;
        }

        .live-track-hud-left {
          display: flex;
          flex-direction: column;
          gap: 2px;
          min-width: 0;
        }

        .live-track-hud-main-line {
          display: flex;
          align-items: center;
          gap: 5px;
          flex-wrap: wrap;
        }

        .hud-sep {
          color: rgba(255, 255, 255, 0.2);
          font-size: 0.65rem;
        }

        .live-track-hud-mode-icon {
          font-size: 0.85rem;
          color: #38bdf8;
          display: inline-flex;
          align-items: center;
        }

        .live-track-hud-code {
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          font-size: 0.74rem;
          font-weight: 500;
          color: #ffffff;
          letter-spacing: 0.02em;
        }

        .live-track-hud-copy-btn {
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.12);
          color: #94a3b8;
          border-radius: 4px;
          padding: 1px 4px;
          font-size: 0.65rem;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          transition: all 0.15s ease;
        }
        .live-track-hud-copy-btn:hover {
          background: rgba(255, 255, 255, 0.2);
          color: #ffffff;
        }

        .cmd-status-pill {
          padding: 1px 5px;
          border-radius: 8px;
          font-size: 0.6rem;
          letter-spacing: 0.03em;
          text-transform: uppercase;
          font-weight: 500;
        }

        .cmd-status-pill.in_transit,
        .cmd-status-pill.in-transit {
          background: rgba(2, 132, 199, 0.25);
          color: #38bdf8;
          border: 1px solid rgba(56, 189, 248, 0.4);
        }

        .cmd-status-pill.delivered {
          background: rgba(16, 185, 129, 0.25);
          color: #34d399;
          border: 1px solid rgba(52, 211, 153, 0.4);
        }

        .cmd-status-pill.pending {
          background: rgba(234, 179, 8, 0.25);
          color: #fde047;
          border: 1px solid rgba(253, 224, 71, 0.4);
        }

        .cmd-status-pill.on_hold,
        .cmd-status-pill.delayed {
          background: rgba(239, 68, 68, 0.25);
          color: #fca5a5;
          border: 1px solid rgba(252, 165, 165, 0.4);
        }

        .live-track-stopped-badge {
          background-color: #ea580c;
          color: #ffffff;
          font-size: 0.58rem;
          font-weight: 500;
          padding: 1px 4px;
          border-radius: 10px;
          letter-spacing: 0.03em;
          animation: pulse-ring 2s infinite;
          display: inline-flex;
          align-items: center;
          gap: 2px;
        }

        .live-track-hud-corridor {
          color: #cbd5e1;
          font-size: 0.68rem;
          font-weight: 400;
        }

        .live-track-hud-actions {
          display: flex;
          align-items: center;
          gap: 4px;
          flex-shrink: 0;
        }

        .live-track-tile-group.compact {
          display: inline-flex;
          background: rgba(15, 23, 42, 0.9);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 5px;
          padding: 1px;
          gap: 1px;
        }

        .live-track-tile-btn {
          background: transparent;
          color: #94a3b8;
          border: none;
          border-radius: 3px;
          padding: 2px 5px;
          font-size: 8.5px;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 2px;
          transition: all 0.15s ease;
        }
        .live-track-tile-btn:hover {
          color: #ffffff;
        }
        .live-track-tile-btn.active {
          background: #0284c7;
          color: #ffffff;
        }

        .live-track-btn-group {
          display: inline-flex;
          align-items: center;
          gap: 3px;
        }

        .live-track-hud-btn {
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 8.5px;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.15);
          color: #e2e8f0;
          cursor: pointer;
          transition: all 0.15s ease;
          white-space: nowrap;
          display: inline-flex;
          align-items: center;
          gap: 2px;
        }
        .live-track-hud-btn:hover {
          background: rgba(255, 255, 255, 0.2);
          color: #ffffff;
        }
        .live-track-hud-btn.minimize {
          padding: 2px 4px;
          color: #94a3b8;
        }

        /* Floating Bottom-Left Micro Legend */
        .live-track-legend.compact {
          position: absolute;
          bottom: 8px;
          left: 8px;
          background: rgba(15, 23, 42, 0.72);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          border-radius: 5px;
          padding: 2px 6px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.25);
          z-index: 500;
          display: flex;
          flex-direction: row;
          align-items: center;
          gap: 6px;
          font-size: 0.6rem;
          color: #cbd5e1;
          border: 1px solid rgba(255, 255, 255, 0.1);
          pointer-events: none;
        }

        .live-track-legend-item {
          display: flex;
          align-items: center;
          gap: 3px;
        }

        .live-track-dot {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          display: inline-block;
        }

        .live-track-dot.green {
          background-color: #10b981;
          box-shadow: 0 0 4px rgba(16, 185, 129, 0.6);
        }

        .live-track-dot.blue {
          background-color: #0284c7;
          box-shadow: 0 0 4px rgba(2, 132, 199, 0.6);
        }

        .live-track-dot.red {
          background-color: #ef4444;
          box-shadow: 0 0 4px rgba(239, 68, 68, 0.6);
        }

        /* Leaflet Popup Styling */
        .leaflet-popup-content-wrapper {
          border-radius: 8px !important;
          box-shadow: 0 6px 20px rgba(0,0,0,0.4) !important;
          padding: 2px !important;
        }
        .leaflet-popup-content {
          margin: 8px 10px !important;
          line-height: 1.45 !important;
        }

        @media (max-width: 768px) {
          .live-track-hud-bar.compact {
            top: 4px;
            left: 4px;
            right: 4px;
            padding: 3px 6px;
            gap: 4px;
          }

          .live-track-hud-code {
            font-size: 0.7rem;
          }

          .live-track-hud-corridor {
            font-size: 0.64rem;
          }

          .live-track-legend.compact {
            bottom: 4px;
            left: 4px;
            padding: 2px 5px;
            font-size: 0.58rem;
            gap: 4px;
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
