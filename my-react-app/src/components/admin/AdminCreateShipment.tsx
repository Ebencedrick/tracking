import { useEffect, useMemo, useRef, useState, type FormEvent, type ChangeEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import L from 'leaflet'
import { useShipments } from '../../context/ShipmentContext'
import type { Shipment, ShipmentStatus, ShippingMode } from '../../types'
import { WaybillLabelModal } from './WaybillLabelModal'
import {
  searchLiveGeocode,
  lookupKnownHub,
  fetchLiveRouteGeometry,
  calculateHaversineDistance,
  calculateDynamicETA,
  MAP_TILE_PROVIDERS,
  type MapTileKey,
} from '../../utils/mapApis'


export function AdminCreateShipment() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const editWaybill = searchParams.get('edit')

  const { carriers, createShipment, updateShipment, generateWaybillCode, getShipment, shipments } = useShipments()

  // Find existing shipment if in edit mode
  const existingShipment = useMemo(() => {
    if (!editWaybill) return undefined
    return getShipment(editWaybill) || shipments.find((s) => s.waybill === editWaybill)
  }, [editWaybill, getShipment, shipments])

  const isEditMode = Boolean(editWaybill && existingShipment)

  // Creation Popup Modal State
  const [createdShipmentModal, setCreatedShipmentModal] = useState<Shipment | null>(null)
  const [isCopiedTracking, setIsCopiedTracking] = useState(false)
  const [shareReceiptStatus, setShareReceiptStatus] = useState('')
  const [printModalWaybill, setPrintModalWaybill] = useState<string | null>(null)

  // Sender Details
  const [senderName, setSenderName] = useState(existingShipment?.senderName || 'Apex International Logistics')
  const [senderEmail, setSenderEmail] = useState(existingShipment?.senderEmail || 'dispatch@apexlogistics.com')
  const [senderPhone, setSenderPhone] = useState(existingShipment?.senderPhone || '+1 (555) 234-8901')

  // Receiver Details
  const [receiverName, setReceiverName] = useState(existingShipment?.receiverName || existingShipment?.clientName || 'Source Cards TCG')
  const [receiverEmail, setReceiverEmail] = useState(existingShipment?.receiverEmail || existingShipment?.clientEmail || 'info@sourcecardstcg.com')
  const [receiverPhone, setReceiverPhone] = useState(existingShipment?.receiverPhone || '+63 2 8888 1234')

  // Origin / Start Location
  const [originName, setOriginName] = useState(existingShipment?.origin.name || 'New York Worldport Gateway (JFK)')
  const [originLat, setOriginLat] = useState(existingShipment?.origin.lat ?? 40.6413)
  const [originLng, setOriginLng] = useState(existingShipment?.origin.lng ?? -73.7781)

  // Destination / End Location
  const [destName, setDestName] = useState(existingShipment?.destination.name || 'London Heathrow Cargo Center (LHR)')
  const [destLat, setDestLat] = useState(existingShipment?.destination.lat ?? 51.47)
  const [destLng, setDestLng] = useState(existingShipment?.destination.lng ?? -0.4543)

  // Geocoding live status
  const [isGeocodingOrigin, setIsGeocodingOrigin] = useState(false)
  const [isGeocodingDest, setIsGeocodingDest] = useState(false)
  const [geocodeFeedback, setGeocodeFeedback] = useState<string | null>(null)

  // Auto-geocode origin with debounce when text changes
  useEffect(() => {
    if (!originName.trim()) return
    // Instant check in encyclopedia first
    const instant = lookupKnownHub(originName)
    if (instant) {
      setOriginLat(instant.lat)
      setOriginLng(instant.lng)
      setGeocodeFeedback(`✓ Origin verified: [${instant.lat.toFixed(4)}, ${instant.lng.toFixed(4)}] (${instant.displayName})`)
      return
    }

    const timer = setTimeout(async () => {
      try {
        const results = await searchLiveGeocode(originName)
        if (results.length > 0) {
          const top = results[0]
          setOriginLat(top.lat)
          setOriginLng(top.lng)
          setGeocodeFeedback(`✓ Origin verified: [${top.lat.toFixed(4)}, ${top.lng.toFixed(4)}] (${top.displayName.slice(0, 45)}...)`)
        }
      } catch {}
    }, 500)
    return () => clearTimeout(timer)
  }, [originName])

  // Auto-geocode destination with debounce when text changes
  useEffect(() => {
    if (!destName.trim()) return
    // Instant check in encyclopedia first
    const instant = lookupKnownHub(destName)
    if (instant) {
      setDestLat(instant.lat)
      setDestLng(instant.lng)
      setGeocodeFeedback(`✓ Destination verified: [${instant.lat.toFixed(4)}, ${instant.lng.toFixed(4)}] (${instant.displayName})`)
      return
    }

    const timer = setTimeout(async () => {
      try {
        const results = await searchLiveGeocode(destName)
        if (results.length > 0) {
          const top = results[0]
          setDestLat(top.lat)
          setDestLng(top.lng)
          setGeocodeFeedback(`✓ Destination verified: [${top.lat.toFixed(4)}, ${top.lng.toFixed(4)}] (${top.displayName.slice(0, 45)}...)`)
        }
      } catch {}
    }, 500)
    return () => clearTimeout(timer)
  }, [destName])

  // Map Tile Layer state
  const [activeTileKey, setActiveTileKey] = useState<MapTileKey>('voyager')

  // Package Image
  const [imageUrl, setImageUrl] = useState('')
  const [imagePreview, setImagePreview] = useState<string | null>(
    existingShipment?.packageImageUrl ||
      'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=600&q=80'
  )

  // Carrier, Scope, and Status
  const [carrierName, setCarrierName] = useState(existingShipment?.carrier || carriers[0]?.name || 'DHL Express')
  const [shippingMode, setShippingMode] = useState<ShippingMode>(existingShipment?.mode || 'air')
  const [transportScope, setTransportScope] = useState<'Domestic' | 'Regional' | 'International'>(
    existingShipment?.transportScope || 'International'
  )
  const [shipmentStatus, setShipmentStatus] = useState<ShipmentStatus>(existingShipment?.status || 'pending')

  // Cargo Specifics
  const [cargoType, setCargoType] = useState(existingShipment?.cargoType || 'Commercial Electronics & Collectibles')
  const [bookingDate, setBookingDate] = useState(existingShipment?.bookingDate || new Date().toISOString().slice(0, 16))
  const [driverName, setDriverName] = useState(existingShipment?.assignedDriver || 'Amina Bello')
  const [vehicleId, setVehicleId] = useState(existingShipment?.vehicleId || 'VEH-101')
  const [weightKg, setWeightKg] = useState(existingShipment?.weightKg ?? 14.5)
  const [packageCount, setPackageCount] = useState(existingShipment?.packageCount ?? 1)
  const [declaredValue, setDeclaredValue] = useState(existingShipment?.declaredValue ?? 3200)
  const [serviceTier, setServiceTier] = useState(existingShipment?.serviceTier || 'STANDARD')
  const [customRate, setCustomRate] = useState<number>(existingShipment?.rate ?? 120.0)

  // Computed distance based on coordinates
  const calculatedDistance = useMemo(() => {
    return Math.round(calculateHaversineDistance(originLat, originLng, destLat, destLng))
  }, [originLat, originLng, destLat, destLng])

  const [customDistance, setCustomDistance] = useState<number>(existingShipment?.estimatedDistanceKm ?? (calculatedDistance || 5560))

  const autoCalculatedEta = useMemo(() => {
    return calculateDynamicETA(customDistance || calculatedDistance || 5000, shippingMode, bookingDate)
  }, [customDistance, calculatedDistance, shippingMode, bookingDate])

  const [etaSchedule, setEtaSchedule] = useState(existingShipment?.eta || autoCalculatedEta.etaString)


  useEffect(() => {
    if (!existingShipment) {
      setCustomDistance(calculatedDistance)
      setEtaSchedule(autoCalculatedEta.etaString)
    }
  }, [calculatedDistance, autoCalculatedEta.etaString, existingShipment])


  // Sync state if existingShipment loads or changes
  useEffect(() => {
    if (existingShipment) {
      setSenderName(existingShipment.senderName || 'Apex International Logistics')
      setSenderEmail(existingShipment.senderEmail || 'dispatch@apexlogistics.com')
      setSenderPhone(existingShipment.senderPhone || '+1 (555) 234-8901')
      setReceiverName(existingShipment.receiverName || existingShipment.clientName || 'Source Cards TCG')
      setReceiverEmail(existingShipment.receiverEmail || existingShipment.clientEmail || 'info@sourcecardstcg.com')
      setReceiverPhone(existingShipment.receiverPhone || '+63 2 8888 1234')
      setOriginName(existingShipment.origin.name)
      setOriginLat(existingShipment.origin.lat ?? 40.6413)
      setOriginLng(existingShipment.origin.lng ?? -73.7781)
      setDestName(existingShipment.destination.name)
      setDestLat(existingShipment.destination.lat ?? 51.47)
      setDestLng(existingShipment.destination.lng ?? -0.4543)
      setCarrierName(existingShipment.carrier)
      setShippingMode(existingShipment.mode)
      setTransportScope(existingShipment.transportScope || 'International')
      setShipmentStatus(existingShipment.status)
      setCargoType(existingShipment.cargoType || 'Commercial Electronics')
      setDriverName(existingShipment.assignedDriver || 'Amina Bello')
      setVehicleId(existingShipment.vehicleId || 'VEH-101')
      setWeightKg(existingShipment.weightKg)
      setPackageCount(existingShipment.packageCount)
      setDeclaredValue(existingShipment.declaredValue)
      setEtaSchedule(existingShipment.eta)
      setServiceTier(existingShipment.serviceTier || 'STANDARD')
      setCustomRate(existingShipment.rate)
      if (existingShipment.packageImageUrl) {
        setImagePreview(existingShipment.packageImageUrl)
      }
    }
  }, [existingShipment])

  // Leaflet Live Map Integration
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<L.Map | null>(null)
  const tileLayerRef = useRef<L.TileLayer | null>(null)
  const markersLayerRef = useRef<L.LayerGroup | null>(null)
  const routePolylineRef = useRef<L.Polyline | null>(null)

  useEffect(() => {
    if (!mapContainerRef.current) return
    if (mapInstanceRef.current) return

    const map = L.map(mapContainerRef.current, {
      zoomControl: true,
      attributionControl: false,
    }).setView([originLat, originLng], 4)

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
    }
  }, [])

  // Switch Tile Layers dynamically
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

  // Live Geocoding Handlers (OpenStreetMap Nominatim Live API)
  const handleGeocodeOrigin = async () => {
    if (!originName.trim()) return
    setIsGeocodingOrigin(true)
    setGeocodeFeedback('Querying Google Maps & Live Geocoding APIs for Origin...')
    try {
      const results = await searchLiveGeocode(originName)
      if (results.length > 0) {
        const top = results[0]
        setOriginLat(top.lat)
        setOriginLng(top.lng)
        const srcTag = top.source ? ` [${top.source}]` : ''
        setGeocodeFeedback(`✓ Origin Geocoded${srcTag}: [${top.lat.toFixed(4)}, ${top.lng.toFixed(4)}] (${top.displayName.slice(0, 45)}...)`)
      } else {
        setGeocodeFeedback(`⚠️ Could not geocode "${originName}". Please verify spelling or adjust coordinates manually.`)
      }
    } catch {
      setGeocodeFeedback('⚠️ Geocoding API temporary timeout. Fallback coordinates active.')
    } finally {
      setIsGeocodingOrigin(false)
      setTimeout(() => setGeocodeFeedback(null), 5000)
    }
  }

  const handleGeocodeDest = async () => {
    if (!destName.trim()) return
    setIsGeocodingDest(true)
    setGeocodeFeedback('Querying Google Maps & Live Geocoding APIs for Destination...')
    try {
      const results = await searchLiveGeocode(destName)
      if (results.length > 0) {
        const top = results[0]
        setDestLat(top.lat)
        setDestLng(top.lng)
        const srcTag = top.source ? ` [${top.source}]` : ''
        setGeocodeFeedback(`✓ Destination Geocoded${srcTag}: [${top.lat.toFixed(4)}, ${top.lng.toFixed(4)}] (${top.displayName.slice(0, 45)}...)`)
      } else {
        setGeocodeFeedback(`⚠️ Could not geocode "${destName}". Please verify spelling or adjust coordinates manually.`)
      }
    } catch {
      setGeocodeFeedback('⚠️ Geocoding API temporary timeout. Fallback coordinates active.')
    } finally {
      setIsGeocodingDest(false)
      setTimeout(() => setGeocodeFeedback(null), 5000)
    }
  }

  // Update Route on Map when Coordinates Change (OSRM Road or Great-Circle Arc)
  useEffect(() => {
    const map = mapInstanceRef.current
    const markersGroup = markersLayerRef.current
    if (!map || !markersGroup) return

    markersGroup.clearLayers()
    if (routePolylineRef.current) {
      map.removeLayer(routePolylineRef.current)
      routePolylineRef.current = null
    }

    const startCoord: [number, number] = [originLat, originLng]
    const destCoord: [number, number] = [destLat, destLng]

    // Start Icon
    const startIcon = L.divIcon({
      className: 'leaflet-custom-marker-start',
      html: `
        <div style="
          width: 16px;
          height: 16px;
          background-color: #10b981;
          border: 3px solid #ffffff;
          border-radius: 50%;
          box-shadow: 0 2px 8px rgba(0,0,0,0.4);
        "></div>
      `,
      iconSize: [16, 16],
      iconAnchor: [8, 8],
    })

    // Destination Icon
    const destIcon = L.divIcon({
      className: 'leaflet-custom-marker-dest',
      html: `
        <div style="
          width: 16px;
          height: 16px;
          background-color: #ef4444;
          border: 3px solid #ffffff;
          border-radius: 50%;
          box-shadow: 0 2px 8px rgba(0,0,0,0.4);
        "></div>
      `,
      iconSize: [16, 16],
      iconAnchor: [8, 8],
    })

    const startMarker = L.marker(startCoord, { icon: startIcon }).bindPopup(
      `<b>🟢 Start Origin:</b> ${originName}<br/>Lat: ${originLat.toFixed(4)}, Lng: ${originLng.toFixed(4)}`
    )

    const destMarker = L.marker(destCoord, { icon: destIcon }).bindPopup(
      `<b>🔴 Destination Hub:</b> ${destName}<br/>Lat: ${destLat.toFixed(4)}, Lng: ${destLng.toFixed(4)}`
    )

    markersGroup.addLayer(startMarker)
    markersGroup.addLayer(destMarker)

    // Calculate real corridor route geometry
    let isCancelled = false
    fetchLiveRouteGeometry(startCoord, destCoord, shippingMode).then((res) => {
      if (isCancelled || !map) return
      
      const polyline = L.polyline(res.coordinates, {
        color: '#0284c7',
        weight: 3.5,
        opacity: 0.9,
        dashArray: '6, 6',
      }).addTo(map)
      routePolylineRef.current = polyline

      try {
        const bounds = L.latLngBounds([startCoord, destCoord])
        map.fitBounds(bounds, { padding: [60, 60], maxZoom: 10 })
      } catch {
        // ignore
      }
    })

    return () => {
      isCancelled = true
    }
  }, [originLat, originLng, destLat, destLng, originName, destName, shippingMode])

  // Handle local image upload
  const handleImageFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        const result = reader.result as string
        setImagePreview(result)
        setImageUrl('')
      }
      reader.readAsDataURL(file)
    }
  }

  const handleImageUrlChange = (url: string) => {
    setImageUrl(url)
    if (url.trim()) {
      setImagePreview(url.trim())
    }
  }

  // Quick preset corridor buttons
  const applyPresetCorridor = (
    oName: string,
    oLat: number,
    oLng: number,
    dName: string,
    dLat: number,
    dLng: number
  ) => {
    setOriginName(oName)
    setOriginLat(oLat)
    setOriginLng(oLng)
    setDestName(dName)
    setDestLat(dLat)
    setDestLng(dLng)
  }

  const handleResetFormForNew = () => {
    setCreatedShipmentModal(null)
    setOriginName('New York Worldport Gateway (JFK)')
    setOriginLat(40.6413)
    setOriginLng(-73.7781)
    setDestName('London Heathrow Cargo Center (LHR)')
    setDestLat(51.47)
    setDestLng(-0.4543)
    setReceiverName('')
    setReceiverEmail('')
    setReceiverPhone('')
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()

    const selectedCarrierObj = carriers.find((c) => c.name === carrierName)

    let finalOriginLat = originLat
    let finalOriginLng = originLng
    let finalDestLat = destLat
    let finalDestLng = destLng

    // Fallback checks from encyclopedia
    const geoOrig = lookupKnownHub(originName)
    if (geoOrig && (originLat === 40.6413 || originLat === 0)) {
      finalOriginLat = geoOrig.lat
      finalOriginLng = geoOrig.lng
    }
    const geoDest = lookupKnownHub(destName)
    if (geoDest && (destLat === 51.47 || destLat === 0)) {
      finalDestLat = geoDest.lat
      finalDestLng = geoDest.lng
    }

    if (isEditMode && editWaybill) {
      // UPDATE EXISTING SHIPMENT
      updateShipment(editWaybill, {
        carrier: carrierName,
        carrierCode: selectedCarrierObj?.code || 'EXP',
        mode: shippingMode,
        origin: {
          name: originName,
          code: originName.slice(0, 3).toUpperCase(),
          lat: finalOriginLat,
          lng: finalOriginLng,
        },
        destination: {
          name: destName,
          code: destName.slice(0, 3).toUpperCase(),
          lat: finalDestLat,
          lng: finalDestLng,
        },
        currentLocation: {
          name: shipmentStatus === 'delivered' ? destName : originName,
          lat: finalOriginLat,
          lng: finalOriginLng,
        },
        status: shipmentStatus,
        statusNote: `Updated via dispatch studio. Status: ${shipmentStatus}`,
        weightKg,
        packageCount,
        declaredValue,
        clientName: receiverName,
        clientEmail: receiverEmail,
        clientReference: receiverEmail || senderEmail,
        rate: customRate,
        eta: etaSchedule,
        assignedDriver: driverName,
        vehicleId,
        senderName,
        senderEmail,
        senderPhone,
        receiverName,
        receiverEmail,
        receiverPhone,
        packageImageUrl: imagePreview || undefined,
        transportScope,
        cargoType,
        bookingDate,
        estimatedDistanceKm: customDistance,
        serviceTier,
      })

      navigate('/admin/shipments')
    } else {
      // CREATE NEW SHIPMENT & SYNC TO MONGODB
      const code = generateWaybillCode()

      const newShipment = createShipment({
        waybill: code,
        carrier: carrierName,
        carrierCode: selectedCarrierObj?.code || 'EXP',
        mode: shippingMode,
        origin: {
          name: originName,
          code: originName.slice(0, 3).toUpperCase(),
          lat: finalOriginLat,
          lng: finalOriginLng,
        },
        destination: {
          name: destName,
          code: destName.slice(0, 3).toUpperCase(),
          lat: finalDestLat,
          lng: finalDestLng,
        },
        currentLocation: {
          name: shipmentStatus === 'delivered' ? destName : originName,
          lat: finalOriginLat,
          lng: finalOriginLng,
        },
        status: shipmentStatus,
        statusNote: shipmentStatus === 'pending'
          ? 'Pending dispatch approval. Manifest logged into MongoDB Atlas database.'
          : `Consignment active. Scope: ${transportScope}`,
        weightKg,
        packageCount,
        declaredValue,
        clientName: receiverName,
        clientEmail: receiverEmail,
        clientReference: receiverEmail || senderEmail,
        rate: customRate,
        eta: etaSchedule,
        assignedDriver: driverName,
        vehicleId,
        senderName,
        senderEmail,
        senderPhone,
        receiverName,
        receiverEmail,
        receiverPhone,
        packageImageUrl: imagePreview || undefined,
        transportScope,
        cargoType,
        bookingDate,
        estimatedDistanceKm: customDistance,
        serviceTier,
        isCustomerBooking: true,
        progressPct: shipmentStatus === 'delivered' ? 100 : shipmentStatus === 'in_transit' ? 35 : 10,
      })

      // Pop up the confirmation modal with tracking number!
      setCreatedShipmentModal(newShipment)
    }
  }

  return (
    <div className="create-shipment-full-page">
      {/* Top Header */}
      <div className="create-shipment-header">
        <div>
          <Link to="/admin/shipments" className="create-shipment-back-link">
            ← Back to Shipments & Bookings
          </Link>
          <h1 className="create-shipment-title">
            {isEditMode ? `Edit Freight Consignment (${editWaybill})` : 'Create Freight Consignment'}
          </h1>
          <p className="create-shipment-subtitle">
            {isEditMode
              ? `Update consignee credentials, corridor routing, cargo specifications, and manual rate overrides for ${editWaybill}.`
              : 'Configure sender/receiver credentials, corridor coordinates, live interactive route preview, and carrier assignment.'}
          </p>
        </div>

        <div className="create-shipment-header-actions">
          <Link to="/admin/shipments" className="cmd-btn cmd-btn-white">
            Cancel
          </Link>
          <button type="submit" form="create-shipment-form" className="cmd-btn cmd-btn-red">
            {isEditMode ? '💾 Update Shipment' : '+ Create Shipment'}
          </button>
        </div>
      </div>

      <form id="create-shipment-form" onSubmit={handleSubmit} className="create-shipment-form-body">
        {/* Section 1: Sender & Receiver Details (2 Columns) */}
        <div className="create-shipment-section-card">
          <div className="create-shipment-card-title">
            <span className="create-shipment-badge-step">1</span>
            <h3>Sender & Receiver Credentials</h3>
          </div>

          <div className="create-shipment-grid-2">
            {/* Sender Column */}
            <div className="create-shipment-subpanel">
              <h4 className="create-shipment-subpanel-title">
                <span>📤 Sender (Origin Party)</span>
              </h4>

              <div className="cmd-form-group">
                <label className="cmd-form-label">Sender Full Name / Company</label>
                <input
                  type="text"
                  className="cmd-input"
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  placeholder="e.g. Apex International Logistics"
                  required
                />
              </div>

              <div className="cmd-form-group">
                <label className="cmd-form-label">Sender Email Address</label>
                <input
                  type="email"
                  className="cmd-input"
                  value={senderEmail}
                  onChange={(e) => setSenderEmail(e.target.value)}
                  placeholder="e.g. dispatch@apexlogistics.com"
                  required
                />
              </div>

              <div className="cmd-form-group">
                <label className="cmd-form-label">Sender Phone Number</label>
                <input
                  type="tel"
                  className="cmd-input"
                  value={senderPhone}
                  onChange={(e) => setSenderPhone(e.target.value)}
                  placeholder="e.g. +1 (555) 234-8901"
                  required
                />
              </div>
            </div>

            {/* Receiver Column */}
            <div className="create-shipment-subpanel">
              <h4 className="create-shipment-subpanel-title">
                <span>📥 Receiver (Consignee Party)</span>
              </h4>

              <div className="cmd-form-group">
                <label className="cmd-form-label">Receiver Full Name / Consignee</label>
                <input
                  type="text"
                  className="cmd-input"
                  value={receiverName}
                  onChange={(e) => setReceiverName(e.target.value)}
                  placeholder="e.g. Source Cards TCG"
                  required
                />
              </div>

              <div className="cmd-form-group">
                <label className="cmd-form-label">Receiver Email Address</label>
                <input
                  type="email"
                  className="cmd-input"
                  value={receiverEmail}
                  onChange={(e) => setReceiverEmail(e.target.value)}
                  placeholder="e.g. info@sourcecardstcg.com"
                  required
                />
              </div>

              <div className="cmd-form-group">
                <label className="cmd-form-label">Receiver Phone Number</label>
                <input
                  type="tel"
                  className="cmd-input"
                  value={receiverPhone}
                  onChange={(e) => setReceiverPhone(e.target.value)}
                  placeholder="e.g. +63 2 8888 1234"
                  required
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Start & End Location + Coordinates */}
        <div className="create-shipment-section-card">
          <div className="create-shipment-card-title">
            <span className="create-shipment-badge-step">2</span>
            <h3>Corridor Routing & Geolocation Vectors</h3>
          </div>

          <div className="create-shipment-corridor-presets">
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b' }}>
              Quick Presets:
            </span>
            <button
              type="button"
              className="create-shipment-preset-chip"
              onClick={() =>
                applyPresetCorridor(
                  'Los Angeles World Gateway (LAX)',
                  33.9416,
                  -118.4085,
                  'Tokyo Haneda Air Cargo Hub (HND)',
                  35.5494,
                  139.7798
                )
              }
            >
              Los Angeles ➔ Tokyo (8,815 km)
            </button>
            <button
              type="button"
              className="create-shipment-preset-chip"
              onClick={() =>
                applyPresetCorridor(
                  'New York Worldport Gateway (JFK)',
                  40.6413,
                  -73.7781,
                  'London Heathrow Cargo Center (LHR)',
                  51.47,
                  -0.4543
                )
              }
            >
              New York ➔ London (5,560 km)
            </button>
            <button
              type="button"
              className="create-shipment-preset-chip"
              onClick={() =>
                applyPresetCorridor(
                  'Frankfurt Airport Logistics Hub (FRA)',
                  50.0379,
                  8.5622,
                  'Dubai Cargo Mega Terminal (DXB)',
                  25.2532,
                  55.3657
                )
              }
            >
              Frankfurt ➔ Dubai (4,840 km)
            </button>
          </div>

          {/* Geocoding feedback alert */}
          {geocodeFeedback && (
            <div
              style={{
                marginTop: '0.75rem',
                padding: '0.65rem 1rem',
                borderRadius: '8px',
                background: 'rgba(2, 132, 199, 0.1)',
                border: '1px solid rgba(2, 132, 199, 0.3)',
                color: '#0284c7',
                fontSize: '0.85rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <span>🌐</span>
              <span>{geocodeFeedback}</span>
            </div>
          )}

          <div className="create-shipment-grid-2" style={{ marginTop: '1rem' }}>
            {/* Start Location (Origin) */}
            <div className="create-shipment-location-box">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
                <div className="create-shipment-loc-badge green">🟢 Start Location (Origin)</div>
                <button
                  type="button"
                  onClick={handleGeocodeOrigin}
                  disabled={isGeocodingOrigin}
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    padding: '3px 8px',
                    borderRadius: '6px',
                    background: '#0284c7',
                    color: '#ffffff',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  {isGeocodingOrigin ? '⏳ Geocoding...' : '📍 Auto-Locate Live API'}
                </button>
              </div>

              <div className="cmd-form-group">
                <label className="cmd-form-label">Origin Terminal / Address</label>
                <input
                  type="text"
                  className="cmd-input"
                  value={originName}
                  onChange={(e) => setOriginName(e.target.value)}
                  placeholder="e.g. New York Worldport Gateway (JFK)"
                  required
                />
              </div>

              <div className="cmd-form-row">
                <div className="cmd-form-group">
                  <label className="cmd-form-label">Origin Latitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    className="cmd-input"
                    value={originLat}
                    onChange={(e) => setOriginLat(parseFloat(e.target.value) || 0)}
                    placeholder="e.g. 40.6413"
                    required
                  />
                </div>
                <div className="cmd-form-group">
                  <label className="cmd-form-label">Origin Longitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    className="cmd-input"
                    value={originLng}
                    onChange={(e) => setOriginLng(parseFloat(e.target.value) || 0)}
                    placeholder="e.g. -73.7781"
                    required
                  />
                </div>
              </div>
            </div>

            {/* End Location (Destination) */}
            <div className="create-shipment-location-box">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
                <div className="create-shipment-loc-badge red">🔴 End Location (Destination)</div>
                <button
                  type="button"
                  onClick={handleGeocodeDest}
                  disabled={isGeocodingDest}
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    padding: '3px 8px',
                    borderRadius: '6px',
                    background: '#0284c7',
                    color: '#ffffff',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  {isGeocodingDest ? '⏳ Geocoding...' : '📍 Auto-Locate Live API'}
                </button>
              </div>

              <div className="cmd-form-group">
                <label className="cmd-form-label">Destination Hub / Address</label>
                <input
                  type="text"
                  className="cmd-input"
                  value={destName}
                  onChange={(e) => setDestName(e.target.value)}
                  placeholder="e.g. London Heathrow Cargo Center (LHR)"
                  required
                />
              </div>

              <div className="cmd-form-row">
                <div className="cmd-form-group">
                  <label className="cmd-form-label">Destination Latitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    className="cmd-input"
                    value={destLat}
                    onChange={(e) => setDestLat(parseFloat(e.target.value) || 0)}
                    placeholder="e.g. 51.4700"
                    required
                  />
                </div>
                <div className="cmd-form-group">
                  <label className="cmd-form-label">Destination Longitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    className="cmd-input"
                    value={destLng}
                    onChange={(e) => setDestLng(parseFloat(e.target.value) || 0)}
                    placeholder="e.g. -0.4543"
                    required
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Embedded Live Map Display */}
          <div className="create-shipment-map-wrapper">
            <div className="create-shipment-map-header" style={{ flexWrap: 'wrap', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <span style={{ fontSize: '1.2rem' }}>🗺️</span>
                <strong>Live Corridor Trajectory Mapping</strong>
                <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', fontWeight: 700 }}>
                  ⚡ Live API Active
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {/* Tile Selector */}
                <div style={{ display: 'inline-flex', background: '#f1f5f9', padding: '2px', borderRadius: '6px' }}>
                  {(['voyager', 'satellite', 'dark'] as MapTileKey[]).map((k) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setActiveTileKey(k)}
                      style={{
                        padding: '3px 8px',
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        background: activeTileKey === k ? '#ffffff' : 'transparent',
                        color: activeTileKey === k ? '#0f172a' : '#64748b',
                        boxShadow: activeTileKey === k ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                      }}
                    >
                      {k === 'voyager' ? '🗺️ Street' : k === 'satellite' ? '🛰️ Satellite' : '🌙 Radar'}
                    </button>
                  ))}
                </div>

                <div className="create-shipment-distance-pill">
                  <span>📍 Distance:</span>
                  <strong style={{ color: '#0284c7' }}>
                    {customDistance.toLocaleString()} km ({Math.round(customDistance * 0.621371).toLocaleString()} miles)
                  </strong>
                </div>
              </div>
            </div>

            <div ref={mapContainerRef} className="create-shipment-leaflet-map" />
          </div>
        </div>

        {/* Section 3: Package Image & Media */}
        <div className="create-shipment-section-card">
          <div className="create-shipment-card-title">
            <span className="create-shipment-badge-step">3</span>
            <h3>Package Image & Consignment Assets</h3>
          </div>

          <div className="create-shipment-grid-2">
            <div className="cmd-form-group">
              <label className="cmd-form-label">Upload Image from Gallery / File</label>
              <input
                type="file"
                accept="image/*"
                className="cmd-input"
                onChange={handleImageFileChange}
              />
              <span style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '4px' }}>
                Accepts JPG, PNG, WEBP cargo inspection photos.
              </span>
            </div>

            <div className="cmd-form-group">
              <label className="cmd-form-label">Or Direct Image URL</label>
              <input
                type="url"
                className="cmd-input"
                value={imageUrl}
                onChange={(e) => handleImageUrlChange(e.target.value)}
                placeholder="https://images.example.com/cargo-box.jpg"
              />
            </div>
          </div>

          {imagePreview && (
            <div className="create-shipment-image-preview-box">
              <img src={imagePreview} alt="Package cargo preview" className="create-shipment-preview-img" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <strong style={{ fontSize: '0.9rem', color: '#0f172a' }}>Cargo Inspection Photo Attached</strong>
                <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                  Digital asset verified for airframe intake & customs clearance documentation.
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Section 4: Carrier Agency, Transport Scope & Status */}
        <div className="create-shipment-section-card">
          <div className="create-shipment-card-title">
            <span className="create-shipment-badge-step">4</span>
            <h3>Carrier Agency, Transport Scope & Status</h3>
          </div>

          <div className="cmd-form-row">
            <div className="cmd-form-group">
              <label className="cmd-form-label">Carrier Agency Partner</label>
              <select
                className="cmd-select"
                value={carrierName}
                onChange={(e) => setCarrierName(e.target.value)}
              >
                {carriers.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name} ({c.code})
                  </option>
                ))}
              </select>
            </div>

            <div className="cmd-form-group">
              <label className="cmd-form-label">Transport Scope</label>
              <select
                className="cmd-select"
                value={transportScope}
                onChange={(e) => setTransportScope(e.target.value as 'Domestic' | 'Regional' | 'International')}
              >
                <option value="International">🌍 International / Transcontinental</option>
                <option value="Regional">🌐 Regional Freight Linehaul</option>
                <option value="Domestic">🏠 Domestic Overland Service</option>
              </select>
            </div>

            <div className="cmd-form-group">
              <label className="cmd-form-label">Shipping Modality</label>
              <select
                className="cmd-select"
                value={shippingMode}
                onChange={(e) => setShippingMode(e.target.value as ShippingMode)}
              >
                <option value="air">✈️ Priority Air Linehaul</option>
                <option value="sea">🚢 Ocean Container FCL/LCL</option>
                <option value="land">🚚 Overland Express Freight</option>
              </select>
            </div>

            <div className="cmd-form-group">
              <label className="cmd-form-label">Consignment Status</label>
              <select
                className="cmd-select"
                value={shipmentStatus}
                onChange={(e) => setShipmentStatus(e.target.value as ShipmentStatus)}
              >
                <option value="pending">⏳ Pending Approval (Requires Admin Approval)</option>
                <option value="in_transit">▶️ In Transit (Active GPS Telemetry)</option>
                <option value="customs">🛂 Customs Clearance Hold</option>
                <option value="delivered">✅ Delivered Receipt</option>
                <option value="exception">⚠️ Transit Advisory / Exception</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section 5: Cargo Details, Driver, Weight, ETA */}
        <div className="create-shipment-section-card">
          <div className="create-shipment-card-title">
            <span className="create-shipment-badge-step">5</span>
            <h3>Cargo Specifications & Manual Tariff Entry</h3>
          </div>

          <div className="cmd-form-row">
            <div className="cmd-form-group">
              <label className="cmd-form-label">Cargo Type / Goods Category</label>
              <input
                type="text"
                className="cmd-input"
                value={cargoType}
                onChange={(e) => setCargoType(e.target.value)}
                placeholder="e.g. Commercial Electronics, Collectibles"
                required
              />
            </div>

            <div className="cmd-form-group">
              <label className="cmd-form-label">Booking / Intake Date</label>
              <input
                type="datetime-local"
                className="cmd-input"
                value={bookingDate}
                onChange={(e) => setBookingDate(e.target.value)}
                required
              />
            </div>

            <div className="cmd-form-group">
              <label className="cmd-form-label">Assigned Driver / Captain</label>
              <input
                type="text"
                className="cmd-input"
                value={driverName}
                onChange={(e) => setDriverName(e.target.value)}
                placeholder="e.g. Amina Bello"
                required
              />
            </div>

            <div className="cmd-form-group">
              <label className="cmd-form-label">Assigned Vehicle / Airframe ID</label>
              <input
                type="text"
                className="cmd-input"
                value={vehicleId}
                onChange={(e) => setVehicleId(e.target.value)}
                placeholder="e.g. VEH-101 or Boeing 767-300F"
                required
              />
            </div>
          </div>

          <div className="cmd-form-row" style={{ marginTop: '0.5rem' }}>
            <div className="cmd-form-group">
              <label className="cmd-form-label">Weight (KG)</label>
              <input
                type="number"
                step="0.1"
                className="cmd-input"
                value={weightKg}
                onChange={(e) => setWeightKg(parseFloat(e.target.value) || 1)}
                required
              />
            </div>

            <div className="cmd-form-group">
              <label className="cmd-form-label">Package Count</label>
              <input
                type="number"
                min="1"
                className="cmd-input"
                value={packageCount}
                onChange={(e) => setPackageCount(parseInt(e.target.value, 10) || 1)}
                required
              />
            </div>

            <div className="cmd-form-group">
              <label className="cmd-form-label">Declared Value ($ USD)</label>
              <input
                type="number"
                className="cmd-input"
                value={declaredValue}
                onChange={(e) => setDeclaredValue(parseFloat(e.target.value) || 0)}
                required
              />
            </div>

            <div className="cmd-form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="cmd-form-label">Estimated Delivery Date (ETA)</label>
                <button
                  type="button"
                  onClick={() => setEtaSchedule(autoCalculatedEta.etaString)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#0284c7',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    padding: '0 0 2px 0',
                    textDecoration: 'underline',
                  }}
                >
                  ⚡ Auto-Calculate
                </button>
              </div>
              <input
                type="text"
                className="cmd-input"
                value={etaSchedule}
                onChange={(e) => setEtaSchedule(e.target.value)}
                placeholder="e.g. Sep 29, 04:28 PM"
                required
              />
              <span style={{ fontSize: '0.72rem', color: '#10b981', fontWeight: 600, display: 'block', marginTop: '2px' }}>
                ✨ {autoCalculatedEta.humanSummary} → {autoCalculatedEta.etaString}
              </span>
            </div>
          </div>

          <div className="cmd-form-row" style={{ marginTop: '0.5rem' }}>
            <div className="cmd-form-group">
              <label className="cmd-form-label">Service Tier</label>
              <select
                className="cmd-select"
                value={serviceTier}
                onChange={(e) => setServiceTier(e.target.value)}
              >
                <option value="STANDARD">STANDARD AIR / LINEHAUL</option>
                <option value="PRIORITY EXPRESS">PRIORITY EXPRESS NEXT-DAY</option>
                <option value="TIME CRITICAL">TIME CRITICAL CHARTER</option>
                <option value="ECONOMY FREIGHT">ECONOMY FREIGHT</option>
              </select>
            </div>

            <div className="cmd-form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="cmd-form-label">Estimated Route Distance (KM)</label>
                <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                  Auto: {calculatedDistance.toLocaleString()} km
                </span>
              </div>
              <input
                type="number"
                className="cmd-input"
                value={customDistance}
                onChange={(e) => setCustomDistance(parseInt(e.target.value, 10) || 0)}
              />
            </div>
          </div>
        </div>


        {/* Section 6: Consignment Manifest Summary */}
        <div className="create-shipment-summary-card">
          <div className="create-shipment-summary-left">
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b' }}>
              CONSIGNMENT DISPATCH MANIFEST
            </span>
            <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#0284c7' }}>
              {carrierName} • {shippingMode.toUpperCase()}
            </div>
            <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
              {isEditMode ? `Waybill Reference: ${editWaybill}` : 'Initial Status: ' + shipmentStatus.toUpperCase()} • Direct client billing
            </span>
          </div>

          <div className="create-shipment-summary-actions">
            <Link to="/admin/shipments" className="cmd-btn cmd-btn-white">
              Cancel
            </Link>
            <button type="submit" className="cmd-btn cmd-btn-red" style={{ padding: '0.85rem 1.85rem' }}>
              {isEditMode ? '💾 Update Freight Shipment' : '+ Create Freight Shipment'}
            </button>
          </div>
        </div>
      </form>

      {/* SUCCESS CONFIRMATION POPUP MODAL (MODERATE PROPORTIONS + SHARE RECEIPT) */}
      {createdShipmentModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            backgroundColor: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.25rem',
            animation: 'fadeIn 0.2s ease-out',
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              maxWidth: '540px',
              width: '100%',
              maxHeight: '88vh',
              overflowY: 'auto',
              boxShadow: '0 20px 45px -10px rgba(0, 0, 0, 0.35)',
              border: '1px solid #e2e8f0',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
                padding: '1.25rem 1.5rem',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                gap: '0.85rem',
              }}
            >
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '50%',
                  background: 'rgba(255, 255, 255, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.4rem',
                  flexShrink: 0,
                }}
              >
                ✓
              </div>
              <div style={{ flex: 1 }}>
                <span
                  style={{
                    fontSize: '0.72rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    fontWeight: 800,
                    opacity: 0.9,
                    display: 'block',
                  }}
                >
                  Manifest Dispatched & Logged
                </span>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '2px 0 0 0', color: '#ffffff' }}>
                  Shipment Created Successfully!
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setCreatedShipmentModal(null)}
                style={{
                  background: 'rgba(255,255,255,0.15)',
                  border: 'none',
                  color: '#ffffff',
                  width: '30px',
                  height: '30px',
                  borderRadius: '50%',
                  fontSize: '1.1rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>

            {/* Modal Content */}
            <div style={{ padding: '1.35rem 1.5rem' }}>
              {/* Waybill Tracking Number Box */}
              <div
                style={{
                  background: '#f8fafc',
                  border: '1.5px dashed #cbd5e1',
                  borderRadius: '12px',
                  padding: '1rem 1.25rem',
                  textAlign: 'center',
                  marginBottom: '1rem',
                }}
              >
                <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Waybill Identification Number
                </div>
                <div
                  style={{
                    fontSize: '1.65rem',
                    fontWeight: 900,
                    color: '#0f172a',
                    letterSpacing: '0.04em',
                    margin: '0.3rem 0 0.65rem',
                    fontFamily: 'monospace',
                  }}
                >
                  {createdShipmentModal.waybill}
                </div>

                <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(createdShipmentModal.waybill)
                      setIsCopiedTracking(true)
                      setTimeout(() => setIsCopiedTracking(false), 3000)
                    }}
                    style={{
                      background: isCopiedTracking ? '#10b981' : '#0f172a',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '7px',
                      padding: '0.45rem 1rem',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      transition: 'all 0.2s',
                    }}
                  >
                    {isCopiedTracking ? '✓ Copied ID' : '📋 Copy Tracking Code'}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const url = `${window.location.origin}/track?waybill=${encodeURIComponent(createdShipmentModal.waybill)}`
                      navigator.clipboard.writeText(url)
                      setShareReceiptStatus('Receipt & Tracking Link copied!')
                      setTimeout(() => setShareReceiptStatus(''), 3000)
                    }}
                    style={{
                      background: '#ffffff',
                      color: '#0284c7',
                      border: '1.5px solid #0284c7',
                      borderRadius: '7px',
                      padding: '0.45rem 1rem',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                    }}
                  >
                    🔗 Copy Link
                  </button>
                </div>

                {shareReceiptStatus && (
                  <div style={{ marginTop: '6px', fontSize: '0.78rem', color: '#10b981', fontWeight: 700 }}>
                    ✓ {shareReceiptStatus}
                  </div>
                )}
              </div>

              {/* Details Summary Grid */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '0.75rem',
                  background: '#f1f5f9',
                  borderRadius: '10px',
                  padding: '1rem',
                  marginBottom: '1.15rem',
                  fontSize: '0.82rem',
                }}
              >
                <div>
                  <span style={{ color: '#64748b', display: 'block', fontSize: '0.7rem', fontWeight: 700 }}>
                    ORIGIN (START)
                  </span>
                  <strong style={{ color: '#0f172a', display: 'block', marginTop: '1px' }}>
                    🟢 {createdShipmentModal.origin.name}
                  </strong>
                </div>

                <div>
                  <span style={{ color: '#64748b', display: 'block', fontSize: '0.7rem', fontWeight: 700 }}>
                    DESTINATION (END)
                  </span>
                  <strong style={{ color: '#0f172a', display: 'block', marginTop: '1px' }}>
                    🔴 {createdShipmentModal.destination.name}
                  </strong>
                </div>

                <div>
                  <span style={{ color: '#64748b', display: 'block', fontSize: '0.7rem', fontWeight: 700 }}>
                    CARRIER & MODALITY
                  </span>
                  <strong style={{ color: '#0f172a', display: 'block', marginTop: '1px' }}>
                    {createdShipmentModal.carrier} • {createdShipmentModal.mode === 'land' ? '🚚 LAND' : createdShipmentModal.mode === 'sea' ? '🚢 SEA' : '✈️ AIR'}
                  </strong>
                </div>

                <div>
                  <span style={{ color: '#64748b', display: 'block', fontSize: '0.7rem', fontWeight: 700 }}>
                    CONSIGNEE / RECIPIENT
                  </span>
                  <strong style={{ color: '#0f172a', display: 'block', marginTop: '1px' }}>
                    {createdShipmentModal.receiverName || createdShipmentModal.clientName || 'N/A'}
                  </strong>
                </div>

                <div>
                  <span style={{ color: '#64748b', display: 'block', fontSize: '0.7rem', fontWeight: 700 }}>
                    CARGO / WEIGHT
                  </span>
                  <strong style={{ color: '#0f172a', display: 'block', marginTop: '1px' }}>
                    {createdShipmentModal.cargoType || 'Freight'} • {createdShipmentModal.weightKg} kg
                  </strong>
                </div>

                <div>
                  <span style={{ color: '#64748b', display: 'block', fontSize: '0.7rem', fontWeight: 700 }}>
                    INITIAL STATUS
                  </span>
                  <strong style={{ color: createdShipmentModal.status === 'in_transit' ? '#0284c7' : '#d97706', display: 'block', marginTop: '1px' }}>
                    {createdShipmentModal.status === 'in_transit' ? '▶️ IN TRANSIT' : '⏳ PENDING APPROVAL'}
                  </strong>
                </div>
              </div>

              {/* Share Receipt Suite */}
              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '0.85rem 1rem',
                  marginBottom: '1.25rem',
                }}
              >
                <span style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: '8px' }}>
                  📤 Share Digital Receipt & Tracking Link
                </span>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  {/* WhatsApp Share */}
                  <a
                    href={`https://api.whatsapp.com/send?text=${encodeURIComponent(
                      `📦 *Freight Consignment Receipt*\nWaybill: ${createdShipmentModal.waybill}\nOrigin: ${createdShipmentModal.origin.name}\nDestination: ${createdShipmentModal.destination.name}\nCarrier: ${createdShipmentModal.carrier} (${createdShipmentModal.mode.toUpperCase()})\nConsignee: ${createdShipmentModal.receiverName || createdShipmentModal.clientName}\n\nTrack Live Consignment:\n${window.location.origin}/track?waybill=${encodeURIComponent(createdShipmentModal.waybill)}`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      padding: '0.55rem',
                      background: '#25D366',
                      color: '#ffffff',
                      borderRadius: '8px',
                      textDecoration: 'none',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                    }}
                  >
                    <span>💬</span> WhatsApp Receipt
                  </a>

                  {/* Email Share */}
                  <a
                    href={`mailto:${encodeURIComponent(createdShipmentModal.receiverEmail || '')}?subject=${encodeURIComponent(
                      `Freight Consignment Waybill & Tracking Receipt - ${createdShipmentModal.waybill}`
                    )}&body=${encodeURIComponent(
                      `Dear ${createdShipmentModal.receiverName || 'Client'},\n\nYour freight shipment has been registered with ${createdShipmentModal.carrier}.\n\nWaybill Tracking Number: ${createdShipmentModal.waybill}\nOrigin: ${createdShipmentModal.origin.name}\nDestination: ${createdShipmentModal.destination.name}\nModality: ${createdShipmentModal.mode.toUpperCase()} FREIGHT\nWeight: ${createdShipmentModal.weightKg} kg\n\nYou can track the consignment live at:\n${window.location.origin}/track?waybill=${encodeURIComponent(createdShipmentModal.waybill)}\n\nThank you for choosing Northstar Logistics Network.`
                    )}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      padding: '0.55rem',
                      background: '#0284c7',
                      color: '#ffffff',
                      borderRadius: '8px',
                      textDecoration: 'none',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                    }}
                  >
                    <span>✉️</span> Email Receipt
                  </a>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
                <button
                  type="button"
                  onClick={() => {
                    navigate(`/track?waybill=${encodeURIComponent(createdShipmentModal.waybill)}`)
                  }}
                  style={{
                    padding: '0.75rem 1rem',
                    background: '#0f172a',
                    color: '#ffffff',
                    borderRadius: '9px',
                    border: 'none',
                    fontWeight: 700,
                    fontSize: '0.84rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.4rem',
                  }}
                >
                  <span>🌐</span> Track Consignment Live
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setPrintModalWaybill(createdShipmentModal.waybill)
                  }}
                  style={{
                    padding: '0.75rem 1rem',
                    background: '#ffffff',
                    color: '#0f172a',
                    borderRadius: '9px',
                    border: '1.5px solid #cbd5e1',
                    fontWeight: 700,
                    fontSize: '0.84rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.4rem',
                  }}
                >
                  <span>🖨️</span> Print Waybill / Label
                </button>

                <button
                  type="button"
                  onClick={() => {
                    navigate('/admin/shipments')
                  }}
                  style={{
                    padding: '0.65rem 1rem',
                    background: '#ffffff',
                    color: '#475569',
                    borderRadius: '9px',
                    border: '1.5px solid #cbd5e1',
                    fontWeight: 700,
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                  }}
                >
                  📋 View All Shipments
                </button>

                <button
                  type="button"
                  onClick={handleResetFormForNew}
                  style={{
                    padding: '0.65rem 1rem',
                    background: '#ffffff',
                    color: '#0284c7',
                    borderRadius: '9px',
                    border: '1.5px solid #bae6fd',
                    fontWeight: 700,
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                  }}
                >
                  ➕ Create Another
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PRINT WAYBILL MODAL */}
      {printModalWaybill && (
        <WaybillLabelModal
          shipment={createdShipmentModal || (editWaybill ? existingShipment || null : null)}
          isOpen={Boolean(printModalWaybill)}
          onClose={() => setPrintModalWaybill(null)}
        />
      )}
    </div>
  )
}
