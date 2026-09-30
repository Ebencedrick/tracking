import { Link } from 'react-router-dom'
import { useShipments } from '../../context/ShipmentContext'

export function AdminRates() {
  const { carriers } = useShipments()

  return (
    <div className="cmd-canvas">

      {/* Header */}
      <div className="cmd-header">
        <div className="cmd-header-left">
          <div className="cmd-node-status">
            <span className="cmd-node-pulse" />
            <span>CARRIER CORRIDORS & SLA POLICY // DIRECT BILLING ACTIVE</span>
          </div>
          <h1 className="cmd-title">Carrier Corridors & Operations Guidelines</h1>
          <p className="cmd-subtitle">
            Operations management for authorized carrier networks, corridor SLA benchmarks, and direct client quotation protocols.
          </p>
        </div>

        <div className="cmd-header-actions">
          <Link to="/admin/inquiries" className="cmd-btn cmd-btn-white">
            ✉ Client Quotations
          </Link>
          <Link to="/admin/chats" className="cmd-btn cmd-btn-navy">
            💬 Live Support Desk
          </Link>
        </div>
      </div>

      {/* Manual Direct Quotation Policy Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, #f0fdf4 0%, #e0f2fe 100%)',
          border: '1.5px solid #0284c7',
          padding: '1.25rem 1.5rem',
          borderRadius: '14px',
          marginBottom: '1.75rem',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          boxShadow: '0 4px 16px rgba(2, 132, 199, 0.08)',
        }}
      >
        <span style={{ fontSize: '2rem' }}>📧</span>
        <div>
          <strong style={{ color: '#0369a1', fontSize: '0.95rem', display: 'block' }}>
            Direct Manual Tariff & Consignment Billing Protocol:
          </strong>
          <span style={{ color: '#334155', fontSize: '0.85rem', display: 'block', marginTop: '3px', lineHeight: 1.5 }}>
            Automated public pricing tables are disabled. All consignment tariffs, custom linehaul rates, and clearance invoices are communicated directly to clients via official dispatch email or 24/7 Live Support Chat.
          </span>
        </div>
      </div>

      {/* Top 4 KPI Metric Cards */}
      <div className="cmd-stats-row">
        <div className="cmd-stat-card">
          <div className="cmd-stat-info">
            <span className="cmd-stat-label">Authorized Carrier Partners</span>
            <div className="cmd-stat-number">{carriers.length} Networks</div>
            <span className="cmd-stat-subtext">Global Multi-Modal</span>
          </div>
          <div className="cmd-stat-icon-box gray">
            🌐
          </div>
        </div>

        <div className="cmd-stat-card">
          <div className="cmd-stat-info">
            <span className="cmd-stat-label">Air Express Network</span>
            <div className="cmd-stat-number" style={{ color: '#0284c7' }}>99.4% SLA</div>
            <span className="cmd-stat-subtext">DHL & FedEx Airframes</span>
          </div>
          <div className="cmd-stat-icon-box blue">
            ✈️
          </div>
        </div>

        <div className="cmd-stat-card">
          <div className="cmd-stat-info">
            <span className="cmd-stat-label">Ocean & Intermodal</span>
            <div className="cmd-stat-number" style={{ color: '#10b981' }}>97.2% SLA</div>
            <span className="cmd-stat-subtext">Maersk Line Fleet</span>
          </div>
          <div className="cmd-stat-icon-box green">
            🚢
          </div>
        </div>

        <div className="cmd-stat-card">
          <div className="cmd-stat-info">
            <span className="cmd-stat-label">Customs Protocol</span>
            <div className="cmd-stat-number" style={{ color: '#7c3aed' }}>Green-Lane</div>
            <span className="cmd-stat-subtext">Pre-Clearance Standard</span>
          </div>
          <div className="cmd-stat-icon-box red">
            🛂
          </div>
        </div>
      </div>

      {/* 2-Column Layout: Carrier Partner Grid + Operations Guidelines */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.4fr) minmax(300px, 1fr)', gap: '1.75rem', alignItems: 'start' }}>
        {/* Left Column: Authorized Carriers & Corridor SLAs */}
        <div className="cmd-card">
          <div className="cmd-card-header">
            <h2 className="cmd-card-title">
              <span className="cmd-card-title-icon">📋</span>
              Authorized Carrier Partners & Coverage Corridors
            </h2>
          </div>

          <div style={{ padding: '0.5rem' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left', color: '#64748b' }}>
                  <th style={{ padding: '0.75rem 0.6rem' }}>Carrier Partner</th>
                  <th style={{ padding: '0.75rem 0.6rem' }}>Coverage Corridor</th>
                  <th style={{ padding: '0.75rem 0.6rem' }}>SLA Reliability</th>
                  <th style={{ padding: '0.75rem 0.6rem' }}>Dispatch Status</th>
                </tr>
              </thead>
              <tbody>
                {carriers.map((c) => (
                  <tr key={c.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '0.85rem 0.6rem', fontWeight: 800, color: '#0f172a' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>🏢</span>
                        <div>
                          <div>{c.name}</div>
                          <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>Code: {c.code}</span>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '0.85rem 0.6rem', color: '#475569' }}>{c.coverage || 'Global Air & Maritime'}</td>
                    <td style={{ padding: '0.85rem 0.6rem', fontWeight: 800, color: '#10b981' }}>{c.slaScore ? `${c.slaScore}%` : '98.8%'}</td>
                    <td style={{ padding: '0.85rem 0.6rem' }}>
                      <span className={`cmd-status-pill ${c.status === 'active' ? 'delivered' : 'exception'}`} style={{ fontSize: '0.7rem', padding: '2px 8px' }}>
                        {c.status ? c.status.toUpperCase() : 'ACTIVE'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column: Dispatch Direct Communication Guidelines */}
        <div className="cmd-card">
          <div className="cmd-card-header">
            <h2 className="cmd-card-title">
              <span className="cmd-card-title-icon">🛡️</span>
              Consignment Intake Protocols
            </h2>
          </div>

          <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <strong style={{ fontSize: '0.88rem', color: '#0f172a', display: 'block', marginBottom: '4px' }}>
                1. Manual Tariff Confirmation
              </strong>
              <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b', lineHeight: 1.5 }}>
                Operations controllers provide commercial cargo quotations directly through email invoices or customer chat sessions based on volumetric weight and transit speed.
              </p>
            </div>

            <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <strong style={{ fontSize: '0.88rem', color: '#0f172a', display: 'block', marginBottom: '4px' }}>
                2. Real-Time Telemetry Tracking
              </strong>
              <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b', lineHeight: 1.5 }}>
                Once a consignment is registered, clients track live coordinates, elapsed/remaining hours, and milestones using their unique waybill number on the public portal.
              </p>
            </div>

            <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <strong style={{ fontSize: '0.88rem', color: '#0f172a', display: 'block', marginBottom: '4px' }}>
                3. Customs Pre-Clearance
              </strong>
              <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b', lineHeight: 1.5 }}>
                Electronic manifests and commercial invoices are transmitted to port authorities before wheels touch down to minimize dwell times at major hubs.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
