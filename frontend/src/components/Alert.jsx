export default function Alert({ type = 'error', children }) {
  return (
    <div className={`alert alert-${type}`} role="alert">
      <span>
        {type === 'error'   && '⚠️'}
        {type === 'success' && '✅'}
        {type === 'warning' && '⚡'}
        {type === 'info'    && 'ℹ️'}
      </span>
      <span>{children}</span>
    </div>
  )
}
