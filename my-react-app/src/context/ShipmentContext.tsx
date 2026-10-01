import React, { createContext, useContext, useEffect, useState, useTransition } from 'react'
import type {
  AuditLog,
  Carrier,
  Checkpoint,
  HubNode,
  RateConfig,
  Shipment,
  ShipmentStatus,
  ShippingMode,
  UserAccount,
} from '../types'
import { apiService } from '../services/api'
import { calculateHaversineDistance } from '../utils/mapApis'

interface ShipmentContextType {
  shipments: Shipment[]
  carriers: Carrier[]
  users: UserAccount[]
  currentUser: UserAccount
  rateConfig: RateConfig
  hubNodes: HubNode[]
  auditLogs: AuditLog[]
  telemetryActive: boolean
  telemetryPackets: Array<{ id: string; time: string; waybill: string; lat: number; lng: number; speed: string; altitude?: string }>
  getShipment: (waybill: string) => Shipment | undefined
  createShipment: (data: Partial<Shipment>) => Shipment
  updateShipment: (waybill: string, data: Partial<Shipment>) => void
  deleteShipment: (waybill: string) => Promise<void>
  pushCheckpoint: (waybill: string, checkpoint: Omit<Checkpoint, 'id' | 'timestamp'>) => void
  updateShipmentStatus: (waybill: string, status: ShipmentStatus, note?: string) => void
  generateWaybillCode: () => string
  calculateRate: (mode: ShippingMode, weightKg: number, declaredValue?: number) => number
  addCarrier: (carrier: Omit<Carrier, 'id'>) => void
  updateCarrier: (id: string, carrier: Partial<Carrier>) => void
  toggleCarrierStatus: (id: string) => void
  updateRateConfig: (config: Partial<RateConfig>) => void
  updateUser: (id: string, data: Partial<UserAccount>) => void
  addUser: (user: Omit<UserAccount, 'id'>) => void
  switchUser: (id: string) => void
  toggleTelemetry: () => void
  addAuditLog: (
    action: string,
    category: AuditLog['category'],
    details: string,
    severity?: AuditLog['severity'],
    waybill?: string
  ) => void
  resetToDefaultData: () => void
}

const INITIAL_CARRIERS: Carrier[] = [
  {
    id: 'c1',
    name: 'DHL Express',
    code: 'DHL',
    mode: ['air', 'land'],
    logoUrl: 'https://www.packagepilottracker.com/photos/dhl-logo.svg',
    slaScore: 99.4,
    activeFleet: 1420,
    baseRateMultiplier: 1.15,
    status: 'active',
    contact: 'ops@dhl-express.com',
    coverage: 'Global / 220+ Countries',
  },
  {
    id: 'c2',
    name: 'FedEx Priority',
    code: 'FDX',
    mode: ['air', 'land'],
    logoUrl: 'https://www.packagepilottracker.com/_next/image?url=%2Fphotos%2Ffedex.png&w=828&q=75',
    slaScore: 98.9,
    activeFleet: 980,
    baseRateMultiplier: 1.1,
    status: 'active',
    contact: 'dispatch@fedex.com',
    coverage: 'Americas, EMEA, APAC',
  },
  {
    id: 'c3',
    name: 'UPS Worldwide',
    code: 'UPS',
    mode: ['air', 'land'],
    logoUrl: 'https://www.packagepilottracker.com/photos/ups.svg',
    slaScore: 98.6,
    activeFleet: 1100,
    baseRateMultiplier: 1.05,
    status: 'active',
    contact: 'cargo@ups.com',
    coverage: 'Global Multi-Modal',
  },
  {
    id: 'c4',
    name: 'USPS Priority',
    code: 'USPS',
    mode: ['land', 'air'],
    logoUrl: 'https://www.packagepilottracker.com/photos/usps.svg',
    slaScore: 96.8,
    activeFleet: 820,
    baseRateMultiplier: 0.9,
    status: 'active',
    contact: 'support@usps.gov',
    coverage: 'Domestic & International Postal',
  },
  {
    id: 'c5',
    name: 'Maersk Intermodal',
    code: 'MSK',
    mode: ['sea', 'land'],
    logoUrl: 'https://www.packagepilottracker.com/_next/image?url=%2Fphotos%2FMaersk.png&w=828&q=75',
    slaScore: 97.5,
    activeFleet: 450,
    baseRateMultiplier: 0.85,
    status: 'active',
    contact: 'maritime@maersk.com',
    coverage: 'Worldwide Ocean & Container Corridors',
  },
]

const INITIAL_USERS: UserAccount[] = [
  {
    id: 'u1',
    name: 'Admin Chief Controller',
    email: 'admin@northstar-freight.com',
    role: 'admin',
    companyName: 'Northstar Global Ops HQ',
    billingAddress: '350 5th Ave, New York, NY 10118',
    taxId: 'US-99-887766',
    creditBalance: 500000,
    tier: 'Enterprise Gold',
    status: 'active',
    lastLogin: 'Just now',
  },
  {
    id: 'u2',
    name: 'Jordan Smith (Acme Corp)',
    email: 'jordan@acmecorp.com',
    role: 'client',
    companyName: 'Acme Corporation',
    billingAddress: '1200 Market Street, San Francisco, CA',
    taxId: 'US-82-312901',
    creditBalance: 24500,
    tier: 'Enterprise Gold',
    status: 'active',
    lastLogin: '2 hours ago',
  },
  {
    id: 'u3',
    name: 'Riley Chen (Apex Biotech)',
    email: 'riley@apexbiotech.com',
    role: 'client',
    companyName: 'Apex Biotech International',
    billingAddress: '88 Bio Parkway, Cambridge, MA',
    taxId: 'US-44-129482',
    creditBalance: 12000,
    tier: 'Standard',
    status: 'active',
    lastLogin: 'Yesterday',
  },
  {
    id: 'u4',
    name: 'Marcus Vance (Ops Dispatch)',
    email: 'marcus.v@northstar-ops.com',
    role: 'ops',
    companyName: 'Northstar Air Linehaul',
    billingAddress: '1000 O\'Hare Access Rd, Chicago, IL',
    taxId: 'US-11-992834',
    creditBalance: 0,
    tier: 'Standard',
    status: 'active',
    lastLogin: '10 mins ago',
  },
]

