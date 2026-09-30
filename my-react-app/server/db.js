import mongoose from 'mongoose'
import { Shipment } from './models/Shipment.js'
import { Carrier } from './models/Carrier.js'
import { Inquiry } from './models/Inquiry.js'
import { ChatSession } from './models/Chat.js'
import { Settings } from './models/Settings.js'

export async function connectDB() {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/northstar_tracking'

  try {
    mongoose.set('strictQuery', false)
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 8000,
    })
    console.log(`[MongoDB] Connected successfully to: ${uri.replace(/\/\/.*@/, '//<hidden_credentials>@')}`)

    // Auto-seed initial data if empty
    await seedInitialData()
  } catch (err) {
    console.error(`[MongoDB] Connection error:`, err.message)
  }
}

async function seedInitialData() {
  try {
    const shipmentCount = await Shipment.countDocuments()
    if (shipmentCount === 0) {
      console.log('[MongoDB] Seeding initial freight consignments...')
      await Shipment.insertMany([
        {
          waybill: 'PLOT-70955-JFD',
          clientName: 'Source Cards TCG',
          clientEmail: 'info@sourcecardstcg.com',
          clientReference: 'PO-88219-TCG',
          senderName: 'Apex International Logistics Hub',
          senderEmail: 'dispatch@apexlogistics.com',
          senderPhone: '+1 (555) 234-8901',
          receiverName: 'Source Cards TCG Logistics',
          receiverEmail: 'info@sourcecardstcg.com',
          receiverPhone: '+44 20 7946 0991',
          origin: {
            name: 'New York JFK Cargo Terminal (JFK)',
            code: 'JFK',
            lat: 40.6413,
            lng: -73.7781,
          },
          destination: {
            name: 'London Heathrow Gateway Hub (LHR)',
            code: 'LHR',
            lat: 51.47,
            lng: -0.4543,
          },
          currentLocation: {
            name: 'Transatlantic Air Corridor Alpha (FL345)',
            lat: 48.5,
            lng: -35.2,
          },
          status: 'in_transit',
          statusNote: 'Cruising at 850 km/h altitude FL345 en route to London Heathrow Gateway (LHR)',
          mode: 'air',
          carrier: 'DHL Express',
          carrierCode: 'DHL',
          transportScope: 'International',
          cargoType: 'Precision Electronics & Collectibles',
          weightKg: 14.5,
          packageCount: 1,
          declaredValue: 3200,
          rate: 120.0,
          estimatedDistanceKm: 5560,
          eta: 'Today, 04:28 PM',
          bookingDate: 'Sep 29, 2026',
          assignedDriver: 'Capt. C. Lin (Boeing 767-300F / DH-709)',
          vehicleId: 'DH-709',
          isMovementStopped: false,
          packageImageUrl: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=600&q=80',
          checkpoints: [
            {
              id: 'cp-1',
              title: 'Consignment Received & Manifest Created',
              location: 'New York JFK Cargo Terminal (JFK)',
              timestamp: 'Sep 29, 08:30 AM',
              completed: true,
              current: false,
              detail: 'Electronic waybill validated. Export security and dangerous goods screening passed.',
            },
            {
              id: 'cp-2',
              title: 'Departed Export World Gateway',
              location: 'New York JFK Airfreight Center',
              timestamp: 'Sep 29, 11:15 AM',
              completed: true,
              current: false,
              detail: 'Wheels up aboard flight DH-709 Boeing 767-300F freighter.',
            },
            {
              id: 'cp-3',
              title: 'Transoceanic Corridor In-Flight Telemetry',
              location: 'Transatlantic Flight Track Alpha (FL345)',
              timestamp: 'Sep 29, 02:40 PM',
              completed: true,
              current: true,
              detail: 'Cruising at 850 km/h, satellite transponder telemetry stream normal.',
            },
            {
              id: 'cp-4',
              title: 'Arrival & Inward Customs Processing',
              location: 'London Heathrow Gateway Hub (LHR)',
              timestamp: 'Sep 29, 04:28 PM (Est.)',
              completed: false,
              current: false,
              detail: 'Scheduled touch down at LHR Cargo Center and rapid customs green lane intake.',
            },
            {
              id: 'cp-5',
              title: 'Final Delivery to Consignee Facility',
              location: 'London Logistics Depot',
              timestamp: 'Sep 30, 09:00 AM (Est.)',
              completed: false,
              current: false,
              detail: 'Final signature delivery dispatch to client receiver address.',
            },
          ],
        },
        {
          waybill: 'PLOT-99420-CT4',
          clientName: 'Global Tech Distribution',
          clientEmail: 'procurement@globaltech.com',
          clientReference: 'GT-44910-US',
          senderName: 'Frankfurt Air Logistics Mega Hub',
          senderEmail: 'export@fra-logistics.de',
          senderPhone: '+49 69 6900',
          receiverName: 'Dubai Logistics City Terminal',
          receiverEmail: 'receiving@dxb-logistics.ae',
          receiverPhone: '+971 4 224 5555',
          origin: {
            name: 'Frankfurt Airport Logistics Hub (FRA)',
            code: 'FRA',
            lat: 50.0379,
            lng: 8.5622,
          },
          destination: {
            name: 'Dubai Cargo Mega Terminal (DXB)',
            code: 'DXB',
            lat: 25.2532,
            lng: 55.3657,
          },
          currentLocation: {
            name: 'Mid-East Corridor Vector (FL360)',
            lat: 36.8,
            lng: 34.5,
          },
          status: 'in_transit',
          statusNote: 'Cruising en route to Dubai Cargo Mega Terminal (DXB)',
          mode: 'air',
          carrier: 'FedEx Logistics',
          carrierCode: 'FDX',
          transportScope: 'International',
          cargoType: 'High-Value Semiconductor Components',
          weightKg: 85.0,
          packageCount: 4,
          declaredValue: 18500,
          rate: 450.0,
          estimatedDistanceKm: 4840,
          eta: 'Tomorrow, 08:15 AM',
          bookingDate: 'Sep 29, 2026',
          assignedDriver: 'Capt. E. Lindqvist (Airbus A330-200F)',
          vehicleId: 'FDX-882',
          isMovementStopped: false,
          packageImageUrl: 'https://images.unsplash.com/photo-1578575437130-527eed3abbec?auto=format&fit=crop&w=600&q=80',
          checkpoints: [
            {
              id: 'cp-201',
              title: 'Export Customs Cleared',
              location: 'Frankfurt Cargo City South (FRA)',
              timestamp: 'Sep 29, 01:00 PM',
              completed: true,
              current: false,
              detail: 'Airway bill registered with EU Export Customs.',
            },
            {
              id: 'cp-202',
              title: 'En Route Mid-East Flight Track',
              location: 'Air Corridor Mediterranean',
              timestamp: 'Sep 29, 04:30 PM',
              completed: true,
              current: true,
              detail: 'Airborne flight vector proceeding on schedule.',
            },
          ],
        },
      ])
      console.log('[MongoDB] Seeded default shipments successfully.')
    }

    const carrierCount = await Carrier.countDocuments()
    if (carrierCount === 0) {
      await Carrier.insertMany([
        {
          id: 'c-1',
          name: 'DHL Express Global',
          code: 'DHL',
          supportedModes: ['air', 'land', 'sea'],
          sla: '99.4%',
          onTimeRate: 98.8,
          rating: 4.9,
          contactEmail: 'support@dhl.com',
          contactPhone: '+1 (800) 225-5345',
        },
        {
          id: 'c-2',
          name: 'FedEx Logistics',
          code: 'FDX',
          supportedModes: ['air', 'land'],
          sla: '98.9%',
          onTimeRate: 97.6,
          rating: 4.8,
          contactEmail: 'freight@fedex.com',
          contactPhone: '+1 (800) 463-3339',
        },
        {
          id: 'c-3',
          name: 'Maersk Line Intermodal',
          code: 'MSK',
          supportedModes: ['sea', 'land'],
          sla: '96.8%',
          onTimeRate: 95.2,
          rating: 4.7,
          contactEmail: 'ocean@maersk.com',
          contactPhone: '+45 3363 3363',
        },
      ])
      console.log('[MongoDB] Seeded default carriers successfully.')
    }

    const settingsCount = await Settings.countDocuments()
    if (settingsCount === 0) {
      await Settings.create({ key: 'global_config' })
      console.log('[MongoDB] Initialized default system settings.')
    }

    const inquiryCount = await Inquiry.countDocuments()
    if (inquiryCount === 0) {
      await Inquiry.insertMany([
        {
          id: 'inq-101',
          senderName: 'Jessica Wong (Apex Bio)',
          senderEmail: 'jessica.w@apexbiotech.com',
          subject: 'Cold-chain telemetry report verification for JFK-LHR',
          topic: 'Customs or documentation',
          waybillRef: 'PLOT-70955-JFD',
          status: 'new',
          message: 'Hello Operations Desk,\n\nWe require the full calibrated 4-second GPS telemetry and temperature logger download for our shipment PLOT-70955-JFD before customs clearance handover at London Heathrow (LHR).\n\nBest regards,\nJessica Wong',
          createdAtStr: new Date(Date.now() - 15 * 60 * 1000).toLocaleString(),
        },
        {
          id: 'inq-102',
          senderName: 'Arthur Pendelton (Acme Corp)',
          senderEmail: 'a.pendelton@acme-corp.com',
          subject: 'Priority air freight rate quote for Q4 transatlantic linehaul',
          topic: 'New shipment',
          waybillRef: '',
          status: 'pending',
          message: 'Good day,\n\nAcme Corporation is scheduling 40 high-security cargo pallets for delivery from JFK to London Heathrow next month. Please confirm rate matrix tiers and dedicated airframe options.\n\nThank you,\nArthur Pendelton',
          createdAtStr: new Date(Date.now() - 3 * 3600 * 1000).toLocaleString(),
        },
      ])
      console.log('[MongoDB] Seeded default inquiries successfully.')
    }

    const chatCount = await ChatSession.countDocuments()
    if (chatCount === 0) {
      await ChatSession.insertMany([
        {
          id: 'chat-default-1',
          clientName: 'Sarah Jenkins',
          clientEmail: 's.jenkins@pacificmaritime.com',
          waybillRef: 'PLOT-70955-JFD',
          status: 'active',
          lastMessageTime: '14:52',
          unreadCount: 1,
          messages: [
            { id: 'm1', sender: 'client', text: 'Hello, what is the estimated touch-down time at London Heathrow for PLOT-70955-JFD?', time: '14:48' },
            { id: 'm2', sender: 'agent', text: 'Cargo flight DH-709 is on final approach to London Heathrow (LHR). Customs green lane pre-clearance is already completed.', time: '14:50' },
            { id: 'm3', sender: 'client', text: 'Great! Will our local brokerage team receive the automated delivery push notification?', time: '14:52' },
          ],
        },
      ])
      console.log('[MongoDB] Seeded default chat sessions successfully.')
    }
  } catch (err) {
    console.error('[MongoDB] Auto-seeding error:', err.message)
  }
}
