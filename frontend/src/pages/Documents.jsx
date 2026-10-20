import { useState, useEffect, useCallback, useRef } from 'react'
import {
  getDocuments, getVehicles, uploadDocument, deleteDocument, getDownloadUrl
} from '../services/api'
import Modal from '../components/Modal'
import Alert from '../components/Alert'

const DOCUMENT_TYPES = [
  'Insurance',
  'Registration Certificate',
  'Pollution Certificate',
  'Road Tax',
  'Fitness Certificate',
  'Permit',
  'Other',
]

const emptyForm = {
  title: '', documentType: DOCUMENT_TYPES[0], vehicleId: '', expiryDate: ''
}

function formatBytes(bytes) {
  if (!bytes) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

function ExpiryBadge({ date }) {
  if (!date) return <span className="badge badge-default">No expiry</span>
  const d = new Date(date)
  const now = new Date()
  const diffDays = Math.ceil((d - now) / (1000 * 60 * 60 * 24))
  if (d < now) return <span className="badge badge-danger">⛔ Expired</span>
  if (diffDays <= 30) return <span className="badge badge-warning">⚠️ {diffDays}d left</span>
  return <span className="badge badge-success">✅ {formatDate(date)}</span>
}

export default function Documents() {
  const [documents, setDocuments] = useState([])
  const [vehicles, setVehicles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [successMsg, setSuccessMsg] = useState(null)

  const [filterVehicle, setFilterVehicle] = useState('')

  const [showUpload, setShowUpload] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [file, setFile] = useState(null)
  const [formError, setFormError] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef(null)

  const [confirmDelete, setConfirmDelete] = useState(null)

  const loadAll = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [docsData, vehData] = await Promise.all([
        getDocuments(filterVehicle || undefined),
        getVehicles(),
      ])
      setDocuments(docsData.documents)
      setVehicles(vehData.vehicles)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [filterVehicle])

  useEffect(() => { loadAll() }, [loadAll])

  function openUpload() {
    setForm({ ...emptyForm, vehicleId: vehicles[0]?._id || '' })
    setFile(null)
    setFormError(null)
    setShowUpload(true)
  }

  function closeUpload() {
    setShowUpload(false)
    setFile(null)
    setFormError(null)
  }

  function handleFileDrop(e) {
    e.preventDefault()
    setDragOver(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped) setFile(dropped)
  }

  async function handleUpload(e) {
    e.preventDefault()
    setFormError(null)

    if (!file) { setFormError('Please select a PDF file.'); return }
    if (!file.name.toLowerCase().endsWith('.pdf')) { setFormError('Only PDF files are accepted.'); return }
    if (file.size > 10 * 1024 * 1024) { setFormError('File must be 10 MB or smaller.'); return }
    if (!form.title.trim()) { setFormError('Document title is required.'); return }
    if (!form.vehicleId) { setFormError('Please select a vehicle.'); return }

    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('title', form.title)
      fd.append('documentType', form.documentType)
      fd.append('vehicleId', form.vehicleId)
      if (form.expiryDate) fd.append('expiryDate', form.expiryDate)

      await uploadDocument(fd)
      setSuccessMsg('Document uploaded successfully.')
      closeUpload()
      await loadAll()
      setTimeout(() => setSuccessMsg(null), 3000)
    } catch (e) {
      setFormError(e.message)
    } finally {
      setUploading(false)
    }
  }

  async function handleDelete(doc) {
    try {
      await deleteDocument(doc._id)
      setConfirmDelete(null)
      setSuccessMsg('Document deleted.')
      await loadAll()
      setTimeout(() => setSuccessMsg(null), 3000)
    } catch (e) {
      setError(e.message)
      setConfirmDelete(null)
    }
  }

  return (
    <div>
      <div className="page-accent-line" />
      <div className="page-toolbar">
        <div className="page-header" style={{ marginBottom: 0 }}>
          <h1>Documents</h1>
          <p>Upload and manage vehicle PDF documents</p>
        </div>
        <div className="page-toolbar-actions">
          <select
            className="form-select"
            value={filterVehicle}
            onChange={e => setFilterVehicle(e.target.value)}
            style={{ minWidth: 180 }}
            id="filter-vehicle"
          >
            <option value="">All Vehicles</option>
            {vehicles.map(v => (
              <option key={v._id} value={v._id}>{v.registrationNumber} — {v.make} {v.model}</option>
            ))}
          </select>
          <button
            className="btn btn-primary"
            onClick={openUpload}
            disabled={vehicles.length === 0}
            id="upload-doc-btn"
            title={vehicles.length === 0 ? 'Add a vehicle first' : 'Upload document'}
          >
            ⬆ Upload PDF
          </button>
        </div>
      </div>

      {error && <Alert type="error">{error}</Alert>}
      {successMsg && <Alert type="success">{successMsg}</Alert>}
      {vehicles.length === 0 && !loading && (
        <Alert type="info">No vehicles found. Add a vehicle before uploading documents.</Alert>
      )}

      {loading ? (
        <div className="loading-center">
          <div className="spinner" />
          <p>Loading documents…</p>
        </div>
      ) : documents.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">📄</div>
            <h3>No documents found</h3>
            <p>Upload your first PDF document to start building your document vault.</p>
            {vehicles.length > 0 && (
              <button className="btn btn-primary" onClick={openUpload}>⬆ Upload First Document</button>
            )}
          </div>
        </div>
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Type</th>
                <th>Vehicle</th>
                <th>File Size</th>
                <th>Uploaded</th>
                <th>Expiry</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {documents.map(d => (
                <tr key={d._id}>
                  <td>
                    <strong>{d.title}</strong>
                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginTop: 2 }}>
                      {d.originalFilename}
                    </div>
                  </td>
                  <td><span className="badge badge-info">{d.documentType}</span></td>
                  <td>{d.vehicle?.registrationNumber || '—'}</td>
                  <td>{formatBytes(d.fileSize)}</td>
                  <td>{formatDate(d.uploadedAt)}</td>
                  <td><ExpiryBadge date={d.expiryDate} /></td>
                  <td>
                    <div style={{ display: 'flex', gap: 'var(--spacing-2)' }}>
                      <a
                        className="btn btn-success btn-sm"
                        href={getDownloadUrl(d._id)}
                        download={d.originalFilename}
                        id={`download-doc-${d._id}`}
                      >
                        ⬇ Download
                      </a>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => setConfirmDelete(d)}
                        id={`delete-doc-${d._id}`}
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Upload Modal */}
      <Modal
        isOpen={showUpload}
        onClose={closeUpload}
        title="Upload PDF Document"
        footer={
          <>
            <button className="btn btn-secondary" onClick={closeUpload} disabled={uploading}>Cancel</button>
            <button
              className="btn btn-primary"
              onClick={handleUpload}
              disabled={uploading}
              id="submit-upload-btn"
            >
              {uploading ? 'Uploading…' : '⬆ Upload Document'}
            </button>
          </>
        }
      >
        {formError && <Alert type="error">{formError}</Alert>}

        {/* Drop Zone */}
        <div
          className={`upload-zone ${dragOver ? 'drag-over' : ''}`}
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleFileDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="upload-zone-icon">📁</div>
          <p><strong>Click to browse</strong> or drag &amp; drop a PDF here</p>
          <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginTop: 4 }}>
            PDF only · Max 10 MB
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,application/pdf"
            style={{ display: 'none' }}
            id="file-input"
            onChange={e => setFile(e.target.files[0] || null)}
          />
        </div>

        {file && (
          <div className="file-preview">
            <span>📄</span>
            <span className="file-preview-name">{file.name}</span>
            <span className="file-preview-size">{formatBytes(file.size)}</span>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => { setFile(null); if (fileInputRef.current) fileInputRef.current.value = '' }}
              type="button"
            >✕</button>
          </div>
        )}

        <div className="form-grid">
          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label className="form-label" htmlFor="doc-title">
              Document Title <span className="required">*</span>
            </label>
            <input
              id="doc-title"
              className="form-input"
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="e.g. Annual Insurance Policy"
              maxLength={100}
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="doc-type">
              Document Type <span className="required">*</span>
            </label>
            <select
              id="doc-type"
              className="form-select"
              value={form.documentType}
              onChange={e => setForm(f => ({ ...f, documentType: e.target.value }))}
            >
              {DOCUMENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="doc-vehicle">
              Vehicle <span className="required">*</span>
            </label>
            <select
              id="doc-vehicle"
              className="form-select"
              value={form.vehicleId}
              onChange={e => setForm(f => ({ ...f, vehicleId: e.target.value }))}
            >
              <option value="">Select vehicle…</option>
              {vehicles.map(v => (
                <option key={v._id} value={v._id}>
                  {v.registrationNumber} — {v.make} {v.model}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label className="form-label" htmlFor="doc-expiry">Expiry Date (optional)</label>
            <input
              id="doc-expiry"
              className="form-input"
              type="date"
              value={form.expiryDate}
              onChange={e => setForm(f => ({ ...f, expiryDate: e.target.value }))}
            />
          </div>
        </div>
      </Modal>

      {/* Confirm Delete Modal */}
      <Modal
        isOpen={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="Delete Document"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setConfirmDelete(null)}>Cancel</button>
            <button
              className="btn btn-danger"
              onClick={() => handleDelete(confirmDelete)}
              id="confirm-delete-doc-btn"
            >
              Delete Document
            </button>
          </>
        }
      >
        <div className="confirm-body">
          <div className="confirm-icon">🗑️</div>
          <p className="confirm-message">
            Permanently delete <strong>{confirmDelete?.title}</strong>?
            The PDF file and its metadata will be removed.
          </p>
        </div>
      </Modal>
    </div>
  )
}
