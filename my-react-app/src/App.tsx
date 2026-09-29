import { useEffect, useRef, useState, type FormEvent } from 'react'
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
import siteLogo from '../img/10dfe2bf-120c-41cf-9b7d-3da49f7928bc.jfif'
import './App.css'

const publicLinks = [
  { to: '/', label: 'Home' },
  { to: '/services', label: 'Services' },
  { to: '/about', label: 'Enterprise' },
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
  },
]

function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
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
          <Link to="/" className="brand-mark" aria-label="Northstar Freight home">
            <img src={siteLogo} alt="Northstar Freight logo" className="brand-logo" />
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
            <Link to="/faq" className="button header-utility-button" onClick={() => setIsMobileMenuOpen(false)}>
              FAQs
            </Link>
            <Link to="/contact" className="button header-utility-button" onClick={() => setIsMobileMenuOpen(false)}>
              Support
            </Link>
            <Link to="/track" className="button button-secondary header-action-button" onClick={() => setIsMobileMenuOpen(false)}>
              <svg className="header-action-icon" aria-hidden="true"><use href="/icons.svg#header-track-icon" /></svg>
              Track
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
              <img src={siteLogo} alt="Northstar Freight logo" className="brand-logo brand-logo-footer" />
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
          <span>© 2026 Northstar Freight</span>
          <div>
            <Link to="/policies">Privacy Policy</Link>
            <Link to="/policies#terms">Terms</Link>
            <Link to="/faq">FAQ</Link>
            <Link to="/contact">Support</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}

function DashboardLayout() {
  return (
    <div className="dashboard-shell">
      <aside className="dashboard-sidebar">
        <div className="dashboard-brand">
          <img src={siteLogo} alt="Northstar Freight logo" className="brand-logo brand-logo-dashboard" />
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
      </div>
    </div>
  )
}