const INITIAL_RATE_CONFIG: RateConfig = {
  airPerKg: 14.5,
  seaPerKg: 3.2,
  landPerKg: 5.8,
  fuelSurchargePct: 12.5,
  customsClearanceFee: 45.0,
  peakSeasonMultiplier: 1.0,
}

const INITIAL_HUB_NODES: HubNode[] = [
  { id: 'h1', name: 'Chicago O\'Hare International', code: 'ORD', lat: 41.9742, lng: -87.9073, status: 'ONLINE', latencyMs: 12, activeConsignments: 142, region: 'Americas' },
  { id: 'h2', name: 'Frankfurt Airport Hub', code: 'FRA', lat: 50.0379, lng: 8.5622, status: 'ONLINE', latencyMs: 24, activeConsignments: 198, region: 'Europe' },
  { id: 'h3', name: 'London Heathrow Gateway', code: 'LHR', lat: 51.4700, lng: -0.4543, status: 'ONLINE', latencyMs: 18, activeConsignments: 165, region: 'Europe' },
  { id: 'h4', name: 'Dubai Cargo Mega Terminal', code: 'DXB', lat: 25.2532, lng: 55.3657, status: 'ONLINE', latencyMs: 38, activeConsignments: 210, region: 'Middle East' },
  { id: 'h5', name: 'Singapore Changi Airfreight', code: 'SIN', lat: 1.3644, lng: 103.9915, status: 'ONLINE', latencyMs: 42, activeConsignments: 174, region: 'Asia-Pacific' },
  { id: 'h6', name: 'New York JFK Worldport', code: 'JFK', lat: 40.6413, lng: -73.7781, status: 'ONLINE', latencyMs: 14, activeConsignments: 230, region: 'Americas' },
]

