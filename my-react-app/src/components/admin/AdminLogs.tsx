import { useState } from 'react'
import { useShipments } from '../../context/ShipmentContext'

export function AdminLogs() {
  const { auditLogs } = useShipments()

  const [categoryFilter, setCategoryFilter] = useState('ALL')
  const [severityFilter, setSeverityFilter] = useState('ALL')
  const [searchQuery, setSearchQuery] = useState('')

  const filteredLogs = auditLogs.filter((log) => {
    const matchCategory = categoryFilter === 'ALL' || log.category === categoryFilter
    const matchSeverity = severityFilter === 'ALL' || log.severity === severityFilter
    const matchSearch =
      log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.user.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.details.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (log.waybill && log.waybill.toLowerCase().includes(searchQuery.toLowerCase()))

    return matchCategory && matchSeverity && matchSearch
  })

  const handleExportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(filteredLogs, null, 2))
    const dlAnchorElem = document.createElement('a')
    dlAnchorElem.setAttribute('href', dataStr)
    dlAnchorElem.setAttribute('download', `northstar_audit_log_${new Date().toISOString().slice(0, 10)}.json`)
    dlAnchorElem.click()
  }

  return (
    <div className="admin-page">
      {/* Header */}
      <div className="admin-page-header">
        <div>
          <h2>Operational Audit Trail & Security Logs</h2>
          <p>Immutable activity log of all state overrides, milestone broadcasts, rate modifications, and user access records.</p>
        </div>

        <button type="button" className="admin-quick-btn" onClick={handleExportJSON}>
          📥 Export Audit Log (JSON)
        </button>
      </div>

      {/* Filters */}
      <div className="admin-card" style={{ marginBottom: '1.5rem', padding: '1rem 1.25rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '1rem' }}>
          <input
            type="search"
            className="admin-input"
            placeholder="Search by action, user, waybill, or details..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />

          <select
            className="admin-select"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="ALL">All Event Categories</option>
            <option value="SHIPMENT">Shipments</option>
            <option value="CHECKPOINT">Checkpoints & Milestones</option>
            <option value="RATES">Rates & Pricing</option>
            <option value="CARRIER">Carriers</option>
            <option value="SECURITY">Security & Access</option>
            <option value="TELEMETRY">Telemetry Engine</option>
          </select>

          <select
            className="admin-select"
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
          >
            <option value="ALL">All Severities</option>
            <option value="info">Info</option>
            <option value="warning">Warning / Alert</option>
            <option value="critical">Critical</option>
          </select>
        </div>
      </div>

      {/* Logs Table */}
      <div className="admin-card" style={{ padding: 0 }}>
        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Category</th>
                <th>Action</th>
                <th>Initiated By</th>
                <th>Target Waybill</th>
                <th>Operational Details</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log) => (
                <tr key={log.id}>
                  <td style={{ whiteSpace: 'nowrap', fontSize: '0.75rem', color: '#94a3b8' }}>
                    {new Date(log.timestamp).toLocaleString()}
                  </td>

                  <td>
                    <span
                      style={{
                        fontSize: '0.68rem',
                        fontWeight: 800,
                        padding: '2px 6px',
                        borderRadius: '4px',
                        background: 'rgba(255, 255, 255, 0.06)',
                        color: '#cbd5e1',
                      }}
                    >
                      {log.category}
                    </span>
                  </td>

                  <td>
                    <span
                      style={{
                        fontWeight: 700,
                        color:
                          log.severity === 'critical'
                            ? '#f87171'
                            : log.severity === 'warning'
                            ? '#f59e0b'
                            : '#00d2ff',
                      }}
                    >
                      {log.action}
                    </span>
                  </td>

                  <td>
                    <span style={{ fontSize: '0.8rem', color: '#ffffff' }}>{log.user}</span>
                  </td>

                  <td>
                    {log.waybill ? (
                      <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#38bdf8' }}>
                        {log.waybill}
                      </span>
                    ) : (
                      <span style={{ color: '#64748b' }}>—</span>
                    )}
                  </td>

                  <td style={{ color: '#cbd5e1', fontSize: '0.8rem' }}>{log.details}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredLogs.length === 0 && (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
              <h3>No audit entries matching the search criteria.</h3>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