function HomePage() {
  return (
    <section className="section-block home-page">
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
              <span className="field-icon">◎</span>
              <input name="waybill" type="text" aria-label="Enter waybill number" placeholder="Waybill number (e.g. NTS-99420-CT4)" />
            </div>
            <button type="submit" className="button button-primary small-button">
              Track
            </button>
          </form>
        </div>

      </div>

      <div className="partner-row" aria-label="Carrier partners">
        {carrierLogos.map((carrier) => (
          <Link key={carrier.name} to={`/ship?carrier=${encodeURIComponent(carrier.booking)}`} className="carrier-pill">
            <img src={carrier.logo} alt={`${carrier.name} logo`} loading="eager" />
          </Link>
        ))}
      </div>

      <div className="network-strip" aria-label="Network operations status">
        <div className="network-status">
          <span className="network-pulse" />
          <span>Dispatch network</span>
          <strong>Operational</strong>
        </div>
        <span className="network-detail">Global hubs <strong>ORD · FRA · LHR · DXB</strong></span>
        <Link to="/contact" className="network-support">24/7 operations support <span aria-hidden="true">↗</span></Link>
      </div>

      <section className="content-panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Transport modes & infrastructure</p>
            <h2>End-to-end freight modalities</h2>
          </div>
          <Link to="/services" className="panel-link">
            Explore Full Portfolio →
          </Link>
        </div>

        <div className="service-grid">
          {serviceCards.map((service) => (
            <article key={service.title} className="info-card">
              <div className={`service-image ${service.tone}`} aria-hidden="true" />
              <div className="service-copy">
                <h3>{service.title}</h3>
                <p>{service.text}</p>
                <Link to={service.link} className="text-link">
                  Book this service →
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="feature-split">
        <div className="feature-copy">
          <p className="eyebrow">Precision tracking engine</p>
          <h2>Live waypoints with transparent milestone visibility.</h2>
          <p>
            Every shipment receives a scannable QR code and a standardized waybill format for live route status, customs checkpoints, and delivery updates.
          </p>

          <div className="mini-feature-grid">
            <div>
              <h3>Millisecond telemetry</h3>
              <p>Live coordinates interpolate across air, sea, and highway corridors.</p>
            </div>
            <div>
              <h3>Automated notifications</h3>
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
              <span className="qr-ring">◉</span>
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
                  value={`${window.location.origin}/track?waybill=NTS-99420-CT4`}
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

          <Link to="/track?waybill=NTS-99420-CT4" className="button button-primary full-width">
            View Shipment Status
          </Link>
        </div>
      </section>

      <section className="cta-banner">
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
    if (currentStep === 5 && !document.querySelector('#confirm-ack')?.checked) {
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
          <p className="eyebrow">Northstar shipment desk</p>
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
  const [waybillInput, setWaybillInput] = useState(searchParams.get('waybill') ?? '')
  const [shareStatus, setShareStatus] = useState('')
  const requestedWaybill = searchParams.get('waybill')?.trim() ?? ''
  const isSampleShipment = requestedWaybill.toUpperCase() === 'NTS-99420-CT4'
  useEffect(() => setShareStatus(''), [requestedWaybill])

  const copyTrackingLink = async () => {
    const trackingUrl = `${window.location.origin}/track?waybill=${encodeURIComponent(requestedWaybill)}`

    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable')
      await navigator.clipboard.writeText(trackingUrl)
      setShareStatus('Tracking link copied.')
    } catch {
      setShareStatus('Copy is unavailable here. You can share the tracking URL in your address bar.')
    }
  }
  const milestones = [
    { title: 'Shipment booked', detail: 'Label created and carrier assigned', location: 'New York, NY', time: 'Today · 08:42', complete: true },
    { title: 'Picked up', detail: 'Shipment collected from sender', location: 'New York, NY', time: 'Today · 10:16', complete: true },
    { title: 'In transit', detail: 'Departed origin gateway', location: 'John F. Kennedy International (JFK)', time: 'Today · 14:22', complete: true, current: true },
    { title: 'Out for delivery', detail: 'With local delivery partner', location: 'London, UK', time: 'Estimated tomorrow', complete: false },
    { title: 'Delivered', detail: 'Shipment received at destination', location: 'London, UK', time: 'Pending', complete: false },
  ]

  return (
    <section className="section-block page-shell tracking-page">
      <div className="tracking-page-heading">
        <div>
          <p className="eyebrow">Shipment visibility</p>
          <h1>Track a shipment</h1>
          <p>Search a waybill to review its route, current status, and shipment milestones.</p>
        </div>
        <div className="tracking-service-note"><span className="network-pulse" /> Tracking preview <strong>Sample data</strong></div>
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
              placeholder="Enter a waybill, e.g. NTS-99420-CT4"
            />
          </div>
        </label>
        <button type="submit" className="button button-primary">Track shipment</button>
      </form>

      {!requestedWaybill && (
        <div className="tracking-empty card">
          <div className="tracking-empty-mark">↗</div>
          <div><strong>Start with a waybill</strong><p>Enter the shipment reference from your confirmation. Only the sample waybill is available in this preview.</p></div>
          <div className="tracking-empty-route" aria-label="Example route from New York JFK to London Heathrow">
            <div><span>ORIGIN</span><strong>JFK</strong></div>
            <span className="tracking-empty-route-line" aria-hidden="true" />
            <div><span>DESTINATION</span><strong>LHR</strong></div>
          </div>
          <button type="button" className="tracking-example-button" onClick={() => { setWaybillInput('NTS-99420-CT4'); setSearchParams({ waybill: 'NTS-99420-CT4' }) }}>
            View sample tracking
          </button>
        </div>
      )}

      {requestedWaybill && !isSampleShipment && (
        <div className="tracking-not-found card" role="status">
          <span className="tracking-not-found-mark" aria-hidden="true">!</span>
          <div><strong>No preview shipment found for {requestedWaybill}</strong><p>Check the reference and try again. This demo only includes NTS-99420-CT4.</p><Link to={`/contact?waybill=${encodeURIComponent(requestedWaybill)}`}>Ask operations about this waybill <span aria-hidden="true">→</span></Link></div>
        </div>
      )}

      {isSampleShipment && (
        <section className="tracking-result" aria-label="Shipment tracking result">
          <div className="tracking-result-heading">
            <div>
              <p className="eyebrow">Sample tracking result</p>
              <h2>{requestedWaybill.toUpperCase()}</h2>
            </div>
            <div className="tracking-result-actions">
              <span className="tracking-state"><i /> In transit</span>
              <button type="button" className="tracking-copy-button" onClick={copyTrackingLink}>
                {shareStatus === 'Tracking link copied.' ? 'Copied' : 'Copy link'} <span aria-hidden="true">↗</span>
              </button>
            </div>
          </div>
          {shareStatus && <p className="tracking-share-status" role="status">{shareStatus}</p>}

          <div className="tracking-result-grid">
            <div className="tracking-main-column">
              <article className="tracking-route-card card">
                <div className="tracking-route-topline"><span>SAMPLE SHIPMENT ROUTE</span><span>Last checkpoint · today at 14:22</span></div>
                <div className="tracking-route-visual">
                  <div className="tracking-route-stop"><i className="route-origin-dot" /><span>ORIGIN</span><strong>New York, USA</strong><small>JFK · United States</small></div>
                  <div className="tracking-route-path"><span>✈</span><i /></div>
                  <div className="tracking-route-stop tracking-route-destination"><i className="route-destination-dot" /><span>DESTINATION</span><strong>London, UK</strong><small>LHR · United Kingdom</small></div>
                </div>
                <div className="tracking-route-footer"><span>Indicative delivery window</span><strong>Tomorrow by 18:00</strong></div>
              </article>

              <article className="tracking-timeline-card card">
                <div className="tracking-card-heading"><div><p className="eyebrow">Journey history</p><h3>Shipment progress</h3></div><span>3 of 5 milestones</span></div>
                <ol className="tracking-timeline">
                  {milestones.map((milestone) => (
                    <li key={milestone.title} className={`${milestone.complete ? 'milestone-complete' : ''} ${milestone.current ? 'milestone-current' : ''}`}>
                      <span className="milestone-indicator">{milestone.complete ? '✓' : ''}</span>
                      <div className="milestone-copy"><strong>{milestone.title}</strong><span>{milestone.detail}</span><small>{milestone.location}</small></div>
                      <time>{milestone.time}</time>
                    </li>
                  ))}
                </ol>
              </article>
            </div>

            <aside className="tracking-detail-card card">
              <div className="tracking-detail-heading"><p className="eyebrow">Shipment details</p><span className="tracking-demo-tag">SAMPLE</span></div>
              <div className="tracking-carrier-lockup"><img src={carrierLogos[0].logo} alt="DHL logo" /><div><strong>DHL Express</strong><span>International priority</span></div></div>
              <dl className="tracking-detail-list">
                <div><dt>Service</dt><dd>Express Worldwide</dd></div>
                <div><dt>Pieces</dt><dd>1 package</dd></div>
                <div><dt>Total weight</dt><dd>12 kg</dd></div>
                <div><dt>Reference</dt><dd>{requestedWaybill.toUpperCase()}</dd></div>
              </dl>
                <div className="tracking-help"><strong>Need assistance?</strong><span>Our operations team is available around the clock.</span><Link to={`/contact?waybill=${encodeURIComponent(requestedWaybill)}`}>Contact support <span aria-hidden="true">↗</span></Link></div>
            </aside>
          </div>
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
          <p className="eyebrow">Northstar freight services</p>
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
  const [requestPrepared, setRequestPrepared] = useState(false)
  const [searchParams] = useSearchParams()
  const prefilledWaybill = searchParams.get('waybill') ?? ''

  const handleSupportSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setRequestPrepared(true)
  }

  return (
    <div className="support-page">
      <section className="support-hero" aria-labelledby="support-title">
        <div>
          <p className="eyebrow">Northstar support</p>
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

          <form className="support-form" aria-label="Submit a support request" onSubmit={handleSupportSubmit}>
            <div className="support-form-pair">
              <label>Name <span className="support-required">*</span>
                <input type="text" name="name" placeholder="Your name" autoComplete="name" required />
              </label>
              <label>Work email <span className="support-required">*</span>
                <input type="email" name="email" placeholder="you@company.com" autoComplete="email" required />
              </label>
            </div>
            <div className="support-form-pair">
              <label>What do you need help with?
                <select name="topic" defaultValue="Tracking update">
                  <option>Tracking update</option>
                  <option>New shipment</option>
                  <option>Customs or documentation</option>
                  <option>Cargo handling</option>
                  <option>Other question</option>
                </select>
              </label>
              <label>Waybill <span className="support-optional">Optional</span>
                <input type="text" name="waybill" defaultValue={prefilledWaybill} placeholder="e.g. NTS-99420-CT4" autoComplete="off" />
              </label>
            </div>
            <label>Message <span className="support-required">*</span>
              <textarea name="message" rows={5} placeholder="Tell us what happened or what you are planning." required />
            </label>
            <div className="support-form-actions">
              <button type="submit" className="button button-primary">Prepare request <span aria-hidden="true">→</span></button>
              <span>Your details stay in this demo and are not transmitted.</span>
            </div>
            {requestPrepared && <p className="support-form-confirmation" role="status">Your request is ready. This demo does not send messages to the operations desk.</p>}
          </form>
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
        <p>How shipment information is used and the conditions that apply when arranging freight through Northstar.</p>
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
            <p>Northstar uses the information you provide to arrange and support freight services. This can include contact details, shipment references, routing information, cargo details, and messages sent to operations.</p>

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
  const stats = [
    { label: 'In Transit', value: '18', tone: 'blue' },
    { label: 'Customs Hold', value: '4', tone: 'amber' },
    { label: 'Delivered (7d)', value: '62', tone: 'green' },
    { label: 'Exceptions', value: '2', tone: 'red' },
  ]

  const activities = [
    { title: 'Shipment NTS-99420-CT4 cleared customs', time: '4 minutes ago' },
    { title: 'Driver assigned for outbound dispatch', time: '18 minutes ago' },
    { title: 'Delay notice sent for one ocean route', time: '1 hour ago' },
    { title: 'Collected from New York origin hub', time: '2 hours ago' },
    { title: 'Proof of delivery uploaded for LHR parcel', time: 'Yesterday' },
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
            <span className="panel-badge">18 in motion</span>
          </div>

          <div className="map-visual" aria-label="Map of active shipments">
            <span className="map-pin map-pin-nyc">NYC</span>
            <span className="map-pin map-pin-ord">ORD</span>
            <span className="map-pin map-pin-lhr">LHR</span>
            <span className="map-pin map-pin-dxb">DXB</span>
            <span className="map-route route-one" />
            <span className="map-route route-two" />
            <span className="map-route route-three" />
          </div>
        </div>

        <div className="card panel-card">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Operations</p>
              <h2>Recent activity</h2>
            </div>
            <Link to="/dashboard/notifications" className="panel-link">View all</Link>
          </div>

          <ul className="activity-list">
            {activities.map((activity) => (
              <li key={activity.title} className="activity-item">
                <span className="activity-dot" aria-hidden="true" />
                <div>
                  <strong>{activity.title}</strong>
                  <small>{activity.time}</small>
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
  const shipments = [
    { waybill: 'NTS-99420-CT4', carrier: 'DHL Express', mode: 'Air', route: 'NYC → LHR', status: 'In transit', eta: '14h 22m', tag: 'in_transit' },
    { waybill: 'NTS-11280-FT2', carrier: 'Maersk Intermodal', mode: 'Sea', route: 'Houston → Rotterdam', status: 'Customs', eta: '3d 4h', tag: 'customs' },
    { waybill: 'NTS-77812-QA1', carrier: 'FedEx Priority', mode: 'Air', route: 'Chicago → Dubai', status: 'Delivered', eta: 'Delivered', tag: 'delivered' },
    { waybill: 'NTS-55290-HM7', carrier: 'UPS Worldwide', mode: 'Land', route: 'Toronto → Detroit', status: 'Exception', eta: 'Needs review', tag: 'exception' },
  ]

  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all')

  const visibleShipments = shipments.filter((shipment) => {
    const matchesQuery = `${shipment.waybill} ${shipment.carrier}`.toLowerCase().includes(query.toLowerCase())
    const matchesFilter = filter === 'all' || shipment.tag === filter
    return matchesQuery && matchesFilter
  })

  return (
    <section className="dashboard-page">
      <div className="table-card card shipment-card">
        <div className="table-toolbar">
          <div>
            <p className="eyebrow">Shipment list</p>
            <h2>Active freight</h2>
          </div>

          <div className="table-controls">
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search waybill or carrier"
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
                  <td>{shipment.mode}</td>
                  <td>{shipment.route}</td>
                  <td>
                    <span className={`status-pill status-${shipment.tag}`}>{shipment.status}</span>
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

  const shipment = {
    waybill: waybill ?? 'NTS-99420-CT4',
    carrier: 'DHL Express',
    mode: 'Air',
    route: 'NYC → LHR',
    status: 'In transit',
    tag: 'in_transit',
    eta: '14h 22m',
  }

  const timeline = [
    { label: 'Booked', time: '09:12', done: true },
    { label: 'Dispatched', time: '11:40', done: true },
    { label: 'In transit', time: 'Live', done: true, current: true },
    { label: 'Customs', time: 'Pending', done: false },
    { label: 'Delivered', time: 'ETA 18:00', done: false },
  ]

  const documents = ['Invoice', 'Customs clearance', 'Proof of delivery', 'Label export']

  return (
    <section className="dashboard-page">
      <div className="detail-layout">
        <div className="card detail-main">
          <div className="detail-header">
            <div>
              <p className="eyebrow">Shipment detail</p>
              <h2>{shipment.waybill}</h2>
            </div>
            <span className={`status-pill status-${shipment.tag}`}>{shipment.status}</span>
          </div>

          <p className="detail-subtitle">{shipment.carrier} • {shipment.mode} • {shipment.route}</p>

          <div className="detail-actions">
            <button type="button" className="button button-secondary">Share tracking link</button>
            <button type="button" className="button button-primary">Print waybill</button>
          </div>

          <div className="detail-map-panel">
            <div className="map-mini" aria-label="Shipment path map">
              <span className="map-pin map-pin-nyc">Origin</span>
              <span className="map-pin map-pin-lhr">Destination</span>
              <span className="map-route map-route-live route-one" />
            </div>
          </div>

          <ul className="timeline">
            {timeline.map((item) => (
              <li key={item.label} className={item.current ? 'timeline-current' : item.done ? 'timeline-done' : ''}>
                <span className="timeline-marker" aria-hidden="true" />
                <div>
                  <strong>{item.label}</strong>
                  <small>{item.time}</small>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="card detail-side">
          <div className="detail-side-header">
            <h3>Documents</h3>
            <button type="button" className="button button-secondary small-button">Download all</button>
          </div>

          <ul className="document-list">
            {documents.map((document) => (
              <li key={document}>
                <span>{document}</span>
                <button type="button">Download</button>
              </li>
            ))}
          </ul>

          <div className="detail-meta">
            <h4>Shipment details</h4>
            <dl>
              <div><dt>Weight</dt><dd>12 kg</dd></div>
              <div><dt>Rate</dt><dd>$420.00</dd></div>
              <div><dt>Reference</dt><dd>Acme Corp</dd></div>
              <div><dt>ETA</dt><dd>Today 18:00</dd></div>
            </dl>
          </div>
        </div>
      </div>
    </section>
  )
}

function CreateShipmentPage() {
  const [step, setStep] = useState(0)
  const [draft, setDraft] = useState({
    mode: 'air',
    carrier: 'DHL Express',
    origin: 'New York, NY',
    destination: 'London, UK',
    weight: '12',
    value: '2500',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const steps = ['Mode & Carrier', 'Route', 'Package & Rate']

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

  const stepContent = [
    <div key="mode" className="wizard-panel">
      <div className="wizard-grid">
        {['Air', 'Ocean', 'Land'].map((mode) => (
          <button
            key={mode}
            type="button"
            className={draft.mode === mode.toLowerCase() ? 'mode-card active' : 'mode-card'}
            onClick={() => setDraft((current) => ({ ...current, mode: mode.toLowerCase() }))}
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
          Origin
          <input value={draft.origin} onChange={(event) => { setDraft((current) => ({ ...current, origin: event.target.value })); setErrors((previous) => ({ ...previous, origin: '' })) }} />
          {errors.origin && <span className="field-error">{errors.origin}</span>}
        </label>
        <label>
          Destination
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
          Declared value
          <input value={draft.value} onChange={(event) => { setDraft((current) => ({ ...current, value: event.target.value })); setErrors((previous) => ({ ...previous, value: '' })) }} />
          {errors.value && <span className="field-error">{errors.value}</span>}
        </label>
      </div>
      <div className="rate-box">
        <span>Estimated rate</span>
        <strong>$315.00</strong>
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
              if (!validateDraftStep()) return
              setStep((current) => Math.min(steps.length - 1, current + 1))
            }}
          >
            {step === steps.length - 1 ? 'Create draft' : 'Continue'}
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
