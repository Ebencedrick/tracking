import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useShipments } from '../../context/ShipmentContext'

export function AdminUsers() {
  const { users, addUser, updateUser, switchUser, currentUser } = useShipments()
  const navigate = useNavigate()

  const [activeTab, setActiveTab] = useState<'accounts' | 'api' | 'platform'>('accounts')
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [toastMessage, setToastMessage] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  // Form State
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'client' | 'ops' | 'admin'>('client')
  const [companyName, setCompanyName] = useState('')
  const [billingAddress, setBillingAddress] = useState('')
  const [taxId, setTaxId] = useState('')
  const [creditBalance, setCreditBalance] = useState(15000)
  const [tier, setTier] = useState<'Starter' | 'Standard' | 'Enterprise Gold'>('Enterprise Gold')

  // API Keys State
  const [apiKeyProd] = useState('pk_live_99420_8192384910293847')
  const [apiSecretProd] = useState('sk_live_sec_778129038472910398471203')
  const [showSecret, setShowSecret] = useState(false)
  const [webhookUrl, setWebhookUrl] = useState('https://api.enterpriselogistics.com/v1/webhooks/package-pilot')

  // Platform Settings State
  const [orgName, setOrgName] = useState('Package Pilot Global Logistics Command')
  const [supportPhone, setSupportPhone] = useState('+1 (800) 555-PLOT')
  const [defaultCurrency, setDefaultCurrency] = useState('USD ($)')
  const [gpsIntervalSec, setGpsIntervalSec] = useState(4)
  const [autoGreenLane, setAutoGreenLane] = useState(true)
  const [autoBarcode, setAutoBarcode] = useState(true)
  const [autoSmsNotify, setAutoSmsNotify] = useState(true)

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(''), 3500)
  }

  const handleAddSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !email.trim()) return

    addUser({
      name,
      email,
      role,
      companyName: companyName || name,
      billingAddress: billingAddress || 'Corporate Office',
      taxId: taxId || `US-${Math.floor(10 + Math.random() * 89)}-${Math.floor(100000 + Math.random() * 900000)}`,
      creditBalance,
      tier,
      status: 'active',
      lastLogin: 'Never',
    })

    setIsAddOpen(false)
    setName('')
    setEmail('')
    setCompanyName('')
    showToast(`Registered account for ${name}!`)
  }

  const handleImpersonate = (userId: string) => {
    switchUser(userId)
    showToast('Switched persona. Redirecting to client portal...')
    setTimeout(() => navigate('/dashboard'), 800)
  }

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    showToast(`Copied ${label} to clipboard!`)
  }

  const handleSavePlatformSettings = (e: FormEvent) => {
    e.preventDefault()
    showToast('Platform operational parameters saved successfully!')
  }

  const handleTestWebhook = () => {
    showToast('Sent test ping [event: shipment.telemetry_updated] → 200 OK')
  }

  const filteredUsers = users.filter((u) => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    return (
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.companyName.toLowerCase().includes(q) ||
      u.role.toLowerCase().includes(q)
    )
  })

  return (
    <div className="cmd-canvas">
      {/* Toast */}
      {toastMessage && (
        <div className="shipment-toast">
          {toastMessage}
        </div>
      )}

      {/* Header */}
      <div className="cmd-header">
        <div className="cmd-header-left">
          <div className="cmd-node-status">
            <span className="cmd-node-pulse" />
            <span>SYSTEM GOVERNANCE // ONLINE</span>
          </div>
          <h1 className="cmd-title">System Settings & Accounts</h1>
          <p className="cmd-subtitle">
            Configure client organization profiles, team roles, API & webhook integrations, and global operational rules.
          </p>
        </div>

        {activeTab === 'accounts' && (
          <div className="cmd-header-actions">
            <button type="button" className="cmd-btn cmd-btn-red" onClick={() => setIsAddOpen(true)}>
              + Create Shipper Account
            </button>
          </div>
        )}
      </div>

      {/* Top Main Navigation Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', borderBottom: '2px solid #e2e8f0', paddingBottom: '0.75rem' }}>
        <button
          type="button"
          className={`cmd-btn ${activeTab === 'accounts' ? 'cmd-btn-navy' : 'cmd-btn-white'}`}
          onClick={() => setActiveTab('accounts')}
          style={{ padding: '0.65rem 1.25rem', fontSize: '0.88rem' }}
        >
          Shipper & Team Accounts ({users.length})
        </button>

        <button
          type="button"
          className={`cmd-btn ${activeTab === 'api' ? 'cmd-btn-navy' : 'cmd-btn-white'}`}
          onClick={() => setActiveTab('api')}
          style={{ padding: '0.65rem 1.25rem', fontSize: '0.88rem' }}
        >
          API Keys & Webhook Integrations
        </button>

        <button
          type="button"
          className={`cmd-btn ${activeTab === 'platform' ? 'cmd-btn-navy' : 'cmd-btn-white'}`}
          onClick={() => setActiveTab('platform')}
          style={{ padding: '0.65rem 1.25rem', fontSize: '0.88rem' }}
        >
          Global Platform Settings
        </button>
      </div>

      {/* TAB 1: ACCOUNTS */}
      {activeTab === 'accounts' && (
        <div>
          {/* Top 4 KPI Metric Cards */}
          <div className="cmd-stats-row">
            <div className="cmd-stat-card">
              <div className="cmd-stat-info">
                <span className="cmd-stat-label">Total Registered Accounts</span>
                <div className="cmd-stat-number">{users.length}</div>
                <span className="cmd-stat-subtext">Enterprise & Clients</span>
              </div>
              <div className="cmd-stat-icon-box gray">
                
              </div>
            </div>

            <div className="cmd-stat-card">
              <div className="cmd-stat-info">
                <span className="cmd-stat-label">Enterprise Gold Tiers</span>
                <div className="cmd-stat-number" style={{ color: '#0284c7' }}>
                  {users.filter((u) => u.tier === 'Enterprise Gold').length}
                </div>
                <span className="cmd-stat-subtext">Dedicated SLA Routing</span>
              </div>
              <div className="cmd-stat-icon-box blue">
                ⭐
              </div>
            </div>

            <div className="cmd-stat-card">
              <div className="cmd-stat-info">
                <span className="cmd-stat-label">Total Credit Facilities</span>
                <div className="cmd-stat-number" style={{ color: '#10b981' }}>
                  ${users.reduce((acc, u) => acc + u.creditBalance, 0).toLocaleString()}
                </div>
                <span className="cmd-stat-subtext">Pre-Approved Linehaul</span>
              </div>
              <div className="cmd-stat-icon-box green">
                
              </div>
            </div>

            <div className="cmd-stat-card">
              <div className="cmd-stat-info">
                <span className="cmd-stat-label">Current Active Persona</span>
                <div className="cmd-stat-number" style={{ fontSize: '1.25rem', color: '#0f172a' }}>
                  {currentUser.name}
                </div>
                <span className="cmd-stat-subtext">{currentUser.role.toUpperCase()} Role</span>
              </div>
              <div className="cmd-stat-icon-box gray">
                
              </div>
            </div>
          </div>

          {/* Accounts Table Card */}
          <div className="cmd-card" style={{ padding: 0 }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <h2 className="cmd-card-title" style={{ margin: 0 }}>
                  <span className="cmd-card-title-icon">📋</span>
                  Enterprise Shipper Profiles
                </h2>
              </div>

              <div style={{ width: '280px' }}>
                <input
                  type="text"
                  className="cmd-input"
                  placeholder="Search user, email, company..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ padding: '0.45rem 0.85rem', fontSize: '0.82rem' }}
                />
              </div>
            </div>

            <div className="cmd-table-wrap">
              <table className="cmd-table">
                <thead>
                  <tr>
                    <th>User & Organization</th>
                    <th>Role & Privilege</th>
                    <th>Tier</th>
                    <th>Credit Balance</th>
                    <th>Tax ID & Billing Address</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((u) => (
                    <tr key={u.id} style={{ background: u.id === currentUser.id ? '#f0f9ff' : undefined }}>
                      <td>
                        <div style={{ fontWeight: 800, color: '#0f172a' }}>{u.name}</div>
                        <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                          {u.email} • <strong style={{ color: '#334155' }}>{u.companyName}</strong>
                        </div>
                      </td>

                      <td>
                        <span
                          className={`cmd-status-pill ${
                            u.role === 'admin' ? 'exception' : u.role === 'ops' ? 'in_transit' : 'delivered'
                          }`}
                        >
                          {u.role.toUpperCase()}
                        </span>
                      </td>

                      <td>
                        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155' }}>{u.tier}</span>
                      </td>

                      <td>
                        <div style={{ fontWeight: 800, color: '#10b981' }}>
                          ${u.creditBalance.toLocaleString()}
                        </div>
                      </td>

                      <td>
                        <div style={{ fontSize: '0.82rem', color: '#0f172a', fontFamily: 'monospace', fontWeight: 700 }}>{u.taxId}</div>
                        <div style={{ fontSize: '0.74rem', color: '#64748b' }}>{u.billingAddress}</div>
                      </td>

                      <td>
                        <button
                          type="button"
                          className={`cmd-status-pill ${u.status === 'active' ? 'delivered' : 'exception'}`}
                          style={{ cursor: 'pointer', border: 'none' }}
                          onClick={() => {
                            const next = u.status === 'active' ? 'suspended' : 'active'
                            updateUser(u.id, { status: next })
                            showToast(`Set ${u.name} to ${next}`)
                          }}
                        >
                          {u.status === 'active' ? '● Active' : '⏸ Suspended'}
                        </button>
                      </td>

                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.5rem' }}>
                          <button
                            type="button"
                            className="cmd-btn cmd-btn-white"
                            style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem' }}
                            onClick={() => handleImpersonate(u.id)}
                            title="Impersonate this client in Shipper Portal"
                          >
                            Preview Portal
                          </button>

                          <select
                            className="cmd-select"
                            style={{ padding: '0.35rem 0.55rem', fontSize: '0.75rem', width: 'auto' }}
                            value={u.role}
                            onChange={(e) => {
                              updateUser(u.id, { role: e.target.value as any })
                              showToast(`Updated ${u.name} role to ${e.target.value}`)
                            }}
                          >
                            <option value="client">Client</option>
                            <option value="ops">Ops</option>
                            <option value="admin">Admin</option>
                          </select>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: API & WEBHOOK INTEGRATIONS */}
      {activeTab === 'api' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.75rem', alignItems: 'start' }}>
          {/* Production & Sandbox API Keys */}
          <div className="cmd-card">
            <div className="cmd-card-header">
              <h2 className="cmd-card-title">
                <span className="cmd-card-title-icon"></span>
                REST API Authentication Keys
              </h2>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* Live Key */}
              <div style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <strong style={{ fontSize: '0.88rem', color: '#0f172a' }}>Live Production API Key</strong>
                  <span className="cmd-status-pill delivered">Active</span>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <input
                    type="text"
                    readOnly
                    className="cmd-input"
                    value={apiKeyProd}
                    style={{ fontFamily: 'monospace', fontSize: '0.82rem', background: '#ffffff' }}
                  />
                  <button
                    type="button"
                    className="cmd-btn cmd-btn-white"
                    onClick={() => copyToClipboard(apiKeyProd, 'Production API Key')}
                  >
                    Copy
                  </button>
                </div>

                <label className="cmd-form-label" style={{ marginTop: '0.5rem' }}>Production Secret Key</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    type={showSecret ? 'text' : 'password'}
                    readOnly
                    className="cmd-input"
                    value={apiSecretProd}
                    style={{ fontFamily: 'monospace', fontSize: '0.82rem', background: '#ffffff' }}
                  />
                  <button
                    type="button"
                    className="cmd-btn cmd-btn-white"
                    onClick={() => setShowSecret(!showSecret)}
                  >
                    {showSecret ? 'Hide' : 'Reveal'}
                  </button>
                </div>
              </div>

              {/* Rate Limits info */}
              <div style={{ background: '#eff6ff', padding: '1rem', borderRadius: '10px', border: '1px solid #bfdbfe', fontSize: '0.82rem', color: '#1e40af' }}>
                ℹ️ <strong>Rate Limiting:</strong> Standard tier is capped at 1,000 requests/minute. Enterprise Gold tiers have burst access up to 10,000 req/min with automated failover.
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="cmd-btn cmd-btn-navy"
                  onClick={() => showToast('Generated fresh API signing keys!')}
                >
                  Regenerate API Keys
                </button>
              </div>
            </div>
          </div>

          {/* Webhook Endpoints */}
          <div className="cmd-card">
            <div className="cmd-card-header">
              <h2 className="cmd-card-title">
                <span className="cmd-card-title-icon"></span>
                Automated Webhook Dispatcher
              </h2>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="cmd-form-group">
                <label className="cmd-form-label">Webhook Destination URL</label>
                <input
                  type="url"
                  className="cmd-input"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  placeholder="https://your-domain.com/webhooks/tracking"
                />
              </div>

              <div>
                <label className="cmd-form-label" style={{ marginBottom: '0.5rem', display: 'block' }}>
                  Subscribed Telemetry & Lifecycle Events
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem', color: '#334155', cursor: 'pointer' }}>
                    <input type="checkbox" defaultChecked />
                    <code>shipment.created</code> — Dispatched when new consignment is manifested
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem', color: '#334155', cursor: 'pointer' }}>
                    <input type="checkbox" defaultChecked />
                    <code>telemetry.vector_updated</code> — Dispatched every 4s GPS node beacon
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem', color: '#334155', cursor: 'pointer' }}>
                    <input type="checkbox" defaultChecked />
                    <code>customs.status_change</code> — Customs green-lane clearance or hold
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem', color: '#334155', cursor: 'pointer' }}>
                    <input type="checkbox" defaultChecked />
                    <code>delivery.pod_signed</code> — Final proof of delivery & e-signature
                  </label>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #f1f5f9' }}>
                <button
                  type="button"
                  className="cmd-btn cmd-btn-white"
                  onClick={handleTestWebhook}
                >
                  Send Test Webhook Ping
                </button>

                <button
                  type="button"
                  className="cmd-btn cmd-btn-red"
                  onClick={() => showToast('Webhook endpoint settings saved!')}
                >
                  Save Webhook Config
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: PLATFORM SETTINGS */}
      {activeTab === 'platform' && (
        <div className="cmd-card" style={{ maxWidth: '840px' }}>
          <div className="cmd-card-header">
            <h2 className="cmd-card-title">
              <span className="cmd-card-title-icon"></span>
              Global Operations & Dispatch Automation Rules
            </h2>
          </div>

          <form onSubmit={handleSavePlatformSettings}>
            <div className="cmd-form-row">
              <div className="cmd-form-group">
                <label className="cmd-form-label">Global Organization Title</label>
                <input
                  type="text"
                  className="cmd-input"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  required
                />
              </div>

              <div className="cmd-form-group">
                <label className="cmd-form-label">Emergency Operations Hotline</label>
                <input
                  type="text"
                  className="cmd-input"
                  value={supportPhone}
                  onChange={(e) => setSupportPhone(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="cmd-form-row">
              <div className="cmd-form-group">
                <label className="cmd-form-label">Base Invoice Currency</label>
                <select
                  className="cmd-select"
                  value={defaultCurrency}
                  onChange={(e) => setDefaultCurrency(e.target.value)}
                >
                  <option value="USD ($)">USD ($) - United States Dollar</option>
                  <option value="EUR (€)">EUR (€) - Euro</option>
                  <option value="GBP (£)">GBP (£) - British Pound</option>
                  <option value="JPY (¥)">JPY (¥) - Japanese Yen</option>
                </select>
              </div>

              <div className="cmd-form-group">
                <label className="cmd-form-label">GPS Telemetry Polling Rate (Seconds)</label>
                <input
                  type="number"
                  min="1"
                  max="60"
                  className="cmd-input"
                  value={gpsIntervalSec}
                  onChange={(e) => setGpsIntervalSec(Number(e.target.value))}
                  required
                />
              </div>
            </div>

            <div style={{ marginTop: '1.5rem', borderTop: '1px solid #f1f5f9', paddingTop: '1.25rem' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', margin: '0 0 1rem 0' }}>
                Operational Automation Toggles
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', fontSize: '0.88rem', color: '#334155', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={autoGreenLane}
                    onChange={(e) => setAutoGreenLane(e.target.checked)}
                  />
                  <span>
                    <strong>Automated Customs Green-Lane:</strong> Auto-verify compliant commercial electronic manifests for direct clearance.
                  </span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', fontSize: '0.88rem', color: '#334155', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={autoBarcode}
                    onChange={(e) => setAutoBarcode(e.target.checked)}
                  />
                  <span>
                    <strong>Instant QR & Barcode Generation:</strong> Auto-render digital label assets upon booking submission.
                  </span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', fontSize: '0.88rem', color: '#334155', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={autoSmsNotify}
                    onChange={(e) => setAutoSmsNotify(e.target.checked)}
                  />
                  <span>
                    <strong>Automated Dispatch SMS / Email Alerts:</strong> Dispatch real-time milestone alerts to consignee upon route entry.
                  </span>
                </label>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '2rem', paddingTop: '1.25rem', borderTop: '1px solid #f1f5f9' }}>
              <button type="submit" className="cmd-btn cmd-btn-red" style={{ padding: '0.75rem 1.75rem' }}>
                Save Global System Settings
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Add User Modal */}
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
                <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#0f172a', fontWeight: 800 }}>Create Shipper Account</h3>
                <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748b' }}>
                  Register a new client enterprise or operations officer.
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
                  <label className="cmd-form-label">Full Name / Contact Person</label>
                  <input
                    type="text"
                    className="cmd-input"
                    placeholder="e.g. Alex Morgan"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>

                <div className="cmd-form-group">
                  <label className="cmd-form-label">Email Address</label>
                  <input
                    type="email"
                    className="cmd-input"
                    placeholder="alex@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="cmd-form-row">
                <div className="cmd-form-group">
                  <label className="cmd-form-label">Company Name</label>
                  <input
                    type="text"
                    className="cmd-input"
                    placeholder="e.g. Horizon Global Ltd"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    required
                  />
                </div>

                <div className="cmd-form-group">
                  <label className="cmd-form-label">Role Privilege</label>
                  <select
                    className="cmd-select"
                    value={role}
                    onChange={(e) => setRole(e.target.value as any)}
                  >
                    <option value="client">Client Shipper (Standard Portal)</option>
                    <option value="ops">Operations Dispatcher (Milestone Control)</option>
                    <option value="admin">Chief System Administrator</option>
                  </select>
                </div>
              </div>

              <div className="cmd-form-row">
                <div className="cmd-form-group">
                  <label className="cmd-form-label">Credit Limit ($ USD)</label>
                  <input
                    type="number"
                    step="1000"
                    className="cmd-input"
                    value={creditBalance}
                    onChange={(e) => setCreditBalance(Number(e.target.value))}
                    required
                  />
                </div>

                <div className="cmd-form-group">
                  <label className="cmd-form-label">Account Tier</label>
                  <select
                    className="cmd-select"
                    value={tier}
                    onChange={(e) => setTier(e.target.value as any)}
                  >
                    <option value="Enterprise Gold">Enterprise Gold (Dedicated SLA)</option>
                    <option value="Standard">Standard Tier</option>
                    <option value="Starter">Starter Tier</option>
                  </select>
                </div>
              </div>

              <div className="cmd-form-row">
                <div className="cmd-form-group">
                  <label className="cmd-form-label">Tax / VAT ID</label>
                  <input
                    type="text"
                    className="cmd-input"
                    placeholder="e.g. US-99-129482"
                    value={taxId}
                    onChange={(e) => setTaxId(e.target.value)}
                  />
                </div>

                <div className="cmd-form-group">
                  <label className="cmd-form-label">Billing Address</label>
                  <input
                    type="text"
                    className="cmd-input"
                    placeholder="Street, City, Country"
                    value={billingAddress}
                    onChange={(e) => setBillingAddress(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid #f1f5f9' }}>
                <button type="button" className="cmd-btn cmd-btn-white" onClick={() => setIsAddOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="cmd-btn cmd-btn-red">
                  + Create Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
