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
const ADMIN_BUSINESS_EMAIL = 'info@globallprimelogistics.com'
const ADMIN_PASSWORD = '675Amiri$$'

export function AdminLayout() {
  const navigate = useNavigate()
  const { addAuditLog } = useShipments()

  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    return sessionStorage.getItem('gpl_admin_auth') === 'true' || localStorage.getItem('gpl_admin_auth') === 'true'
  })

  const [authEmail, setAuthEmail] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [authError, setAuthError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [authLoading, setAuthLoading] = useState(false)

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

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault()
    setAuthLoading(true)
    setAuthError('')

    const cleanEmail = authEmail.trim().toLowerCase()
    if (cleanEmail === ADMIN_BUSINESS_EMAIL.toLowerCase() && authPassword === ADMIN_PASSWORD) {
      sessionStorage.setItem('gpl_admin_auth', 'true')
      localStorage.setItem('gpl_admin_auth', 'true')
      setIsAuthenticated(true)
      addAuditLog('ADMIN_LOGIN', 'SECURITY', `Dispatch operator authenticated with master credentials (${cleanEmail})`, 'info')
    } else {
      setAuthError('Access Denied: Invalid operator credentials. Please provide the authorized business email and password.')
    }
    setAuthLoading(false)
  }

  const handleSignOut = () => {
    sessionStorage.removeItem('gpl_admin_auth')
    localStorage.removeItem('gpl_admin_auth')
    setIsAuthenticated(false)
    addAuditLog('ADMIN_LOGOUT', 'SECURITY', 'Operator signed out of terminal session', 'info')
  }

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

  // Render High-Security Login Screen if not authenticated
  if (!isAuthenticated) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #070d19 0%, #0a182d 50%, #0d213f 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px 16px',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: '430px',
            background: 'rgba(15, 23, 42, 0.88)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '16px',
            boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.6)',
            padding: '2.5rem 2rem',
            color: '#ffffff',
          }}
        >
          {/* Brand Header */}
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '54px',
                height: '54px',
                borderRadius: '14px',
                background: '#0284c7',
                marginBottom: '1rem',
                overflow: 'hidden',
                boxShadow: '0 0 25px rgba(2, 132, 199, 0.45)',
              }}
            >
              <img src={siteLogo} alt="Global Prime Logistics" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            </div>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0 0 6px 0', letterSpacing: '-0.02em', color: '#f8fafc' }}>
              Operations Command Terminal
            </h1>
            <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: 0 }}>
              Global Prime Logistics Dispatch Authorization
            </p>
          </div>

          {authError && (
            <div
              style={{
                background: 'rgba(239, 68, 68, 0.14)',
                border: '1px solid rgba(239, 68, 68, 0.45)',
                borderRadius: '8px',
                padding: '10px 14px',
                marginBottom: '1.25rem',
                fontSize: '0.8rem',
                color: '#fca5a5',
                lineHeight: 1.45,
              }}
            >
              ⚠️ {authError}
            </div>
          )}

          <form onSubmit={handleAdminLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  color: '#94a3b8',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  marginBottom: '6px',
                }}
              >
                Business Email Address
              </label>
              <input
                type="email"
                required
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
                placeholder="info@globallprimelogistics.com"
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  padding: '12px 14px',
                  borderRadius: '9px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: '#ffffff',
                  fontSize: '0.88rem',
                  outline: 'none',
                }}
              />
            </div>

            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  color: '#94a3b8',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  marginBottom: '6px',
                }}
              >
                Security Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  placeholder="••••••••••••"
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '12px 50px 12px 14px',
                    borderRadius: '9px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    color: '#ffffff',
                    fontSize: '0.88rem',
                    outline: 'none',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: '#38bdf8',
                    cursor: 'pointer',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                  }}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={authLoading}
              style={{
                marginTop: '0.5rem',
                width: '100%',
                padding: '13px',
                borderRadius: '9px',
                background: '#0284c7',
                border: 'none',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: '0.9rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 4px 16px rgba(2, 132, 199, 0.4)',
              }}
            >
              <span>Authenticate & Open Console</span>
              <span>→</span>
            </button>
          </form>

          <div
            style={{
              textAlign: 'center',
              marginTop: '1.75rem',
              paddingTop: '1.25rem',
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            }}
          >
            <Link to="/" style={{ color: '#38bdf8', fontSize: '0.8rem', textDecoration: 'none' }}>
              ← Return to Public Tracking Portal
            </Link>
          </div>
        </div>
      </div>
    )
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

          <button
            type="button"
            className="cmd-nav-item sign-out"
            style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' }}
            onClick={() => {
              closeMobileMenu()
              handleSignOut()
            }}
          >
            <span className="cmd-nav-icon"><LogOut size={15} strokeWidth={1.5} /></span>
            <span>Sign Out</span>
          </button>
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
