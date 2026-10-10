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
  source?: string
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
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
    subdomains: ['server', 'services'],
    maxZoom: 19,
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, DeLorme, NAVTEQ, USGS, Intermap, iPC, NRCAN, Esri Japan, METI, Esri China (Hong Kong), Esri (Thailand), TomTom',
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
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
    subdomains: ['server', 'services'],
    maxZoom: 19,
    attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ',
  },
} as const

export type MapTileKey = keyof typeof MAP_TILE_PROVIDERS

const SERP_API_KEY =
  process.env.NEXT_PUBLIC_SERP_API_KEY ||
  '474aada0e5b378fe41c877b76edbc04c918fcfa1be45670fee71d90840950882'

/**
 * Comprehensive Global Logistics Hubs & Cities Encyclopedia
 * Covers 100+ major international gateways, capitals, seaports, and cargo hubs
 */
export const KNOWN_HUBS: Record<string, [number, number, string]> = {
  // Americas
  jfk: [40.6413, -73.7781, 'New York John F. Kennedy International Airport (JFK)'],
  'new york': [40.7128, -74.006, 'New York City, NY, USA'],
  nyc: [40.7128, -74.006, 'New York City, NY, USA'],
  ord: [41.9742, -87.9073, "Chicago O'Hare International Airport (ORD)"],
  chicago: [41.8781, -87.6298, 'Chicago, IL, USA'],
  lax: [33.9416, -118.4085, 'Los Angeles International Airport (LAX)'],
  'los angeles': [34.0522, -118.2437, 'Los Angeles, CA, USA'],
  hou: [29.7604, -95.3698, 'Port of Houston Intermodal Terminal (HOU)'],
  houston: [29.7604, -95.3698, 'Houston, TX, USA'],
  atl: [33.6407, -84.4277, 'Atlanta Hartsfield-Jackson International (ATL)'],
  atlanta: [33.749, -84.388, 'Atlanta, GA, USA'],
  mia: [25.7959, -80.287, 'Miami International Cargo Gateway (MIA)'],
  miami: [25.7617, -80.1918, 'Miami, FL, USA'],
  dfw: [32.8998, -97.0403, 'Dallas/Fort Worth International Airport (DFW)'],
  dallas: [32.7767, -96.797, 'Dallas, TX, USA'],
  sfo: [37.6213, -122.379, 'San Francisco International Airport (SFO)'],
  'san francisco': [37.7749, -122.4194, 'San Francisco, CA, USA'],
  sea: [47.4502, -122.3088, 'Seattle-Tacoma International (SEA)'],
  seattle: [47.6062, -122.3321, 'Seattle, WA, USA'],
  bos: [42.3656, -71.0096, 'Boston Logan International (BOS)'],
  boston: [42.3601, -71.0589, 'Boston, MA, USA'],
  yyz: [43.6777, -79.6248, 'Toronto Pearson International Cargo Hub (YYZ)'],
  toronto: [43.6532, -79.3832, 'Toronto, ON, Canada'],
  yvr: [49.1967, -123.1815, 'Vancouver International Airport (YVR)'],
  vancouver: [49.2827, -123.1207, 'Vancouver, BC, Canada'],
  yul: [45.4657, -73.7455, 'Montreal-Trudeau International (YUL)'],
  montreal: [45.5017, -73.5673, 'Montreal, QC, Canada'],
  mex: [19.4361, -99.0719, 'Mexico City International Airport (MEX)'],
  'mexico city': [19.4326, -99.1332, 'Mexico City, Mexico'],
  mexico: [19.4326, -99.1332, 'Mexico City, Mexico'],
  gru: [-23.4356, -46.4731, 'São Paulo-Guarulhos International (GRU)'],
  'sao paulo': [-23.5505, -46.6333, 'São Paulo, Brazil'],
  'são paulo': [-23.5505, -46.6333, 'São Paulo, Brazil'],
  brazil: [-15.7975, -47.8919, 'Brasília, Brazil'],
  eze: [-34.8222, -58.5358, 'Buenos Aires Ezeiza International (EZE)'],
  'buenos aires': [-34.6037, -58.3816, 'Buenos Aires, Argentina'],
  argentina: [-34.6037, -58.3816, 'Buenos Aires, Argentina'],
  bog: [4.7016, -74.1469, 'Bogotá El Dorado International (BOG)'],
  bogota: [4.711, -74.0721, 'Bogotá, Colombia'],
  scl: [-33.3928, -70.7856, 'Santiago Arturo Merino Benítez (SCL)'],
  santiago: [-33.4489, -70.6693, 'Santiago, Chile'],
  lim: [-12.0219, -77.1143, 'Lima Jorge Chávez International (LIM)'],
  lima: [-12.0464, -77.0428, 'Lima, Peru'],

  // Europe & UK
  lhr: [51.47, -0.4543, 'London Heathrow Airport World Cargo Center (LHR)'],
  london: [51.5074, -0.1278, 'London, United Kingdom'],
  uk: [51.5074, -0.1278, 'London, United Kingdom'],
  'united kingdom': [51.5074, -0.1278, 'London, United Kingdom'],
  england: [51.5074, -0.1278, 'London, United Kingdom'],
  man: [53.3537, -2.275, 'Manchester Airport Cargo Gateway (MAN)'],
  manchester: [53.4808, -2.2426, 'Manchester, United Kingdom'],
  fra: [50.0379, 8.5622, 'Frankfurt Airport Global Logistics Hub (FRA)'],
  frankfurt: [50.1109, 8.6821, 'Frankfurt am Main, Germany'],
  germany: [52.52, 13.405, 'Berlin, Germany'],
  berlin: [52.52, 13.405, 'Berlin, Germany'],
  muc: [48.3537, 11.775, 'Munich Airport World Cargo Center (MUC)'],
  munich: [48.1351, 11.582, 'Munich, Germany'],
  cdg: [49.0097, 2.5479, 'Paris Charles de Gaulle International (CDG)'],
  paris: [48.8566, 2.3522, 'Paris, France'],
  france: [48.8566, 2.3522, 'Paris, France'],
  ams: [52.3105, 4.7683, 'Amsterdam Airport Schiphol Cargo (AMS)'],
  amsterdam: [52.3676, 4.9041, 'Amsterdam, Netherlands'],
  netherlands: [52.3676, 4.9041, 'Amsterdam, Netherlands'],
  holland: [52.3676, 4.9041, 'Amsterdam, Netherlands'],
  rtm: [51.9244, 4.4777, 'Port of Rotterdam World Gateway (RTM)'],
  rotterdam: [51.9244, 4.4777, 'Rotterdam, Netherlands'],
  bru: [50.901, 4.4856, 'Brussels Airport Air Cargo Center (BRU)'],
  brussels: [50.8503, 4.3517, 'Brussels, Belgium'],
  belgium: [50.8503, 4.3517, 'Brussels, Belgium'],
  mad: [40.4839, -3.568, 'Madrid-Barajas Airport Cargo Hub (MAD)'],
  madrid: [40.4168, -3.7038, 'Madrid, Spain'],
  spain: [40.4168, -3.7038, 'Madrid, Spain'],
  bcn: [41.2974, 2.0833, 'Barcelona-El Prat Cargo Center (BCN)'],
  barcelona: [41.3879, 2.1699, 'Barcelona, Spain'],
  fco: [41.8003, 12.2389, 'Rome Leonardo da Vinci Fiumicino (FCO)'],
  rome: [41.9028, 12.4964, 'Rome, Italy'],
  italy: [41.9028, 12.4964, 'Rome, Italy'],
  mxp: [45.6301, 8.7255, 'Milan Malpensa Cargo City (MXP)'],
  milan: [45.4642, 9.19, 'Milan, Italy'],
  zrh: [47.4582, 8.5555, 'Zurich Airport Freight Hub (ZRH)'],
  zurich: [47.3769, 8.5417, 'Zurich, Switzerland'],
  switzerland: [46.8182, 8.2275, 'Bern, Switzerland'],
  vie: [48.1103, 16.5697, 'Vienna International Airport Cargo (VIE)'],
  vienna: [48.2082, 16.3738, 'Vienna, Austria'],
  austria: [48.2082, 16.3738, 'Vienna, Austria'],
  waw: [52.1672, 20.9679, 'Warsaw Chopin Airport Gateway (WAW)'],
  warsaw: [52.2297, 21.0122, 'Warsaw, Poland'],
  poland: [52.2297, 21.0122, 'Warsaw, Poland'],
  ist: [41.2753, 28.7519, 'Istanbul Airport Global Cargo Hub (IST)'],
  istanbul: [41.0082, 28.9784, 'Istanbul, Turkey'],
  turkey: [39.9334, 32.8597, 'Ankara, Turkey'],

  // Africa
  los: [6.5774, 3.3212, 'Murtala Muhammed International Airport (LOS)'],
  lagos: [6.5244, 3.3792, 'Lagos, Nigeria'],
  nigeria: [9.0765, 7.3986, 'Abuja, Nigeria'],
  abv: [9.0065, 7.2631, 'Nnamdi Azikiwe International Airport (ABV)'],
  abuja: [9.0765, 7.3986, 'Abuja, Nigeria'],
  acc: [5.6052, -0.1668, 'Kotoka International Airport (ACC)'],
  accra: [5.6037, -0.187, 'Accra, Ghana'],
  ghana: [5.6037, -0.187, 'Accra, Ghana'],
  jnb: [-26.1367, 28.2411, 'O.R. Tambo International Airport (JNB)'],
  johannesburg: [-26.2041, 28.0473, 'Johannesburg, South Africa'],
  cpt: [-33.9715, 18.6021, 'Cape Town International Airport (CPT)'],
  'cape town': [-33.9249, 18.4241, 'Cape Town, South Africa'],
  'south africa': [-25.7479, 28.2293, 'Pretoria, South Africa'],
  nbo: [-1.3192, 36.9278, 'Jomo Kenyatta International Airport (NBO)'],
  nairobi: [-1.2921, 36.8219, 'Nairobi, Kenya'],
  kenya: [-1.2921, 36.8219, 'Nairobi, Kenya'],
  cai: [30.1219, 31.4056, 'Cairo International Airport Cargo (CAI)'],
  cairo: [30.0444, 31.2357, 'Cairo, Egypt'],
  egypt: [30.0444, 31.2357, 'Cairo, Egypt'],
  add: [8.9779, 38.7993, 'Addis Ababa Bole International (ADD)'],
  'addis ababa': [9.032, 38.7469, 'Addis Ababa, Ethiopia'],
  ethiopia: [9.032, 38.7469, 'Addis Ababa, Ethiopia'],
  dkr: [14.671, -17.0733, 'Blaise Diagne International (DSS/DKR)'],
  dakar: [14.7167, -17.4677, 'Dakar, Senegal'],
  senegal: [14.7167, -17.4677, 'Dakar, Senegal'],
  cmr: [4.0061, 9.7195, 'Douala International Airport (DLA)'],
  douala: [4.0511, 9.7679, 'Douala, Cameroon'],
  cameroon: [3.848, 11.5021, 'Yaoundé, Cameroon'],
  cmn: [33.3675, -7.5899, 'Mohammed V International Airport (CMN)'],
  casablanca: [33.5731, -7.5898, 'Casablanca, Morocco'],
  morocco: [34.0209, -6.8416, 'Rabat, Morocco'],

  // Middle East & Asia
  dxb: [25.2532, 55.3657, 'Dubai International Airport Cargo Mega Terminal (DXB)'],
  dubai: [25.2048, 55.2708, 'Dubai, United Arab Emirates'],
  uae: [24.4539, 54.3773, 'Abu Dhabi, United Arab Emirates'],
  'abu dhabi': [24.4539, 54.3773, 'Abu Dhabi, United Arab Emirates'],
  auh: [24.433, 54.6511, 'Abu Dhabi International Airport (AUH)'],
  doh: [25.2731, 51.6081, 'Hamad International Airport Cargo (DOH)'],
  doha: [25.2854, 51.531, 'Doha, Qatar'],
  qatar: [25.2854, 51.531, 'Doha, Qatar'],
  ruh: [24.9576, 46.6988, 'King Khalid International Airport (RUH)'],
  riyadh: [24.7136, 46.6753, 'Riyadh, Saudi Arabia'],
  jed: [21.6796, 39.1565, 'King Abdulaziz International Airport (JED)'],
  jeddah: [21.4858, 39.1925, 'Jeddah, Saudi Arabia'],
  'saudi arabia': [24.7136, 46.6753, 'Riyadh, Saudi Arabia'],
  sin: [1.3644, 103.9915, 'Singapore Changi Airport Airfreight Centre (SIN)'],
  singapore: [1.3521, 103.8198, 'Singapore'],
  hkg: [22.308, 113.9185, 'Hong Kong International Airport Cargo (HKG)'],
  'hong kong': [22.3193, 114.1694, 'Hong Kong SAR'],
  pvg: [31.1443, 121.8083, 'Shanghai Pudong International Cargo (PVG)'],
  shanghai: [31.2304, 121.4737, 'Shanghai, China'],
  pek: [40.0799, 116.6031, 'Beijing Capital International Airport (PEK)'],
  beijing: [39.9042, 116.4074, 'Beijing, China'],
  can: [23.3924, 113.2988, 'Guangzhou Baiyun International (CAN)'],
  guangzhou: [23.1291, 113.2644, 'Guangzhou, China'],
  szx: [22.6393, 113.8107, 'Shenzhen Baoan International (SZX)'],
  shenzhen: [22.5431, 114.0579, 'Shenzhen, China'],
  china: [39.9042, 116.4074, 'Beijing, China'],
  hnd: [35.5494, 139.7798, 'Tokyo Haneda International Airport (HND)'],
  nrt: [35.772, 140.3929, 'Tokyo Narita International Airport (NRT)'],
  tokyo: [35.6762, 139.6503, 'Tokyo, Japan'],
  japan: [35.6762, 139.6503, 'Tokyo, Japan'],
  kix: [34.432, 135.2304, 'Kansai International Airport (KIX)'],
  osaka: [34.6937, 135.5023, 'Osaka, Japan'],
  icn: [37.4602, 126.4407, 'Seoul Incheon International Airport (ICN)'],
  seoul: [37.5665, 126.978, 'Seoul, South Korea'],
  korea: [37.5665, 126.978, 'Seoul, South Korea'],
  tpe: [25.0797, 121.2342, 'Taiwan Taoyuan International (TPE)'],
  taipei: [25.033, 121.5654, 'Taipei, Taiwan'],
  taiwan: [25.033, 121.5654, 'Taipei, Taiwan'],
  bom: [19.0896, 72.8656, 'Mumbai Chhatrapati Shivaji Maharaj (BOM)'],
  mumbai: [19.076, 72.8777, 'Mumbai, Maharashtra, India'],
  del: [28.5562, 77.1, 'Delhi Indira Gandhi International (DEL)'],
  delhi: [28.6139, 77.209, 'New Delhi, India'],
  india: [28.6139, 77.209, 'New Delhi, India'],
  blr: [13.1986, 77.7066, 'Bengaluru Kempegowda International (BLR)'],
  bangalore: [12.9716, 77.5946, 'Bengaluru, India'],
  bkk: [13.69, 100.7501, 'Bangkok Suvarnabhumi Airport Cargo (BKK)'],
  bangkok: [13.7563, 100.5018, 'Bangkok, Thailand'],
  thailand: [13.7563, 100.5018, 'Bangkok, Thailand'],
  kul: [2.7456, 101.7099, 'Kuala Lumpur International Airport (KUL)'],
  'kuala lumpur': [3.139, 101.6869, 'Kuala Lumpur, Malaysia'],
  malaysia: [3.139, 101.6869, 'Kuala Lumpur, Malaysia'],
  mnl: [14.5086, 121.0194, 'Manila Ninoy Aquino International (MNL)'],
  manila: [14.5995, 120.9842, 'Manila, Philippines'],
  philippines: [14.5995, 120.9842, 'Manila, Philippines'],
  cgk: [-6.1275, 106.6537, 'Jakarta Soekarno-Hatta International (CGK)'],
  jakarta: [-6.2088, 106.8456, 'Jakarta, Indonesia'],
  indonesia: [-6.2088, 106.8456, 'Jakarta, Indonesia'],
  sgn: [10.8185, 106.6518, 'Ho Chi Minh City Tan Son Nhat (SGN)'],
  'ho chi minh': [10.8231, 106.6297, 'Ho Chi Minh City, Vietnam'],
  vietnam: [21.0285, 105.8542, 'Hanoi, Vietnam'],

  // Oceania
  syd: [-33.9399, 151.1753, 'Sydney Kingsford Smith Airport (SYD)'],
  sydney: [-33.8688, 151.2093, 'Sydney, NSW, Australia'],
  australia: [-35.2809, 149.13, 'Canberra, Australia'],
  mel: [-37.669, 144.841, 'Melbourne Airport Cargo Terminal (MEL)'],
  melbourne: [-37.8136, 144.9631, 'Melbourne, VIC, Australia'],
  bne: [-27.3842, 153.1175, 'Brisbane Airport (BNE)'],
  brisbane: [-27.4698, 153.0251, 'Brisbane, QLD, Australia'],
  akl: [-37.0082, 174.785, 'Auckland Airport Cargo Hub (AKL)'],
  auckland: [-36.8485, 174.7633, 'Auckland, New Zealand'],
  'new zealand': [-41.2865, 174.7762, 'Wellington, New Zealand'],
}

