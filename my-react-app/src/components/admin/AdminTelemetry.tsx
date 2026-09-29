import { useShipments } from '../../context/ShipmentContext'

export function AdminTelemetry() {
  const {
    hubNodes,
    telemetryActive,
    toggleTelemetry,
    telemetryPackets,
    shipments,
  } = useShipments()

  const inTransitShipments = shipments.filter((s) => s.status === 'in_transit')

  return (
    <div className="admin-page">
      {/* Header */}
      <div className="admin-page-header">
        <div>
          <h2>Global Telemetry & Infrastructure Network</h2>
          <p>Real-time packet streaming from satellite transponders, ground gateway pings, and 4-second vector polling.</p>
        </div>

        <button
          type="button"
          className={`admin-telemetry-pill ${!telemetryActive ? 'paused' : ''}`}
          onClick={toggleTelemetry}
        >
          <span className="admin-telemetry-pulse" />
          <span>{telemetryActive ? 'Telemetry Engine: ACTIVE (4,000ms)' : 'Telemetry Engine: PAUSED'}</span>
        </button>
      </div>

      {/* Grid */}
      <div className="admin-grid-2">
        {/* Left: Live Packet Stream Log */}
        <div className="admin-card">
          <div className="admin-card-header">
            <div>
              <h3>Live Telemetry Packet Stream (4s Polling Engine)</h3>
              <p style={{ margin: 0, fontSize: '0.78rem', color: '#94a3b8' }}>
                Streaming raw GPS vectors and transit velocities for {inTransitShipments.length} in-transit aircraft & vessels.
              </p>
            </div>
            <span style={{ fontSize: '0.72rem', color: '#10b981', fontFamily: 'monospace' }}>
              ● {telemetryPackets.length} Packets Captured
            </span>
          </div>

          <div className="admin-packet-stream" aria-label="Raw Telemetry Data Feed">
            {telemetryPackets.length === 0 && (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
                Waiting for next 4-second telemetry tick...
              </div>
            )}

            {telemetryPackets.map((pkt) => (
              <div key={pkt.id} className="admin-packet-line">
                <span className="admin-packet-time">[{pkt.time}]</span>
                <span className="admin-packet-wb">{pkt.waybill}</span>
                <span className="admin-packet-coords">
                  LAT: {pkt.lat}° LNG: {pkt.lng}°
                </span>
                <span className="admin-packet-speed">{pkt.speed}</span>
                {pkt.altitude && (
                  <span style={{ color: '#818cf8', fontSize: '0.72rem' }}>ALT: {pkt.altitude}</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Right: Active In-Transit Consignments Telemetry Health */}
        <div className="admin-card">
          <div className="admin-card-header">
            <h3>Active Vector Diagnostics</h3>
            <span style={{ fontSize: '0.75rem', color: '#38bdf8' }}>
              {inTransitShipments.length} active links
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {inTransitShipments.map((s) => (
              <div
                key={s.waybill}
                style={{
                  padding: '0.85rem 1rem',
                  borderRadius: '8px',
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid var(--admin-border)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <strong style={{ fontSize: '0.85rem', color: '#00d2ff' }}>{s.waybill}</strong>
                  <span style={{ fontSize: '0.72rem', color: '#10b981', fontWeight: 700 }}>
                    Signal: 99.8% (Optimal)
                  </span>
                </div>

                <div style={{ fontSize: '0.78rem', color: '#cbd5e1' }}>
                  {s.carrier} • {s.vehicleId || 'Scheduled Linehaul'}
                </div>

                {/* Progress bar */}
                <div style={{ marginTop: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#64748b', marginBottom: '2px' }}>
                    <span>{s.origin.code}</span>
                    <span>{Math.round(s.progressPct || 50)}% along corridor</span>
                    <span>{s.destination.code}</span>
                  </div>
                  <div style={{ height: '4px', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '2px', overflow: 'hidden' }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${s.progressPct || 50}%`,
                        background: 'linear-gradient(90deg, #0284c7, #00d2ff)',
                        borderRadius: '2px',
                        transition: 'width 0.4s ease',
                      }}
                    />
                  </div>
                </div>

                <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '6px' }}>
                  Current Vector: {s.currentLocation.name}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Hub Infrastructure Nodes */}
      <div className="admin-card" style={{ marginTop: '1.5rem' }}>
        <div className="admin-card-header">
          <h3>Global Gateway Infrastructure Telemetry Nodes</h3>
          <span style={{ fontSize: '0.75rem', color: '#10b981' }}>● 100% Core Network Uptime</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
          {hubNodes.map((hub) => (
            <div
              key={hub.id}
              style={{
                padding: '1rem',
                borderRadius: '8px',
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid var(--admin-border)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <span
                    style={{
                      fontFamily: 'monospace',
                      fontWeight: 800,
                      fontSize: '0.85rem',
                      color: '#00d2ff',
                      background: 'rgba(0, 210, 255, 0.12)',
                      padding: '2px 6px',
                      borderRadius: '4px',
                    }}
                  >
                    {hub.code}
                  </span>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#ffffff', marginTop: '6px' }}>
                    {hub.name}
                  </div>
                </div>

                <span style={{ fontSize: '0.72rem', color: '#10b981', fontWeight: 700 }}>
                  {hub.status}
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '1rem', fontSize: '0.75rem', color: '#94a3b8' }}>
                <div>Latency: <strong style={{ color: '#10b981' }}>{hub.latencyMs} ms</strong></div>
                <div>Throughput: <strong style={{ color: '#cbd5e1' }}>{hub.activeConsignments} pkts/s</strong></div>
                <div>Region: <strong style={{ color: '#cbd5e1' }}>{hub.region}</strong></div>
                <div>Coordinates: <strong style={{ color: '#cbd5e1' }}>{hub.lat.toFixed(1)}°, {hub.lng.toFixed(1)}°</strong></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
