import { useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useShipments } from '../../context/ShipmentContext'
import {
  LayoutDashboard,
  MapPin,
  Package,
  CreditCard,
  Mail,
  MessageSquare,
  Truck,
  Settings,
  LogOut,
  ExternalLink,
  Radio,
  X,
  Menu,
  Send,
  CheckCircle2,
} from 'lucide-react'

const siteLogo = '/brand-logo.jfif'

export function AdminLayout() {
  const navigate = useNavigate()
  const { addAuditLog } = useShipments()

  // Mobile Menu State
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

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
    { to: '/admin', label: 'Dashboard', icon: <LayoutDashboard size={15} strokeWidth={1.5} />, end: true },
    { to: '/admin/tracking', label: 'Live Tracking', icon: <MapPin size={15} strokeWidth={1.5} /> },
    { to: '/admin/shipments', label: 'Shipments & Bookings', icon: <Package size={15} strokeWidth={1.5} /> },
    { to: '/admin/rates', label: 'Pricing & Tariffs', icon: <CreditCard size={15} strokeWidth={1.5} /> },
    { to: '/admin/inquiries', label: 'Emails & Inquiries', icon: <Mail size={15} strokeWidth={1.5} /> },
    { to: '/admin/chats', label: 'Live Support Chats', icon: <MessageSquare size={15} strokeWidth={1.5} /> },
    { to: '/admin/carriers', label: 'Fleet & Drivers', icon: <Truck size={15} strokeWidth={1.5} /> },
    { to: '/admin/users', label: 'System Settings', icon: <Settings size={15} strokeWidth={1.5} /> },
  ]

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false)
  }

  return (
    <div className="cmd-shell">
      {/* Mobile Top Header (Visible on mobile/tablet) */}
      <header className="cmd-mobile-header">
        <button
          type="button"
          className="cmd-mobile-hamburger"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-label="Toggle Navigation Menu"
          aria-expanded={isMobileMenuOpen}
        >
          {isMobileMenuOpen ? <X size={18} strokeWidth={1.5} /> : <Menu size={18} strokeWidth={1.5} />}
        </button>

        <div className="cmd-mobile-brand">
          <img src={siteLogo} alt="Package Pilot" className="cmd-mobile-logo" />
          <div>
            <div className="cmd-mobile-brand-title">PACKAGE PILOT</div>
            <div className="cmd-mobile-brand-subtitle">
              <span className="cmd-brand-status-dot" /> DISPATCH OPS
            </div>
          </div>
        </div>

        <Link
          to="/admin/shipments/new"
          className="cmd-mobile-new-btn"
          onClick={closeMobileMenu}
        >
          <span>+</span> NEW
        </Link>
      </header>

      {/* Backdrop overlay for mobile drawer */}
      {isMobileMenuOpen && (
        <div
          className="cmd-sidebar-backdrop"
          onClick={closeMobileMenu}
          aria-hidden="true"
        />
      )}

      {/* Sidebar (Responsive drawer on mobile, sticky on desktop) */}
      <aside className={`cmd-sidebar ${isMobileMenuOpen ? 'mobile-open' : ''}`}>
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
          {/* Close button inside mobile drawer */}
          <button
            type="button"
            className="cmd-mobile-close-drawer"
            onClick={closeMobileMenu}
            aria-label="Close navigation drawer"
          >
            ✕
          </button>
        </div>

        {/* Red New Consignment CTA (Full-Page Studio) */}
        <Link
          to="/admin/shipments/new"
          className="cmd-sidebar-cta"
          onClick={closeMobileMenu}
        >
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
              onClick={closeMobileMenu}
            >
              <span className="cmd-nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Bottom Nav Links */}
        <div className="cmd-sidebar-footer">
          <Link to="/" className="cmd-nav-item" onClick={closeMobileMenu}>
            <span className="cmd-nav-icon"><ExternalLink size={15} strokeWidth={1.5} /></span>
            <span>Public Web Portal</span>
          </Link>

          <Link to="/login" className="cmd-nav-item sign-out" onClick={closeMobileMenu}>
            <span className="cmd-nav-icon"><LogOut size={15} strokeWidth={1.5} /></span>
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
                <X size={16} strokeWidth={1.5} />
              </button>
            </div>

            {broadcastSuccess ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#10b981', fontWeight: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <CheckCircle2 size={18} strokeWidth={1.5} />
                <span>{broadcastSuccess}</span>
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
                  <button type="submit" className="cmd-btn cmd-btn-navy" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <Send size={14} strokeWidth={1.5} />
                    <span>Transmit Broadcast</span>
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
                <X size={16} strokeWidth={1.5} />
              </button>
            </div>

            <div
              style={{
                height: '420px',
                background: 'radial-gradient(circle at center, #0a182d 0%, #040915 100%)',
                borderRadius: '12px',
                position: 'relative',
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid rgba(0, 82, 180, 0.25)',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  backgroundImage:
                    'linear-gradient(rgba(0, 82, 180, 0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 82, 180, 0.12) 1px, transparent 1px)',
                  backgroundSize: '40px 40px',
                }}
              />

              <div style={{ position: 'absolute', left: '15%', top: '38%', color: '#38bdf8', fontWeight: 400, fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <MapPin size={12} strokeWidth={1.5} /> ORD (Chicago)
              </div>
              <div style={{ position: 'absolute', left: '25%', top: '42%', color: '#38bdf8', fontWeight: 400, fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <MapPin size={12} strokeWidth={1.5} /> JFK (New York)
              </div>
              <div style={{ position: 'absolute', left: '50%', top: '32%', color: '#38bdf8', fontWeight: 400, fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <MapPin size={12} strokeWidth={1.5} /> LHR (London)
              </div>
              <div style={{ position: 'absolute', left: '58%', top: '36%', color: '#38bdf8', fontWeight: 400, fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <MapPin size={12} strokeWidth={1.5} /> FRA (Frankfurt)
              </div>
              <div style={{ position: 'absolute', left: '72%', top: '48%', color: '#38bdf8', fontWeight: 400, fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <MapPin size={12} strokeWidth={1.5} /> DXB (Dubai)
              </div>

              <div style={{ color: '#ffffff', textAlign: 'center', zIndex: 10, background: 'rgba(10, 24, 45, 0.92)', padding: '1.25rem 2rem', borderRadius: '12px', border: '1px solid rgba(0, 82, 180, 0.35)' }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.4rem', color: '#38bdf8' }}>
                  <Radio size={24} strokeWidth={1.5} />
                </div>
                <strong style={{ fontSize: '1rem', display: 'block', fontWeight: 400 }}>SpaceLink Satellite Telemetry Link Active</strong>
                <span style={{ fontSize: '0.78rem', color: '#8fa0ba', fontWeight: 300 }}>
                  Continuous GPS vector triangulation across all active airways & maritime corridors.
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