/**
 * Fuzzy check known locations
 */
export function lookupKnownHub(query: string): GeocodeResult | null {
  const clean = query.trim().toLowerCase()
  if (!clean) return null

  // 1. Direct key match
  if (KNOWN_HUBS[clean]) {
    const [lat, lng, name] = KNOWN_HUBS[clean]
    return {
      displayName: name,
      shortName: name.split(',')[0],
      lat,
      lng,
      country: 'Verified Logistics Gateway',
      source: 'Internal Fast Gateway DB',
    }
  }

  // 2. Keyword/Sub-string match
  // e.g. "Lagos, Nigeria" matches "lagos" or "los"
  const tokens = clean
    .replace(/[,\(\)\/-]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length >= 3)

  for (const token of tokens) {
    if (KNOWN_HUBS[token]) {
      const [lat, lng, name] = KNOWN_HUBS[token]
      return {
        displayName: `${query} (${name})`,
        shortName: name.split(',')[0],
        lat,
        lng,
        country: 'Verified Logistics Gateway',
        source: 'Internal Fast Gateway DB',
      }
    }
  }

  // 3. Reverse search keys in query string
  for (const [key, [lat, lng, name]] of Object.entries(KNOWN_HUBS)) {
    if (key.length >= 4 && clean.includes(key)) {
      return {
        displayName: `${query} (${name})`,
        shortName: name.split(',')[0],
        lat,
        lng,
        country: 'Verified Logistics Gateway',
        source: 'Internal Fast Gateway DB',
      }
    }
  }

  return null
}

