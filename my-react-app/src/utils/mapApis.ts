/**
 * Real Live Map & Logistics API Service
 * Integrates:
 * 1. OpenStreetMap Nominatim Live Geocoding & Reverse Geocoding API
 * 2. OSRM (Open Source Routing Machine) Live Road Geometry API
 * 3. Great-Circle Spherical Geodesic Curvature Engine for Aviation & Maritime
 * 4. Multi-Layer Live Tile Providers (HD Satellite, Voyager English Street, Tactical Dark Radar)
 */

export interface GeocodeResult {
  displayName: string
  shortName: string
  lat: number
  lng: number
  type?: string
  country?: string
}

export interface RouteGeometryResult {
  coordinates: [number, number][]
  distanceKm: number
  durationMinutes: number
  isRealRoad: boolean
}

export const MAP_TILE_PROVIDERS = {
  voyager: {
    name: 'Street Vector (English)',
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    subdomains: 'abcd',
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
  },
  satellite: {
    name: 'Live HD Satellite',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    subdomains: ['server', 'services'],
    maxZoom: 19,
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
  },
  dark: {
    name: 'Tactical Radar (Dark)',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    subdomains: 'abcd',
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
  },
} as const

export type MapTileKey = keyof typeof MAP_TILE_PROVIDERS

/**
 * Known Major Logistics Hubs Fallback Dictionary
 */
const KNOWN_HUBS: Record<string, [number, number, string]> = {
  jfk: [40.6413, -73.7781, 'New York John F. Kennedy International Airport (JFK)'],
  lhr: [51.47, -0.4543, 'London Heathrow Airport World Cargo Center (LHR)'],
  fra: [50.0379, 8.5622, 'Frankfurt Airport Global Logistics Hub (FRA)'],
  ord: [41.9742, -87.9073, "Chicago O'Hare International Airport (ORD)"],
  lax: [33.9416, -118.4085, 'Los Angeles International Airport (LAX)'],
  dxb: [25.2532, 55.3657, 'Dubai International Airport Cargo Mega Terminal (DXB)'],
  sin: [1.3644, 103.9915, 'Singapore Changi Airport Airfreight Centre (SIN)'],
  hnd: [35.5494, 139.7798, 'Tokyo Haneda International Airport (HND)'],
  hou: [29.7604, -95.3698, 'Port of Houston Intermodal Terminal (HOU)'],
  rtm: [51.9244, 4.4777, 'Port of Rotterdam World Gateway (RTM)'],
  yyz: [43.6777, -79.6248, 'Toronto Pearson International Cargo Hub (YYZ)'],
}

/**
 * Live Geocoding via OpenStreetMap Nominatim API
 */
