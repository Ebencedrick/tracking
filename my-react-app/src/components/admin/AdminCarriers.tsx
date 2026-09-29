import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useShipments } from '../../context/ShipmentContext'
import type { ShippingMode } from '../../types'

interface DriverUnit {
  id: string
  name: string
  vehicleId: string
  carrier: string
  mode: ShippingMode
  assignedWaybill?: string
  status: 'en_route' | 'at_hub' | 'standby'
  phone: string
  licenseType: string
}

const SAMPLE_DRIVERS: DriverUnit[] = [
  {
    id: 'drv-1',
    name: 'Amina Bello',
    vehicleId: 'VEH-101 (Boeing 767-300F)',
    carrier: 'DHL Express',
    mode: 'air',
    assignedWaybill: 'PLOT-70955-JFD',
    status: 'en_route',
    phone: '+63 917 555 4321',
    licenseType: 'ICAO ATP Heavy Multi-Engine',
  },
  {
    id: 'drv-2',
    name: 'Captain Henrik Larsson',
    vehicleId: 'Vessel Madrid Maersk',
    carrier: 'Maersk Intermodal',
    mode: 'sea',
    assignedWaybill: 'PLOT-99420-CT4',
    status: 'en_route',
    phone: '+31 10 555 8890',
    licenseType: 'Master Mariner Unlimited',
  },
  {
    id: 'drv-3',
    name: 'Marcus Vance',
    vehicleId: 'TRK-440 (Freightliner Cascadia)',
    carrier: 'FedEx Priority',
    mode: 'land',
    assignedWaybill: 'PLOT-38190-V42',
    status: 'at_hub',
    phone: '+1 (555) 349-2210',
    licenseType: 'Commercial Driver CDL-A',
  },
  {
    id: 'drv-4',
    name: 'Elena Rostova',
    vehicleId: 'VEH-208 (Airbus A330-200F)',
    carrier: 'UPS Worldwide',
    mode: 'air',
    assignedWaybill: 'PLOT-11029-EXP',
    status: 'standby',
    phone: '+49 69 555 1289',
    licenseType: 'EASA ATPL Air Cargo',
  },
]

