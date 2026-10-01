import { useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useShipments } from '../../context/ShipmentContext'

const siteLogo = '/brand-logo.jfif'

export function AdminLayout() {
  const navigate = useNavigate()
  const { addAuditLog } = useShipments()

  // Broadcast Notice Modal
  const [isBroadcastModalOpen, setIsBroadcastModalOpen] = useState(false)
  const [broadcastTitle, setBroadcastTitle] = useState('Port Customs Green-Lane Active')
  const [broadcastMessage, setBroadcastMessage] = useState(
    'All express linehaul shipments cleared through automated pre-manifest gateways without delay.'
  )
  const [broadcastSuccess, setBroadcastSuccess] = useState('')

  // Live Radar Modal
  const [isRadarModalOpen, setIsRadarModalOpen] = useState(false)

  const handleSendBroadcast = (e: React.FormEvent) => {
    e.preventDefault()
    addAuditLog('BROADCAST_NOTICE', 'TELEMETRY', `${broadcastTitle}: ${broadcastMessage}`, 'info')
    setBroadcastSuccess('Broadcast notice transmitted across all terminal nodes!')
    setTimeout(() => {
      setBroadcastSuccess('')
      setIsBroadcastModalOpen(false)
    }, 2000)
  }

  const navItems = [
    { to: '/admin', label: 'Dashboard', icon: '⊞', end: true },
    { to: '/admin/tracking', label: 'Live Tracking', icon: '📍' },
    { to: '/admin/shipments', label: 'Shipments & Bookings', icon: '📦' },
    { to: '/admin/rates', label: 'Pricing & Tariffs', icon: '💳' },
    { to: '/admin/inquiries', label: 'Emails & Inquiries', icon: '✉️' },
    { to: '/admin/chats', label: 'Live Support Chats', icon: '💬' },
    { to: '/admin/carriers', label: 'Fleet & Drivers', icon: '🪪' },
    { to: '/admin/users', label: 'System Settings', icon: '⚙️' },
  ]

  return (
    <div className="cmd-shell">
      {/* Sidebar matching the screenshot */}
      <aside className="cmd-sidebar">
        {/* Brand Header with Official Logo & Dispatch Control Indicator */}
        <div className="cmd-brand-header">
          <div className="cmd-brand-icon">
            <img src={siteLogo} alt="Package Pilot" className="cmd-brand-logo-img" />
          </div>
          <div className="cmd-brand-info">
            <div className="cmd-brand-name">PACKAGE PILOT</div>
            <div className="cmd-brand-status">
              <span className="cmd-brand-status-dot" />
              <span>DISPATCH CONTROL</span>
            </div>
          </div>
        </div>

        {/* Red New Consignment CTA (Full-Page Studio) */}
        <Link to="/admin/shipments/new" className="cmd-sidebar-cta">
          <span className="cmd-sidebar-cta-icon">+</span>
          <span>NEW CONSIGNMENT</span>
        </Link>

        {/* Nav list */}
        <nav className="cmd-nav" aria-label="Command Center Navigation">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `cmd-nav-item ${isActive ? 'active' : ''}`}
            >
              <span className="cmd-nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Bottom Nav Links */}
        <div className="cmd-sidebar-footer">
          <Link to="/" className="cmd-nav-item">
            <span className="cmd-nav-icon">↗</span>
            <span>Public Web Portal</span>
          </Link>

          <Link to="/login" className="cmd-nav-item sign-out">
            <span className="cmd-nav-icon">🚪</span>
            <span>Sign Out</span>
          </Link>
        </div>
      </aside>

      {/* Main Canvas Area (Scrolls independently) */}
      <div className="cmd-main">
        <Outlet
          context={{
            openNewConsignmentModal: () => navigate('/admin/shipments/new'),
            openBroadcastModal: () => setIsBroadcastModalOpen(true),
            openRadarModal: () => setIsRadarModalOpen(true),
          }}
        />
      </div>

      {/* Broadcast Notice Modal */}
      {isBroadcastModalOpen && (
        <div className="cmd-modal-overlay" onClick={() => setIsBroadcastModalOpen(false)}>
          <div className="cmd-modal" onClick={(e) => e.stopPropagation()}>
            <div className="cmd-modal-header">
              <h3>Broadcast Operations Notice</h3>
              <button type="button" className="cmd-modal-close" onClick={() => setIsBroadcastModalOpen(false)}>
                ✕
              </button>
            </div>

            {broadcastSuccess ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#10b981', fontWeight: 700 }}>
                ✓ {broadcastSuccess}
              </div>
            ) : (
              <form onSubmit={handleSendBroadcast}>
                <div className="cmd-form-group">
                  <label className="cmd-form-label">Notice Subject</label>
                  <input
                    type="text"
                    className="cmd-input"
                    value={broadcastTitle}
                    onChange={(e) => setBroadcastTitle(e.target.value)}
                    required
                  />
                </div>

                <div className="cmd-form-group">
                  <label className="cmd-form-label">Broadcast Content / Advisory</label>
                  <textarea
                    rows={4}
                    className="cmd-textarea"
                    value={broadcastMessage}
                    onChange={(e) => setBroadcastMessage(e.target.value)}
                    required
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                  <button
                    type="button"
                    className="cmd-btn cmd-btn-white"
                    onClick={() => setIsBroadcastModalOpen(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="cmd-btn cmd-btn-navy">
                    ✉ Transmit Broadcast
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Live Radar Map Modal */}
      {isRadarModalOpen && (
        <div className="cmd-modal-overlay" onClick={() => setIsRadarModalOpen(false)}>
          <div className="cmd-modal" style={{ maxWidth: '900px' }} onClick={(e) => e.stopPropagation()}>
            <div className="cmd-modal-header">
              <h3>Global Satellite Telemetry Radar</h3>
              <button type="button" className="cmd-modal-close" onClick={() => setIsRadarModalOpen(false)}>
                ✕
              </button>
            </div>

            <div
              style={{
                height: '420px',
                background: 'radial-gradient(circle at center, #111d38 0%, #080d1a 100%)',
                borderRadius: '12px',
                position: 'relative',
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid #1e293b',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  backgroundImage:
                    'linear-gradient(rgba(0, 210, 255, 0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 210, 255, 0.08) 1px, transparent 1px)',
                  backgroundSize: '40px 40px',
                }}
              />

              <div style={{ position: 'absolute', left: '15%', top: '38%', color: '#38bdf8', fontWeight: 800, fontSize: '0.8rem' }}>
                📍 ORD (Chicago)
              </div>
              <div style={{ position: 'absolute', left: '25%', top: '42%', color: '#38bdf8', fontWeight: 800, fontSize: '0.8rem' }}>
                📍 JFK (New York)
              </div>
              <div style={{ position: 'absolute', left: '50%', top: '32%', color: '#38bdf8', fontWeight: 800, fontSize: '0.8rem' }}>
                📍 LHR (London)
              </div>
              <div style={{ position: 'absolute', left: '58%', top: '36%', color: '#38bdf8', fontWeight: 800, fontSize: '0.8rem' }}>
                📍 FRA (Frankfurt)
              </div>
              <div style={{ position: 'absolute', left: '72%', top: '48%', color: '#38bdf8', fontWeight: 800, fontSize: '0.8rem' }}>
                📍 DXB (Dubai)
              </div>

              <div style={{ color: '#ffffff', textAlign: 'center', zIndex: 10, background: 'rgba(15, 23, 42, 0.85)', padding: '1.25rem 2rem', borderRadius: '12px', border: '1px solid #38bdf8' }}>
                <div style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>🛰️</div>
                <strong style={{ fontSize: '1.1rem', display: 'block' }}>SpaceLink Satellite Telemetry Link Active</strong>
                <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                  4,000ms continuous GPS vector triangulation across all active airways & maritime corridors.
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
              <button
                type="button"
                className="cmd-btn cmd-btn-white"
                onClick={() => setIsRadarModalOpen(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