const INITIAL_SHIPMENTS: Shipment[] = [
  {
    id: 's0',
    waybill: 'PLOT-70955-JFD',
    carrier: 'DHL Express',
    carrierCode: 'DHL',
    mode: 'air',
    origin: { name: 'New York JFK Cargo Terminal, USA', code: 'JFK', lat: 40.6413, lng: -73.7781 },
    destination: { name: 'London Heathrow Gateway Hub, UK', code: 'LHR', lat: 51.4700, lng: -0.4543 },
    currentLocation: { name: 'Transatlantic Flight Corridor', lat: 48.5, lng: -35.2 },
    status: 'in_transit',
    statusNote: 'In transit via transatlantic priority express airway DH-709',
    weightKg: 18.0,
    packageCount: 1,
    declaredValue: 5400,
    clientReference: 'info@sourcecardstcg.com',
    clientName: 'Source Cards TCG',
    clientEmail: 'info@sourcecardstcg.com',
    clientId: 'u2',
    rate: 46.0,
    eta: 'Today, 04:28 PM',
    createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
    assignedDriver: 'Capt. C. Lin',
    vehicleId: 'Boeing 767-300F / DH-709',
    telemetryActive: true,
    progressPct: 65,
    estimatedDistanceKm: 5560,
    serviceTier: 'PRIORITY EXPRESS',
    isCustomerBooking: true,
    isMovementStopped: false,
    checkpoints: [
      {
        id: 'cp-01',
        title: 'Shipment booked & manifests generated',
        detail: 'Pre-clearance documentation transmitted to UK Border Force',
        location: 'New York, NY, USA',
        time: 'Today · 08:00',
        timestamp: new Date(Date.now() - 3600000 * 8).toISOString(),
        lat: 40.6413,
        lng: -73.7781,
        eventType: 'booked',
        status: 'pending',
        completed: true,
      },
      {
        id: 'cp-02',
        title: 'Collected from JFK freight terminal',
        detail: 'Cargo inspected and cleared export customs screening',
        location: 'JFK Air Cargo Center (JFK)',
        time: 'Today · 10:30',
        timestamp: new Date(Date.now() - 3600000 * 5.5).toISOString(),
        lat: 40.6413,
        lng: -73.7781,
        eventType: 'pickup',
        status: 'in_transit',
        completed: true,
      },
      {
        id: 'cp-03',
        title: 'Departed transatlantic air corridor',
        detail: 'Airborne cruising at 34,000 ft en route to London Heathrow',
        location: 'Transatlantic Flight Corridor',
        time: 'Today · 13:15',
        timestamp: new Date(Date.now() - 3600000 * 2.8).toISOString(),
        lat: 48.5,
        lng: -35.2,
        eventType: 'in_transit',
        status: 'in_transit',
        completed: true,
        current: true,
      },
    ],
    documents: [
      { id: 'd01', name: 'Master Air Waybill (PLOT-70955)', type: 'label', size: '280 KB', date: 'Today' },
      { id: 'd02', name: 'Commercial Invoice & Export SAD', type: 'customs', size: '490 KB', date: 'Today' },
    ],
  },
  {
    id: 's1',
    waybill: 'PLOT-99420-CT4',
    carrier: 'DHL Express',
    carrierCode: 'DHL',
    mode: 'air',
    origin: { name: 'New York, NY (JFK)', code: 'JFK', lat: 40.6413, lng: -73.7781 },
    destination: { name: 'London, UK (LHR)', code: 'LHR', lat: 51.47, lng: -0.4543 },
    currentLocation: { name: 'Mid-Atlantic Waypoint 44°N 32°W', lat: 44.2, lng: -32.5 },
    status: 'in_transit',
    statusNote: 'Cruising at FL380 on transatlantic speed corridor',
    weightKg: 14.5,
    packageCount: 2,
    declaredValue: 4850,
    clientReference: 'ACM-2026-994',
    clientName: 'Acme Corporation',
    clientId: 'u2',
    rate: 420.0,
    eta: 'Today 18:30 GMT',
    createdAt: new Date(Date.now() - 3600000 * 6).toISOString(),
    assignedDriver: 'Capt. E. Lindqvist (Flight DH-882)',
    vehicleId: 'Airbus A330-200F / Reg N-884DH',
    telemetryActive: true,
    progressPct: 62,
    estimatedDistanceKm: 5560,
    checkpoints: [
      {
        id: 'cp-1',
        title: 'Shipment booked & manifests generated',
        detail: 'Pre-clearance electronic paperwork submitted to UK Border Force',
        location: 'New York, NY (JFK)',
        time: '08:42 EDT',
        timestamp: new Date(Date.now() - 3600000 * 6).toISOString(),
        lat: 40.6413,
        lng: -73.7781,
        eventType: 'booked',
        status: 'pending',
        completed: true,
      },
      {
        id: 'cp-2',
        title: 'Picked up from sender origin facility',
        detail: 'Cargo inspected and weighed at JFK South Gate Hub',
        location: 'Queens, New York',
        time: '10:16 EDT',
        timestamp: new Date(Date.now() - 3600000 * 4.5).toISOString(),
        lat: 40.66,
        lng: -73.79,
        eventType: 'pickup',
        status: 'in_transit',
        completed: true,
      },
      {
        id: 'cp-3',
        title: 'Departed origin international gateway',
        detail: 'Flight DHL-882 departed JFK Runway 31L en route to London Heathrow',
        location: 'John F. Kennedy International (JFK)',
        time: '12:30 EDT',
        timestamp: new Date(Date.now() - 3600000 * 2.5).toISOString(),
        lat: 40.6413,
        lng: -73.7781,
        eventType: 'in_transit',
        status: 'in_transit',
        completed: true,
        current: true,
      },
      {
        id: 'cp-4',
        title: 'Arrival & Customs pre-clearance',
        detail: 'Scheduled touch down at LHR Cargo Center and rapid customs intake',
        location: 'London Heathrow (LHR)',
        time: '17:45 GMT (Est.)',
        timestamp: new Date(Date.now() + 3600000 * 3).toISOString(),
        lat: 51.47,
        lng: -0.4543,
        eventType: 'customs',
        status: 'customs',
        completed: false,
      },
      {
        id: 'cp-5',
        title: 'Out for final priority delivery',
        detail: 'Dispatched to central London corporate address',
        location: 'Central London, UK',
        time: '19:15 GMT (Est.)',
        timestamp: new Date(Date.now() + 3600000 * 5).toISOString(),
        lat: 51.5074,
        lng: -0.1278,
        eventType: 'out_for_delivery',
        status: 'delivered',
        completed: false,
      },
    ],
    documents: [
      { id: 'd1', name: 'Air Waybill (AWB-99420)', type: 'label', size: '240 KB', date: 'Today' },
      { id: 'd2', name: 'Commercial Customs Invoice', type: 'customs', size: '512 KB', date: 'Today' },
      { id: 'd3', name: 'Dangerous Goods Declaration (Exempt)', type: 'invoice', size: '180 KB', date: 'Today' },
    ],
  },
  {
    id: 's2',
    waybill: 'PLOT-11280-FT2',
    carrier: 'Maersk Intermodal',
    carrierCode: 'MSK',
    mode: 'sea',
    origin: { name: 'Port of Houston, TX', code: 'HOU', lat: 29.7604, lng: -95.3698 },
    destination: { name: 'Port of Rotterdam, NL', code: 'RTM', lat: 51.9244, lng: 4.4777 },
    currentLocation: { name: 'English Channel Approaches', lat: 49.8, lng: -3.4 },
    status: 'customs',
    statusNote: 'Customs declaration under automated EU entry clearance review',
    weightKg: 12400,
    packageCount: 1,
    declaredValue: 98000,
    clientReference: 'ACM-SEA-8841',
    clientName: 'Acme Corporation',
    clientId: 'u2',
    rate: 3450.0,
    eta: 'In 2 days (Oct 1)',
    createdAt: new Date(Date.now() - 3600000 * 24 * 14).toISOString(),
    assignedDriver: 'Capt. H. Sorensen (Vessel Madrid Maersk)',
    vehicleId: 'Container Vessel / IMO 9778800',
    telemetryActive: true,
    progressPct: 88,
    estimatedDistanceKm: 8120,
    checkpoints: [
      {
        id: 'cp-21',
        title: 'Container sealed & loaded at Houston Terminal',
        detail: '40ft High Cube Container MSKU-882910 loaded aboard vessel',
        location: 'Houston Bayport Terminal',
        time: 'Sep 15 · 14:00',
        timestamp: new Date(Date.now() - 3600000 * 24 * 14).toISOString(),
        lat: 29.76,
        lng: -95.37,
        eventType: 'dispatched',
        status: 'pending',
        completed: true,
      },
      {
        id: 'cp-22',
        title: 'Transatlantic ocean passage',
        detail: 'Deep sea corridor transit completed without weather delays',
        location: 'Mid-Atlantic Corridor',
        time: 'Sep 24 · 09:30',
        timestamp: new Date(Date.now() - 3600000 * 24 * 5).toISOString(),
        lat: 45.0,
        lng: -25.0,
        eventType: 'in_transit',
        status: 'in_transit',
        completed: true,
      },
      {
        id: 'cp-23',
        title: 'European Union Customs documentation inspection',
        detail: 'Awaiting routine phytosanitary certificate verification',
        location: 'Rotterdam Maasvlakte Gateway',
        time: 'Today · 06:15',
        timestamp: new Date(Date.now() - 3600000 * 4).toISOString(),
        lat: 51.92,
        lng: 4.47,
        eventType: 'customs_hold',
        status: 'customs',
        completed: true,
        current: true,
      },
    ],
    documents: [
      { id: 'd21', name: 'Ocean Bill of Lading (MSK-11280)', type: 'label', size: '1.2 MB', date: 'Sep 15' },
      { id: 'd22', name: 'EU Import Manifest (SAD Form)', type: 'customs', size: '640 KB', date: 'Today' },
    ],
  },
  {
    id: 's3',
    waybill: 'PLOT-77812-QA1',
    carrier: 'FedEx Priority',
    carrierCode: 'FDX',
    mode: 'air',
    origin: { name: 'Chicago, IL (ORD)', code: 'ORD', lat: 41.9742, lng: -87.9073 },
    destination: { name: 'Dubai, UAE (DXB)', code: 'DXB', lat: 25.2532, lng: 55.3657 },
    currentLocation: { name: 'Dubai South Logistics District', lat: 25.2532, lng: 55.3657 },
    status: 'delivered',
    statusNote: 'Delivered and signed by M. Al-Maktoum / Logistics Desk',
    weightKg: 8.2,
    packageCount: 1,
    declaredValue: 3100,
    clientReference: 'APX-DXB-019',
    clientName: 'Apex Biotech International',
    clientId: 'u3',
    rate: 285.0,
    eta: 'Delivered',
    createdAt: new Date(Date.now() - 3600000 * 48).toISOString(),
    assignedDriver: 'T. Rashid (FedEx Courier #419)',
    vehicleId: 'Mercedes Sprinter EV / DXB-9912',
    telemetryActive: false,
    progressPct: 100,
    estimatedDistanceKm: 11640,
    checkpoints: [
      {
        id: 'cp-31',
        title: 'Booked & collected from Chicago cold-storage hub',
        detail: 'Temperature validated at 4°C continuous',
        location: 'Chicago, IL',
        time: 'Sep 27 · 09:00',
        timestamp: new Date(Date.now() - 3600000 * 48).toISOString(),
        lat: 41.97,
        lng: -87.9,
        eventType: 'booked',
        status: 'pending',
        completed: true,
      },
      {
        id: 'cp-32',
        title: 'Arrived at Dubai International Cargo Mega Terminal',
        detail: 'Customs cleared through rapid green lane',
        location: 'Dubai, UAE',
        time: 'Sep 28 · 16:40',
        timestamp: new Date(Date.now() - 3600000 * 18).toISOString(),
        lat: 25.25,
        lng: 55.36,
        eventType: 'customs_cleared',
        status: 'in_transit',
        completed: true,
      },
      {
        id: 'cp-33',
        title: 'Consignment safely delivered & signed',
        detail: 'Proof of delivery recorded with photo verification',
        location: 'Dubai South Zone 4',
        time: 'Today · 11:20',
        timestamp: new Date(Date.now() - 3600000 * 3).toISOString(),
        lat: 25.25,
        lng: 55.36,
        eventType: 'delivered',
        status: 'delivered',
        completed: true,
        current: true,
      },
    ],
    documents: [
      { id: 'd31', name: 'Signed Proof of Delivery (POD)', type: 'pod', size: '380 KB', date: 'Today' },
      { id: 'd32', name: 'Cold-Chain Data Logger Log', type: 'customs', size: '820 KB', date: 'Today' },
    ],
  },
  {
    id: 's4',
    waybill: 'PLOT-55290-HM7',
    carrier: 'UPS Worldwide',
    carrierCode: 'UPS',
    mode: 'land',
    origin: { name: 'Toronto, ON (YYZ)', code: 'YYZ', lat: 43.6777, lng: -79.6248 },
    destination: { name: 'Detroit, MI (DTW)', code: 'DTW', lat: 42.2162, lng: -83.3554 },
    currentLocation: { name: 'Ambassador Bridge Crossing (Windsor/Detroit)', lat: 42.312, lng: -83.074 },
    status: 'exception',
    statusNote: 'Cross-border secondary customs inspection delayed transit by 2 hours',
    weightKg: 42.0,
    packageCount: 3,
    declaredValue: 6200,
    clientReference: 'ACM-CAN-114',
    clientName: 'Acme Corporation',
    clientId: 'u2',
    rate: 195.0,
    eta: 'Delayed / Reviewing',
    createdAt: new Date(Date.now() - 3600000 * 12).toISOString(),
    assignedDriver: 'Driver G. Bouchard (Linehaul 902)',
    vehicleId: 'Freightliner Cascadia / Plate ON-7782A',
    telemetryActive: true,
    progressPct: 70,
    estimatedDistanceKm: 370,
    checkpoints: [
      {
        id: 'cp-41',
        title: 'Departed Toronto linehaul hub',
        detail: 'Manifest transmitted to US Customs Border Protection (CBP)',
        location: 'Mississauga, ON',
        time: 'Today · 05:30',
        timestamp: new Date(Date.now() - 3600000 * 8).toISOString(),
        lat: 43.67,
        lng: -79.62,
        eventType: 'dispatched',
        status: 'in_transit',
        completed: true,
      },
      {
        id: 'cp-42',
        title: 'Cross-border delay & inspection notice',
        detail: 'Commercial vehicle selected for automated secondary x-ray scan',
        location: 'Ambassador Bridge Port of Entry',
        time: 'Today · 10:15',
        timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
        lat: 42.31,
        lng: -83.07,
        eventType: 'exception',
        status: 'exception',
        completed: true,
        current: true,
      },
    ],
    documents: [
      { id: 'd41', name: 'US/Canada In-Bond Waybill', type: 'label', size: '210 KB', date: 'Today' },
      { id: 'd42', name: 'CBP Form 7512 Transit Manifest', type: 'customs', size: '440 KB', date: 'Today' },
    ],
  },
  {
    id: 's5',
    waybill: 'PLOT-33190-KL5',
    carrier: 'DHL Express',
    carrierCode: 'DHL',
    mode: 'air',
    origin: { name: 'Frankfurt, DE (FRA)', code: 'FRA', lat: 50.0379, lng: 8.5622 },
    destination: { name: 'Singapore (SIN)', code: 'SIN', lat: 1.3644, lng: 103.9915 },
    currentLocation: { name: 'Arabian Sea Airway P574', lat: 18.5, lng: 66.2 },
    status: 'in_transit',
    statusNote: 'En route non-stop scheduled cargo flight LH8402',
    weightKg: 28.0,
    packageCount: 4,
    declaredValue: 14500,
    clientReference: 'APX-SIN-552',
    clientName: 'Apex Biotech International',
    clientId: 'u3',
    rate: 680.0,
    eta: 'Tomorrow 06:00 SGT',
    createdAt: new Date(Date.now() - 3600000 * 10).toISOString(),
    assignedDriver: 'Capt. V. Weber (Flight LH-8402)',
    vehicleId: 'Boeing 777F / D-ALFA',
    telemetryActive: true,
    progressPct: 54,
    estimatedDistanceKm: 10280,
    checkpoints: [
      {
        id: 'cp-51',
        title: 'Consignment secured at Frankfurt CargoCity Süd',
        detail: 'Pharma temperature-controlled pallet built and sealed',
        location: 'Frankfurt CargoCity (FRA)',
        time: 'Yesterday · 22:15',
        timestamp: new Date(Date.now() - 3600000 * 10).toISOString(),
        lat: 50.03,
        lng: 8.56,
        eventType: 'booked',
        status: 'pending',
        completed: true,
      },
      {
        id: 'cp-52',
        title: 'Airborne direct linehaul to Singapore',
        detail: 'Departed Frankfurt Runway 18 en route to Changi',
        location: 'Frankfurt International (FRA)',
        time: 'Today · 02:40',
        timestamp: new Date(Date.now() - 3600000 * 7).toISOString(),
        lat: 50.03,
        lng: 8.56,
        eventType: 'in_transit',
        status: 'in_transit',
        completed: true,
        current: true,
      },
    ],
    documents: [
      { id: 'd51', name: 'Master Air Waybill (MAWB-33190)', type: 'label', size: '310 KB', date: 'Yesterday' },
      { id: 'd52', name: 'EU Export Declaration (EAD)', type: 'customs', size: '490 KB', date: 'Yesterday' },
    ],
  },
]

