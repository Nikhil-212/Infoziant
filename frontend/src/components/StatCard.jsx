export default function StatCard({ icon, value, label, colorClass = 'blue' }) {
  return (
    <div className={`stat-card ${colorClass}`}>
      <div className="stat-card-icon">{icon}</div>
      <div className="stat-card-value">{value}</div>
      <div className="stat-card-label">{label}</div>
    </div>
  )
}
