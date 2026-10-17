import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import {
  BrowserRouter,
  Link,
  NavLink,
  Outlet,
  Route,
  Routes,
  useLocation,
  useSearchParams,
  useParams,
} from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import {
  Plane,
  Ship,
  Truck,
  Package,
  ShieldCheck,
  Zap,
  Globe,
  Radio,
  Search,
  Calendar,
  Printer,
  MapPin,
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  CheckCircle2,
  ArrowUpRight,
  ArrowDownLeft,
  Phone,
  Camera,
  Check,
  Sparkles,
  Clock,
  ArrowRight,
  Lock,
} from 'lucide-react'
import { ShipmentProvider, useShipments } from './context/ShipmentContext'
import type { ShippingMode, Shipment } from './types'
import { ClientLiveMap } from './components/ClientLiveMap'
import { calculateRealtimeJourneyTelemetry } from './utils/mapApis'
import { LiveSupportChat } from './components/LiveSupportChat'
import { apiService } from './services/api'
import { WaybillLabelModal } from './components/admin/WaybillLabelModal'
import { AdminLayout } from './components/admin/AdminLayout'
import { AdminDashboard } from './components/admin/AdminDashboard'
import { AdminShipments } from './components/admin/AdminShipments'
import { AdminDispatch } from './components/admin/AdminDispatch'
import { AdminCarriers } from './components/admin/AdminCarriers'
import { AdminRates } from './components/admin/AdminRates'
import { AdminUsers } from './components/admin/AdminUsers'
import { AdminTelemetry } from './components/admin/AdminTelemetry'
import { AdminLogs } from './components/admin/AdminLogs'
import { AdminInquiries } from './components/admin/AdminInquiries'
import { AdminChats } from './components/admin/AdminChats'
import { AdminLiveTracking } from './components/admin/AdminLiveTracking'
import { AdminCreateShipment } from './components/admin/AdminCreateShipment'

const siteLogo = '/brand-logo.jfif'

const publicLinks = [
  { to: '/', label: 'Home' },
  { to: '/services', label: 'Services' },
  { to: '/about', label: 'About' },
  { to: '/contact', label: 'Support' },
  { to: '/faq', label: 'FAQs' },
]

const dashboardLinks = [
  { to: '/dashboard', label: 'Overview' },
  { to: '/dashboard/shipments', label: 'Shipments' },
  { to: '/dashboard/ship', label: 'New Shipment' },
  { to: '/dashboard/notifications', label: 'Notifications' },
  { to: '/dashboard/account', label: 'Account' },
]

const carrierLogos = [
  { name: 'DHL', booking: 'DHL Express', detail: 'International express', logo: 'https://www.packagepilottracker.com/photos/dhl-logo.svg' },
  { name: 'FedEx', booking: 'FedEx Priority', detail: 'Priority air network', logo: 'https://www.packagepilottracker.com/_next/image?url=%2Fphotos%2Ffedex.png&w=828&q=75' },
  { name: 'UPS', booking: 'UPS Worldwide', detail: 'Global parcel service', logo: 'https://www.packagepilottracker.com/photos/ups.svg' },
  { name: 'USPS', booking: 'USPS Priority', detail: 'Postal priority service', logo: 'https://www.packagepilottracker.com/photos/usps.svg' },
  { name: 'Maersk', booking: 'Maersk Intermodal', detail: 'Ocean and intermodal', logo: 'https://www.packagepilottracker.com/_next/image?url=%2Fphotos%2FMaersk.png&w=828&q=75' },
]

const serviceCards = [
  {
    mode: 'air',
    eyebrow: 'TIME-CRITICAL',
    title: 'Priority Air Freight',
    text: 'Move urgent shipments across major global corridors with proactive milestones and customs visibility.',
    idealFor: 'Urgent documents, samples, and high-value cargo',
    transit: '1–3 business days',
    features: ['Priority air network', 'Door-to-door coordination', 'Customs milestone updates'],
    link: '/ship?mode=air',
    tone: 'image-air',
    image: '/images/air-freight.jpg',
    tag: 'B777-F Air Express',
  },
  {
    mode: 'sea',
    eyebrow: 'COST-EFFICIENT',
    title: 'Ocean Container Shipping',
    text: 'Plan dependable port-to-port freight for larger consignments, with options for shared or dedicated container space.',
    idealFor: 'Bulk goods and non-urgent international freight',
    transit: '3–6 weeks',
    features: ['FCL and LCL options', 'Port-to-door coordination', 'Export documentation support'],
    link: '/ship?mode=sea',
    tone: 'image-ocean',
    image: '/images/ocean-freight.jpg',
    tag: 'Triple-E Maritime Lift',
  },
  {
    mode: 'land',
    eyebrow: 'REGIONAL DELIVERY',
    title: 'Overland & Cold-Chain',
    text: 'Coordinate regional road freight with options for temperature-aware handling and scheduled linehaul.',
    idealFor: 'Regional distribution and temperature-sensitive cargo',
    transit: '1–7 business days',
    features: ['Scheduled linehaul', 'Temperature-control options', 'Regional delivery coordination'],
    link: '/ship?mode=land',
    tone: 'image-road',
    image: '/images/fleet-truck.jpg',
    tag: 'Expedited Linehaul Fleet',
  },
]

function App() {
  return (
    <ShipmentProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </ShipmentProvider>
  )
}

function AppRoutes() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/ship" element={<ShipPage />} />
        <Route path="/track" element={<TrackPage />} />
        <Route path="/services" element={<ServicesPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/faq" element={<FaqPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/policies" element={<PoliciesPage />} />
      </Route>

      <Route path="/login" element={<AuthPage mode="login" />} />
      <Route path="/register" element={<AuthPage mode="register" />} />

      <Route element={<DashboardLayout />}>
        <Route path="/dashboard" element={<OverviewPage />} />
        <Route path="/dashboard/shipments" element={<ShipmentsPage />} />
        <Route path="/dashboard/shipments/:waybill" element={<ShipmentDetailPage />} />
        <Route path="/dashboard/ship" element={<CreateShipmentPage />} />
        <Route path="/dashboard/notifications" element={<NotificationsPage />} />
        <Route path="/dashboard/account" element={<AccountPage />} />
      </Route>

      {/* Admin Operations Console */}
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<AdminDashboard />} />
        <Route path="dashboard" element={<AdminDashboard />} />
        <Route path="tracking" element={<AdminLiveTracking />} />
        <Route path="shipments" element={<AdminShipments />} />
        <Route path="shipments/new" element={<AdminCreateShipment />} />
        <Route path="new-consignment" element={<AdminCreateShipment />} />
        <Route path="dispatch" element={<AdminDispatch />} />
        <Route path="rates" element={<AdminRates />} />
        <Route path="inquiries" element={<AdminInquiries />} />
        <Route path="chats" element={<AdminChats />} />
        <Route path="carriers" element={<AdminCarriers />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="settings" element={<AdminUsers />} />
        <Route path="telemetry" element={<AdminTelemetry />} />
        <Route path="logs" element={<AdminLogs />} />
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}

function PublicLayout() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  useEffect(() => {
    if (!isMobileMenuOpen) return

    const closeMenuOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsMobileMenuOpen(false)
    }

    window.addEventListener('keydown', closeMenuOnEscape)
    return () => window.removeEventListener('keydown', closeMenuOnEscape)
  }, [isMobileMenuOpen])

  return (
    <div className="site-shell">
      <header className="topbar">
        <div className="brand-wrap">
          <Link to="/" className="brand-mark" aria-label="Global Prime Logistics home">
            <img src={siteLogo} alt="Global Prime Logistics logo" className="brand-logo" />
          </Link>
        </div>

        <button
          type="button"
          className={`mobile-menu-toggle ${isMobileMenuOpen ? 'mobile-menu-toggle-open' : ''}`}
          aria-label={isMobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          aria-expanded={isMobileMenuOpen}
          aria-controls="public-navigation-menu"
          onClick={() => setIsMobileMenuOpen((open) => !open)}
        >
          <span className="mobile-menu-icon" aria-hidden="true" />
        </button>

        <div
          className={`topbar-menu ${isMobileMenuOpen ? 'topbar-menu-open' : ''}`}
          id="public-navigation-menu"
        >
          <nav className="main-nav" aria-label="Main navigation">
            {publicLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  `nav-link ${isActive ? 'nav-link-active' : ''}`
                }
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {link.label}
              </NavLink>
            ))}
          </nav>

          <div className="auth-actions">
            <Link to="/track" className="button button-secondary header-action-button" onClick={() => setIsMobileMenuOpen(false)}>
              <svg className="header-action-icon" aria-hidden="true"><use href="/icons.svg#header-track-icon" /></svg>
              Track Consignment
            </Link>
            <Link to="/ship" className="button button-primary header-action-button" onClick={() => setIsMobileMenuOpen(false)}>
              <svg className="header-action-icon" aria-hidden="true"><use href="/icons.svg#header-ship-icon" /></svg>
              Ship Now
            </Link>
          </div>
        </div>
      </header>

      <main className="page-content">
        <Outlet />
      </main>

      <footer className="site-footer">
        <div className="footer-grid section-block">
          <div>
            <div className="brand-mark footer-brand">
              <img src={siteLogo} alt="Global Prime Logistics logo" className="brand-logo brand-logo-footer" />
            </div>
            <p>
              Precision supply chain visibility, real-time asset tracking, and multi-modal freight coordination for global operations.
            </p>
          </div>

          <div>
            <h4>Operations</h4>
            <ul>
              <li><Link to="/ship">Request Shipment</Link></li>
              <li><Link to="/track">Track Consignment</Link></li>
              <li><Link to="/services">Air Express</Link></li>
              <li><Link to="/services">Ocean Freight</Link></li>
            </ul>
          </div>

          <div>
            <h4>Enterprise</h4>
            <ul>
              <li><Link to="/about">Custom Routing</Link></li>
              <li><Link to="/services">Cold-Chain</Link></li>
              <li><Link to="/contact">Operations Desk</Link></li>
              <li><Link to="/policies">Cargo Protection</Link></li>
            </ul>
          </div>

          <div>
            <h4>System Telemetry</h4>
            <div className="telemetry-badges">
              <span>Global Hubs</span>
              <span>99.99% Online</span>
              <span>ORD // FRA // LHR</span>
            </div>
          </div>
        </div>

        <div className="footer-bottom section-block">
          <span>© 2026 Global Prime Logistics</span>
          <div>
            <Link to="/policies">Privacy Policy</Link>
            <Link to="/policies#terms">Terms</Link>
            <Link to="/faq">FAQ</Link>
            <Link to="/contact">Support</Link>
          </div>
        </div>
      </footer>

      {/* Floating 24/7 Live Support Chat Widget */}
      <LiveSupportChat />
    </div>
  )
}

function DashboardLayout() {
  return (
    <div className="dashboard-shell">
      <aside className="dashboard-sidebar">
        <div className="dashboard-brand">
          <img src={siteLogo} alt="Global Prime Logistics logo" className="brand-logo brand-logo-dashboard" />
        </div>

        <nav className="dashboard-nav" aria-label="Dashboard navigation">
          {dashboardLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `sidebar-link ${isActive ? 'sidebar-link-active' : ''}`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-cta">
          <Link to="/dashboard/ship" className="button button-primary">
            + Ship
          </Link>
        </div>
      </aside>

      <div className="dashboard-main">
        <header className="dashboard-topbar">
          <div>
            <p className="eyebrow">Client portal</p>
            <h1>Operations dashboard</h1>
          </div>

          <div className="dashboard-user">
            <span className="notification-badge">3</span>
            <span>Acme Corp</span>
          </div>
        </header>

        <Outlet />

        {/* Floating Live Support Chat Widget */}
        <LiveSupportChat />
      </div>
    </div>
  )
}

function useScrollReveal() {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const root = ref.current
    if (!root) return
    const elements = root.querySelectorAll('.reveal-on-scroll')
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
      elements.forEach((el) => el.classList.add('is-revealed'))
      return
    }
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-revealed')
          }
        })
      },
      { threshold: 0.08, rootMargin: '0px 0px -30px 0px' }
    )
    elements.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [])
  return ref
}