const INITIAL_AUDIT_LOGS: AuditLog[] = [
  {
    id: 'log-1',
    timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
    user: 'Admin Chief Controller',
    action: 'CHECKPOINT_PUSHED',
    category: 'CHECKPOINT',
    waybill: 'PLOT-99420-CT4',
    details: 'Pushed event "Departed origin international gateway" with lat 40.64, lng -73.77',
    severity: 'info',
  },
  {
    id: 'log-2',
    timestamp: new Date(Date.now() - 3600000 * 3.5).toISOString(),
    user: 'Marcus Vance (Ops)',
    action: 'STATUS_EXCEPTION_LOGGED',
    category: 'SHIPMENT',
    waybill: 'PLOT-55290-HM7',
    details: 'Flagged border delay at Ambassador Bridge port of entry. SLA adjusted.',
    severity: 'warning',
  },
  {
    id: 'log-3',
    timestamp: new Date(Date.now() - 3600000 * 5).toISOString(),
    user: 'Admin Chief Controller',
    action: 'RATE_CONFIG_UPDATED',
    category: 'RATES',
    details: 'Adjusted global fuel surcharge index from 11.8% to 12.5% based on IATA index.',
    severity: 'info',
  },
  {
    id: 'log-4',
    timestamp: new Date(Date.now() - 3600000 * 8).toISOString(),
    user: 'Jordan Smith (Acme)',
    action: 'SHIPMENT_CREATED',
    category: 'SHIPMENT',
    waybill: 'PLOT-99420-CT4',
    details: 'Booked priority express air freight NYC -> LHR (14.5 kg, $420.00)',
    severity: 'info',
  },
]