/**
 * Query SerpApi Google Maps Engine for live place search and GPS coordinates
 */
export async function searchSerpApiGoogleMaps(query: string): Promise<GeocodeResult[]> {
  if (!query.trim() || !SERP_API_KEY) return []

  const tryEndpoints = [
    `/api/serpapi/search.json?engine=google_maps&q=${encodeURIComponent(query)}&api_key=${SERP_API_KEY}`,
    `https://serpapi.com/search.json?engine=google_maps&q=${encodeURIComponent(query)}&api_key=${SERP_API_KEY}`,
  ]

  for (const url of tryEndpoints) {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 4000)

      const res = await fetch(url, { signal: controller.signal })
      clearTimeout(timeoutId)

      if (res.ok) {
        const data = await res.json()
        const results: GeocodeResult[] = []

        // 1. Single Place Result
        if (data.place_results && data.place_results.gps_coordinates) {
          const p = data.place_results
          results.push({
            displayName: p.title || p.address || query,
            shortName: p.title || query,
            lat: p.gps_coordinates.latitude,
            lng: p.gps_coordinates.longitude,
            type: p.type || 'Google Maps Place',
            country: p.address || 'Global Location',
            source: 'Google Maps (SerpApi)',
          })
        }

        // 2. Local Results list
        if (Array.isArray(data.local_results) && data.local_results.length > 0) {
          for (const item of data.local_results) {
            if (item.gps_coordinates?.latitude && item.gps_coordinates?.longitude) {
              results.push({
                displayName: `${item.title}${item.address ? ` - ${item.address}` : ''}`,
                shortName: item.title || query,
                lat: item.gps_coordinates.latitude,
                lng: item.gps_coordinates.longitude,
                type: item.type || 'Google Maps Result',
                country: item.address,
                source: 'Google Maps (SerpApi)',
              })
            }
          }
        }

        if (results.length > 0) {
          return results
        }
      }
    } catch {
      // Continue to next endpoint or fallback
    }
  }

  return []
}