export function AdminCarriers() {
  const { carriers, addCarrier, toggleCarrierStatus, shipments } = useShipments()

  const [isAddOpen, setIsAddOpen] = useState(false)
  const [toastMessage, setToastMessage] = useState('')
  const [modeFilter, setModeFilter] = useState<'all' | ShippingMode>('all')
  const [searchQuery, setSearchQuery] = useState('')

  // New Carrier Form
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [selectedModes, setSelectedModes] = useState<ShippingMode[]>(['air'])
  const [slaScore, setSlaScore] = useState(98.5)
  const [activeFleet, setActiveFleet] = useState(650)
  const [baseRateMultiplier, setBaseRateMultiplier] = useState(1.0)
  const [contact, setContact] = useState('')
  const [coverage, setCoverage] = useState('Global Freight Corridors')

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(''), 3500)
  }

  const handleToggleMode = (mode: ShippingMode) => {
    setSelectedModes((prev) =>
      prev.includes(mode) ? (prev.length > 1 ? prev.filter((m) => m !== mode) : prev) : [...prev, mode]
    )
  }

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !code.trim()) return

    addCarrier({
      name,
      code: code.toUpperCase(),
      mode: selectedModes,
      slaScore,
      activeFleet,
      baseRateMultiplier,
      status: 'active',
      contact: contact || 'dispatch@carrier.com',
      coverage,
    })

    setIsAddOpen(false)
    setName('')
    setCode('')
    showToast(`Added carrier partner ${name}!`)
  }

  // Filtered Carriers
  const filteredCarriers = useMemo(() => {
    return carriers.filter((carrier) => {
      if (modeFilter !== 'all' && !carrier.mode.includes(modeFilter)) return false
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        return (
          carrier.name.toLowerCase().includes(q) ||
          carrier.code.toLowerCase().includes(q) ||
          carrier.coverage.toLowerCase().includes(q)
        )
      }
      return true
    })
  }, [carriers, modeFilter, searchQuery])

  // Calculated Stats
  const avgSla = (carriers.reduce((acc, c) => acc + c.slaScore, 0) / (carriers.length || 1)).toFixed(1)
  const totalFleet = carriers.reduce((acc, c) => acc + c.activeFleet, 0)

  return (
    <div className="cmd-canvas">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="shipment-toast">
          ✓ {toastMessage}
        </div>
      )}

      {/* Header */}
      <div className="cmd-header">
        <div className="cmd-header-left">
          <div className="cmd-node-status">
            <span className="cmd-node-pulse" />
            <span>GLOBAL FLEET NETWORK // ACTIVE</span>
          </div>
          <h1 className="cmd-title">Fleet & Carrier Network</h1>
          <p className="cmd-subtitle">
            Supervise integrated global carrier partners, linehaul performance SLAs, modality allocations, and active drivers.
          </p>
        </div>

        <div className="cmd-header-actions">
          <button type="button" className="cmd-btn cmd-btn-red" onClick={() => setIsAddOpen(true)}>
            + Add Carrier Partner
          </button>
        </div>
      </div>

      {/* Top 4 KPI Metric Cards */}
      <div className="cmd-stats-row">
        <div className="cmd-stat-card">
          <div className="cmd-stat-info">
            <span className="cmd-stat-label">Partner Carrier Networks</span>
            <div className="cmd-stat-number">{carriers.length} Networks</div>
            <span className="cmd-stat-subtext">Integrated API Linehauls</span>
          </div>
          <div className="cmd-stat-icon-box gray">
            🌐
          </div>
        </div>

        <div className="cmd-stat-card">
          <div className="cmd-stat-info">
            <span className="cmd-stat-label">Network Average SLA</span>
            <div className="cmd-stat-number" style={{ color: '#10b981' }}>{avgSla}%</div>
            <span className="cmd-stat-subtext">On-Time Linehaul Target</span>
          </div>
          <div className="cmd-stat-icon-box green">
            ⚡
          </div>
        </div>

        <div className="cmd-stat-card">
          <div className="cmd-stat-info">
            <span className="cmd-stat-label">Active Linehaul Fleet</span>
            <div className="cmd-stat-number">{totalFleet.toLocaleString()}</div>
            <span className="cmd-stat-subtext">Airframes, Ships & Trucks</span>
          </div>
          <div className="cmd-stat-icon-box blue">
            🚛
          </div>
        </div>

        <div className="cmd-stat-card">
          <div className="cmd-stat-info">
            <span className="cmd-stat-label">Consignments in Motion</span>
            <div className="cmd-stat-number" style={{ color: '#0284c7' }}>
              {shipments.filter((s) => s.status === 'in_transit').length}
            </div>
            <span className="cmd-stat-subtext">Live Telemetry Active</span>
          </div>
          <div className="cmd-stat-icon-box gray">
            📦
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            className={`cmd-btn ${modeFilter === 'all' ? 'cmd-btn-navy' : 'cmd-btn-white'}`}
            style={{ padding: '0.45rem 0.85rem', fontSize: '0.8rem' }}
            onClick={() => setModeFilter('all')}
          >
            All Modalities ({carriers.length})
          </button>
          <button
            type="button"
            className={`cmd-btn ${modeFilter === 'air' ? 'cmd-btn-navy' : 'cmd-btn-white'}`}
            style={{ padding: '0.45rem 0.85rem', fontSize: '0.8rem' }}
            onClick={() => setModeFilter('air')}
          >
            ✈️ Air Cargo
          </button>
          <button
            type="button"
            className={`cmd-btn ${modeFilter === 'sea' ? 'cmd-btn-navy' : 'cmd-btn-white'}`}
            style={{ padding: '0.45rem 0.85rem', fontSize: '0.8rem' }}
            onClick={() => setModeFilter('sea')}
          >
            🚢 Ocean Lines
          </button>
          <button
            type="button"
            className={`cmd-btn ${modeFilter === 'land' ? 'cmd-btn-navy' : 'cmd-btn-white'}`}
            style={{ padding: '0.45rem 0.85rem', fontSize: '0.8rem' }}
            onClick={() => setModeFilter('land')}
          >
            🚚 Overland Fleet
          </button>
        </div>

        <div style={{ width: '280px' }}>
          <input
            type="text"
            className="cmd-input"
            placeholder="Search carrier or corridor..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ padding: '0.45rem 0.85rem', fontSize: '0.82rem' }}
          />
        </div>
      </div>

      {/* Carrier Partners Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
        {filteredCarriers.map((carrier) => {
          const activeConsignments = shipments.filter(
            (s) => s.carrier.toLowerCase().includes(carrier.name.toLowerCase().split(' ')[0])
          ).length

          return (
            <div key={carrier.id} className="cmd-card" style={{ display: 'flex', flexDirection: 'column', margin: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span className="cmd-carrier-badge">
                      {carrier.code}
                    </span>
                    <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#0f172a', fontWeight: 800 }}>{carrier.name}</h3>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '4px' }}>
                    {carrier.coverage}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    toggleCarrierStatus(carrier.id)
                    showToast(`Toggled ${carrier.name} status`)
                  }}
                  className={`cmd-status-pill ${carrier.status === 'active' ? 'delivered' : 'exception'}`}
                  style={{ cursor: 'pointer', border: 'none' }}
                >
                  {carrier.status === 'active' ? '● Active' : '⏸ Suspended'}
                </button>
              </div>

              {/* Supported Modes */}
              <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '1.25rem' }}>
                {carrier.mode.map((m) => (
                  <span
                    key={m}
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '12px',
                      background: '#f1f5f9',
                      color: '#334155',
                      border: '1px solid #e2e8f0',
                    }}
                  >
                    {m === 'air' ? '✈️ Air Linehaul' : m === 'sea' ? '🚢 Ocean Freight' : '🚚 Overland Express'}
                  </span>
                ))}
              </div>

              {/* Metrics Grid */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '0.75rem',
                  background: '#f8fafc',
                  padding: '1rem',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  marginBottom: '1rem',
                }}
              >
                <div>
                  <span style={{ fontSize: '0.68rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 800 }}>ON-TIME SLA</span>
                  <div style={{ fontSize: '1.15rem', fontWeight: 900, color: '#10b981' }}>{carrier.slaScore}%</div>
                </div>

                <div>
                  <span style={{ fontSize: '0.68rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 800 }}>ACTIVE FLEET</span>
                  <div style={{ fontSize: '1.15rem', fontWeight: 900, color: '#0f172a' }}>{carrier.activeFleet.toLocaleString()}</div>
                </div>

                <div>
                  <span style={{ fontSize: '0.68rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 800 }}>RATE MULTIPLIER</span>
                  <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0284c7' }}>{carrier.baseRateMultiplier}x base</div>
                </div>

                <div>
                  <span style={{ fontSize: '0.68rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 800 }}>LIVE SHIPMENTS</span>
                  <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>{activeConsignments} in transit</div>
                </div>
              </div>

              <div style={{ marginTop: 'auto', fontSize: '0.78rem', color: '#64748b', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Contact: <strong style={{ color: '#0f172a' }}>{carrier.contact}</strong></span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Driver & Linehaul Units Roster */}
      <div className="cmd-card">
        <div className="cmd-card-header">
          <div>
            <h2 className="cmd-card-title">
              <span className="cmd-card-title-icon">👤</span>
              Assigned Drivers & Vehicle Linehaul Units
            </h2>
            <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748b' }}>
              Real-time driver rosters, airframe captains, and intermodal transport assignments.
            </p>
          </div>
        </div>

        <div className="cmd-table-wrap">
          <table className="cmd-table">
            <thead>
              <tr>
                <th>Driver / Captain</th>
                <th>Vehicle / Airframe ID</th>
                <th>Carrier Network</th>
                <th>Modality</th>
                <th>Active Waybill</th>
                <th>License & Credentials</th>
                <th>Status</th>
                <th>Direct Contact</th>
              </tr>
            </thead>
            <tbody>
              {SAMPLE_DRIVERS.map((driver) => (
                <tr key={driver.id}>
                  <td>
                    <div style={{ fontWeight: 800, color: '#0f172a' }}>{driver.name}</div>
                  </td>
                  <td>
                    <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#0284c7' }}>
                      {driver.vehicleId}
                    </span>
                  </td>
                  <td>
                    <strong style={{ color: '#334155' }}>{driver.carrier}</strong>
                  </td>
                  <td>
                    <span style={{ textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: 800 }}>
                      {driver.mode === 'air' ? '✈️ Air' : driver.mode === 'sea' ? '🚢 Sea' : '🚚 Land'}
                    </span>
                  </td>
                  <td>
                    {driver.assignedWaybill ? (
                      <Link
                        to={`/track?waybill=${encodeURIComponent(driver.assignedWaybill)}`}
                        style={{ fontFamily: 'monospace', fontWeight: 800, color: '#0284c7', textDecoration: 'none' }}
                      >
                        {driver.assignedWaybill}
                      </Link>
                    ) : (
                      <span style={{ color: '#94a3b8' }}>Unassigned</span>
                    )}
                  </td>
                  <td>
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{driver.licenseType}</span>
                  </td>
                  <td>
                    <span
                      className={`cmd-status-pill ${
                        driver.status === 'en_route' ? 'in_transit' : driver.status === 'at_hub' ? 'customs' : 'delivered'
                      }`}
                    >
                      {driver.status.replace('_', ' ').toUpperCase()}
                    </span>
                  </td>
                  <td>
                    <a
                      href={`tel:${driver.phone}`}
                      style={{ fontSize: '0.78rem', color: '#0284c7', textDecoration: 'none', fontWeight: 700 }}
                    >
                      📞 {driver.phone}
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Carrier Modal */}
      {isAddOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem',
          }}
          onClick={() => setIsAddOpen(false)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '18px',
              maxWidth: '560px',
              width: '100%',
              padding: '2rem',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.2)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', paddingBottom: '0.85rem', borderBottom: '1px solid #f1f5f9' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#0f172a', fontWeight: 800 }}>Add Carrier Partner</h3>
                <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748b' }}>
                  Register a new intermodal carrier into the automated routing network.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddOpen(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#94a3b8' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddSubmit}>
              <div className="cmd-form-row">
                <div className="cmd-form-group">
                  <label className="cmd-form-label">Carrier Name</label>
                  <input
                    type="text"
                    className="cmd-input"
                    placeholder="e.g. Nippon Express"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>

                <div className="cmd-form-group">
                  <label className="cmd-form-label">Carrier Code (3-4 letters)</label>
                  <input
                    type="text"
                    className="cmd-input"
                    placeholder="e.g. NPX"
                    maxLength={4}
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    required
                  />
                </div>
              </div>

              <div className="cmd-form-group">
                <label className="cmd-form-label">Supported Modalities</label>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '4px' }}>
                  {(['air', 'sea', 'land'] as ShippingMode[]).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => handleToggleMode(mode)}
                      className={`cmd-btn ${selectedModes.includes(mode) ? 'cmd-btn-navy' : 'cmd-btn-white'}`}
                      style={{ padding: '0.4rem 0.75rem', fontSize: '0.78rem' }}
                    >
                      {mode === 'air' ? '✈️ Air' : mode === 'sea' ? '🚢 Ocean' : '🚛 Overland'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="cmd-form-row">
                <div className="cmd-form-group">
                  <label className="cmd-form-label">Target SLA %</label>
                  <input
                    type="number"
                    step="0.1"
                    className="cmd-input"
                    value={slaScore}
                    onChange={(e) => setSlaScore(Number(e.target.value))}
                    required
                  />
                </div>

                <div className="cmd-form-group">
                  <label className="cmd-form-label">Active Fleet Count</label>
                  <input
                    type="number"
                    className="cmd-input"
                    value={activeFleet}
                    onChange={(e) => setActiveFleet(Number(e.target.value))}
                    required
                  />
                </div>
              </div>

              <div className="cmd-form-row">
                <div className="cmd-form-group">
                  <label className="cmd-form-label">Rate Multiplier (vs Base)</label>
                  <input
                    type="number"
                    step="0.05"
                    className="cmd-input"
                    value={baseRateMultiplier}
                    onChange={(e) => setBaseRateMultiplier(Number(e.target.value))}
                    required
                  />
                </div>

                <div className="cmd-form-group">
                  <label className="cmd-form-label">Operations Contact Email</label>
                  <input
                    type="email"
                    className="cmd-input"
                    placeholder="ops@partner.com"
                    value={contact}
                    onChange={(e) => setContact(e.target.value)}
                  />
                </div>
              </div>

              <div className="cmd-form-group">
                <label className="cmd-form-label">Geographic Coverage</label>
                <input
                  type="text"
                  className="cmd-input"
                  value={coverage}
                  onChange={(e) => setCoverage(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid #f1f5f9' }}>
                <button type="button" className="cmd-btn cmd-btn-white" onClick={() => setIsAddOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="cmd-btn cmd-btn-red">
                  + Register Carrier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
