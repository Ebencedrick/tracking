import { useState, type FormEvent } from 'react'
import { useShipments } from '../../context/ShipmentContext'

export function AdminRates() {
  const { rateConfig, updateRateConfig, carriers } = useShipments()

  // Form State
  const [airRate, setAirRate] = useState(rateConfig.airPerKg)
  const [seaRate, setSeaRate] = useState(rateConfig.seaPerKg)
  const [landRate, setLandRate] = useState(rateConfig.landPerKg)
  const [fuelPct, setFuelPct] = useState(rateConfig.fuelSurchargePct)
  const [customsFee, setCustomsFee] = useState(rateConfig.customsClearanceFee)
  const [peakMultiplier, setPeakMultiplier] = useState(rateConfig.peakSeasonMultiplier)

  // Surcharges & Customs Fee Schedules
  const [securityScanFee, setSecurityScanFee] = useState(25.0)
  const [dangerousGoodsFee, setDangerousGoodsFee] = useState(150.0)
  const [tempControlledFee, setTempControlledFee] = useState(85.0)

  const [toastMessage, setToastMessage] = useState('')

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(''), 3500)
  }

  const handleSaveRates = (e: FormEvent) => {
    e.preventDefault()
    updateRateConfig({
      airPerKg: airRate,
      seaPerKg: seaRate,
      landPerKg: landRate,
      fuelSurchargePct: fuelPct,
      customsClearanceFee: customsFee,
      peakSeasonMultiplier: peakMultiplier,
    })
    showToast('Updated global freight tariff guidelines successfully!')
  }

  const handleResetDefaults = () => {
    setAirRate(4.8)
    setSeaRate(1.4)
    setLandRate(2.2)
    setFuelPct(8.5)
    setCustomsFee(45.0)
    setPeakMultiplier(1.15)
    setSecurityScanFee(25.0)
    setDangerousGoodsFee(150.0)
    setTempControlledFee(85.0)
    updateRateConfig({
      airPerKg: 4.8,
      seaPerKg: 1.4,
      landPerKg: 2.2,
      fuelSurchargePct: 8.5,
      customsClearanceFee: 45.0,
      peakSeasonMultiplier: 1.15,
    })
    showToast('Reset rate guidelines to global baseline standards')
  }

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
            <span>GLOBAL TARIFF & CHARGES POLICY // ACTIVE</span>
          </div>
          <h1 className="cmd-title">Pricing & Tariff Guidelines</h1>
          <p className="cmd-subtitle">
            Configure reference per-KG rate benchmarks, customs fee schedules, and surcharge policies. Tariffs are manually confirmed per consignment.
          </p>
        </div>

        <div className="cmd-header-actions">
          <button type="button" onClick={handleResetDefaults} className="cmd-btn cmd-btn-white">
            ↺ Reset Defaults
          </button>
          <button type="submit" form="rate-matrix-form" className="cmd-btn cmd-btn-red">
            💾 Save Tariff Matrix
          </button>
        </div>
      </div>

      {/* Manual Pricing Policy Alert Banner */}
      <div style={{ background: '#fef3c7', border: '1px solid #fde68a', padding: '1rem 1.25rem', borderRadius: '14px', marginBottom: '1.75rem', display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
        <span style={{ fontSize: '1.4rem' }}>ℹ️</span>
        <div>
          <strong style={{ color: '#92400e', fontSize: '0.88rem' }}>Manual Pricing Assignment Model:</strong>
          <span style={{ color: '#78350f', fontSize: '0.82rem', display: 'block', marginTop: '2px' }}>
            The system does not generate automated binding customer quotations. All rates, surcharges, and invoices are manually quoted and set during consignment intake and booking approval.
          </span>
        </div>
      </div>

      {/* Top 4 KPI Metric Cards */}
      <div className="cmd-stats-row">
        <div className="cmd-stat-card">
          <div className="cmd-stat-info">
            <span className="cmd-stat-label">Air Freight Baseline</span>
            <div className="cmd-stat-number">${airRate.toFixed(2)} / kg</div>
            <span className="cmd-stat-subtext">Priority Global Linehaul</span>
          </div>
          <div className="cmd-stat-icon-box gray">
            ✈️
          </div>
        </div>

        <div className="cmd-stat-card">
          <div className="cmd-stat-info">
            <span className="cmd-stat-label">Ocean Container FCL/LCL</span>
            <div className="cmd-stat-number">${seaRate.toFixed(2)} / kg</div>
            <span className="cmd-stat-subtext">Intermodal Deep-Sea</span>
          </div>
          <div className="cmd-stat-icon-box gray">
            🚢
          </div>
        </div>

        <div className="cmd-stat-card">
          <div className="cmd-stat-info">
            <span className="cmd-stat-label">Overland Express</span>
            <div className="cmd-stat-number">${landRate.toFixed(2)} / kg</div>
            <span className="cmd-stat-subtext">Regional Cold-Chain</span>
          </div>
          <div className="cmd-stat-icon-box gray">
            🚚
          </div>
        </div>

        <div className="cmd-stat-card">
          <div className="cmd-stat-info">
            <span className="cmd-stat-label">Fuel Surcharge Index</span>
            <div className="cmd-stat-number">{fuelPct.toFixed(1)}%</div>
            <span className="cmd-stat-subtext">Monthly Benchmark</span>
          </div>
          <div className="cmd-stat-icon-box gray">
            ⛽
          </div>
        </div>
      </div>

      {/* 2-Column Layout: Modality Reference Form + Surcharges & Carrier Multipliers Table */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.75rem', alignItems: 'start' }}>
        {/* Left Column: Form Card */}
        <div className="cmd-card">
          <div className="cmd-card-header">
            <h2 className="cmd-card-title">
              <span className="cmd-card-title-icon">⚙️</span>
              Base Modality Rate Reference ($ USD / KG)
            </h2>
          </div>

          <form id="rate-matrix-form" onSubmit={handleSaveRates}>
            <div className="cmd-form-row">
              <div className="cmd-form-group">
                <label className="cmd-form-label">✈️ Priority Air Freight ($/KG)</label>
                <input
                  type="number"
                  step="0.1"
                  className="cmd-input"
                  value={airRate}
                  onChange={(e) => setAirRate(Number(e.target.value))}
                  required
                />
              </div>

              <div className="cmd-form-group">
                <label className="cmd-form-label">🚢 Ocean Container FCL/LCL ($/KG)</label>
                <input
                  type="number"
                  step="0.1"
                  className="cmd-input"
                  value={seaRate}
                  onChange={(e) => setSeaRate(Number(e.target.value))}
                  required
                />
              </div>

              <div className="cmd-form-group">
                <label className="cmd-form-label">🚚 Overland Express ($/KG)</label>
                <input
                  type="number"
                  step="0.1"
                  className="cmd-input"
                  value={landRate}
                  onChange={(e) => setLandRate(Number(e.target.value))}
                  required
                />
              </div>
            </div>

            <div style={{ marginTop: '1.75rem', borderTop: '1px solid #f1f5f9', paddingTop: '1.5rem' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: '0 0 0.25rem 0', color: '#0f172a' }}>
                Customs Intake & Special Handling Fee Schedule
              </h3>
              <p style={{ fontSize: '0.78rem', color: '#64748b', margin: '0 0 1.25rem 0' }}>
                Standard clearance and intake charges applied during consignment booking.
              </p>

              <div className="cmd-form-row">
                <div className="cmd-form-group">
                  <label className="cmd-form-label">Port Clearance Intake ($ USD)</label>
                  <input
                    type="number"
                    step="1"
                    className="cmd-input"
                    value={customsFee}
                    onChange={(e) => setCustomsFee(Number(e.target.value))}
                    required
                  />
                </div>

                <div className="cmd-form-group">
                  <label className="cmd-form-label">Security Screening Fee ($ USD)</label>
                  <input
                    type="number"
                    step="1"
                    className="cmd-input"
                    value={securityScanFee}
                    onChange={(e) => setSecurityScanFee(Number(e.target.value))}
                    required
                  />
                </div>
              </div>

              <div className="cmd-form-row" style={{ marginTop: '0.5rem' }}>
                <div className="cmd-form-group">
                  <label className="cmd-form-label">Dangerous Goods (HAZMAT) Fee ($ USD)</label>
                  <input
                    type="number"
                    step="1"
                    className="cmd-input"
                    value={dangerousGoodsFee}
                    onChange={(e) => setDangerousGoodsFee(Number(e.target.value))}
                    required
                  />
                </div>

                <div className="cmd-form-group">
                  <label className="cmd-form-label">Cold-Chain Temp Control Fee ($ USD)</label>
                  <input
                    type="number"
                    step="1"
                    className="cmd-input"
                    value={tempControlledFee}
                    onChange={(e) => setTempControlledFee(Number(e.target.value))}
                    required
                  />
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1px solid #f1f5f9' }}>
              <button type="button" onClick={handleResetDefaults} className="cmd-btn cmd-btn-white">
                Cancel
              </button>
              <button type="submit" className="cmd-btn cmd-btn-red">
                Save Changes
              </button>
            </div>
          </form>
        </div>

        {/* Right Column: Carrier Partner Rate Multipliers & Policy Matrix */}
        <div className="cmd-card">
          <div className="cmd-card-header">
            <h2 className="cmd-card-title">
              <span className="cmd-card-title-icon">📋</span>
              Carrier Multipliers & Corridor Schedule
            </h2>
          </div>

          <div style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '14px', border: '1px solid #e2e8f0', marginBottom: '1.25rem' }}>
            <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', color: '#0f172a' }}>Standard Multiplier Index by Carrier Network</h4>
            <p style={{ margin: '0 0 1rem 0', fontSize: '0.78rem', color: '#64748b' }}>
              Approved baseline adjustment factors based on partner SLAs and airframe capacity allocations.
            </p>

            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left', color: '#64748b' }}>
                  <th style={{ padding: '0.4rem 0.6rem' }}>Carrier Partner</th>
                  <th style={{ padding: '0.4rem 0.6rem' }}>Coverage Corridor</th>
                  <th style={{ padding: '0.4rem 0.6rem' }}>Base Multiplier</th>
                  <th style={{ padding: '0.4rem 0.6rem' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {carriers.map((c) => (
                  <tr key={c.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '0.6rem', fontWeight: 800, color: '#0f172a' }}>
                      {c.name} ({c.code})
                    </td>
                    <td style={{ padding: '0.6rem', color: '#64748b' }}>{c.coverage}</td>
                    <td style={{ padding: '0.6rem', fontWeight: 800, color: '#0284c7' }}>{c.baseRateMultiplier}x</td>
                    <td style={{ padding: '0.6rem' }}>
                      <span className={`cmd-status-pill ${c.status === 'active' ? 'delivered' : 'exception'}`} style={{ fontSize: '0.68rem', padding: '1px 6px' }}>
                        {c.status.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ background: '#ffffff', padding: '1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.88rem', color: '#0f172a' }}>Tariff Protocol Notes</h4>
            <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.78rem', color: '#475569', lineHeight: '1.6' }}>
              <li>Declared cargo value above $1,000 USD is subject to optional cargo insurance assessment.</li>
              <li>Peak demand season factor applies dynamically during designated fourth-quarter holiday linehauls.</li>
              <li>Consignments booked by shippers remain in <strong>Pending</strong> state until quoted tariffs are approved by Operations.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