/**
 * Live Geocoding via SerpApi Google Maps Engine with OpenStreetMap Nominatim Fallback
 */
export async function searchLiveGeocode(query: string): Promise<GeocodeResult[]> {
  const clean = query.trim()
  if (!clean) return []

  // 1. Fast check known hub codes and city/country names
  const known = lookupKnownHub(clean)
  if (known) {
    return [known]
  }

  // 2. Query Google Maps Engine via SerpApi
  try {
    const serpResults = await searchSerpApiGoogleMaps(query)
    if (serpResults.length > 0) {
      return serpResults
    }
  } catch {
    // Fallthrough to Nominatim
  }

  // 3. Fallback: OpenStreetMap Nominatim Live Geocoding API
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

    if (response.ok) {
      const data = await response.json()
      if (Array.isArray(data) && data.length > 0) {
        return data.map((item: any) => ({
          displayName: item.display_name,
          shortName: item.name || item.display_name.split(',')[0],
          lat: parseFloat(item.lat),
          lng: parseFloat(item.lon),
          type: item.type,
          country: item.address?.country,
          source: 'Nominatim Live API',
        }))
      }
    }
  } catch {
    // Graceful fallback
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

export interface ShipmentProgressMetrics {
  totalKm: number
  pct: number
  coveredKm: number
  remainingKm: number
  speedDisplay: string
  statusDisplay: string
  isStopped: boolean
}

export const NORMAL_SPEEDS: Record<string, number> = {
  land: 80, // 80 km/h: Normal car highway & overland driving speed
  air: 850, // 850 km/h: Cruising commercial aviation speed
  sea: 38,  // 38 km/h: Normal container maritime linehaul (~20.5 knots)
}

export function getShipmentDistanceKm(shipment: {
  estimatedDistanceKm?: number
  origin?: { lat?: number; lng?: number }
  destination?: { lat?: number; lng?: number }
  mode?: string
}): number {
  if (shipment.estimatedDistanceKm && shipment.estimatedDistanceKm > 0) {
    return Math.round(shipment.estimatedDistanceKm)
  }
  const lat1 = shipment.origin?.lat ?? 40.6413
  const lng1 = shipment.origin?.lng ?? -73.7781
  const lat2 = shipment.destination?.lat ?? 51.4700
  const lng2 = shipment.destination?.lng ?? -0.4543
  let dist = calculateHaversineDistance(lat1, lng1, lat2, lng2)
  if (shipment.mode === 'land') {
    // Normal road winding detour factor for overland car/truck driving
    dist *= 1.22
  }
  return Math.max(20, Math.round(dist) || 450)
}

export function getShipmentProgressMetrics(shipment: {
  status: string
  progressPct?: number
  isMovementStopped?: boolean
  mode?: string
  estimatedDistanceKm?: number
  origin?: { lat?: number; lng?: number }
  destination?: { lat?: number; lng?: number }
  createdAt?: string
  bookingDate?: string
}): ShipmentProgressMetrics {
  const telemetry = calculateRealtimeJourneyTelemetry(shipment)
  return {
    totalKm: telemetry.totalKm,
    pct: telemetry.progressPct,
    coveredKm: telemetry.coveredKm,
    remainingKm: telemetry.remainingKm,
    speedDisplay: telemetry.speedDisplay,
    statusDisplay: telemetry.statusDisplay,
    isStopped: !!shipment.isMovementStopped,
  }
}

/**
 * Calculate realistic transit duration in hours based on distance and normal vehicle speed
 */
export function calculateEstimatedTransitHours(distanceKm: number, mode: string = 'land'): number {
  const d = Math.max(10, distanceKm)
  const speed = NORMAL_SPEEDS[mode] || NORMAL_SPEEDS.land
  const hours = d / speed
  return Math.max(0.2, Math.round(hours * 10) / 10)
}

/**
 * Calculate dynamic ETA formatted string based on distance, mode, and start time
 */
export function calculateDynamicETA(
  distanceKm: number,
  mode: string = 'land',
  startDateInput?: Date | string
): { etaString: string; durationHours: number; arrivalDate: Date; humanSummary: string } {
  const durationHours = calculateEstimatedTransitHours(distanceKm, mode)
  const baseTime = startDateInput ? new Date(startDateInput).getTime() : Date.now()
  const arrivalTimeMs = (isNaN(baseTime) ? Date.now() : baseTime) + durationHours * 3600 * 1000
  const arrivalDate = new Date(arrivalTimeMs)

  const now = new Date()
  const isToday = arrivalDate.toDateString() === now.toDateString()
  
  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const isTomorrow = arrivalDate.toDateString() === tomorrow.toDateString()

  const timeStr = arrivalDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  
  let etaString = ''
  if (isToday) {
    etaString = `Today, ${timeStr}`
  } else if (isTomorrow) {
    etaString = `Tomorrow, ${timeStr}`
  } else {
    const month = arrivalDate.toLocaleString('default', { month: 'short' })
    const day = arrivalDate.getDate()
    const year = arrivalDate.getFullYear()
    etaString = `${month} ${day}, ${year} · ${timeStr}`
  }

  let humanSummary = ''
  if (durationHours < 24) {
    humanSummary = `Est. ~${durationHours} hrs transit (${Math.round(distanceKm).toLocaleString()} km)`
  } else {
    const days = (durationHours / 24).toFixed(1).replace('.0', '')
    humanSummary = `Est. ~${days} days transit (${Math.round(distanceKm).toLocaleString()} km)`
  }

  return {
    etaString,
    durationHours,
    arrivalDate,
    humanSummary,
  }
}

/**
 * Calculate Compass Bearing in degrees and cardinal direction between two points
 */
export function calculateBearing(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): { degrees: number; cardinal: string } {
  const φ1 = (lat1 * Math.PI) / 180
  const φ2 = (lat2 * Math.PI) / 180
  const Δλ = ((lon2 - lon1) * Math.PI) / 180

  const y = Math.sin(Δλ) * Math.cos(φ2)
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ)
  const θ = Math.atan2(y, x)
  const degrees = Math.round(((θ * 180) / Math.PI + 360) % 360)

  const cardinals = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW']
  const index = Math.round(degrees / 22.5) % 16
  const cardinal = `${String(degrees).padStart(3, '0')}° ${cardinals[index]}`

  return { degrees, cardinal }
}