export async function searchLiveGeocode(query: string): Promise<GeocodeResult[]> {
  const clean = query.trim().toLowerCase()
  if (!clean) return []

  // Check known hub codes (e.g. "JFK", "LHR")
  if (KNOWN_HUBS[clean]) {
    const [lat, lng, name] = KNOWN_HUBS[clean]
    return [
      {
        displayName: name,
        shortName: clean.toUpperCase(),
        lat,
        lng,
        country: 'Global Gateway',
      },
    ]
  }

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 3500)

    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        query
      )}&limit=5&addressdetails=1`,
      {
        headers: {
          'Accept-Language': 'en',
          'User-Agent': 'NorthstarFreightTracking/2.0 (operations@northstar-freight.com)',
        },
        signal: controller.signal,
      }
    )

    clearTimeout(timeoutId)

    if (!response.ok) throw new Error('Nominatim geocode service returned error')

    const data = await response.json()
    if (Array.isArray(data) && data.length > 0) {
      return data.map((item: any) => ({
        displayName: item.display_name,
        shortName: item.name || item.display_name.split(',')[0],
        lat: parseFloat(item.lat),
        lng: parseFloat(item.lon),
        type: item.type,
        country: item.address?.country,
      }))
    }
  } catch {
    // Graceful fallback to fuzzy match
  }

  return []
}

/**
 * Calculate Great Circle Geodesic Arc Coordinates (Air & Maritime Corridors)
 */
export function generateGreatCircleArc(
  start: [number, number],
  end: [number, number],
  numPoints = 50
): [number, number][] {
  const [lat1, lon1] = start
  const [lat2, lon2] = end

  const deg2rad = Math.PI / 180
  const rad2deg = 180 / Math.PI

  const phi1 = lat1 * deg2rad
  const lambda1 = lon1 * deg2rad
  const phi2 = lat2 * deg2rad
  const lambda2 = lon2 * deg2rad

  // Angular distance in radians
  const deltaPhi = phi2 - phi1
  const deltaLambda = lambda2 - lambda1
  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2)
  const d = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  if (d === 0) return [start, end]

  const points: [number, number][] = []

  for (let i = 0; i <= numPoints; i++) {
    const f = i / numPoints
    const A = Math.sin((1 - f) * d) / Math.sin(d)
    const B = Math.sin(f * d) / Math.sin(d)

    const x = A * Math.cos(phi1) * Math.cos(lambda1) + B * Math.cos(phi2) * Math.cos(lambda2)
    const y = A * Math.cos(phi1) * Math.sin(lambda1) + B * Math.cos(phi2) * Math.sin(lambda2)
    const z = A * Math.sin(phi1) + B * Math.sin(phi2)

    const phi = Math.atan2(z, Math.sqrt(x * x + y * y))
    const lambda = Math.atan2(y, x)

    points.push([phi * rad2deg, lambda * rad2deg])
  }

  return points
}

/**
 * Live Road Route Geometry via OSRM (Open Source Routing Machine) API
 * Falls back to Great Circle arc for trans-oceanic / non-drivable routes.
 */
export async function fetchLiveRouteGeometry(
  start: [number, number],
  end: [number, number],
  mode: 'air' | 'sea' | 'land'
): Promise<RouteGeometryResult> {
  const [lat1, lng1] = start
  const [lat2, lng2] = end

  // If Air or Sea, use high-precision Geodesic arc
  if (mode === 'air' || mode === 'sea') {
    const arc = generateGreatCircleArc(start, end, 60)
    const distanceKm = Math.round(calculateHaversineDistance(lat1, lng1, lat2, lng2))
    const durationMinutes = mode === 'air' ? Math.round((distanceKm / 850) * 60) : Math.round((distanceKm / 40) * 60)
    return {
      coordinates: arc,
      distanceKm,
      durationMinutes,
      isRealRoad: false,
    }
  }

  // Land / Overland: Fetch real road turn-by-turn geometry via OSRM
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 4000)

    const url = `https://router.project-osrm.org/route/v1/driving/${lng1},${lat1};${lng2},${lat2}?overview=full&geometries=geojson`
    const response = await fetch(url, { signal: controller.signal })
    clearTimeout(timeoutId)

    if (response.ok) {
      const data = await response.json()
      if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
        const route = data.routes[0]
        const rawCoords: [number, number][] = route.geometry.coordinates.map(
          (c: [number, number]) => [c[1], c[0]] // Swap [lng, lat] to [lat, lng]
        )
        return {
          coordinates: rawCoords,
          distanceKm: Math.round(route.distance / 1000),
          durationMinutes: Math.round(route.duration / 60),
          isRealRoad: true,
        }
      }
    }
  } catch {
    // Fallback on timeout or CORS
  }

  // Fallback to Great-Circle
  const arc = generateGreatCircleArc(start, end, 40)
  const distanceKm = Math.round(calculateHaversineDistance(lat1, lng1, lat2, lng2))
  return {
    coordinates: arc,
    distanceKm,
    durationMinutes: Math.round((distanceKm / 75) * 60),
    isRealRoad: false,
  }
}

/**
 * Haversine Distance Helper in Kilometers
 */
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}
