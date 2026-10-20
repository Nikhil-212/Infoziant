import { useState, useEffect } from 'react'
import { getHealth, getDashboardStats } from '../services/api'

function formatUptime(seconds) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  return `${h}h ${m}m ${s}s`
}

function StatusRow({ label, value, dot }) {
  const dotClass = dot === 'green' ? 'green' : dot === 'yellow' ? 'yellow' : 'red'
  return (
    <div className="status-item">
      <span className="status-item-label">{label}</span>
      <span className="status-item-value">
        {dot && <span className={`status-dot ${dotClass}`} />}
        {value}
      </span>
    </div>
  )
}

export default function SystemStatus() {
  const [health, setHealth] = useState(null)
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastChecked, setLastChecked] = useState(null)

  async function fetchStatus() {
    setLoading(true)
    setError(null)
    try {
      const [h, s] = await Promise.all([getHealth(), getDashboardStats()])
      setHealth(h)
      setStats(s)
      setLastChecked(new Date())
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchStatus() }, [])

  return (
    <div>
      <div className="page-accent-line" />
      <div className="page-toolbar">
        <div className="page-header" style={{ marginBottom: 0 }}>
          <h1>System Status</h1>
          <p>Application health and resource information</p>
        </div>
        <button className="btn btn-secondary" onClick={fetchStatus} disabled={loading} id="refresh-status-btn">
          {loading ? '⟳ Refreshing…' : '⟳ Refresh'}
        </button>
      </div>

      {lastChecked && (
        <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginBottom: 'var(--spacing-6)' }}>
          Last checked: {lastChecked.toLocaleTimeString()}
        </p>
      )}

      {loading && (
        <div className="loading-center">
          <div className="spinner" />
          <p>Checking system status…</p>
        </div>
      )}

      {error && !loading && (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">⚠️</div>
            <h3>Backend Unreachable</h3>
            <p>Could not connect to the API: {error}</p>
            <p>Verify the backend container is running and accessible.</p>
          </div>
        </div>
      )}

      {health && !loading && (
        <div style={{ display: 'grid', gap: 'var(--spacing-6)', gridTemplateColumns: '1fr 1fr' }}>
          {/* API Health */}
          <div className="card">
            <div className="card-title">API Health</div>
            <StatusRow
              label="Application Status"
              value={health.status === 'ok' ? 'Healthy' : 'Degraded'}
              dot={health.status === 'ok' ? 'green' : 'red'}
            />
            <StatusRow
              label="Database Connection"
              value={health.database?.status || 'unknown'}
              dot={health.database?.status === 'connected' ? 'green' : 'red'}
            />
            <StatusRow
              label="Server Uptime"
              value={formatUptime(health.uptime || 0)}
              dot="green"
            />
            <StatusRow
              label="API Version"
              value={health.version || '1.0.0'}
            />
            <StatusRow
              label="Last Health Check"
              value={health.timestamp ? new Date(health.timestamp).toLocaleTimeString() : '—'}
            />
          </div>

          {/* Application Stats */}
          {stats && (
            <div className="card">
              <div className="card-title">Application Data</div>
              <StatusRow label="Total Vehicles" value={stats.stats.totalVehicles} />
              <StatusRow label="Total Documents" value={stats.stats.totalDocuments} />
              <StatusRow
                label="Expiring within 30 Days"
                value={stats.stats.expiringDocuments}
                dot={stats.stats.expiringDocuments > 0 ? 'yellow' : 'green'}
              />
              <StatusRow
                label="Expired Documents"
                value={stats.stats.expiredDocuments}
                dot={stats.stats.expiredDocuments > 0 ? 'red' : 'green'}
              />
              <StatusRow
                label="Database Status"
                value={stats.system?.database || '—'}
                dot={stats.system?.database === 'connected' ? 'green' : 'red'}
              />
            </div>
          )}

          {/* Architecture Information */}
          <div className="card" style={{ gridColumn: '1 / -1' }}>
            <div className="card-title">Architecture</div>
            <StatusRow label="Frontend" value="React 18 + Vite → served by Nginx" />
            <StatusRow label="Backend" value="Node.js + Express (running in Docker)" />
            <StatusRow label="Database" value="MongoDB (named volume: mongodb_data)" />
            <StatusRow label="Document Storage" value="Named Docker Volume: vehicle_documents → /app/uploads" />
            <StatusRow label="Reverse Proxy" value="Nginx — routes /api/* to backend, serves React SPA" />
            <StatusRow label="Container Runtime" value="Docker + Docker Compose" />
          </div>

          {/* Security Notes */}
          <div className="card" style={{ gridColumn: '1 / -1' }}>
            <div className="card-title">Security Limitations</div>
            <div style={{ padding: 'var(--spacing-4)', color: 'var(--color-warning)', fontSize: 'var(--font-size-sm)' }}>
              <p>⚠️ <strong>No authentication:</strong> This application is an unauthenticated MVP for learning purposes.
              Any user with network access can read, write, and delete all data.</p>
              <br />
              <p>🔐 <strong>Before public deployment:</strong> Add user authentication (e.g., JWT + bcrypt),
              authorization (role-based access), input sanitization, audit logs, and HTTPS.</p>
              <br />
              <p>📁 <strong>Document access:</strong> Downloads are restricted to documents registered in the database.
              The raw upload directory is not served as a public static directory.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