/**
 * Interpolate exact position along route coordinates based on progress fraction (0 to 1)
 * Calculates true geodesic segment distances and returns interpolated lat/lng, bearing, and split path polylines.
 */
export interface RouteInterpolationResult {
  lat: number
  lng: number
  bearingAngle: number
  bearingCardinal: string
  coveredCoordinates: [number, number][]
  remainingCoordinates: [number, number][]
}

export function interpolatePositionAlongRoute(
  coordinates: [number, number][],
  fraction: number // 0 to 1
): RouteInterpolationResult {
  if (!coordinates || coordinates.length === 0) {
    return {
      lat: 0,
      lng: 0,
      bearingAngle: 0,
      bearingCardinal: '000° N',
      coveredCoordinates: [],
      remainingCoordinates: [],
    }
  }

  const clampedFraction = Math.max(0, Math.min(1, fraction))

  if (coordinates.length === 1 || clampedFraction <= 0) {
    const [lat, lng] = coordinates[0]
    return {
      lat,
      lng,
      bearingAngle: 0,
      bearingCardinal: '000° N',
      coveredCoordinates: [coordinates[0]],
      remainingCoordinates: coordinates,
    }
  }

  if (clampedFraction >= 1) {
    const last = coordinates[coordinates.length - 1]
    const prev = coordinates[coordinates.length - 2] || last
    const bearing = calculateBearing(prev[0], prev[1], last[0], last[1])
    return {
      lat: last[0],
      lng: last[1],
      bearingAngle: bearing.degrees,
      bearingCardinal: bearing.cardinal,
      coveredCoordinates: coordinates,
      remainingCoordinates: [last],
    }
  }

  // Calculate cumulative distances along route geometry
  const distances: number[] = [0]
  let totalDistance = 0
  for (let i = 0; i < coordinates.length - 1; i++) {
    const d = calculateHaversineDistance(
      coordinates[i][0],
      coordinates[i][1],
      coordinates[i + 1][0],
      coordinates[i + 1][1]
    )
    totalDistance += d
    distances.push(totalDistance)
  }

  if (totalDistance === 0) {
    return {
      lat: coordinates[0][0],
      lng: coordinates[0][1],
      bearingAngle: 0,
      bearingCardinal: '000° N',
      coveredCoordinates: [coordinates[0]],
      remainingCoordinates: coordinates,
    }
  }

  const targetDistance = clampedFraction * totalDistance
  let segIndex = 0
  for (let i = 0; i < distances.length - 1; i++) {
    if (targetDistance >= distances[i] && targetDistance <= distances[i + 1]) {
      segIndex = i
      break
    }
  }

  const segStartDist = distances[segIndex]
  const segEndDist = distances[segIndex + 1]
  const segLength = segEndDist - segStartDist
  const segFraction = segLength > 0 ? (targetDistance - segStartDist) / segLength : 0

  const p1 = coordinates[segIndex]
  const p2 = coordinates[segIndex + 1]

  const lat = p1[0] + (p2[0] - p1[0]) * segFraction
  const lng = p1[1] + (p2[1] - p1[1]) * segFraction

  const bearing = calculateBearing(p1[0], p1[1], p2[0], p2[1])

  const currentPt: [number, number] = [lat, lng]
  const coveredCoordinates: [number, number][] = [...coordinates.slice(0, segIndex + 1), currentPt]
  const remainingCoordinates: [number, number][] = [currentPt, ...coordinates.slice(segIndex + 1)]

  return {
    lat,
    lng,
    bearingAngle: bearing.degrees,
    bearingCardinal: bearing.cardinal,
    coveredCoordinates,
    remainingCoordinates,
  }
}

