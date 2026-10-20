import { NavLink } from 'react-router-dom'

const navItems = [
  { to: '/dashboard', icon: '📊', label: 'Dashboard' },
  { to: '/vehicles',  icon: '🚗', label: 'Vehicles' },
  { to: '/documents', icon: '📄', label: 'Documents' },
  { to: '/status',    icon: '💡', label: 'System Status' },
]

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">🚙</div>
        <div className="sidebar-logo-text">
          <span className="sidebar-logo-title">VehicleVault</span>
          <span className="sidebar-logo-sub">Document Manager</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        <span className="sidebar-section-label">Navigation</span>
        {navItems.map(({ to, icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `sidebar-link${isActive ? ' active' : ''}`
            }
          >
            <span className="sidebar-link-icon">{icon}</span>
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <p>VehicleVault v1.0</p>
        <p>MERN + Docker</p>
      </div>
    </aside>
  )
}