function HomePage() {
  const revealRef = useScrollReveal()
  return (
    <section ref={revealRef} className="section-block home-page">
      <div className="hero-panel">
        <div className="hero-copy">
          <p className="eyebrow">Global Dispatch Network</p>
          <h1>Move every shipment with clarity and control.</h1>
          <p className="hero-subtext">
            Book trusted carriers, coordinate air, ocean, and ground freight, and follow every milestone from pickup through final delivery.
          </p>

          <div className="action-row">
            <Link to="/ship" className="button button-primary">
              Ship Now
            </Link>
            <Link to="/track" className="button button-secondary">
              Track a Package
            </Link>
          </div>

          <form className="tracking-mini-box" action="/track" method="get">
            <div className="tracking-field">
              <Search className="field-icon" style={{ width: 16, height: 16, color: '#f37920', flexShrink: 0 }} />
              <input name="waybill" type="text" aria-label="Enter waybill number" placeholder="Waybill number (e.g. NTS-99420-CT4)" />
            </div>
            <button type="submit" className="button button-primary small-button">
              Track
            </button>
          </form>
        </div>
      </div>

      <div className="partner-row reveal-on-scroll" aria-label="Carrier partners">
        {carrierLogos.map((carrier) => (
          <Link key={carrier.name} to={`/ship?carrier=${encodeURIComponent(carrier.booking)}`} className="carrier-pill">
            <img src={carrier.logo} alt={`${carrier.name} logo`} loading="eager" />
          </Link>
        ))}
      </div>

      <div className="network-strip reveal-on-scroll" aria-label="Network operations status">
        <div className="network-status">
          <span className="network-pulse" />
          <span>Dispatch network</span>
          <strong>Operational</strong>
        </div>
        <span className="network-detail">Global hubs <strong>ORD · FRA · LHR · DXB</strong></span>
        <Link to="/contact" className="network-support">
          24/7 operations support
          <ArrowUpRight size={13} style={{ display: 'inline-block', verticalAlign: 'middle', marginLeft: 4 }} />
        </Link>
      </div>

      <section className="content-panel reveal-on-scroll">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Transport modes & infrastructure</p>
            <h2>End-to-end freight modalities</h2>
          </div>
          <Link to="/services" className="panel-link" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span>Explore Full Portfolio</span>
            <ArrowRight size={14} />
          </Link>
        </div>

        <div className="service-grid">
          {serviceCards.map((service, idx) => (
            <article key={service.title} className={`info-card reveal-on-scroll reveal-delay-${idx + 1}`}>
              <div className={`service-image ${service.tone}`} aria-hidden="true">
                <span className="modality-badge">
                  {service.title.includes('Air') ? <Plane size={13} /> : service.title.includes('Ocean') ? <Ship size={13} /> : <Truck size={13} />}
                  <span>{service.title.includes('Air') ? 'Air Freight' : service.title.includes('Ocean') ? 'Ocean Freight' : 'Ground Freight'}</span>
                </span>
              </div>
              <div className="service-copy">
                <h3>{service.title}</h3>
                <p>{service.text}</p>
                <Link to={service.link} className="text-link">
                  <span>Book this service</span>
                  <ArrowRight size={13} />
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="feature-split reveal-on-scroll">
        <div className="feature-copy">
          <p className="eyebrow">Precision tracking engine</p>
          <h2>Live waypoints with transparent milestone visibility.</h2>
          <p>
            Every shipment receives a scannable QR code and a standardized waybill format for live route status, customs checkpoints, and delivery updates.
          </p>

          <div className="mini-feature-grid">
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}>
                <Radio size={16} style={{ color: '#f37920' }} />
                <h3 style={{ margin: 0 }}>Millisecond telemetry</h3>
              </div>
              <p>Live coordinates interpolate across air, sea, and highway corridors.</p>
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}>
                <Zap size={16} style={{ color: '#f37920' }} />
                <h3 style={{ margin: 0 }}>Automated notifications</h3>
              </div>
              <p>Dispatch and delay notices are generated instantly as routes evolve.</p>
            </div>
          </div>

          <div className="action-row compact-row">
            <Link to="/track" className="button button-primary">
              Try Interactive Tracking
            </Link>
            <Link to="/ship" className="button button-secondary">
              Request a Shipment
            </Link>
          </div>
        </div>

        <div className="tracking-panel card">
          <div className="qr-header">
            <div className="qr-identity">
              <span className="qr-ring">
                <Package size={18} />
              </span>
              <div>
                <small>Sample shipment</small>
                <strong>NTS-99420-CT4</strong>
              </div>
            </div>
            <span className="status-live"><span /> In transit</span>
          </div>

          <div className="qr-content">
            <div className="qr-scan-block">
              <div className="qr-box">
                <QRCodeSVG
                  value={`${typeof window !== 'undefined' ? window.location.origin : ''}/track?waybill=NTS-99420-CT4`}
                  size={120}
                  level="M"
                  title="Track waybill NTS-99420-CT4"
                />
              </div>
              <div className="qr-scan-copy">
                <strong>Scan to track</strong>
                <span>Opens live shipment status</span>
              </div>
            </div>

            <div className="shipment-details">
              <div className="status-list">
                <div><span>Carrier</span><strong>DHL Express Air</strong></div>
                <div><span>From</span><strong>New York · JFK</strong></div>
                <div><span>To</span><strong>London · LHR</strong></div>
                <div><span>Estimated arrival</span><strong>Today, 14:22</strong></div>
              </div>

              <div className="shipment-progress">
                <div className="progress-heading">
                  <strong>Shipment progress</strong>
                  <span>2 of 4 checkpoints</span>
                </div>
                <div className="progress-track"><span /></div>
                <div className="progress-labels"><span>Collected</span><span>In transit</span><span>Delivered</span></div>
              </div>
            </div>
          </div>

          <Link to="/track?waybill=NTS-99420-CT4" className="button button-primary full-width" style={{ gap: 8 }}>
            <span>View Shipment Status</span>
            <ArrowRight size={15} />
          </Link>
        </div>
      </section>

      <section className="cta-banner reveal-on-scroll">
        <div>
          <p className="eyebrow">Ready to dispatch?</p>
          <h2>Get a transparent rate and live tracking on day one.</h2>
        </div>
        <div className="action-row">
          <Link to="/ship" className="button button-primary">
            Ship Now
          </Link>
          <Link to="/track" className="button button-secondary">
            Track Package
          </Link>
        </div>
      </section>
    </section>
  )
}

function ShipPage() {
  const [searchParams] = useSearchParams()
  const modeOptions = [
    { value: 'air', label: 'Air freight', detail: 'Fast, time-critical delivery' },
    { value: 'sea', label: 'Ocean freight', detail: 'Flexible container shipping' },
    { value: 'land', label: 'Ground freight', detail: 'Regional and overland routes' },
  ]
  const steps = ['Scope', 'Carrier', 'Sender', 'Receiver', 'Package', 'Confirm']
  const [currentStep, setCurrentStep] = useState(0)
  const [completed, setCompleted] = useState(false)
  const [mode, setMode] = useState(searchParams.get('mode') ?? 'air')
  const [carrier, setCarrier] = useState(searchParams.get('carrier') ?? 'DHL Express')
  const [sender, setSender] = useState({ name: '', email: '', phone: '', address: '', city: 'New York, NY', country: 'United States' })
  const [receiver, setReceiver] = useState({ name: '', email: '', phone: '', address: '', city: 'London', country: 'United Kingdom' })
  const [packages, setPackages] = useState('1')
  const [weight, setWeight] = useState('12')
  const [declaredValue, setDeclaredValue] = useState('2500')
  const [contents, setContents] = useState('')
  const [dimensions, setDimensions] = useState({ length: '30', width: '20', height: '15' })
  const [handling, setHandling] = useState('Standard handling')
  const [packagePhotos, setPackagePhotos] = useState<Array<{ id: string; name: string; url: string }>>([])
  const [errors, setErrors] = useState<Record<string, string>>({})
  const packagePhotoUrls = useRef<string[]>([])
  const selectedMode = modeOptions.find((option) => option.value === mode) ?? modeOptions[0]
  const selectedCarrier = carrierLogos.find((option) => option.booking === carrier)
  const updateSender = (field: keyof typeof sender, value: string) => {
    setSender((previous) => ({ ...previous, [field]: value }))
    setErrors((previous) => ({ ...previous, [`sender-${field}`]: '' }))
  }
  const updateReceiver = (field: keyof typeof receiver, value: string) => {
    setReceiver((previous) => ({ ...previous, [field]: value }))
    setErrors((previous) => ({ ...previous, [`receiver-${field}`]: '' }))
  }
  const senderLocation = [sender.city, sender.country].filter(Boolean).join(', ')
  const receiverLocation = [receiver.city, receiver.country].filter(Boolean).join(', ')

  const validateStep = () => {
    const nextErrors: Record<string, string> = {}

    if (currentStep === 0 && !mode) nextErrors.mode = 'Choose a transport mode.'
    if (currentStep === 1 && !carrier) nextErrors.carrier = 'Select a carrier.'
    if (currentStep === 2) {
      if (!sender.name.trim()) nextErrors['sender-name'] = 'Pickup contact name is required.'
      if (!sender.email.trim()) nextErrors['sender-email'] = 'Pickup email is required.'
      if (!sender.phone.trim()) nextErrors['sender-phone'] = 'Pickup phone is required.'
      if (!sender.address.trim()) nextErrors['sender-address'] = 'Pickup address is required.'
      if (!sender.city.trim()) nextErrors['sender-city'] = 'Pickup city is required.'
      if (!sender.country.trim()) nextErrors['sender-country'] = 'Pickup country is required.'
    }
    if (currentStep === 3) {
      if (!receiver.name.trim()) nextErrors['receiver-name'] = 'Delivery contact name is required.'
      if (!receiver.email.trim()) nextErrors['receiver-email'] = 'Delivery email is required.'
      if (!receiver.phone.trim()) nextErrors['receiver-phone'] = 'Delivery phone is required.'
      if (!receiver.address.trim()) nextErrors['receiver-address'] = 'Delivery address is required.'
      if (!receiver.city.trim()) nextErrors['receiver-city'] = 'Delivery city is required.'
      if (!receiver.country.trim()) nextErrors['receiver-country'] = 'Delivery country is required.'
    }
    if (currentStep === 4) {
      if (!packages || Number(packages) <= 0) nextErrors.packages = 'Package count must be greater than zero.'
      if (!weight || Number(weight) <= 0) nextErrors.weight = 'Weight must be greater than zero.'
      if (!declaredValue || Number(declaredValue) < 0) nextErrors.declaredValue = 'Declared value must be zero or greater.'
      if (!contents.trim()) nextErrors.contents = 'Add a short contents description.'
      if (!dimensions.length || Number(dimensions.length) <= 0) nextErrors.length = 'Length must be greater than zero.'
      if (!dimensions.width || Number(dimensions.width) <= 0) nextErrors.width = 'Width must be greater than zero.'
      if (!dimensions.height || Number(dimensions.height) <= 0) nextErrors.height = 'Height must be greater than zero.'
    }
    if (currentStep === 5 && !(document.querySelector('#confirm-ack') as HTMLInputElement)?.checked) {
      nextErrors.confirmation = 'Please confirm the shipment details before continuing.'
    }

    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const advanceStep = () => {
    if (currentStep === steps.length - 1) {
      setCompleted(true)
      return
    }

    const isValid = validateStep()
    if (!isValid) return
    setCurrentStep((step) => step + 1)
  }

  useEffect(() => () => packagePhotoUrls.current.forEach((url) => URL.revokeObjectURL(url)), [])

  return (
    <section className="section-block page-shell ship-page">
      <section className="ship-hero" aria-labelledby="ship-hero-title">
        <div className="ship-hero-copy">
          <p className="eyebrow">Global Prime Logistics shipment desk</p>
          <h1 id="ship-hero-title">Plan your next delivery.</h1>
          <p>Choose a route, add shipment details, and review your request in a few clear steps.</p>
        </div>
        <div className="ship-hero-markers" aria-label="Supported transport modes">
          <span>Air</span>
          <span>Ocean</span>
          <span>Ground</span>
        </div>
      </section>

      <div className="ship-page-heading">
        <div>
          <p className="eyebrow">{completed ? 'Request preview' : 'Shipment request'}</p>
          <h2>{completed ? 'Shipment request prepared' : 'Build your shipment'}</h2>
          <p>{completed ? 'Your request summary is ready. No booking has been submitted.' : 'Complete each step to prepare your booking request.'}</p>
        </div>
        {!completed && (
          <nav className="booking-steps" aria-label="Shipment request progress">
            {steps.map((step, index) => (
              <button
                key={step}
                type="button"
                className={`${index === currentStep ? 'booking-step-active' : ''} ${index < currentStep ? 'booking-step-complete' : ''}`}
                aria-current={index === currentStep ? 'step' : undefined}
                onClick={() => index < currentStep && setCurrentStep(index)}
                disabled={index > currentStep}
              >
                <i>{index < currentStep ? '✓' : index + 1}</i>
                <span>{step}</span>
              </button>
            ))}
          </nav>
        )}
      </div>

      {completed ? (
        <section className="booking-complete card" role="status">
          <span className="completion-mark">✓</span>
          <p className="eyebrow">Request preview complete</p>
          <h2>Your shipment details are ready</h2>
          <p>This is a local preview only. Connect the booking API to submit this request to a carrier.</p>
          <button className="button button-secondary" type="button" onClick={() => { setCurrentStep(0); setCompleted(false) }}>
            Edit shipment details
          </button>
        </section>
      ) : (
        <div className="booking-layout">
          <form
            id="shipment-request-form"
            className="booking-form card"
            onSubmit={(event) => {
              event.preventDefault()
              if (!validateStep()) return
              if (currentStep < steps.length - 1) setCurrentStep((step) => step + 1)
              else setCompleted(true)
              window.scrollTo({ top: 0, behavior: 'smooth' })
            }}
          >
            <section className="booking-form-section" aria-labelledby="active-step-title">
              <div className="booking-section-title">
                <span>{String(currentStep + 1).padStart(2, '0')}</span>
                <div>
                  <h2 id="active-step-title">{steps[currentStep]}</h2>
                  <p>{[
                    'Choose how this shipment should travel.',
                    'Select a carrier for your selected transport mode.',
                    'Who is sending this shipment?',
                    'Who should receive the shipment?',
                    'Describe the packages being shipped.',
                    'Check the details before preparing your request.',
                  ][currentStep]}</p>
                </div>
              </div>

              {currentStep === 0 && (
                <div className="mode-options">
                  {modeOptions.map((option) => (
                    <label key={option.value} className={`mode-option mode-option-${option.value} ${mode === option.value ? 'mode-option-selected' : ''}`}>
                      <input type="radio" name="mode" value={option.value} checked={mode === option.value} onChange={() => setMode(option.value)} />
                      <span className={`mode-option-visual mode-visual-${option.value}`} aria-hidden="true">
                        <span>{option.value === 'air' ? 'AIR NETWORK' : option.value === 'sea' ? 'OCEAN FREIGHT' : 'GROUND FLEET'}</span>
                        <span className="mode-option-mark" />
                      </span>
                      <span className="mode-option-copy"><strong>{option.label}</strong><small>{option.detail}</small></span>
                    </label>
                  ))}
                </div>
              )}

              {currentStep === 1 && (
                <div className="carrier-step">
                  <p className="step-helper">Choose the carrier you would like us to use. Availability and final pricing are confirmed after review.</p>
                  <div className="carrier-options">
                    {carrierLogos.map((option) => (
                      <label key={option.booking} className={`carrier-option ${carrier === option.booking ? 'carrier-option-selected' : ''}`}>
                        <input type="radio" name="carrier" value={option.booking} checked={carrier === option.booking} onChange={() => setCarrier(option.booking)} />
                        <span className="carrier-option-mark" />
                        <span className="carrier-option-brand">
                          <img src={option.logo} alt={`${option.name} logo`} loading="eager" />
                          <span><strong>{option.booking}</strong><small>{option.detail}</small></span>
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {currentStep === 2 && (
                <div className="contact-step contact-step-pickup">
                  <div className="contact-step-banner">
                    <span className="contact-step-icon">P</span>
                    <div><strong>Pickup contact</strong><span>Who should the carrier contact to collect this shipment?</span></div>
                    <span className="contact-step-tag">SENDER</span>
                  </div>
                  <div className="form-grid contact-fields">
                  <label className="booking-field">Full name<input autoComplete="name" required value={sender.name} onChange={(event) => updateSender('name', event.target.value)} />{errors['sender-name'] && <span className="field-error">{errors['sender-name']}</span>}</label>
                  <label className="booking-field">Email address<input autoComplete="email" required type="email" value={sender.email} onChange={(event) => updateSender('email', event.target.value)} />{errors['sender-email'] && <span className="field-error">{errors['sender-email']}</span>}</label>
                  <label className="booking-field">Phone number<input autoComplete="tel" required type="tel" value={sender.phone} onChange={(event) => updateSender('phone', event.target.value)} />{errors['sender-phone'] && <span className="field-error">{errors['sender-phone']}</span>}</label>
                  <label className="booking-field field-wide">Street address<input autoComplete="street-address" required value={sender.address} onChange={(event) => updateSender('address', event.target.value)} />{errors['sender-address'] && <span className="field-error">{errors['sender-address']}</span>}</label>
                  <label className="booking-field">City<input autoComplete="address-level2" required value={sender.city} onChange={(event) => updateSender('city', event.target.value)} />{errors['sender-city'] && <span className="field-error">{errors['sender-city']}</span>}</label>
                  <label className="booking-field">Country<input autoComplete="country-name" required value={sender.country} onChange={(event) => updateSender('country', event.target.value)} />{errors['sender-country'] && <span className="field-error">{errors['sender-country']}</span>}</label>
                  </div>
                </div>
              )}

              {currentStep === 3 && (
                <div className="contact-step contact-step-delivery">
                  <div className="contact-step-banner">
                    <span className="contact-step-icon">D</span>
                    <div><strong>Delivery contact</strong><span>Who should receive the shipment at its destination?</span></div>
                    <span className="contact-step-tag">RECEIVER</span>
                  </div>
                  <div className="form-grid contact-fields">
                  <label className="booking-field">Full name<input autoComplete="name" required value={receiver.name} onChange={(event) => updateReceiver('name', event.target.value)} />{errors['receiver-name'] && <span className="field-error">{errors['receiver-name']}</span>}</label>
                  <label className="booking-field">Email address<input autoComplete="email" required type="email" value={receiver.email} onChange={(event) => updateReceiver('email', event.target.value)} />{errors['receiver-email'] && <span className="field-error">{errors['receiver-email']}</span>}</label>
                  <label className="booking-field">Phone number<input autoComplete="tel" required type="tel" value={receiver.phone} onChange={(event) => updateReceiver('phone', event.target.value)} />{errors['receiver-phone'] && <span className="field-error">{errors['receiver-phone']}</span>}</label>
                  <label className="booking-field field-wide">Street address<input autoComplete="street-address" required value={receiver.address} onChange={(event) => updateReceiver('address', event.target.value)} />{errors['receiver-address'] && <span className="field-error">{errors['receiver-address']}</span>}</label>
                  <label className="booking-field">City<input autoComplete="address-level2" required value={receiver.city} onChange={(event) => updateReceiver('city', event.target.value)} />{errors['receiver-city'] && <span className="field-error">{errors['receiver-city']}</span>}</label>
                  <label className="booking-field">Country<input autoComplete="country-name" required value={receiver.country} onChange={(event) => updateReceiver('country', event.target.value)} />{errors['receiver-country'] && <span className="field-error">{errors['receiver-country']}</span>}</label>
                  </div>
                </div>
              )}

              {currentStep === 4 && (
                <div className="package-step">
                  <div className="package-step-banner">
                    <div><strong>Cargo profile</strong><span>Use the outer measurements of one package.</span></div>
                    <span className="package-unit">CM / KG</span>
                  </div>
                  <div className="form-grid package-fields">
                    <label className="booking-field">Number of packages<input required min="1" type="number" value={packages} onChange={(event) => { setPackages(event.target.value); setErrors((previous) => ({ ...previous, packages: '' })) }} />{errors.packages && <span className="field-error">{errors.packages}</span>}</label>
                    <label className="booking-field">Total weight (kg)<input required min="0.1" step="0.1" type="number" value={weight} onChange={(event) => { setWeight(event.target.value); setErrors((previous) => ({ ...previous, weight: '' })) }} />{errors.weight && <span className="field-error">{errors.weight}</span>}</label>
                    <label className="booking-field">Declared value (USD)<input required min="0" type="number" value={declaredValue} onChange={(event) => { setDeclaredValue(event.target.value); setErrors((previous) => ({ ...previous, declaredValue: '' })) }} />{errors.declaredValue && <span className="field-error">{errors.declaredValue}</span>}</label>
                    <fieldset className="dimension-fieldset field-wide">
                      <legend>Package dimensions <span>Length × width × height</span></legend>
                      <div className="dimension-grid">
                        <label className="booking-field">Length<input min="1" type="number" value={dimensions.length} onChange={(event) => { setDimensions((previous) => ({ ...previous, length: event.target.value })); setErrors((previous) => ({ ...previous, length: '' })) }} />{errors.length && <span className="field-error">{errors.length}</span>}</label>
                        <label className="booking-field">Width<input min="1" type="number" value={dimensions.width} onChange={(event) => { setDimensions((previous) => ({ ...previous, width: event.target.value })); setErrors((previous) => ({ ...previous, width: '' })) }} />{errors.width && <span className="field-error">{errors.width}</span>}</label>
                        <label className="booking-field">Height<input min="1" type="number" value={dimensions.height} onChange={(event) => { setDimensions((previous) => ({ ...previous, height: event.target.value })); setErrors((previous) => ({ ...previous, height: '' })) }} />{errors.height && <span className="field-error">{errors.height}</span>}</label>
                      </div>
                    </fieldset>
                    <label className="booking-field">Special handling
                      <select value={handling} onChange={(event) => setHandling(event.target.value)}>
                        <option>Standard handling</option>
                        <option>Fragile goods</option>
                        <option>Keep dry</option>
                        <option>Temperature controlled</option>
                      </select>
                    </label>
                    <label className="booking-field field-wide">Contents description<input required value={contents} onChange={(event) => { setContents(event.target.value); setErrors((previous) => ({ ...previous, contents: '' })) }} placeholder="Briefly describe the shipment contents" />{errors.contents && <span className="field-error">{errors.contents}</span>}</label>
                    <div className="package-photos field-wide">
                      <div className="package-photos-heading">
                        <div><strong>Package photos</strong><span>Add images from your device gallery to help identify the cargo.</span></div>
                        <span>{packagePhotos.length} / 6</span>
                      </div>
                      <label className="photo-upload-zone" htmlFor="package-photo-input">
                        <input
                          id="package-photo-input"
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={(event) => {
                            const selectedFiles = Array.from(event.target.files ?? []).filter((file) => file.type.startsWith('image/'))
                            const remainingSlots = Math.max(0, 6 - packagePhotos.length)
                            const nextPhotos = selectedFiles.slice(0, remainingSlots).map((file, index) => ({
                              id: `${file.name}-${Date.now()}-${index}`,
                              name: file.name,
                              url: URL.createObjectURL(file),
                            }))
                            packagePhotoUrls.current.push(...nextPhotos.map((photo) => photo.url))
                            setPackagePhotos((previous) => [...previous, ...nextPhotos])
                            event.target.value = ''
                          }}
                        />
                        <span className="upload-icon" aria-hidden="true">+</span>
                        <span><strong>Choose photos</strong><small>Browse your gallery · JPG, PNG or WEBP</small></span>
                        <span className="upload-action">Browse</span>
                      </label>
                      {packagePhotos.length > 0 && (
                        <div className="package-photo-grid" aria-label="Selected package photos">
                          {packagePhotos.map((photo) => (
                            <figure key={photo.id} className="package-photo-item">
                              <img src={photo.url} alt={photo.name} />
                              <figcaption title={photo.name}>{photo.name}</figcaption>
                              <button
                                type="button"
                                aria-label={`Remove ${photo.name}`}
                                onClick={() => {
                                  URL.revokeObjectURL(photo.url)
                                  packagePhotoUrls.current = packagePhotoUrls.current.filter((url) => url !== photo.url)
                                  setPackagePhotos((previous) => previous.filter((item) => item.id !== photo.id))
                                }}
                              >×</button>
                            </figure>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {currentStep === 5 && (
                <div className="confirm-step">
                  <div className="confirm-review-banner">
                    <span className="confirm-review-mark">✓</span>
                    <div><strong>Review before you confirm</strong><span>Check the route, contacts, and package details below.</span></div>
                  </div>
                  <div className="confirm-party-grid">
                    <div className="confirm-party-card confirm-sender"><span>SHIPPER / PICKUP</span><strong>{sender.name}</strong><small>{sender.address}</small><small>{senderLocation}</small><small>{sender.email} · {sender.phone}</small></div>
                    <div className="confirm-party-card confirm-receiver"><span>RECIPIENT / DELIVERY</span><strong>{receiver.name}</strong><small>{receiver.address}</small><small>{receiverLocation}</small><small>{receiver.email} · {receiver.phone}</small></div>
                  </div>
                  <div className="confirm-shipment-specs">
                    <div><span>Transport</span><strong>{selectedMode.label}</strong></div>
                    <div><span>Carrier</span><strong>{carrier}</strong></div>
                    <div><span>Packages</span><strong>{packages} package(s)</strong></div>
                    <div><span>Weight</span><strong>{weight} kg</strong></div>
                    <div><span>Dimensions</span><strong>{dimensions.length} × {dimensions.width} × {dimensions.height} cm</strong></div>
                    <div><span>Declared value</span><strong>${Number(declaredValue || 0).toLocaleString()}</strong></div>
                    <div><span>Handling</span><strong>{handling}</strong></div>
                    <div className="confirm-spec-wide"><span>Contents</span><strong>{contents}</strong></div>
                  </div>
                  {packagePhotos.length > 0 && (
                    <div className="confirm-photo-strip" aria-label="Attached package photos">
                      {packagePhotos.map((photo) => <img key={photo.id} src={photo.url} alt={photo.name} />)}
                    </div>
                  )}
                  <label className="confirm-consent"><input id="confirm-ack" required type="checkbox" />{errors.confirmation && <span className="field-error">{errors.confirmation}</span>}<span>I confirm these shipment details are accurate and understand this preview does not submit a carrier booking.</span></label>
                </div>
              )}
            </section>

            <div className="wizard-actions">
              <button className="button button-secondary" type="button" onClick={() => setCurrentStep((step) => Math.max(0, step - 1))} disabled={currentStep === 0}>
                Back
              </button>
              <span>Step {currentStep + 1} of {steps.length}</span>
              <button className="button button-primary" type="submit" onClick={advanceStep}>
                {currentStep === steps.length - 1 ? 'Confirm request' : 'Continue'}
              </button>
            </div>
          </form>

          <aside className="booking-summary card">
          <div className="summary-heading">
            <div>
              <p className="eyebrow">Live request overview</p>
              <h2>{currentStep === 4 ? 'Package details' : steps[currentStep]}</h2>
            </div>
            <span className="summary-draft">Step {currentStep + 1} / 6</span>
          </div>

          <div className="summary-progress-track" aria-label={`Step ${currentStep + 1} of ${steps.length}`}>
            <span style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }} />
          </div>

          <div className="summary-route">
            <div className="summary-stop"><i className="summary-stop-dot pickup-dot" /><span>SHIP FROM</span><strong>{senderLocation || 'Add pickup location'}</strong></div>
            <span className="summary-route-line" aria-hidden="true"><i /></span>
            <div className="summary-stop"><i className="summary-stop-dot delivery-dot" /><span>DELIVER TO</span><strong>{receiverLocation || 'Add delivery location'}</strong></div>
          </div>

          <div className="summary-carrier">
            {selectedCarrier && <img src={selectedCarrier.logo} alt={`${selectedCarrier.name} logo`} />}
            <div><span>{selectedMode.label}</span><strong>{carrier}</strong></div>
            <span className="summary-carrier-label">CARRIER</span>
          </div>

          <div className="summary-section-label">PACKAGE SNAPSHOT</div>
          <div className="summary-metrics">
            <div><span>Packages</span><strong>{packages || '0'}</strong></div>
            <div><span>Total weight</span><strong>{weight || '0'} kg</strong></div>
            <div><span>Dimensions</span><strong>{dimensions.length} × {dimensions.width} × {dimensions.height} cm</strong></div>
            <div><span>Declared value</span><strong>${Number(declaredValue || 0).toLocaleString()}</strong></div>
            <div className="summary-metric-wide"><span>Handling</span><strong>{handling}</strong></div>
          </div>

          <div className="summary-photos">
            <div className="summary-photos-heading"><span>Package photos</span><strong>{packagePhotos.length}</strong></div>
            {packagePhotos.length > 0 ? (
              <div className="summary-photo-strip">
                {packagePhotos.slice(0, 4).map((photo) => <img key={photo.id} src={photo.url} alt={photo.name} />)}
                {packagePhotos.length > 4 && <span>+{packagePhotos.length - 4}</span>}
              </div>
            ) : (
              <p>Add reference photos in the Package step.</p>
            )}
          </div>

          <div className="quote-note">
            <strong>One step at a time</strong>
            <p>Your details stay saved as you move through the request.</p>
          </div>
          <p className="summary-footnote">No booking is submitted until the final step.</p>
        </aside>
      </div>
      )}
    </section>
  )
}

function TrackPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { getShipment, updateShipment } = useShipments()
  const requestedWaybill = (searchParams.get('waybill') || searchParams.get('q'))?.trim() ?? ''
  const [waybillInput, setWaybillInput] = useState(requestedWaybill)
  const [shareStatus, setShareStatus] = useState('')
  const [printModalOpen, setPrintModalOpen] = useState(false)
  const [dbFetchedShipment, setDbFetchedShipment] = useState<Shipment | null>(null)
  const [isFetchingFromDb, setIsFetchingFromDb] = useState(false)
  
  const localShipment = requestedWaybill ? getShipment(requestedWaybill) : undefined
  const matchedShipment = dbFetchedShipment || localShipment

  // Real-time 1-second cadence ticker for active in_transit movement
  const [telemetryTick, setTelemetryTick] = useState(0)
  useEffect(() => {
    if (matchedShipment?.status !== 'in_transit' || matchedShipment?.isMovementStopped) return
    const interval = setInterval(() => {
      setTelemetryTick((t) => (t + 1) % 1000000)
    }, 1000)
    return () => clearInterval(interval)
  }, [matchedShipment?.status, matchedShipment?.isMovementStopped])

  const liveTelemetry = useMemo(() => {
    if (!matchedShipment) return null
    return calculateRealtimeJourneyTelemetry(matchedShipment)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchedShipment, telemetryTick])

  // Fetch fresh shipment details directly when a waybill is searched
  useEffect(() => {
    if (!requestedWaybill) {
      setDbFetchedShipment(null)
      return
    }

    let isCancelled = false
    setIsFetchingFromDb(true)

    const fetchLiveDatabaseRecord = async () => {
      try {
        const fresh = await apiService.getShipment(requestedWaybill)
        if (!isCancelled && fresh && fresh.waybill) {
          setDbFetchedShipment(fresh)
          // Keep context synchronized
          updateShipment(fresh.waybill, fresh)
        }
      } catch {
        // Fallback: search across all shipments in MongoDB
        try {
          const all = await apiService.getShipments()
          if (!isCancelled && Array.isArray(all)) {
            const clean = requestedWaybill.trim().toUpperCase()
            const bare = clean.replace(/^[A-Z]{3,4}-/, '')
            const found = all.find(
              (s) =>
                (s.waybill && (
                  s.waybill.toUpperCase() === clean ||
                  s.waybill.toUpperCase().replace(/^[A-Z]{3,4}-/, '') === bare ||
                  s.waybill.toUpperCase().replace(/^PLOT-/, 'NTS-') === clean ||
                  s.waybill.toUpperCase().replace(/^NTS-/, 'PLOT-') === clean
                )) ||
                (s.clientReference && s.clientReference.toUpperCase() === clean) ||
                s.id === clean
            )
            if (found && found.waybill) {
              setDbFetchedShipment(found)
              updateShipment(found.waybill, found)
            }
          }
        } catch {}
      } finally {
        if (!isCancelled) setIsFetchingFromDb(false)
      }
    }

    // Call immediately on mount/waybill change
    fetchLiveDatabaseRecord()

    // 5-Second Live Auto-Refresh Polling for instant tracking updates
    const pollTimer = setInterval(fetchLiveDatabaseRecord, 5000)

    return () => {
      isCancelled = true
      clearInterval(pollTimer)
    }
  }, [requestedWaybill])


  useEffect(() => {
    if (requestedWaybill) {
      setWaybillInput(requestedWaybill)
    }
  }, [requestedWaybill])

  useEffect(() => setShareStatus(''), [requestedWaybill])

  const copyTrackingLink = async () => {
    const trackingUrl = `${window.location.origin}/track?waybill=${encodeURIComponent(requestedWaybill)}`

    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable')
      await navigator.clipboard.writeText(trackingUrl)
      setShareStatus('Tracking link copied to clipboard.')
    } catch {
      setShareStatus('Copy is unavailable here. You can share the tracking URL in your address bar.')
    }
  }

  return (
    <section className="section-block page-shell tracking-page">
      <div className="tracking-page-heading">
        <div>
          <p className="eyebrow">Real-Time Telemetry Visibility</p>
          <h1>Track a Consignment</h1>
          <p>Search any waybill number to review live satellite telemetry, customs clearance logs, vehicle coordinates, and milestone checkpoints.</p>
        </div>
        <div className="tracking-service-note">
          <span className="network-pulse" /> 10s Auto-Sync Telemetry Engine <strong>Active</strong>
        </div>
      </div>

      <form
        className="tracking-search-panel card"
        onSubmit={(event) => {
          event.preventDefault()
          const waybill = waybillInput.trim()
          if (waybill) setSearchParams({ waybill })
        }}
      >
        <label className="tracking-search-field">
          <span>Waybill identification number</span>
          <div className="tracking-search-control">
            <span className="tracking-search-icon" aria-hidden="true">⌕</span>
            <input
              name="waybill"
              type="search"
              autoComplete="off"
              required
              value={waybillInput}
              onChange={(event) => setWaybillInput(event.target.value)}
              placeholder="Enter a waybill, e.g. PLOT-70955-JFD, PLOT-99420-CT4, or PLOT-11280-FT2"
            />
          </div>
        </label>
        <button type="submit" className="button button-primary">Track shipment</button>
      </form>

      {!requestedWaybill && (
        <div className="tracking-empty card" style={{ padding: '3rem 2rem', textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}><Package size={44} color='#fca311' strokeWidth={1.2} /></div>
          <strong style={{ fontSize: '1.25rem', color: '#f8fafc', display: 'block', marginBottom: '0.5rem' }}>
            Consignment Tracking & Live Telemetry Portal
          </strong>
          <p style={{ maxWidth: '520px', margin: '0 auto 1.5rem', color: '#94a3b8', fontSize: '0.9rem', lineHeight: 1.5 }}>
            Please enter your unique <strong>Waybill / Consignment Number</strong> in the search bar above to monitor real-time satellite coordinates, customs checkpoints, and milestone progression.
          </p>

          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '12px',
              padding: '10px 18px',
              background: 'rgba(255, 255, 255, 0.03)',
              borderRadius: '10px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              fontSize: '0.8rem',
              color: '#64748b',
            }}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}><ShieldCheck size={13} color='#fca311' strokeWidth={1.5} /> 256-Bit Encrypted Tracking</span>
            <span>•</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}><Zap size={13} color='#fca311' strokeWidth={1.5} /> 10-Second Auto-Refresh Polling</span>
            <span>•</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}><Globe size={13} color='#fca311' strokeWidth={1.5} /> Global Customs Multi-Gateway</span>
          </div>
        </div>
      )}

      {requestedWaybill && isFetchingFromDb && !matchedShipment && (
        <div className="card" style={{ padding: '2.5rem', textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.75rem' }}><Radio size={36} color='#fca311' strokeWidth={1.2} /></div>
          <strong style={{ fontSize: '1.1rem', color: '#f8fafc', display: 'block' }}>
            Querying Live Tracking Registry...
          </strong>
          <p style={{ margin: '0.5rem auto 0', color: '#94a3b8', fontSize: '0.85rem' }}>
            Fetching real-time satellite telemetry, customs clearance, and consignment details for <strong>{requestedWaybill}</strong>.
          </p>
        </div>
      )}

      {requestedWaybill && !isFetchingFromDb && !matchedShipment && (
        <div className="tracking-not-found card" role="status" style={{ padding: '2.5rem', textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.75rem' }}><Search size={36} color='#fca311' strokeWidth={1.2} /></div>
          <strong style={{ fontSize: '1.15rem', color: '#f8fafc', display: 'block' }}>
            No Active Consignment Found for "{requestedWaybill}"
          </strong>
          <p style={{ maxWidth: '480px', margin: '0.5rem auto 1.25rem', color: '#94a3b8', fontSize: '0.88rem' }}>
            Please verify the waybill identification code or contact our 24/7 operations support desk.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
            <Link to="/contact" className="button button-primary" style={{ fontSize: '0.85rem' }}>
              Contact Operations Desk
            </Link>
          </div>
        </div>
      )}

      {matchedShipment && (
        <section className="tracking-result" aria-label="Shipment tracking result">
          {/* Header Row */}
          <div className="tracking-result-heading">
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <p className="eyebrow" style={{ margin: 0 }}>Verified Freight Consignment</p>
                <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '4px', background: 'rgba(2, 132, 199, 0.15)', color: '#38bdf8', fontWeight: 400 }}>
                  {matchedShipment.transportScope || 'International'}
                </span>
                <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '4px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', fontWeight: 400 }}>
                  Official Consignment Verified
                </span>
              </div>
              <h2>{matchedShipment.waybill.toUpperCase()}</h2>
              {(matchedShipment.createdAt || matchedShipment.bookingDate) && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px', fontSize: '0.82rem', color: '#94a3b8' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}><Calendar size={12} color='#fca311' strokeWidth={1.5} /> Booking Time:</span>
                  <strong style={{ color: '#f1f5f9' }}>
                    {new Date(matchedShipment.createdAt || matchedShipment.bookingDate!).toLocaleString([], {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}
                  </strong>
                </div>
              )}
            </div>

            <div className="tracking-result-actions">
              <span className={`tracking-state ${matchedShipment.isMovementStopped ? 'tracking-state-alert' : matchedShipment.status === 'exception' ? 'tracking-state-alert' : ''}`}>
                <i /> {matchedShipment.isMovementStopped ? 'MOVEMENT STOPPED' : matchedShipment.status.replace('_', ' ').toUpperCase()}
              </span>
              <button type="button" className="tracking-copy-button" onClick={copyTrackingLink}>
                {shareStatus === 'Tracking link copied to clipboard.' ? '✓ Copied' : 'Copy link'} <span aria-hidden="true">↗</span>
              </button>
              <button
                type="button"
                className="tracking-copy-button"
                style={{ background: 'rgba(255,255,255,0.06)' }}
                onClick={() => setPrintModalOpen(true)}
              >
                Print Label
              </button>
            </div>
          </div>

          {shareStatus && <p className="tracking-share-status" role="status">{shareStatus}</p>}

          {/* Time & Distance Telemetry Summary Matrix */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '0.85rem',
              marginBottom: '1.25rem',
            }}
          >
            {/* Hours Covered / Elapsed */}
            <div
              style={{
                background: 'rgba(15, 23, 42, 0.6)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                padding: '1rem',
                borderRadius: '10px',
                borderLeft: '4px solid #10b981',
              }}
            >
              <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 400, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                ⏱️ Hours & Time Covered
              </span>
              <strong style={{ display: 'block', fontSize: '1.2rem', color: '#f8fafc', marginTop: '4px' }}>
                {liveTelemetry?.hoursCoveredStr || (matchedShipment.status === 'pending' ? '0h 00m' : matchedShipment.status === 'delivered' ? 'Completed' : 'Calculating...')}
              </strong>
              <small style={{ fontSize: '0.74rem', color: '#64748b' }}>
                Since departure at {matchedShipment.origin.code}
              </small>
            </div>

            {/* Hours Left / Remaining */}
            <div
              style={{
                background: 'rgba(15, 23, 42, 0.6)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                padding: '1rem',
                borderRadius: '10px',
                borderLeft: '4px solid #38bdf8',
              }}
            >
              <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 400, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Time Remaining
              </span>
              <strong style={{ display: 'block', fontSize: '1.2rem', color: '#38bdf8', marginTop: '4px' }}>
                {matchedShipment.isMovementStopped ? 'Paused on Hold' : liveTelemetry?.hoursRemainingStr || (matchedShipment.status === 'delivered' ? '0h 00m (Arrived)' : 'Calculating...')}
              </strong>
              <small style={{ fontSize: '0.74rem', color: '#64748b' }}>
                ETA: {matchedShipment.eta || liveTelemetry?.etaString || 'Calculated Live'}
              </small>
            </div>

            {/* Percentage & Distance Covered */}
            <div
              style={{
                background: 'rgba(15, 23, 42, 0.6)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                padding: '1rem',
                borderRadius: '10px',
                borderLeft: '4px solid #f59e0b',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 400, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Progress & Distance
                </span>
                <span style={{ fontSize: '0.7rem', color: '#f59e0b', fontWeight: 400 }}>
                  {liveTelemetry ? `${Math.round(liveTelemetry.remainingPct)}% to go` : ''}
                </span>
              </div>
              <strong style={{ display: 'block', fontSize: '1.2rem', color: '#f59e0b', marginTop: '4px' }}>
                {liveTelemetry ? `${Math.round(liveTelemetry.progressPct)}% Covered` : `${matchedShipment.progressPct || 0}% Complete`}
              </strong>
              <small style={{ fontSize: '0.74rem', color: '#cbd5e1', display: 'block', marginTop: '2px' }}>
                {liveTelemetry
                  ? `${liveTelemetry.coveredKm.toLocaleString()} km covered · ${liveTelemetry.remainingKm.toLocaleString()} km remaining`
                  : `${matchedShipment.estimatedDistanceKm || 0} km`}
              </small>
            </div>

            {/* Speed & Altitude Telemetry */}
            <div
              style={{
                background: 'rgba(15, 23, 42, 0.6)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                padding: '1rem',
                borderRadius: '10px',
                borderLeft: '4px solid #818cf8',
              }}
            >
              <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 400, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Live Telemetry State
              </span>
              <strong style={{ display: 'block', fontSize: '1.2rem', color: matchedShipment.isMovementStopped ? '#ef4444' : '#818cf8', marginTop: '4px' }}>
                {matchedShipment.isMovementStopped ? '0 km/h · Halted' : liveTelemetry?.speedDisplay || '80 km/h · Normal Driving Speed'}
              </strong>
              <small style={{ fontSize: '0.74rem', color: '#64748b' }}>
                Total Route: {liveTelemetry?.totalKm.toLocaleString() || matchedShipment.estimatedDistanceKm?.toLocaleString() || 0} KM
              </small>
            </div>
          </div>

          {/* Interactive Live Map Section */}
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: matchedShipment.isMovementStopped ? '#ef4444' : '#10b981', display: 'inline-block' }} />
                <strong style={{ fontSize: '0.9rem', color: '#f1f5f9' }}>Real-Time GPS Trajectory & Corridor Vector</strong>
              </div>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                Mode: <strong>{matchedShipment.mode.toUpperCase()}</strong> · Carrier: <strong>{matchedShipment.carrier}</strong>
              </span>
            </div>
            <ClientLiveMap shipment={matchedShipment} height="420px" />
          </div>

          <div className="tracking-result-grid">
            <div className="tracking-main-column">
              {/* Corridor Topline */}
              <article className="tracking-route-card card">
                <div className="tracking-route-topline">
                  <span>TRANSIT CORRIDOR ({matchedShipment.mode.toUpperCase()})</span>
                  <span>Vector: {matchedShipment.currentLocation.name}</span>
                </div>
                <div className="tracking-route-visual">
                  <div className="tracking-route-stop">
                    <i className="route-origin-dot" />
                    <span>ORIGIN HUB</span>
                    <strong>{matchedShipment.origin.code}</strong>
                    <small>{matchedShipment.origin.name}</small>
                  </div>
                  <div className="tracking-route-path">
                    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                      {matchedShipment.mode === 'air' ? (
                        <Plane size={15} strokeWidth={1.5} />
                      ) : matchedShipment.mode === 'sea' ? (
                        <Ship size={15} strokeWidth={1.5} />
                      ) : (
                        <Truck size={15} strokeWidth={1.5} />
                      )}
                    </span>
                    <i />
                  </div>
                  <div className="tracking-route-stop tracking-route-destination">
                    <i className="route-destination-dot" />
                    <span>DESTINATION HUB</span>
                    <strong>{matchedShipment.destination.code}</strong>
                    <small>{matchedShipment.destination.name}</small>
                  </div>
                </div>

                {/* Progress bar */}
                <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '4px', flexWrap: 'wrap', gap: '4px' }}>
                    <span>Corridor Transit Progress</span>
                    <strong style={{ color: '#38bdf8' }}>
                      {liveTelemetry
                        ? `${Math.round(liveTelemetry.progressPct)}% covered (${liveTelemetry.coveredKm.toLocaleString()} km) · ${Math.round(liveTelemetry.remainingPct)}% to cover (${liveTelemetry.remainingKm.toLocaleString()} km)`
                        : `${matchedShipment.progressPct || (matchedShipment.status === 'pending' ? 0 : matchedShipment.status === 'delivered' ? 100 : 50)}%`}
                    </strong>
                  </div>
                  <div style={{ height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${liveTelemetry ? liveTelemetry.progressPct : (matchedShipment.progressPct || (matchedShipment.status === 'pending' ? 0 : matchedShipment.status === 'delivered' ? 100 : 50))}%`,
                        background: matchedShipment.isMovementStopped ? '#ef4444' : 'linear-gradient(90deg, #0284c7, #38bdf8, #34d399)',
                        borderRadius: '3px',
                        transition: 'width 0.6s ease',
                      }}
                    />
                  </div>
                </div>

                <div className="tracking-route-footer" style={{ marginTop: '0.75rem' }}>
                  <span>Estimated Delivery Schedule (ETA)</span>
                  <strong style={{ color: '#38bdf8' }}>{matchedShipment.eta || liveTelemetry?.etaString || 'Calculated Live'}</strong>
                </div>
              </article>

              {/* Movement & Security Status Banner (Prominent reflection) */}
              {matchedShipment.isMovementStopped ? (
                <div
                  style={{
                    background: '#fef2f2',
                    border: '2px solid #ef4444',
                    color: '#991b1b',
                    padding: '1.25rem 1.5rem',
                    borderRadius: '14px',
                    marginBottom: '1.25rem',
                    boxShadow: '0 6px 18px rgba(239, 68, 68, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px',
                  }}
                >
                  <span style={{ flexShrink: 0, display: 'inline-flex' }}><AlertCircle size={28} color='#ea580c' strokeWidth={1.5} /></span>
                  <div>
                    <strong style={{ display: 'block', fontSize: '1.05rem', color: '#991b1b', fontWeight: 500, marginBottom: '2px' }}>
                      SHIPMENT MOVEMENT STOPPED / DISPATCH HOLD ACTIVE
                    </strong>
                    <span style={{ fontSize: '0.88rem', color: '#1f2937', fontWeight: 400, lineHeight: 1.4 }}>
                      This consignment has been temporarily halted by Dispatch Operations. Live vehicle coordinates are frozen at the current location until movement is resumed by admin.
                    </span>
                  </div>
                </div>
              ) : matchedShipment.status === 'in_transit' ? (
                <div
                  style={{
                    background: '#f0fdf4',
                    border: '2px solid #22c55e',
                    color: '#166534',
                    padding: '1.25rem 1.5rem',
                    borderRadius: '14px',
                    marginBottom: '1.25rem',
                    boxShadow: '0 6px 18px rgba(34, 197, 94, 0.12)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px',
                  }}
                >
                  <div style={{ flexShrink: 0, width: 44, height: 44, borderRadius: 10, background: 'rgba(34, 197, 94, 0.15)', display: 'grid', placeItems: 'center', color: '#16a34a' }}>
                    {matchedShipment.mode === 'land' ? <Truck size={24} /> : matchedShipment.mode === 'sea' ? <Ship size={24} /> : <Plane size={24} />}
                  </div>
                  <div>
                    <strong style={{ display: 'block', fontSize: '1.05rem', color: '#15803d', fontWeight: 500, marginBottom: '2px' }}>
                      SHIPMENT IN TRANSIT (ACTIVE GPS TELEMETRY)
                    </strong>
                    <span style={{ fontSize: '0.88rem', color: '#1f2937', fontWeight: 400, lineHeight: 1.4 }}>
                      Consignment is actively moving along the authorized corridor towards destination hub. Live telemetry and speed are synchronized.
                    </span>
                  </div>
                </div>
              ) : matchedShipment.status === 'pending' ? (
                <div
                  style={{
                    background: '#fffbeb',
                    border: '2px solid #f59e0b',
                    color: '#92400e',
                    padding: '1.25rem 1.5rem',
                    borderRadius: '14px',
                    marginBottom: '1.25rem',
                    boxShadow: '0 6px 18px rgba(245, 158, 11, 0.12)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px',
                  }}
                >
                  <span style={{ fontSize: '2.25rem', flexShrink: 0 }}>⏳</span>
                  <div>
                    <strong style={{ display: 'block', fontSize: '1.05rem', color: '#92400e', fontWeight: 500, marginBottom: '2px' }}>
                      ⏳ PENDING DISPATCH APPROVAL (STATIONARY AT ORIGIN)
                    </strong>
                    <span style={{ fontSize: '0.88rem', color: '#1f2937', fontWeight: 400, lineHeight: 1.4 }}>
                      Consignment booking is officially confirmed in the logistics system. The vehicle will commence active GPS movement once the operations board approves it to In Transit.
                    </span>
                  </div>
                </div>
              ) : matchedShipment.status === 'delivered' ? (
                <div
                  style={{
                    background: '#f0fdf4',
                    border: '2px solid #10b981',
                    color: '#065f46',
                    padding: '1.25rem 1.5rem',
                    borderRadius: '14px',
                    marginBottom: '1.25rem',
                    boxShadow: '0 6px 18px rgba(16, 185, 129, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px',
                  }}
                >
                  <span style={{ flexShrink: 0, display: 'inline-flex' }}><CheckCircle2 size={28} color='#10b981' strokeWidth={1.5} /></span>
                  <div>
                    <strong style={{ display: 'block', fontSize: '1.05rem', color: '#166534', fontWeight: 500, marginBottom: '2px' }}>
                      CONSIGNMENT DELIVERED & RECEIVED
                    </strong>
                    <span style={{ fontSize: '0.88rem', color: '#1f2937', fontWeight: 400, lineHeight: 1.4 }}>
                      All linehaul milestones completed. Final receipt signed at destination gateway.
                    </span>
                  </div>
                </div>
              ) : null}

              {/* Sender & Receiver Card (High-Contrast White Background + Jet Black Text) */}
              <article
                style={{
                  background: '#ffffff',
                  border: '1.5px solid #cbd5e1',
                  borderRadius: '16px',
                  padding: '1.5rem',
                  marginBottom: '1.25rem',
                  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.06)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.15rem', borderBottom: '1.5px solid #e2e8f0', paddingBottom: '0.85rem' }}>
                  <div>
                    <span style={{ fontSize: '0.72rem', fontWeight: 400, color: '#0284c7', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Official Routing Credentials
                    </span>
                    <h3 style={{ margin: '2px 0 0', fontSize: '1.25rem', color: '#ffffff', fontWeight: 400 }}>
                      Sender & Consignee Information
                    </h3>
                  </div>
                  <span style={{ fontSize: '0.75rem', padding: '4px 12px', borderRadius: '20px', background: '#f1f5f9', color: '#0f172a', fontWeight: 400, border: '1px solid #cbd5e1' }}>
                    Verified Parties
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem' }}>
                  {/* Sender Party */}
                  <div style={{ background: 'rgba(11, 17, 30, 0.65)', padding: '1.25rem', borderRadius: '12px', border: '1px solid rgba(229, 229, 229, 0.1)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.74rem', color: '#059669', fontWeight: 500, letterSpacing: '0.05em', marginBottom: '8px', textTransform: 'uppercase' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><ArrowUpRight size={13} color='#fca311' strokeWidth={1.5} /> SENDER / ORIGIN PARTY</span>
                    </div>
                    <strong style={{ display: 'block', fontSize: '1.15rem', color: '#ffffff', fontWeight: 400 }}>
                      {matchedShipment.senderName || 'Apex International Logistics'}
                    </strong>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '10px', fontSize: '0.88rem' }}>
                      <div>
                        <span style={{ color: '#9ca3af', fontSize: '0.78rem', fontWeight: 300, display: 'block' }}>Origin Location:</span>
                        <strong style={{ color: '#ffffff', fontWeight: 400 }}>{matchedShipment.origin.name}</strong> ({matchedShipment.origin.code})
                      </div>
                      {matchedShipment.senderEmail && (
                        <div>
                          <span style={{ color: '#9ca3af', fontSize: '0.78rem', fontWeight: 300, display: 'block' }}>Sender Email:</span>
                          <strong style={{ color: '#e5e5e5', fontWeight: 400 }}>{matchedShipment.senderEmail}</strong>
                        </div>
                      )}
                      {matchedShipment.senderPhone && (
                        <div>
                          <span style={{ color: '#9ca3af', fontSize: '0.78rem', fontWeight: 300, display: 'block' }}>Sender Phone:</span>
                          <strong style={{ color: '#e5e5e5', fontWeight: 400 }}>{matchedShipment.senderPhone}</strong>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Consignee Party */}
                  <div style={{ background: 'rgba(11, 17, 30, 0.65)', padding: '1.25rem', borderRadius: '12px', border: '1px solid rgba(229, 229, 229, 0.1)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.74rem', color: '#0284c7', fontWeight: 500, letterSpacing: '0.05em', marginBottom: '8px', textTransform: 'uppercase' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><ArrowDownLeft size={13} color='#fca311' strokeWidth={1.5} /> CONSIGNEE / RECEIVER PARTY</span>
                    </div>
                    <strong style={{ display: 'block', fontSize: '1.15rem', color: '#ffffff', fontWeight: 400 }}>
                      {matchedShipment.receiverName || matchedShipment.clientName || 'Source Cards TCG'}
                    </strong>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '10px', fontSize: '0.88rem' }}>
                      <div>
                        <span style={{ color: '#9ca3af', fontSize: '0.78rem', fontWeight: 300, display: 'block' }}>Destination Hub:</span>
                        <strong style={{ color: '#ffffff', fontWeight: 400 }}>{matchedShipment.destination.name}</strong> ({matchedShipment.destination.code})
                      </div>
                      {(matchedShipment.receiverEmail || matchedShipment.clientEmail) && (
                        <div>
                          <span style={{ color: '#9ca3af', fontSize: '0.78rem', fontWeight: 300, display: 'block' }}>Receiver Email:</span>
                          <strong style={{ color: '#e5e5e5', fontWeight: 400 }}>{matchedShipment.receiverEmail || matchedShipment.clientEmail}</strong>
                        </div>
                      )}
                      {matchedShipment.receiverPhone && (
                        <div>
                          <span style={{ color: '#9ca3af', fontSize: '0.78rem', fontWeight: 300, display: 'block' }}>Receiver Phone:</span>
                          <strong style={{ color: '#e5e5e5', fontWeight: 400 }}>{matchedShipment.receiverPhone}</strong>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </article>

              {/* Exception Notice */}
              {matchedShipment.status === 'exception' && !matchedShipment.isMovementStopped && (
                <div
                  style={{
                    background: 'rgba(239, 68, 68, 0.15)',
                    border: '1px solid rgba(239, 68, 68, 0.4)',
                    color: '#fca5a5',
                    padding: '1rem 1.25rem',
                    borderRadius: '8px',
                    marginBottom: '1.25rem',
                  }}
                >
                  <strong style={{ display: 'block', fontSize: '0.9rem', marginBottom: '4px' }}>
                    Operational Exception Notice
                  </strong>
                  <span style={{ fontSize: '0.82rem' }}>
                    {matchedShipment.statusNote || 'Cargo undergoing secondary transit verification.'}
                  </span>
                </div>
              )}

              {/* Checkpoint Timeline */}
              <article className="tracking-timeline-card card">
                <div className="tracking-card-heading">
                  <div>
                    <p className="eyebrow">Checkpoint Progression</p>
                    <h3>Milestone Journey</h3>
                  </div>
                  <span>{matchedShipment.checkpoints.length} recorded events</span>
                </div>
                <ol className="tracking-timeline">
                  {matchedShipment.checkpoints.map((milestone) => (
                    <li
                      key={milestone.id}
                      className={`${milestone.completed ? 'milestone-complete' : ''} ${milestone.current ? 'milestone-current' : ''}`}
                    >
                      <span className="milestone-indicator">{milestone.completed ? '✓' : ''}</span>
                      <div className="milestone-copy">
                        <strong>{milestone.title}</strong>
                        <span>{milestone.detail}</span>
                        <small>{milestone.location}</small>
                      </div>
                      <time>{milestone.time}</time>
                    </li>
                  ))}
                </ol>
              </article>
            </div>

            {/* Sidebar Specifications (High-Contrast White Background + Jet Black Text, No Pricing) */}
            <aside
              style={{
                background: '#ffffff',
                border: '1.5px solid #cbd5e1',
                borderRadius: '16px',
                padding: '1.5rem',
                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.06)',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1.5px solid #e2e8f0', paddingBottom: '0.75rem' }}>
                <div>
                  <span style={{ fontSize: '0.72rem', fontWeight: 400, color: '#0284c7', textTransform: 'uppercase' }}>
                    Consignment Profile
                  </span>
                  <h4 style={{ margin: '2px 0 0', fontSize: '1.15rem', color: '#ffffff', fontWeight: 400 }}>
                    Specifications
                  </h4>
                </div>
                <span style={{ fontSize: '0.78rem', fontWeight: 400, padding: '3px 8px', borderRadius: '6px', background: '#0f172a', color: '#ffffff' }}>
                  {matchedShipment.carrierCode}
                </span>
              </div>
              
              <div style={{ background: '#f8fafc', border: '1.5px solid #cbd5e1', borderRadius: '12px', padding: '1rem' }}>
                <strong style={{ fontSize: '1.15rem', color: '#0a182d', fontWeight: 500, display: 'block' }}>
                  {matchedShipment.carrier}
                </strong>
                <span style={{ fontSize: '0.78rem', color: '#0284c7', fontWeight: 400 }}>
                  {matchedShipment.serviceTier || 'STANDARD'} • {matchedShipment.mode === 'land' ? 'OVERLAND ROAD' : matchedShipment.mode === 'sea' ? 'OCEAN MARITIME' : 'PRIORITY AIR'}
                </span>
              </div>

              {/* Package Cargo Image */}
              <div style={{ borderRadius: '12px', overflow: 'hidden', border: '1.5px solid #cbd5e1', background: '#f8fafc' }}>
                <img
                  src={matchedShipment.packageImageUrl || 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=600&q=80'}
                  alt="Verified Cargo Manifest Preview"
                  style={{ width: '100%', height: '160px', objectFit: 'cover' }}
                />
                <div style={{ padding: '6px 10px', background: '#0f172a', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem', color: '#ffffff' }}>
                  <span style={{ fontWeight: 400, display: 'inline-flex', alignItems: 'center', gap: '5px' }}><Camera size={13} color='#fca311' strokeWidth={1.5} /> CARGO VERIFICATION PHOTO</span>
                  <span style={{ color: '#4ade80', fontWeight: 400, display: 'inline-flex', alignItems: 'center', gap: '3px' }}><Check size={12} strokeWidth={2} /> INSPECTED</span>
                </div>
              </div>

              {/* Cargo & Driver Summary (No Pricing / No Declared Value) */}
              <dl style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.65rem', margin: 0, padding: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '4px' }}>
                  <dt style={{ color: '#475569', fontSize: '0.82rem', fontWeight: 400 }}>Cargo Category</dt>
                  <dd style={{ margin: 0, color: '#000000', fontSize: '0.88rem', fontWeight: 500 }}>{matchedShipment.cargoType || 'Commercial Freight'}</dd>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '4px' }}>
                  <dt style={{ color: '#475569', fontSize: '0.82rem', fontWeight: 400 }}>Shipping Modality</dt>
                  <dd style={{ margin: 0, color: '#000000', fontSize: '0.88rem', fontWeight: 500 }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      {matchedShipment.mode === 'land' ? <Truck size={14} color="#f37920" /> : matchedShipment.mode === 'sea' ? <Ship size={14} color="#f37920" /> : <Plane size={14} color="#f37920" />}
                      {matchedShipment.mode === 'land' ? 'Overland Road Freight' : matchedShipment.mode === 'sea' ? 'Ocean Container Vessel' : 'Priority Air Linehaul'}
                    </span>
                  </dd>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '4px' }}>
                  <dt style={{ color: '#475569', fontSize: '0.82rem', fontWeight: 400 }}>Transport Scope</dt>
                  <dd style={{ margin: 0, color: '#0284c7', fontSize: '0.88rem', fontWeight: 500 }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      <Globe size={14} color="#0284c7" />
                      {matchedShipment.transportScope === 'Domestic' ? 'Domestic Overland' : matchedShipment.transportScope === 'Regional' ? 'Regional Linehaul' : 'International Transcontinental'}
                    </span>
                  </dd>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '4px' }}>
                  <dt style={{ color: '#475569', fontSize: '0.82rem', fontWeight: 400 }}>Assigned Driver / Captain</dt>
                  <dd style={{ margin: 0, color: '#000000', fontSize: '0.88rem', fontWeight: 500 }}>{matchedShipment.assignedDriver || 'Amina Bello'}</dd>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '4px' }}>
                  <dt style={{ color: '#475569', fontSize: '0.82rem', fontWeight: 400 }}>Vehicle / Fleet Unit</dt>
                  <dd style={{ margin: 0, color: '#000000', fontSize: '0.88rem', fontWeight: 500, fontFamily: 'monospace' }}>{matchedShipment.vehicleId || 'VEH-101'}</dd>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '4px' }}>
                  <dt style={{ color: '#475569', fontSize: '0.82rem', fontWeight: 400 }}>Consignment Weight</dt>
                  <dd style={{ margin: 0, color: '#000000', fontSize: '0.88rem', fontWeight: 500 }}>{matchedShipment.weightKg} KG ({matchedShipment.packageCount || 1} PKG)</dd>
                </div>
                {(matchedShipment.createdAt || matchedShipment.bookingDate) && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '4px' }}>
                    <dt style={{ color: '#475569', fontSize: '0.82rem', fontWeight: 400 }}>Booking / Created Date</dt>
                    <dd style={{ margin: 0, color: '#000000', fontSize: '0.88rem', fontWeight: 500 }}>
                      {new Date(matchedShipment.createdAt || matchedShipment.bookingDate!).toLocaleString([], {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </dd>
                  </div>
                )}
                {matchedShipment.estimatedDistanceKm && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '4px' }}>
                    <dt style={{ color: '#475569', fontSize: '0.82rem', fontWeight: 400 }}>Total Corridor Distance</dt>
                    <dd style={{ margin: 0, color: '#000000', fontSize: '0.88rem', fontWeight: 500 }}>{matchedShipment.estimatedDistanceKm.toLocaleString()} KM</dd>
                  </div>
                )}
                {liveTelemetry && (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '4px' }}>
                      <dt style={{ color: '#475569', fontSize: '0.82rem', fontWeight: 400 }}>Distance Covered</dt>
                      <dd style={{ margin: 0, color: '#16a34a', fontSize: '0.88rem', fontWeight: 500 }}>
                        {liveTelemetry.coveredKm.toLocaleString()} KM ({Math.round(liveTelemetry.progressPct)}%)
                      </dd>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '4px' }}>
                      <dt style={{ color: '#475569', fontSize: '0.82rem', fontWeight: 400 }}>Distance Remaining</dt>
                      <dd style={{ margin: 0, color: '#0284c7', fontSize: '0.88rem', fontWeight: 500 }}>
                        {liveTelemetry.remainingKm.toLocaleString()} KM ({Math.round(liveTelemetry.remainingPct)}%)
                      </dd>
                    </div>
                  </>
                )}
              </dl>

              {/* QR Code */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', background: '#f8fafc', padding: '1rem', borderRadius: '12px', border: '1.5px solid #cbd5e1' }}>
                <QRCodeSVG
                  value={`${window.location.origin}/track?waybill=${encodeURIComponent(matchedShipment.waybill)}`}
                  size={110}
                  level="M"
                />
                <span style={{ fontSize: '0.72rem', color: '#0f172a', marginTop: '6px', fontWeight: 400 }}>
                  SCAN FOR MOBILE LIVE SATELLITE TELEMETRY
                </span>
              </div>

              <div style={{ padding: '0.85rem', background: '#f1f5f9', borderRadius: '10px', border: '1px solid #cbd5e1', textAlign: 'center' }}>
                <strong style={{ display: 'block', fontSize: '0.88rem', color: '#0f172a', fontWeight: 400 }}>Operations Control Desk</strong>
                <span style={{ fontSize: '0.78rem', color: '#475569', display: 'block', margin: '2px 0 6px' }}>24/7 dedicated freight coordinator support.</span>
                <Link to={`/contact?waybill=${encodeURIComponent(matchedShipment.waybill)}`} style={{ color: '#0284c7', fontWeight: 400, fontSize: '0.82rem', textDecoration: 'none' }}>
                  Contact Dispatch Desk →
                </Link>
              </div>
            </aside>
          </div>

          <WaybillLabelModal
            shipment={matchedShipment}
            isOpen={printModalOpen}
            onClose={() => setPrintModalOpen(false)}
          />
        </section>
      )}
    </section>
  )
}

function ServicesPage() {
  const [priority, setPriority] = useState<'speed' | 'cost' | 'regional'>('speed')
  const recommendationMode = priority === 'speed' ? 'air' : priority === 'cost' ? 'sea' : 'land'
  const recommendation = serviceCards.find((service) => service.mode === recommendationMode) ?? serviceCards[0]
  const priorityLabels = {
    speed: 'Speed',
    cost: 'Cost efficiency',
    regional: 'Regional reach',
  }

  return (
    <section className="section-block page-shell services-page">
      <section className="ship-hero services-hero" aria-labelledby="services-hero-title">
        <div className="ship-hero-copy">
          <p className="eyebrow">Global Prime Logistics freight services</p>
          <h1 id="services-hero-title">The right route for every shipment.</h1>
          <p>Compare air, ocean, and ground services, then start a request with your preferred transport mode.</p>
        </div>
        <div className="ship-hero-markers" aria-label="Available freight modes">
          <span>Air freight</span>
          <span>Ocean freight</span>
          <span>Ground freight</span>
        </div>
      </section>

      <section className="service-discovery" aria-labelledby="services-discovery-title">
        <header className="services-heading">
          <div>
            <p className="eyebrow">Service comparison</p>
            <h2 id="services-discovery-title">Find the fit for your cargo</h2>
            <p>Compare typical transit and service capabilities before you build a shipment request.</p>
          </div>
          <div className="services-heading-note"><span className="network-pulse" /> Multi-modal network <strong>Available</strong></div>
        </header>

        <section className="service-finder" aria-labelledby="service-finder-title">
          <div className="service-finder-controls">
            <div className="service-finder-intro">
              <p className="eyebrow">Quick guide</p>
              <h2 id="service-finder-title">What matters most for this shipment?</h2>
            </div>
            <div className="service-priority-options" role="group" aria-label="Shipment priority">
              {Object.entries(priorityLabels).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  className={priority === value ? 'service-priority-active' : ''}
                  aria-pressed={priority === value}
                  onClick={() => setPriority(value as typeof priority)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className={`service-recommendation service-recommendation-${recommendation.mode}`} aria-live="polite">
            <div className="recommendation-mark" aria-hidden="true">↗</div>
            <div className="recommendation-copy">
              <span>Suggested for {priorityLabels[priority].toLowerCase()}</span>
              <strong>{recommendation.title}</strong>
              <small>{recommendation.idealFor}</small>
            </div>
            <Link to={recommendation.link} className="button button-primary">Start this shipment <span aria-hidden="true">→</span></Link>
          </div>
          <p className="service-finder-disclaimer">Suggestions are a starting point; route, cargo, carrier availability, and final transit are confirmed during booking.</p>
        </section>
      </section>

      <div className="service-grid large-grid service-catalog">
        {serviceCards.map((service) => (
          <article key={service.mode} className={`service-detail-card service-detail-${service.mode} ${recommendation.mode === service.mode ? 'service-detail-recommended' : ''}`}>
            <div className={`service-image ${service.tone}`} aria-hidden="true">
              <span className="service-image-label">{service.eyebrow}</span>
              <span className="service-image-mode">{service.mode === 'air' ? 'AIR' : service.mode === 'sea' ? 'OCEAN' : 'GROUND'}</span>
            </div>
            <div className="service-detail-copy">
              <h2>{service.title}</h2>
              <p className="service-detail-description">{service.text}</p>

              <div className="service-ideal-for">
                <span>BEST FOR</span>
                <strong>{service.idealFor}</strong>
              </div>

              <ul className="service-features">
                {service.features.map((feature) => <li key={feature}>{feature}</li>)}
              </ul>

              <div className="service-detail-footer">
                <div className="service-transit"><span>Typical transit</span><strong>{service.transit}</strong></div>
                <Link to={service.link} className="button button-primary">Choose service <span aria-hidden="true">→</span></Link>
              </div>
            </div>
          </article>
        ))}
      </div>

      <section className="service-comparison" aria-labelledby="service-comparison-title">
        <div className="service-comparison-header">
          <div className="service-comparison-heading">
            <p className="eyebrow">At a glance</p>
            <h2 id="service-comparison-title">Compare service modes</h2>
            <p>Find the right balance of transit time and cargo fit.</p>
          </div>
          <div className="service-comparison-match" aria-live="polite">
            <span className="service-comparison-match-dot" />
            <span>Best match for {priorityLabels[priority].toLowerCase()}</span>
            <strong>{recommendation.title}</strong>
          </div>
        </div>
        <table className="service-comparison-table" aria-label="Freight service comparison">
          <caption>Typical transit and best-fit cargo for each freight service.</caption>
          <thead>
            <tr>
              <th scope="col">Service</th>
              <th scope="col">Typical transit</th>
              <th scope="col">Best suited for</th>
              <th scope="col"><span className="visually-hidden">Action</span></th>
            </tr>
          </thead>
          <tbody>
            {serviceCards.map((service) => (
              <tr
                key={service.mode}
                className={`service-comparison-row service-comparison-row-${service.mode} ${recommendation.mode === service.mode ? 'service-comparison-row-recommended' : ''}`}
              >
                <th scope="row">
                  <div className="service-comparison-service">
                    <span className="service-comparison-mode">{service.mode === 'sea' ? 'OCEAN' : service.mode.toUpperCase()}</span>
                    <span className="service-comparison-title">{service.title}</span>
                    {recommendation.mode === service.mode && <span className="service-comparison-badge">Recommended</span>}
                  </div>
                </th>
                <td data-label="Typical transit">
                  <strong className="service-comparison-transit">{service.transit}</strong>
                  <span className="service-comparison-estimate">Estimated</span>
                </td>
                <td data-label="Best suited for" className="service-comparison-fit">{service.idealFor}</td>
                <td data-label="Next step" className="service-comparison-action">
                  <Link to={service.link} aria-label={`Start a shipment using ${service.title}`}>
                    Start request <span aria-hidden="true">→</span>
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <div className="services-note">
        <span className="services-note-mark">i</span>
        <p>Transit windows are indicative and can vary by route, customs processing, and carrier availability. Final service details are confirmed during shipment review.</p>
        <Link to="/contact">Talk to operations <span aria-hidden="true">↗</span></Link>
      </div>
    </section>
  )
}

function AboutPage() {
  return (
    <div className="enterprise-page">
      <section className="ship-hero enterprise-hero" aria-labelledby="enterprise-hero-title">
        <div className="ship-hero-copy">
          <p className="eyebrow">Enterprise freight</p>
          <h1 id="enterprise-hero-title">Freight operations built around your business.</h1>
          <p>Coordinate air, ocean, and overland shipments with practical booking, tracking, and support in one place.</p>
          <div className="enterprise-hero-actions">
            <Link to="/contact" className="button button-primary">Talk to operations <span aria-hidden="true">→</span></Link>
            <Link to="/services" className="button button-secondary">Explore services</Link>
          </div>
        </div>
        <div className="enterprise-hero-markers" aria-label="Enterprise freight capabilities">
          <span>Multi-modal routing</span>
          <span>Milestone visibility</span>
          <span>Cold-chain options</span>
        </div>
      </section>

      <section className="section-block enterprise-capabilities" aria-labelledby="enterprise-capabilities-title">
        <div className="enterprise-section-heading">
          <p className="eyebrow">Operational capabilities</p>
          <h2 id="enterprise-capabilities-title">One clear view of your freight workflow.</h2>
          <p>Bring route selection, shipment details, and progress tracking into a more coordinated routine.</p>
        </div>

        <div className="enterprise-capability-grid">
          <article className="enterprise-capability-card">
            <img className="enterprise-capability-image" src="https://images.unsplash.com/photo-1521737711867-e3b97375f902?auto=format&fit=crop&w=1000&q=85" alt="Operations team reviewing a freight plan together" loading="lazy" />
            <div className="enterprise-capability-content">
              <span className="enterprise-capability-index">01 / ROUTING</span>
              <h3>Choose the right mode</h3>
              <p>Compare air, ocean, and overland options against the cargo, route, and timing that matter to your team.</p>
              <Link to="/services" className="enterprise-capability-link">Compare services <span aria-hidden="true">→</span></Link>
            </div>
          </article>
          <article className="enterprise-capability-card">
            <img className="enterprise-capability-image" src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1000&q=85" alt="Operations analytics dashboard with shipment performance data" loading="lazy" />
            <div className="enterprise-capability-content">
              <span className="enterprise-capability-index">02 / VISIBILITY</span>
              <h3>Follow shipment progress</h3>
              <p>Use a waybill to check shipment status and keep key milestones accessible to the people who need them.</p>
              <Link to="/track" className="enterprise-capability-link">Track a shipment <span aria-hidden="true">→</span></Link>
            </div>
          </article>
          <article className="enterprise-capability-card">
            <img className="enterprise-capability-image" src="https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1000&q=85" alt="Enterprise team coordinating details around a meeting table" loading="lazy" />
            <div className="enterprise-capability-content">
              <span className="enterprise-capability-index">03 / HANDLING</span>
              <h3>Plan for cargo needs</h3>
              <p>Explore temperature-control options and share handling requirements when you prepare a shipment request.</p>
              <Link to="/ship" className="enterprise-capability-link">Start a request <span aria-hidden="true">→</span></Link>
            </div>
          </article>
        </div>
      </section>

      <section className="section-block enterprise-tools" aria-labelledby="enterprise-tools-title">
        <div className="enterprise-section-heading">
          <p className="eyebrow">Connected operations</p>
          <h2 id="enterprise-tools-title">Keep every handoff in view.</h2>
          <p>Practical tools for the moments between booking, transit, and delivery.</p>
        </div>

        <div className="enterprise-tools-layout">
          <div className="enterprise-tools-copy">
            <ul className="enterprise-tools-list">
              <li>
                <span>01</span>
                <div><strong>QR-linked shipment records</strong><p>Open a sample shipment directly from its scannable waybill.</p></div>
              </li>
              <li>
                <span>02</span>
                <div><strong>Milestone-by-milestone tracking</strong><p>Follow progress from booking and dispatch through customs and delivery.</p></div>
              </li>
              <li>
                <span>03</span>
                <div><strong>Operational event updates</strong><p>Review dispatch, customs, delay, and delivery notifications.</p></div>
              </li>
            </ul>
            <Link to="/dashboard/notifications" className="enterprise-tools-link">View operations alerts <span aria-hidden="true">→</span></Link>
          </div>

          <aside className="enterprise-shipment-preview" aria-label="Example shipment tracking preview">
            <div className="enterprise-preview-topline">
              <span>Example shipment</span>
              <span className="enterprise-preview-status"><i /> In transit</span>
            </div>
            <strong className="enterprise-preview-waybill">NTS-99420-CT4</strong>
            <span className="enterprise-preview-carrier">DHL Express · Air freight</span>
            <div className="enterprise-preview-route">
              <div><span>ORIGIN</span><strong>New York · JFK</strong></div>
              <span className="enterprise-preview-route-line" aria-hidden="true">→</span>
              <div><span>DESTINATION</span><strong>London · LHR</strong></div>
            </div>
            <ol className="enterprise-preview-milestones">
              <li className="complete"><span />Booked</li>
              <li className="complete"><span />Dispatched</li>
              <li className="current"><span />In transit</li>
              <li><span />Customs</li>
              <li><span />Delivered</li>
            </ol>
            <div className="enterprise-preview-footer">
              <span>Sample shipment · status preview</span>
              <QRCodeSVG
                value={`${window.location.origin}/track?waybill=NTS-99420-CT4`}
                size={56}
                level="M"
                title="Scan to track sample waybill NTS-99420-CT4"
              />
            </div>
            <Link to="/track?waybill=NTS-99420-CT4" className="enterprise-preview-link">Open tracking preview <span aria-hidden="true">↗</span></Link>
          </aside>
        </div>
      </section>

      <section className="section-block enterprise-workflow" aria-labelledby="enterprise-workflow-title">
        <div className="enterprise-section-heading">
          <p className="eyebrow">A practical operating model</p>
          <h2 id="enterprise-workflow-title">From shipment request to delivery visibility.</h2>
        </div>
        <ol className="enterprise-workflow-list">
          <li>
            <span className="enterprise-workflow-number">01</span>
            <div><h3>Share the details</h3><p>Enter the route, freight mode, and cargo information for your request.</p></div>
          </li>
          <li>
            <span className="enterprise-workflow-number">02</span>
            <div><h3>Review the service</h3><p>Check the selected service and shipment details before moving forward.</p></div>
          </li>
          <li>
            <span className="enterprise-workflow-number">03</span>
            <div><h3>Follow milestones</h3><p>Use shipment tracking to check progress and find support when plans change.</p></div>
          </li>
        </ol>
      </section>

      <section className="section-block enterprise-contact-band" aria-labelledby="enterprise-contact-title">
        <div>
          <p className="eyebrow">For your operations team</p>
          <h2 id="enterprise-contact-title">Need a route or handling plan reviewed?</h2>
          <p>Share your requirements with the operations desk and get pointed to the right next step.</p>
        </div>
        <Link to="/contact" className="button button-primary">Contact operations <span aria-hidden="true">→</span></Link>
      </section>
    </div>
  )
}

function FaqPage() {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('All')
  const faqItems = [
    { category: 'Tracking', question: 'What should I enter to track a shipment?', answer: 'Enter the waybill number shown in your shipment details. This demo includes the sample waybill NTS-99420-CT4.' },
    { category: 'Tracking', question: 'My waybill is not showing a result. What should I do?', answer: 'Check the number for typos. If the shipment still cannot be found, contact operations and include the waybill in your support request.', link: '/contact' },
    { category: 'Tracking', question: 'What information appears in shipment tracking?', answer: 'The tracking view can show the route, current status, estimated delivery, and milestone history. Carrier update availability can vary by shipment.' },
    { category: 'Booking', question: 'Which freight modes can I request?', answer: 'The catalogue includes air freight, ocean container shipping with FCL and LCL options, and overland freight.' },
    { category: 'Booking', question: 'Can I add special cargo-handling needs?', answer: 'Yes. Choose a handling option in the shipment request and describe any important cargo requirements in your message.' },
    { category: 'Services', question: 'How should I choose between air, ocean, and overland?', answer: 'Compare typical transit windows and cargo fit on the services page. Final routing depends on your route, cargo, and carrier availability.', link: '/services' },
    { category: 'Support', question: 'What should I include in a support request?', answer: 'Choose a topic, describe the issue, and include your waybill when the question concerns a shipment. Tracking links can prefill the waybill for you.', link: '/contact' },
    { category: 'Support', question: 'Does the support form send a message?', answer: 'The current site is a frontend demo. The form validates your details and shows a local confirmation, but it does not transmit requests.' },
  ]
  const categories = ['All', 'Tracking', 'Booking', 'Services', 'Support']
  const normalizedQuery = query.trim().toLowerCase()
  const visibleFaqs = faqItems.filter((item) => {
    const matchesCategory = category === 'All' || item.category === category
    const matchesQuery = `${item.question} ${item.answer} ${item.category}`.toLowerCase().includes(normalizedQuery)
    return matchesCategory && matchesQuery
  })

  return (
    <section className="faq-page">
      <header className="faq-hero" aria-labelledby="faq-hero-title">
        <img className="faq-hero-image" src="https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=2000&q=85" alt="Colleagues meeting around a table" />
        <div className="faq-hero-content">
          <div className="faq-hero-copy">
            <p className="eyebrow">Help center</p>
            <h1 id="faq-hero-title">Answers for the way freight moves.</h1>
            <p>Find clear guidance on booking, shipment visibility, and getting support.</p>
          </div>
          <div className="faq-hero-actions">
            <label className="faq-search">
              <span className="visually-hidden">Search frequently asked questions</span>
              <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search questions or topics" />
            </label>
            <Link to="/contact" className="button button-primary">Contact operations <span aria-hidden="true">→</span></Link>
          </div>
        </div>
      </header>

      <div className="section-block faq-content">
        <div className="faq-toolbar">
        <div className="faq-categories" role="group" aria-label="Filter questions by topic">
          {categories.map((entry) => (
            <button key={entry} type="button" aria-pressed={category === entry} className={category === entry ? 'faq-category-active' : ''} onClick={() => setCategory(entry)}>{entry}</button>
          ))}
        </div>
        </div>

        <div className="faq-results-heading" aria-live="polite">
          <h2>Frequently asked</h2>
          <span>{visibleFaqs.length} {visibleFaqs.length === 1 ? 'answer' : 'answers'}</span>
        </div>

        <div className="faq-list">
          {visibleFaqs.map((item, index) => (
            <details className="faq-item" key={item.question} open={index === 0}>
              <summary>
                <span>{item.question}</span>
                <span className="faq-item-category">{item.category}</span>
                <span className="faq-toggle" aria-hidden="true" />
              </summary>
              <div className="faq-answer">
                <p>{item.answer}</p>
                {item.link && <Link to={item.link}>{item.link === '/services' ? 'Compare services' : item.link === '/track' ? 'Track a shipment' : 'Contact operations'} <span aria-hidden="true">→</span></Link>}
              </div>
            </details>
          ))}
          {visibleFaqs.length === 0 && (
            <div className="faq-empty" role="status">
              <strong>No answers match that search.</strong>
              <button type="button" onClick={() => { setQuery(''); setCategory('All') }}>Clear search and filters</button>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

function ContactPage() {
  const [searchParams] = useSearchParams()
  const prefilledWaybill = searchParams.get('waybill') ?? ''
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    topic: 'Tracking update',
    waybill: prefilledWaybill,
    message: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submittedInquiryId, setSubmittedInquiryId] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState('')

  const handleSupportSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!formData.name.trim() || !formData.email.trim() || !formData.message.trim()) return

    setIsSubmitting(true)
    setErrorMessage('')

    try {
      const generatedId = `INQ-${Math.floor(1000 + Math.random() * 9000)}`
      const inquiry = await apiService.createInquiry({
        id: generatedId,
        senderName: formData.name.trim(),
        senderEmail: formData.email.trim(),
        topic: formData.topic,
        waybillRef: formData.waybill.trim(),
        subject: `${formData.topic} - ${formData.waybill.trim() || formData.name.trim()}`,
        message: formData.message.trim(),
        status: 'new',
      })

      setSubmittedInquiryId(inquiry.id || generatedId)
      setFormData({
        name: '',
        email: '',
        topic: 'Tracking update',
        waybill: '',
        message: '',
      })
    } catch {
      setErrorMessage('Unable to transmit inquiry at this moment. Please use 24/7 Live Support Chat.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="support-page">
      <section className="support-hero" aria-labelledby="support-title">
        <div>
          <p className="eyebrow">Global Prime Logistics Global Support</p>
          <h1 id="support-title">Talk to the operations desk.</h1>
          <p>Get help with a shipment in progress, plan a new route, or clarify cargo-handling requirements.</p>
        </div>
        <div className="support-availability"><span />Dispatch operations <strong>Available 24/7</strong></div>
      </section>

      <section className="section-block support-layout" aria-label="Contact options and support request form">
        <aside className="support-sidebar">
          <div className="support-contact-panel">
            <p className="eyebrow">Direct contact</p>
            <h2>Speak with operations</h2>
            <a href="mailto:ops@northstarfreight.example" className="support-channel">
              <span>Email the desk</span>
              <strong>ops@northstarfreight.example</strong>
            </a>
            <a href="tel:+14155550182" className="support-channel">
              <span>Call dispatch</span>
              <strong>+1 (415) 555-0182</strong>
            </a>
            <p className="support-direct-note">For urgent shipment disruptions, call dispatch and have your waybill ready.</p>
          </div>

          <nav className="support-quick-links" aria-label="Common support tasks">
            <p className="eyebrow">Common tasks</p>
            <Link to="/track">Track a shipment <span aria-hidden="true">→</span></Link>
            <Link to="/services">Compare freight services <span aria-hidden="true">→</span></Link>
            <Link to="/ship">Start a shipment request <span aria-hidden="true">→</span></Link>
            <Link to="/faq">Browse help topics <span aria-hidden="true">→</span></Link>
          </nav>
        </aside>

        <div className="support-form-panel">
          <div className="support-form-heading">
              <div className="support-form-heading-copy">
                <p className="eyebrow">Support request</p>
                <h2>How can we help?</h2>
                <p>Share a few details so the right operations team can review your question.</p>
              </div>
              <span className="support-form-required-note"><b>*</b> Required fields</span>
          </div>

          {submittedInquiryId ? (
            <div
              style={{
                background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(15, 23, 42, 0.4) 100%)',
                border: '1.5px solid #10b981',
                borderRadius: '12px',
                padding: '2rem',
                textAlign: 'center',
                color: '#f8fafc',
              }}
            >
              <span style={{ fontSize: '3rem', display: 'block', marginBottom: '0.75rem' }}>✓</span>
              <h3 style={{ fontSize: '1.3rem', margin: '0 0 0.5rem 0', color: '#10b981' }}>
                Inquiry Transmitted to Dispatch Operations
              </h3>
              <p style={{ fontSize: '0.9rem', color: '#cbd5e1', maxWidth: '480px', margin: '0 auto 1.25rem' }}>
                Your inquiry reference <strong>#{submittedInquiryId}</strong> has been received by our 24/7 flight and linehaul dispatch team. An operations coordinator will review and respond shortly.
              </p>
              <button
                type="button"
                className="button button-primary"
                onClick={() => setSubmittedInquiryId(null)}
                style={{ fontSize: '0.85rem' }}
              >
                Submit Another Request
              </button>
            </div>
          ) : (
            <form className="support-form" aria-label="Submit a support request" onSubmit={handleSupportSubmit}>
              <div className="support-form-pair">
                <label>Name <span className="support-required">*</span>
                  <input
                    type="text"
                    name="name"
                    placeholder="Your name"
                    autoComplete="name"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  />
                </label>
                <label>Work email <span className="support-required">*</span>
                  <input
                    type="email"
                    name="email"
                    placeholder="you@company.com"
                    autoComplete="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                  />
                </label>
              </div>
              <div className="support-form-pair">
                <label>What do you need help with?
                  <select
                    name="topic"
                    value={formData.topic}
                    onChange={(e) => setFormData((prev) => ({ ...prev, topic: e.target.value }))}
                  >
                    <option value="Tracking update">Tracking update</option>
                    <option value="New shipment">New shipment</option>
                    <option value="Customs or documentation">Customs or documentation</option>
                    <option value="Cargo handling">Cargo handling</option>
                    <option value="Other question">Other question</option>
                  </select>
                </label>
                <label>Waybill <span className="support-optional">Optional</span>
                  <input
                    type="text"
                    name="waybill"
                    placeholder="e.g. PLOT-70955-JFD"
                    autoComplete="off"
                    value={formData.waybill}
                    onChange={(e) => setFormData((prev) => ({ ...prev, waybill: e.target.value }))}
                  />
                </label>
              </div>
              <label>Message <span className="support-required">*</span>
                <textarea
                  name="message"
                  rows={5}
                  placeholder="Tell us what happened or what you are planning."
                  required
                  value={formData.message}
                  onChange={(e) => setFormData((prev) => ({ ...prev, message: e.target.value }))}
                />
              </label>
              {errorMessage && (
                <div style={{ color: '#ef4444', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                  {errorMessage}
                </div>
              )}
              <div className="support-form-actions">
                <button type="submit" className="button button-primary" disabled={isSubmitting}>
                  {isSubmitting ? 'Transmitting...' : 'Send Inquiry to Operations'} <span aria-hidden="true">→</span>
                </button>
                <span>Directly dispatched to operations coordinators and logged in logistics system.</span>
              </div>
            </form>
          )}
        </div>
      </section>
    </div>
  )
}

function PoliciesPage() {
  const { hash } = useLocation()

  useEffect(() => {
    const sectionId = hash.slice(1)
    if (!sectionId) return

    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'instant', block: 'start' })
  }, [hash])

  return (
    <section className="section-block page-shell policy-page">
      <header className="policy-heading">
        <p className="eyebrow">Legal information</p>
        <h1>Privacy and service terms.</h1>
        <p>How shipment information is used and the conditions that apply when arranging freight through Global Prime Logistics.</p>
        <span className="policy-draft-note">Draft policy copy · review before launch</span>
      </header>

      <div className="policy-layout">
        <nav className="policy-contents" aria-label="Policy sections">
          <span>On this page</span>
          <a href="#privacy">Privacy notice</a>
          <a href="#terms">Terms of service</a>
          <Link to="/contact">Questions? Contact operations <span aria-hidden="true">→</span></Link>
        </nav>

        <div className="policy-document">
          <article id="privacy" className="policy-section" aria-labelledby="privacy-title">
            <p className="policy-section-kicker">01 / PRIVACY</p>
            <h2 id="privacy-title">Privacy notice</h2>
            <p>Global Prime Logistics uses the information you provide to arrange and support freight services. This can include contact details, shipment references, routing information, cargo details, and messages sent to operations.</p>

            <h3>How information is used</h3>
            <ul>
              <li>Prepare and coordinate shipment requests and related service updates.</li>
              <li>Display shipment status, route details, and milestone history for a supplied waybill.</li>
              <li>Respond to support, documentation, and billing questions.</li>
            </ul>

            <h3>When information is shared</h3>
            <p>Shipment details may be shared with carriers and service partners when needed to coordinate transport, customs processing, or delivery. Information is otherwise handled for the purposes described in this notice and applicable requirements.</p>

            <h3>Retention and questions</h3>
            <p>Records are retained as needed to coordinate shipments, provide support, and meet applicable business or legal obligations. To ask about information associated with a shipment, contact operations and include the relevant waybill when available.</p>
          </article>

          <article id="terms" className="policy-section" aria-labelledby="terms-title">
            <p className="policy-section-kicker">02 / SERVICE TERMS</p>
            <h2 id="terms-title">Terms of service</h2>
            <p>Submitting a shipment request provides the details needed for review. A route, carrier, or transit estimate is not final until it has been reviewed and confirmed for the shipment.</p>

            <h3>Shipment details and handling</h3>
            <ul>
              <li>Provide accurate origin, destination, cargo, contact, and reference information.</li>
              <li>Declare special handling needs before shipment review; availability depends on the route and selected service.</li>
              <li>Ensure cargo and documents comply with applicable carrier, customs, and destination requirements.</li>
            </ul>

            <h3>Transit estimates and updates</h3>
            <p>Transit windows and estimated delivery times are indicative. Carrier schedules, customs processing, route conditions, and other operational factors may affect progress. Tracking information reflects the shipment events available for the supplied waybill.</p>

            <h3>Support and service questions</h3>
            <p>Contact the operations desk with shipment questions or changes. Include the waybill when your request concerns a shipment already in progress.</p>
            <Link to="/contact" className="policy-contact-link">Contact operations <span aria-hidden="true">→</span></Link>
          </article>
        </div>
      </div>
    </section>
  )
}

function AuthPage({ mode }: { mode: 'login' | 'register' }) {
  return (
    <div className="auth-page">
      <div className="auth-card card">
        <p className="eyebrow">{mode === 'login' ? 'Welcome back' : 'Create account'}</p>
        <h1>{mode === 'login' ? 'Login' : 'Register'}</h1>

        <form className="auth-form">
          {mode === 'register' && (
            <label>
              Full name
              <input type="text" placeholder="Jordan Smith" />
            </label>
          )}

          <label>
            Email
            <input type="email" placeholder="name@company.com" />
          </label>

          <label>
            Password
            <input type="password" placeholder="••••••••" />
          </label>

          <button type="submit" className="button button-primary full-width">
            {mode === 'login' ? 'Sign in' : 'Create account'}
          </button>
        </form>
      </div>
    </div>
  )
}

function OverviewPage() {
  const { shipments, auditLogs } = useShipments()

  const inTransitCount = shipments.filter((s) => s.status === 'in_transit').length
  const customsCount = shipments.filter((s) => s.status === 'customs').length
  const deliveredCount = shipments.filter((s) => s.status === 'delivered').length
  const exceptionCount = shipments.filter((s) => s.status === 'exception').length

  const stats = [
    { label: 'In Transit', value: String(inTransitCount), tone: 'blue' },
    { label: 'Customs Hold', value: String(customsCount), tone: 'amber' },
    { label: 'Delivered', value: String(deliveredCount), tone: 'green' },
    { label: 'Exceptions', value: String(exceptionCount), tone: 'red' },
  ]

  return (
    <section className="dashboard-page">
      <div className="stats-grid">
        {stats.map((stat) => (
          <div key={stat.label} className={`stat-card card stat-card-${stat.tone}`}>
            <span>{stat.label}</span>
            <strong>{stat.value}</strong>
          </div>
        ))}
      </div>

      <div className="panel-grid">
        <div className="card panel-card map-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Live network</p>
              <h2>Active shipments map</h2>
            </div>
            <span className="panel-badge">{inTransitCount} in motion</span>
          </div>

          <div style={{ marginTop: '1rem', borderRadius: '10px', overflow: 'hidden' }}>
            {shipments[0] && <ClientLiveMap shipment={shipments[0]} height="260px" />}
          </div>
        </div>

        <div className="card panel-card">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Operations</p>
              <h2>Recent activity feed</h2>
            </div>
            <Link to="/dashboard/notifications" className="panel-link">View all</Link>
          </div>

          <ul className="activity-list">
            {auditLogs.slice(0, 5).map((activity) => (
              <li key={activity.id} className="activity-item">
                <span className="activity-dot" aria-hidden="true" />
                <div>
                  <strong>{activity.action}: {activity.details}</strong>
                  <small>{new Date(activity.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</small>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}

function ShipmentsPage() {
  const { shipments } = useShipments()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all')

  const visibleShipments = shipments.filter((shipment) => {
    const matchesQuery = `${shipment.waybill} ${shipment.carrier} ${shipment.origin.name} ${shipment.destination.name}`.toLowerCase().includes(query.toLowerCase())
    const matchesFilter = filter === 'all' || shipment.status === filter
    return matchesQuery && matchesFilter
  })

  return (
    <section className="dashboard-page">
      <div className="table-card card shipment-card">
        <div className="table-toolbar">
          <div>
            <p className="eyebrow">Shipment list</p>
            <h2>Active freight ({shipments.length})</h2>
          </div>

          <div className="table-controls">
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search waybill, carrier, or route..."
              aria-label="Search shipments"
            />
            <div className="filter-row" aria-label="Shipment status filters">
              {['all', 'in_transit', 'customs', 'delivered', 'exception'].map((entry) => (
                <button
                  key={entry}
                  type="button"
                  className={filter === entry ? 'filter-pill active' : 'filter-pill'}
                  onClick={() => setFilter(entry)}
                >
                  {entry === 'all' ? 'All' : entry.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Waybill</th>
                <th>Carrier</th>
                <th>Mode</th>
                <th>Route</th>
                <th>Status</th>
                <th>ETA</th>
              </tr>
            </thead>
            <tbody>
              {visibleShipments.map((shipment) => (
                <tr key={shipment.waybill}>
                  <td>
                    <Link to={`/dashboard/shipments/${shipment.waybill}`} className="table-link">
                      {shipment.waybill}
                    </Link>
                  </td>
                  <td>{shipment.carrier}</td>
                  <td>{shipment.mode.toUpperCase()}</td>
                  <td>{shipment.origin.code} → {shipment.destination.code}</td>
                  <td>
                    <span className={`status-pill status-${shipment.status}`}>{shipment.status.replace('_', ' ')}</span>
                  </td>
                  <td>{shipment.eta}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {visibleShipments.length === 0 && (
          <div className="empty-row">
            <strong>No shipments match this filter.</strong>
            <button type="button" className="button button-secondary" onClick={() => { setQuery(''); setFilter('all') }}>
              Clear filters
            </button>
          </div>
        )}
      </div>
    </section>
  )
}

function ShipmentDetailPage() {
  const { waybill } = useParams()
  const { getShipment, shipments } = useShipments()
  const [printModalOpen, setPrintModalOpen] = useState(false)

  const shipment = (waybill ? getShipment(waybill) : undefined) || shipments[0]

  if (!shipment) {
    return (
      <section className="dashboard-page">
        <div className="card">
          <h2>Shipment not found</h2>
          <Link to="/dashboard/shipments" className="button button-primary">Back to Shipments</Link>
        </div>
      </section>
    )
  }

  return (
    <section className="dashboard-page">
      <div className="detail-layout">
        <div className="card detail-main">
          <div className="detail-header">
            <div>
              <p className="eyebrow">Shipment detail</p>
              <h2>{shipment.waybill}</h2>
            </div>
            <span className={`status-pill status-${shipment.status}`}>{shipment.status.replace('_', ' ')}</span>
          </div>

          <p className="detail-subtitle">{shipment.carrier} • {shipment.mode.toUpperCase()} • {shipment.origin.code} → {shipment.destination.code}</p>

          <div className="detail-actions">
            <Link to={`/track?waybill=${encodeURIComponent(shipment.waybill)}`} className="button button-secondary">
              Open Public Tracker ↗
            </Link>
            <button type="button" className="button button-primary" onClick={() => setPrintModalOpen(true)}>
              Print waybill
            </button>
          </div>

          <div className="detail-map-panel" style={{ margin: '1.25rem 0', borderRadius: '12px', overflow: 'hidden' }}>
            <ClientLiveMap shipment={shipment} height="360px" />
          </div>

          <ul className="timeline">
            {shipment.checkpoints.map((item) => (
              <li key={item.id} className={item.current ? 'timeline-current' : item.completed ? 'timeline-done' : ''}>
                <span className="timeline-marker" aria-hidden="true" />
                <div>
                  <strong>{item.title}</strong>
                  <p style={{ margin: '2px 0 0 0', fontSize: '0.78rem', color: '#94a3b8' }}>{item.detail}</p>
                  <small>{item.location} • {item.time}</small>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="card detail-side">
          <div className="detail-side-header">
            <h3>Documents ({shipment.documents.length})</h3>
            <button type="button" className="button button-secondary small-button" onClick={() => setPrintModalOpen(true)}>
              Print Label
            </button>
          </div>

          <ul className="document-list">
            {shipment.documents.map((doc) => (
              <li key={doc.id}>
                <div>
                  <span>{doc.name}</span>
                  <small style={{ display: 'block', color: '#64748b', fontSize: '0.7rem' }}>{doc.size} • {doc.date}</small>
                </div>
                <button type="button" onClick={() => setPrintModalOpen(true)}>View</button>
              </li>
            ))}
          </ul>

          <div className="detail-meta">
            <h4>Shipment details</h4>
            <dl>
              <div><dt>Weight</dt><dd>{shipment.weightKg} kg</dd></div>
              <div><dt>Rate</dt><dd>${shipment.rate.toFixed(2)} USD</dd></div>
              <div><dt>Reference</dt><dd>{shipment.clientReference}</dd></div>
              <div><dt>Consignee</dt><dd>{shipment.clientName}</dd></div>
              <div><dt>ETA</dt><dd>{shipment.eta}</dd></div>
            </dl>
          </div>
        </div>
      </div>

      <WaybillLabelModal
        shipment={shipment}
        isOpen={printModalOpen}
        onClose={() => setPrintModalOpen(false)}
      />
    </section>
  )
}

function CreateShipmentPage() {
  const { createShipment, calculateRate } = useShipments()
  const [step, setStep] = useState(0)
  const [createdWaybill, setCreatedWaybill] = useState('')
  const [draft, setDraft] = useState({
    mode: 'air' as ShippingMode,
    carrier: 'DHL Express',
    origin: 'New York, NY (JFK)',
    originCode: 'JFK',
    destination: 'London, UK (LHR)',
    destCode: 'LHR',
    weight: '12',
    value: '2500',
    clientRef: 'PO-2026-01',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const steps = ['Mode & Carrier', 'Route', 'Package & Rate']

  const calculatedRate = calculateRate(draft.mode, Number(draft.weight || 1), Number(draft.value || 0))

  const validateDraftStep = () => {
    const nextErrors: Record<string, string> = {}

    if (step === 0 && !draft.carrier.trim()) nextErrors.carrier = 'Choose a carrier.'
    if (step === 1) {
      if (!draft.origin.trim()) nextErrors.origin = 'Origin is required.'
      if (!draft.destination.trim()) nextErrors.destination = 'Destination is required.'
    }
    if (step === 2) {
      if (!draft.weight || Number(draft.weight) <= 0) nextErrors.weight = 'Weight must be greater than zero.'
      if (!draft.value || Number(draft.value) < 0) nextErrors.value = 'Declared value cannot be negative.'
    }

    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const handleFinalSubmit = () => {
    if (!validateDraftStep()) return

    const newShip = createShipment({
      carrier: draft.carrier,
      mode: draft.mode,
      origin: { name: draft.origin, code: draft.originCode || 'ORIGIN', lat: 40.6413, lng: -73.7781 },
      destination: { name: draft.destination, code: draft.destCode || 'DEST', lat: 51.47, lng: -0.4543 },
      weightKg: Number(draft.weight),
      declaredValue: Number(draft.value),
      clientReference: draft.clientRef,
      rate: calculatedRate,
      eta: 'In 2 business days',
    })

    setCreatedWaybill(newShip.waybill)
  }

  if (createdWaybill) {
    return (
      <section className="dashboard-page">
        <div className="card" style={{ padding: '2.5rem', textAlign: 'center', maxWidth: '600px', margin: '0 auto' }}>
          <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}></div>
          <h2>Shipment Created Successfully!</h2>
          <p style={{ color: '#94a3b8' }}>Your new consignment has been registered with the carrier dispatch engine.</p>
          <div style={{ fontSize: '1.5rem', fontWeight: 500, fontFamily: 'monospace', color: '#00d2ff', margin: '1rem 0' }}>
            {createdWaybill}
          </div>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '1.5rem' }}>
            <Link to={`/dashboard/shipments/${createdWaybill}`} className="button button-primary">
              View Shipment Details
            </Link>
            <Link to={`/track?waybill=${encodeURIComponent(createdWaybill)}`} className="button button-secondary">
              Track Publicly ↗
            </Link>
          </div>
        </div>
      </section>
    )
  }

  const stepContent = [
    <div key="mode" className="wizard-panel">
      <div className="wizard-grid">
        {(['Air', 'Ocean', 'Land'] as const).map((mode) => (
          <button
            key={mode}
            type="button"
            className={draft.mode === mode.toLowerCase() ? 'mode-card active' : 'mode-card'}
            onClick={() => setDraft((current) => ({ ...current, mode: mode.toLowerCase() as ShippingMode }))}
          >
            <strong>{mode}</strong>
            <small>{mode === 'Air' ? 'Priority network' : mode === 'Ocean' ? 'Container shipping' : 'Regional linehaul'}</small>
          </button>
        ))}
      </div>
      <div className="field-row">
        <label>
          Carrier
          <select value={draft.carrier} onChange={(event) => { setDraft((current) => ({ ...current, carrier: event.target.value })); setErrors((previous) => ({ ...previous, carrier: '' })) }}>
            <option>DHL Express</option>
            <option>FedEx Priority</option>
            <option>UPS Worldwide</option>
            <option>Maersk Intermodal</option>
          </select>
          {errors.carrier && <span className="field-error">{errors.carrier}</span>}
        </label>
      </div>
    </div>,
    <div key="route" className="wizard-panel">
      <div className="field-row two-col">
        <label>
          Origin Hub
          <input value={draft.origin} onChange={(event) => { setDraft((current) => ({ ...current, origin: event.target.value })); setErrors((previous) => ({ ...previous, origin: '' })) }} />
          {errors.origin && <span className="field-error">{errors.origin}</span>}
        </label>
        <label>
          Destination Hub
          <input value={draft.destination} onChange={(event) => { setDraft((current) => ({ ...current, destination: event.target.value })); setErrors((previous) => ({ ...previous, destination: '' })) }} />
          {errors.destination && <span className="field-error">{errors.destination}</span>}
        </label>
      </div>
    </div>,
    <div key="rate" className="wizard-panel">
      <div className="field-row two-col">
        <label>
          Weight (kg)
          <input value={draft.weight} onChange={(event) => { setDraft((current) => ({ ...current, weight: event.target.value })); setErrors((previous) => ({ ...previous, weight: '' })) }} />
          {errors.weight && <span className="field-error">{errors.weight}</span>}
        </label>
        <label>
          Declared value ($)
          <input value={draft.value} onChange={(event) => { setDraft((current) => ({ ...current, value: event.target.value })); setErrors((previous) => ({ ...previous, value: '' })) }} />
          {errors.value && <span className="field-error">{errors.value}</span>}
        </label>
      </div>
      <div className="rate-box">
        <span>Estimated rate</span>
        <strong>${calculatedRate.toFixed(2)} USD</strong>
      </div>
    </div>,
  ]

  return (
    <section className="dashboard-page">
      <div className="card create-shipment-card">
        <div className="table-toolbar">
          <div>
            <p className="eyebrow">Create shipment</p>
            <h2>New booking</h2>
          </div>
          <div className="step-indicator">Step {step + 1} / {steps.length}</div>
        </div>

        <div className="wizard-progress" aria-label="Shipment creation progress">
          {steps.map((label, index) => (
            <button
              key={label}
              type="button"
              className={index <= step ? 'wizard-step done' : 'wizard-step'}
              onClick={() => setStep(index)}
            >
              {label}
            </button>
          ))}
        </div>

        {stepContent[step]}

        <div className="wizard-actions-inline">
          <button type="button" className="button button-secondary" onClick={() => setStep((current) => Math.max(0, current - 1))} disabled={step === 0}>
            Back
          </button>
          <button
            type="button"
            className="button button-primary"
            onClick={() => {
              if (step === steps.length - 1) {
                handleFinalSubmit()
              } else {
                if (!validateDraftStep()) return
                setStep((current) => Math.min(steps.length - 1, current + 1))
              }
            }}
          >
            {step === steps.length - 1 ? 'Confirm & Book Consignment' : 'Continue'}
          </button>
        </div>
      </div>
    </section>
  )
}

function NotificationsPage() {
  const notifications = [
    { id: 1, type: 'Dispatch', title: 'Dispatch confirmation received', time: 'Today', unread: true },
    { id: 2, type: 'Customs', title: 'Customs milestone updated for NTS-99420-CT4', time: 'Today', unread: true },
    { id: 3, type: 'Delay', title: 'Delay notice for route ETA revision', time: 'Yesterday', unread: false },
    { id: 4, type: 'Delivered', title: 'Proof of delivery uploaded', time: 'Yesterday', unread: false },
  ]

  const [filter, setFilter] = useState('all')

  const visibleNotifications = notifications.filter((notification) => filter === 'all' || notification.type === filter)

  return (
    <section className="dashboard-page">
      <div className="card notifications-card">
        <div className="table-toolbar">
          <div>
            <p className="eyebrow">Alerts</p>
            <h2>Notifications</h2>
          </div>
          <button type="button" className="button button-secondary small-button">Mark all as read</button>
        </div>

        <div className="filter-row notification-filters">
          {['all', 'Dispatch', 'Customs', 'Delay', 'Delivered'].map((entry) => (
            <button
              key={entry}
              type="button"
              className={filter === entry ? 'filter-pill active' : 'filter-pill'}
              onClick={() => setFilter(entry)}
            >
              {entry === 'all' ? 'All' : entry}
            </button>
          ))}
        </div>

        <ul className="notification-list">
          {visibleNotifications.map((notification) => (
            <li key={notification.id} className={notification.unread ? 'unread' : ''}>
              <span className="notification-type">{notification.type}</span>
              <div>
                <strong>{notification.title}</strong>
                <small>{notification.time}</small>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

function AccountPage() {
  const profile = {
    company: 'Acme Corp',
    billing: '1200 Market Street, San Francisco, CA',
    taxId: 'US-82-312901',
  }

  const addresses = ['New York, NY', 'Chicago, IL', 'London, UK']
  const users = [
    { name: 'Jordan Smith', role: 'Shipper', access: 'Full access' },
    { name: 'Riley Chen', role: 'Ops', access: 'Milestone updates' },
  ]
  const invoices = [
    { id: 'INV-1042', total: '$1,240.00', date: 'Sep 21, 2026' },
    { id: 'INV-1008', total: '$860.00', date: 'Aug 17, 2026' },
  ]

  return (
    <section className="dashboard-page account-page">
      <div className="account-grid">
        <div className="card account-card">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Company profile</p>
              <h2>{profile.company}</h2>
            </div>
          </div>

          <dl className="account-list">
            <div><dt>Billing address</dt><dd>{profile.billing}</dd></div>
            <div><dt>Tax ID</dt><dd>{profile.taxId}</dd></div>
          </dl>
        </div>

        <div className="card account-card">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Saved addresses</p>
              <h2>Frequent routes</h2>
            </div>
          </div>

          <ul className="chip-list">
            {addresses.map((address) => (
              <li key={address}>{address}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className="account-grid lower-grid">
        <div className="card account-card">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">User access</p>
              <h2>Team members</h2>
            </div>
          </div>

          <ul className="team-list">
            {users.map((user) => (
              <li key={user.name}>
                <div>
                  <strong>{user.name}</strong>
                  <small>{user.role}</small>
                </div>
                <span>{user.access}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="card account-card">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Invoices</p>
              <h2>Billing history</h2>
            </div>
          </div>

          <ul className="invoice-list">
            {invoices.map((invoice) => (
              <li key={invoice.id}>
                <div>
                  <strong>{invoice.id}</strong>
                  <small>{invoice.date}</small>
                </div>
                <span>{invoice.total}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}

function NotFoundPage() {
  return (
    <main className="page-content">
      <section className="section-block">
        <div className="card not-found">
          <h1>404</h1>
          <p>This page does not exist.</p>
          <Link to="/" className="button button-primary">
            Back home
          </Link>
        </div>
      </section>
    </main>
  )
}

export default App