/**
 * Calculate Real-Time Journey Telemetry and Progress Percentage
 * Accurate calculation based on start & end location distance and normal vehicle speed.
 */
export function calculateRealtimeJourneyTelemetry(shipment: {
  createdAt?: string
  bookingDate?: string
  status: string
  mode?: string
  progressPct?: number
  isMovementStopped?: boolean
  movementStopReason?: string
  estimatedDistanceKm?: number
  origin?: { lat?: number; lng?: number }
  destination?: { lat?: number; lng?: number }
}) {
  const totalKm = getShipmentDistanceKm(shipment)
  const mode = shipment.mode || 'land'
  const normalSpeed = NORMAL_SPEEDS[mode] || NORMAL_SPEEDS.land
  const totalTransitHours = calculateEstimatedTransitHours(totalKm, mode)
  const isDelivered = shipment.status === 'delivered'
  const isPending = shipment.status === 'pending'
  const isStopped = !!shipment.isMovementStopped

  const formatHoursAndMinutes = (h: number): string => {
    if (h <= 0) return '0h 00m'
    const hours = Math.floor(h)
    const mins = Math.round((h - hours) * 60)
    if (hours === 0) return `${mins}m`
    return `${hours}h ${String(mins).padStart(2, '0')}m`
  }

  const formatEtaDate = (arrivalDate: Date): string => {
    const now = new Date()
    const isToday = arrivalDate.toDateString() === now.toDateString()
    const tomorrow = new Date(now)
    tomorrow.setDate(tomorrow.getDate() + 1)
    const isTomorrow = arrivalDate.toDateString() === tomorrow.toDateString()
    const timeStr = arrivalDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

    if (isToday) return `Today, ${timeStr}`
    if (isTomorrow) return `Tomorrow, ${timeStr}`
    const month = arrivalDate.toLocaleString('default', { month: 'short' })
    const day = arrivalDate.getDate()
    const year = arrivalDate.getFullYear()
    return `${month} ${day}, ${year} · ${timeStr}`
  }

  if (isDelivered) {
    return {
      progressPct: 100,
      remainingPct: 0,
      coveredKm: totalKm,
      remainingKm: 0,
      totalKm,
      speedKmH: 0,
      speedDisplay: '0 km/h (Delivered)',
      statusDisplay: 'Delivered',
      isMoving: false,
      elapsedHours: totalTransitHours,
      remainingHours: 0,
      hoursCoveredStr: `${formatHoursAndMinutes(totalTransitHours)} (Completed)`,
      hoursRemainingStr: '0h 00m (Arrived)',
      etaString: 'Delivered & Confirmed',
    }
  }

  if (isPending) {
    const etaDate = new Date(Date.now() + totalTransitHours * 3600 * 1000)
    return {
      progressPct: 0,
      remainingPct: 100,
      coveredKm: 0,
      remainingKm: totalKm,
      totalKm,
      speedKmH: 0,
      speedDisplay: '0 km/h (Awaiting Dispatch)',
      statusDisplay: 'Staged at Origin',
      isMoving: false,
      elapsedHours: 0,
      remainingHours: totalTransitHours,
      hoursCoveredStr: '0h 00m (Pending)',
      hoursRemainingStr: `${formatHoursAndMinutes(totalTransitHours)} to Destination`,
      etaString: formatEtaDate(etaDate),
    }
  }

  if (isStopped) {
    const p = Math.min(95, Math.max(1, shipment.progressPct ?? 40))
    const coveredKm = Math.round((totalKm * p) / 100)
    const remainingKm = Math.max(0, totalKm - coveredKm)
    const elapsedHours = coveredKm / normalSpeed
    const remainingHours = remainingKm / normalSpeed
    return {
      progressPct: p,
      remainingPct: Math.max(0, Math.round((100 - p) * 10) / 10),
      coveredKm,
      remainingKm,
      totalKm,
      speedKmH: 0,
      speedDisplay: '0 km/h (Movement Hold)',
      statusDisplay: 'Hold / Inspection',
      isMoving: false,
      elapsedHours,
      remainingHours,
      hoursCoveredStr: formatHoursAndMinutes(elapsedHours),
      hoursRemainingStr: 'Paused on Hold',
      etaString: 'Schedule On Hold',
    }
  }

  // Active in_transit
  const createdTime = shipment.createdAt || shipment.bookingDate
  let elapsedHours = 0.5
  if (createdTime) {
    const elapsedMs = Math.max(0, Date.now() - new Date(createdTime).getTime())
    if (!isNaN(elapsedMs) && elapsedMs > 0) {
      elapsedHours = elapsedMs / (3600 * 1000)
    }
  }

  const timeBasedCoveredKm = elapsedHours * normalSpeed
  const timeBasedFraction = Math.min(0.96, Math.max(0.01, timeBasedCoveredKm / totalKm))
  const calculatedPct = Math.round(timeBasedFraction * 100 * 10) / 10

  // Anchor to admin-provided progressPct if set (starts from at least 1%)
  const finalPct = shipment.progressPct != null ? shipment.progressPct : calculatedPct
  const clampedPct = Math.min(99, Math.max(1, finalPct))

  const coveredKm = Math.min(totalKm, Math.max(1, Math.round((totalKm * clampedPct) / 100)))
  const remainingKm = Math.max(0, totalKm - coveredKm)
  const remainingPct = Math.max(0, Math.round((100 - clampedPct) * 10) / 10)
  const exactElapsedHours = coveredKm / normalSpeed
  const exactRemainingHours = remainingKm / normalSpeed
  const arrivalDate = new Date(Date.now() + exactRemainingHours * 3600 * 1000)

  const speedDisplay =
    mode === 'air'
      ? '850 km/h (Cruising FL345)'
      : mode === 'sea'
      ? '38 km/h (20.5 kts Ocean Linehaul)'
      : '80 km/h (Normal Driving Speed)'

  return {
    progressPct: clampedPct,
    remainingPct,
    coveredKm,
    remainingKm,
    totalKm,
    speedKmH: normalSpeed,
    speedDisplay,
    statusDisplay: 'In Transit',
    isMoving: true,
    elapsedHours: exactElapsedHours,
    remainingHours: exactRemainingHours,
    hoursCoveredStr: `${formatHoursAndMinutes(exactElapsedHours)} Elapsed`,
    hoursRemainingStr: `${formatHoursAndMinutes(exactRemainingHours)} Left`,
    etaString: formatEtaDate(arrivalDate),
  }
}


