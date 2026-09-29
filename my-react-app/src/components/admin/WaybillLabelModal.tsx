import { QRCodeSVG } from 'qrcode.react'
import type { Shipment } from '../../types'

interface WaybillLabelModalProps {
  shipment: Shipment | null
  isOpen: boolean
  onClose: () => void
}

export function WaybillLabelModal({ shipment, isOpen, onClose }: WaybillLabelModalProps) {
  if (!isOpen || !shipment) return null

  const handlePrint = () => {
    window.print()
  }

  const trackingUrl = `${window.location.origin}/track?waybill=${encodeURIComponent(shipment.waybill)}`

  return (
    <div className="admin-modal-overlay" onClick={onClose}>
      <div className="admin-modal" style={{ maxWidth: '760px', background: '#090d16' }} onClick={(e) => e.stopPropagation()}>
        <div className="admin-modal-header no-print">
          <div>
            <h3>Official Waybill & Manifest Label</h3>
            <p style={{ margin: 0, fontSize: '0.8rem', color: '#94a3b8' }}>
              Scannable barcode & QR code for freight transit and customs inspection.
            </p>
          </div>
          <button type="button" className="admin-modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        {/* Printable Sheet */}
        <div className="waybill-print-sheet">
          <div className="waybill-print-header">
            <div>
              <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.02em' }}>
                Northstar Freight
              </h2>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.1em', color: '#64748b' }}>
                GLOBAL INTERMODAL DISPATCH NETWORK
              </span>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0f172a' }}>{shipment.carrier}</div>
              <span style={{ fontSize: '0.72rem', background: '#e2e8f0', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>
                PRIORITY {shipment.mode.toUpperCase()}
              </span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px', gap: '1.5rem', marginBottom: '1.25rem', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>WAYBILL IDENTIFICATION</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 900, fontFamily: 'monospace', letterSpacing: '2px', color: '#0f172a' }}>
                {shipment.waybill}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#475569', marginTop: '4px' }}>
                Client Ref: <strong>{shipment.clientReference || 'N/A'}</strong> • Consignee: <strong>{shipment.clientName}</strong>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', background: '#f8fafc', padding: '8px', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
              <QRCodeSVG value={trackingUrl} size={100} level="M" />
              <span style={{ fontSize: '0.62rem', fontWeight: 700, marginTop: '4px', color: '#64748b' }}>SCAN TO TRACK</span>
            </div>
          </div>

          {/* Barcode Mock */}
          <div className="waybill-print-barcode" style={{ marginBottom: '1.25rem' }}>
            ||| | |||| | || ||||| ||| || |||| ||| ||||| || |||
            <div style={{ fontSize: '0.75rem', letterSpacing: '2px', fontWeight: 600, color: '#334155' }}>
              *{shipment.waybill.replace(/[^A-Z0-9]/g, '')}*
            </div>
          </div>

          {/* Origin & Destination Matrix */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', border: '2px solid #0f172a', borderRadius: '6px', marginBottom: '1.25rem' }}>
            <div style={{ padding: '1rem', borderRight: '1px solid #0f172a', background: '#f8fafc' }}>
              <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>FROM (ORIGIN HUB)</span>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, marginTop: '2px', color: '#0f172a' }}>{shipment.origin.code}</div>
              <div style={{ fontSize: '0.82rem', color: '#334155' }}>{shipment.origin.name}</div>
            </div>

            <div style={{ padding: '1rem', background: '#f1f5f9' }}>
              <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>TO (DESTINATION)</span>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, marginTop: '2px', color: '#0f172a' }}>{shipment.destination.code}</div>
              <div style={{ fontSize: '0.82rem', color: '#334155' }}>{shipment.destination.name}</div>
            </div>
          </div>

          {/* Cargo Specs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', background: '#f8fafc', padding: '0.85rem', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '0.8rem' }}>
            <div>
              <span style={{ fontSize: '0.65rem', color: '#64748b', display: 'block' }}>WEIGHT</span>
              <strong>{shipment.weightKg} KG</strong>
            </div>
            <div>
              <span style={{ fontSize: '0.65rem', color: '#64748b', display: 'block' }}>PIECES</span>
              <strong>{shipment.packageCount} PKG</strong>
            </div>
            <div>
              <span style={{ fontSize: '0.65rem', color: '#64748b', display: 'block' }}>VALUE</span>
              <strong>${shipment.declaredValue.toLocaleString()}</strong>
            </div>
            <div>
              <span style={{ fontSize: '0.65rem', color: '#64748b', display: 'block' }}>RATE</span>
              <strong>${shipment.rate.toFixed(2)}</strong>
            </div>
          </div>

          <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#64748b' }}>
            <span>Vehicle / Linehaul: {shipment.vehicleId || 'Assigned on dispatch'}</span>
            <span>Security Stamp: VERIFIED EXPORT COMPLIANT</span>
          </div>
        </div>

        {/* Modal Controls */}
        <div className="admin-modal-actions no-print">
          <button type="button" className="admin-quick-btn" onClick={onClose}>
            Close
          </button>
          <button type="button" className="admin-quick-btn primary" onClick={handlePrint}>
            🖨️ Print Waybill Label
          </button>
        </div>
      </div>
    </div>
  )
}