const STORAGE_KEYS = {
  SHIPMENTS: 'packagepilot_shipments_v2',
  CARRIERS: 'packagepilot_carriers_v2',
  USERS: 'packagepilot_users_v2',
  RATES: 'packagepilot_rates_v2',
  LOGS: 'packagepilot_logs_v2',
  CURRENT_USER: 'packagepilot_current_user_v2',
}

const ShipmentContext = createContext<ShipmentContextType | undefined>(undefined)

export function ShipmentProvider({ children }: { children: React.ReactNode }) {
  const [, startTransition] = useTransition()

  const [shipments, setShipments] = useState<Shipment[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SHIPMENTS)
      return saved ? JSON.parse(saved) : INITIAL_SHIPMENTS
    } catch {
      return INITIAL_SHIPMENTS
    }
  })

  const [carriers, setCarriers] = useState<Carrier[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CARRIERS)
      return saved ? JSON.parse(saved) : INITIAL_CARRIERS
    } catch {
      return INITIAL_CARRIERS
    }
  })

  const [users, setUsers] = useState<UserAccount[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.USERS)
      return saved ? JSON.parse(saved) : INITIAL_USERS
    } catch {
      return INITIAL_USERS
    }
  })

  const [currentUser, setCurrentUser] = useState<UserAccount>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CURRENT_USER)
      if (saved) return JSON.parse(saved)
      return INITIAL_USERS[0] // default admin
    } catch {
      return INITIAL_USERS[0]
    }
  })

  const [rateConfig, setRateConfig] = useState<RateConfig>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.RATES)
      return saved ? JSON.parse(saved) : INITIAL_RATE_CONFIG
    } catch {
      return INITIAL_RATE_CONFIG
    }
  })

  const [hubNodes] = useState<HubNode[]>(INITIAL_HUB_NODES)

  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.LOGS)
      return saved ? JSON.parse(saved) : INITIAL_AUDIT_LOGS
    } catch {
      return INITIAL_AUDIT_LOGS
    }
  })

  const [telemetryActive, setTelemetryActive] = useState<boolean>(true)
  const [telemetryPackets, setTelemetryPackets] = useState<Array<{ id: string; time: string; waybill: string; lat: number; lng: number; speed: string; altitude?: string }>>([])

  // Real-time synchronization with MongoDB Atlas backend across all devices
  useEffect(() => {
    let isCancelled = false

    const syncWithCloudDatabase = async () => {
      try {
        const cloudShipments = await apiService.getShipments()
        if (!isCancelled && Array.isArray(cloudShipments) && cloudShipments.length > 0) {
          setShipments((prev) => {
            const map = new Map<string, Shipment>()
            prev.forEach((s) => {
              if (s.waybill) map.set(s.waybill.toUpperCase(), s)
            })
            cloudShipments.forEach((cloudS) => {
              if (cloudS.waybill) {
                const key = cloudS.waybill.toUpperCase()
                const local = map.get(key)
                if (!local) {
                  map.set(key, cloudS)
                } else {
                  map.set(key, { ...local, ...cloudS })
                }
              }
            })
            return Array.from(map.values())
          })
        }
      } catch {
        // Silent fallback to local storage
      }
    }

    syncWithCloudDatabase()
    const pollInterval = setInterval(syncWithCloudDatabase, 6000)

    return () => {
      isCancelled = true
      clearInterval(pollInterval)
    }
  }, [])

  // Persist state to LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.SHIPMENTS, JSON.stringify(shipments))
    } catch {}
  }, [shipments])

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.CARRIERS, JSON.stringify(carriers))
    } catch {}
  }, [carriers])

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users))
    } catch {}
  }, [users])

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(currentUser))
    } catch {}
  }, [currentUser])

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.RATES, JSON.stringify(rateConfig))
    } catch {}
  }, [rateConfig])

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(auditLogs))
    } catch {}
  }, [auditLogs])

  const addAuditLog = (
    action: string,
    category: AuditLog['category'],
    details: string,
    severity: AuditLog['severity'] = 'info',
    waybill?: string
  ) => {
    const newLog: AuditLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      user: currentUser.name,
      action,
      category,
      waybill,
      details,
      severity,
    }
    setAuditLogs((prev) => [newLog, ...prev.slice(0, 99)])
  }

  const generateWaybillCode = (): string => {
    const randomNum = Math.floor(10000 + Math.random() * 90000)
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
    const char1 = chars.charAt(Math.floor(Math.random() * chars.length))
    const char2 = chars.charAt(Math.floor(Math.random() * chars.length))
    const digit = Math.floor(1 + Math.random() * 9)
    return `PLOT-${randomNum}-${char1}${char2}${digit}`
  }

  const calculateRate = (mode: ShippingMode, weightKg: number, declaredValue = 0): number => {
    let basePerKg = rateConfig.airPerKg
    if (mode === 'sea') basePerKg = rateConfig.seaPerKg
    if (mode === 'land') basePerKg = rateConfig.landPerKg

    const freightSubtotal = weightKg * basePerKg * rateConfig.peakSeasonMultiplier
    const fuelSurcharge = freightSubtotal * (rateConfig.fuelSurchargePct / 100)
    const insurance = declaredValue > 1000 ? declaredValue * 0.008 : 0
    const total = freightSubtotal + fuelSurcharge + rateConfig.customsClearanceFee + insurance
    return Math.max(45, Math.round(total * 100) / 100)
  }

  const getShipment = (waybill: string): Shipment | undefined => {
    if (!waybill) return undefined
    const clean = waybill.trim().toUpperCase()
    return shipments.find(
      (s) =>
        s.waybill.toUpperCase() === clean ||
        s.waybill.toUpperCase().replace(/^PLOT-/, 'NTS-') === clean ||
        s.waybill.toUpperCase().replace(/^NTS-/, 'PLOT-') === clean
    )
  }

  const createShipment = (data: Partial<Shipment>): Shipment => {
    const waybill = data.waybill || generateWaybillCode()
    const mode = data.mode || 'air'
    const weight = data.weightKg || 5.0
    const value = data.declaredValue || 1000
    const computedRate = data.rate || calculateRate(mode, weight, value)

    const origin = data.origin || { name: 'New York, NY (JFK)', code: 'JFK', lat: 40.6413, lng: -73.7781 }
    const destination = data.destination || { name: 'London, UK (LHR)', code: 'LHR', lat: 51.47, lng: -0.4543 }

    const newShipment: Shipment = {
      id: `s-${Date.now()}`,
      waybill,
      carrier: data.carrier || 'DHL Express',
      carrierCode: data.carrierCode || 'DHL',
      mode,
      origin,
      destination,
      currentLocation: data.currentLocation || origin,
      status: data.status || 'pending',
      statusNote: data.statusNote || (data.status === 'pending' ? 'Pending dispatch intake manifest' : 'Active linehaul movement'),
      weightKg: weight,
      packageCount: data.packageCount || 1,
      declaredValue: value,
      clientReference: data.clientReference || `REF-${Math.floor(1000 + Math.random() * 9000)}`,
      clientName: data.clientName || currentUser.companyName || 'Acme Corporation',
      clientEmail: data.clientEmail || currentUser.email,
      clientId: data.clientId || currentUser.id,
      rate: computedRate,
      eta: data.eta || 'Calculated on dispatch',
      createdAt: new Date().toISOString(),
      progressPct: data.progressPct ?? (data.status === 'delivered' ? 100 : data.status === 'in_transit' ? 45 : 5),
      telemetryActive: true,
      assignedDriver: data.assignedDriver || 'Amina Bello',
      vehicleId: data.vehicleId || 'VEH-101',
      senderName: data.senderName,
      senderEmail: data.senderEmail,
      senderPhone: data.senderPhone,
      receiverName: data.receiverName,
      receiverEmail: data.receiverEmail,
      receiverPhone: data.receiverPhone,
      packageImageUrl: data.packageImageUrl,
      transportScope: data.transportScope || 'International',
      cargoType: data.cargoType || 'Commercial Freight',
      bookingDate: data.bookingDate || new Date().toISOString(),
      estimatedDistanceKm:
        data.estimatedDistanceKm ||
        Math.max(50, Math.round(calculateHaversineDistance(origin.lat, origin.lng, destination.lat, destination.lng))),
      serviceTier: data.serviceTier || 'STANDARD',
      isCustomerBooking: data.isCustomerBooking ?? true,
      checkpoints: (data.checkpoints && data.checkpoints.length > 0) ? data.checkpoints : [
        {
          id: `cp-init-${Date.now()}`,
          title: 'Waybill created & booking logged',
          detail: `Initial cargo booking confirmed with ${data.carrier || 'DHL Express'}.`,
          location: origin.name,
          time: 'Just now',
          timestamp: new Date().toISOString(),
          lat: origin.lat,
          lng: origin.lng,
          eventType: 'booked',
          status: data.status || 'pending',
          completed: true,
          current: true,
        },
      ],
      documents: (data.documents && data.documents.length > 0) ? data.documents : [
        {
          id: `doc-awb-${Date.now()}`,
          name: `Waybill Label (${waybill})`,
          type: 'label',
          size: '220 KB',
          date: 'Just now',
        },
        {
          id: `doc-inv-${Date.now()}`,
          name: 'Electronic Manifest & Invoice',
          type: 'invoice',
          size: '410 KB',
          date: 'Just now',
        },
      ],
      ...data,
    }

    startTransition(() => {
      setShipments((prev) => [newShipment, ...prev])
    })

    // Persist to MongoDB backend
    apiService.createShipment(newShipment).catch(() => {})

    addAuditLog('SHIPMENT_CREATED', 'SHIPMENT', `Created waybill ${waybill} (${origin.name} -> ${destination.name})`, 'info', waybill)
    return newShipment
  }

  const updateShipment = (waybill: string, data: Partial<Shipment>) => {
    startTransition(() => {
      setShipments((prev) =>
        prev.map((s) => {
          if (s.waybill.toUpperCase() === waybill.toUpperCase()) {
            return { ...s, ...data }
          }
          return s
        })
      )
    })

    // Persist to MongoDB backend
    apiService.updateShipment(waybill, data).catch(() => {})

    addAuditLog('SHIPMENT_UPDATED', 'SHIPMENT', `Updated shipment ${waybill}`, 'info', waybill)
  }

  const deleteShipment = async (waybill: string) => {
    await apiService.deleteShipment(waybill)

    startTransition(() => {
      setShipments((prev) => prev.filter((s) => s.waybill.toUpperCase() !== waybill.toUpperCase()))
    })

    addAuditLog('SHIPMENT_DELETED', 'SHIPMENT', `Deleted shipment record ${waybill}`, 'warning', waybill)
  }

  const pushCheckpoint = (waybill: string, cp: Omit<Checkpoint, 'id' | 'timestamp'>) => {
    const timestamp = new Date().toISOString()
    const newCheckpoint: Checkpoint = {
      ...cp,
      id: `cp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp,
      completed: true,
      current: true,
    }

    let updatedPayload: Partial<Shipment> | null = null

    startTransition(() => {
      setShipments((prev) =>
        prev.map((s) => {
          if (s.waybill.toUpperCase() === waybill.toUpperCase()) {
            // mark previous checkpoints as not current
            const existing = (s.checkpoints || []).map((old) => ({ ...old, current: false }))
            const nextStatus = cp.status || s.status
            const nextLocation = cp.lat && cp.lng ? { name: cp.location, lat: cp.lat, lng: cp.lng } : s.currentLocation
            
            updatedPayload = {
              status: nextStatus,
              statusNote: cp.detail,
              currentLocation: nextLocation,
              checkpoints: [...existing, newCheckpoint],
            }

            return {
              ...s,
              ...updatedPayload,
            }
          }
          return s
        })
      )
    })

    // Persist checkpoint to MongoDB Atlas database
    if (updatedPayload) {
      apiService.updateShipment(waybill, updatedPayload).catch(() => {})
    }

    addAuditLog(
      'CHECKPOINT_PUSHED',
      'CHECKPOINT',
      `Pushed checkpoint "${cp.title}" at ${cp.location} (Status: ${cp.status})`,
      cp.status === 'exception' ? 'warning' : 'info',
      waybill
    )
  }

  const updateShipmentStatus = (waybill: string, status: ShipmentStatus, note?: string) => {
    startTransition(() => {
      setShipments((prev) =>
        prev.map((s) => {
          if (s.waybill.toUpperCase() === waybill.toUpperCase()) {
            return {
              ...s,
              status,
              statusNote: note || s.statusNote,
            }
          }
          return s
        })
      )
    })

    // Persist status change to MongoDB Atlas database
    apiService.updateShipment(waybill, {
      status,
      statusNote: note,
    }).catch(() => {})

    addAuditLog('STATUS_OVERRIDE', 'SHIPMENT', `Overrode status to "${status}" (Note: ${note || 'None'})`, status === 'exception' ? 'warning' : 'info', waybill)
  }

  const addCarrier = (carrier: Omit<Carrier, 'id'>) => {
    const newCarrier: Carrier = {
      ...carrier,
      id: `c-${Date.now()}`,
    }
    setCarriers((prev) => [...prev, newCarrier])
    addAuditLog('CARRIER_ADDED', 'CARRIER', `Added carrier partner ${carrier.name} (${carrier.code})`, 'info')
  }

  const updateCarrier = (id: string, data: Partial<Carrier>) => {
    setCarriers((prev) => prev.map((c) => (c.id === id ? { ...c, ...data } : c)))
    addAuditLog('CARRIER_UPDATED', 'CARRIER', `Updated carrier config for ID ${id}`, 'info')
  }

  const toggleCarrierStatus = (id: string) => {
    setCarriers((prev) =>
      prev.map((c) => {
        if (c.id === id) {
          const nextStatus = c.status === 'active' ? 'suspended' : 'active'
          addAuditLog('CARRIER_STATUS_TOGGLE', 'CARRIER', `Changed ${c.name} status to ${nextStatus}`, 'warning')
          return { ...c, status: nextStatus }
        }
        return c
      })
    )
  }

  const updateRateConfig = (config: Partial<RateConfig>) => {
    setRateConfig((prev) => ({ ...prev, ...config }))
    addAuditLog('RATES_UPDATED', 'RATES', `Updated pricing engine parameters: ${JSON.stringify(config)}`, 'info')
  }

  const updateUser = (id: string, data: Partial<UserAccount>) => {
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, ...data } : u)))
    if (currentUser.id === id) {
      setCurrentUser((prev) => ({ ...prev, ...data }))
    }
    addAuditLog('USER_UPDATED', 'SECURITY', `Updated user account ${id}`, 'info')
  }

  const addUser = (user: Omit<UserAccount, 'id'>) => {
    const newUser: UserAccount = {
      ...user,
      id: `u-${Date.now()}`,
    }
    setUsers((prev) => [...prev, newUser])
    addAuditLog('USER_CREATED', 'SECURITY', `Created new user ${user.name} (${user.email}) as role ${user.role}`, 'info')
  }

  const switchUser = (id: string) => {
    const target = users.find((u) => u.id === id)
    if (target) {
      setCurrentUser(target)
      addAuditLog('USER_SWITCHED', 'SECURITY', `Admin switched active session to ${target.name} (${target.role})`, 'info')
    }
  }

  const toggleTelemetry = () => {
    setTelemetryActive((prev) => {
      const next = !prev
      addAuditLog('TELEMETRY_TOGGLED', 'TELEMETRY', `Simulated 4-second telemetry engine is now ${next ? 'ACTIVE' : 'PAUSED'}`, 'info')
      return next
    })
  }

  const resetToDefaultData = () => {
    setShipments(INITIAL_SHIPMENTS)
    setCarriers(INITIAL_CARRIERS)
    setUsers(INITIAL_USERS)
    setCurrentUser(INITIAL_USERS[0])
    setRateConfig(INITIAL_RATE_CONFIG)
    setAuditLogs(INITIAL_AUDIT_LOGS)
    try {
      localStorage.removeItem(STORAGE_KEYS.SHIPMENTS)
      localStorage.removeItem(STORAGE_KEYS.CARRIERS)
      localStorage.removeItem(STORAGE_KEYS.USERS)
      localStorage.removeItem(STORAGE_KEYS.CURRENT_USER)
      localStorage.removeItem(STORAGE_KEYS.RATES)
      localStorage.removeItem(STORAGE_KEYS.LOGS)
    } catch {}
  }

  // 4-Second Live Telemetry Simulator:
  // Smoothly moves in_transit shipments along their routes and emits telemetry packets.
  // Stationary when pending approval or when movement is stopped by admin.
  useEffect(() => {
    if (!telemetryActive) return

    const interval = setInterval(() => {
      setShipments((prevShipments) => {
        let hasUpdated = false
        const next = prevShipments.map((shipment) => {
          // Stationary cases: pending approval, delivered, exception/stopped, or inactive telemetry
          if (
            shipment.status !== 'in_transit' ||
            !shipment.telemetryActive ||
            shipment.isMovementStopped
          ) {
            return shipment
          }

          hasUpdated = true
          const curPct = shipment.progressPct ?? 0

          // Calculate step and speed based on mode:
          // Land: normal driving speed (approx 70-90 km/h on highway, with occasional traffic/waypoint pause)
          // Air: cruising speed (approx 850 km/h)
          // Sea: maritime cruising (approx 20 kts)
          let step = 0.35
          let speedDisplay = '80 km/h'
          let altitudeDisplay: string | undefined = undefined

          if (shipment.mode === 'land') {
            // 15% chance of simulated traffic light / waypoint intersection pause
            const isTrafficPause = Math.random() < 0.15
            if (isTrafficPause) {
              const pauseSpeed = Math.floor(15 + Math.random() * 20)
              speedDisplay = `${pauseSpeed} km/h (Toll / Traffic Slowdown)`
              step = 0.08
            } else {
              const currentSpeed = Math.floor(75 + Math.random() * 15) // 75 - 90 km/h normal driving speed
              speedDisplay = `${currentSpeed} km/h`
              step = Math.random() * 0.35 + 0.2 // 0.20% - 0.55% steady road progression
            }
          } else if (shipment.mode === 'sea') {
            const currentSpeed = (18 + Math.random() * 4).toFixed(1)
            speedDisplay = `${currentSpeed} kts`
            step = Math.random() * 0.25 + 0.1
          } else {
            // Air
            const currentSpeed = Math.floor(830 + Math.random() * 50)
            const currentAlt = Math.floor(34000 + Math.random() * 4000)
            speedDisplay = `${currentSpeed} km/h`
            altitudeDisplay = `${currentAlt} ft`
            step = Math.random() * 0.5 + 0.3
          }

          const nextPct = Math.min(100, curPct + step)

          // Interpolate lat / lng along origin -> destination corridor strictly from progress percentage
          const lat = shipment.origin.lat + (shipment.destination.lat - shipment.origin.lat) * (nextPct / 100)
          const lng = shipment.origin.lng + (shipment.destination.lng - shipment.origin.lng) * (nextPct / 100)

          // Emit packet
          const packet = {
            id: `pkt-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            time: new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            waybill: shipment.waybill,
            lat: Math.round(lat * 10000) / 10000,
            lng: Math.round(lng * 10000) / 10000,
            speed: speedDisplay,
            altitude: altitudeDisplay,
          }

          setTelemetryPackets((pkts) => [packet, ...pkts.slice(0, 49)])

          const isNowDelivered = nextPct >= 100

          return {
            ...shipment,
            progressPct: Math.round(nextPct * 10) / 10,
            status: isNowDelivered ? ('delivered' as ShipmentStatus) : shipment.status,
            statusNote: isNowDelivered
              ? 'Consignment arrived at destination terminal and cleared final receipt.'
              : shipment.mode === 'land'
              ? `En route overland corridor at ${speedDisplay}. Telemetry synchronized.`
              : `En route active corridor at ${speedDisplay}. Telemetry synchronized.`,
            currentLocation: {
              name: isNowDelivered
                ? shipment.destination.name
                : `Corridor Vector (${lat.toFixed(2)}°, ${lng.toFixed(2)}°)`,
              lat,
              lng,
            },
          }
        })

        return hasUpdated ? next : prevShipments
      })
    }, 4000)

    return () => clearInterval(interval)
  }, [telemetryActive])

  return (
    <ShipmentContext.Provider
      value={{
        shipments,
        carriers,
        users,
        currentUser,
        rateConfig,
        hubNodes,
        auditLogs,
        telemetryActive,
        telemetryPackets,
        getShipment,
        createShipment,
        updateShipment,
        deleteShipment,
        pushCheckpoint,
        updateShipmentStatus,
        generateWaybillCode,
        calculateRate,
        addCarrier,
        updateCarrier,
        toggleCarrierStatus,
        updateRateConfig,
        updateUser,
        addUser,
        switchUser,
        toggleTelemetry,
        addAuditLog,
        resetToDefaultData,
      }}
    >
      {children}
    </ShipmentContext.Provider>
  )
}

export function useShipments() {
  const context = useContext(ShipmentContext)
  if (!context) {
    throw new Error('useShipments must be used within a ShipmentProvider')
  }
  return context
}
