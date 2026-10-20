import { useState, useEffect, useCallback } from 'react'
import { getVehicles, createVehicle, updateVehicle, deleteVehicle } from '../services/api'
import Modal from '../components/Modal'
import Alert from '../components/Alert'

const CURRENT_YEAR = new Date().getFullYear()

const emptyForm = { registrationNumber: '', make: '', model: '', year: CURRENT_YEAR, notes: '' }

export default function Vehicles() {
  const [vehicles, setVehicles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [successMsg, setSuccessMsg] = useState(null)

  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null) // vehicle being edited
  const [form, setForm] = useState(emptyForm)
  const [formError, setFormError] = useState(null)
  const [saving, setSaving] = useState(false)

  const [confirmDelete, setConfirmDelete] = useState(null) // vehicle to confirm delete

  const loadVehicles = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getVehicles()
      setVehicles(data.vehicles)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadVehicles() }, [loadVehicles])

  function openCreate() {
    setEditing(null)
    setForm(emptyForm)
    setFormError(null)
    setShowForm(true)
  }

  function openEdit(vehicle) {
    setEditing(vehicle)
    setForm({
      registrationNumber: vehicle.registrationNumber,
      make: vehicle.make,
      model: vehicle.model,
      year: vehicle.year,
      notes: vehicle.notes || '',
    })
    setFormError(null)
    setShowForm(true)
  }

  function closeForm() {
    setShowForm(false)
    setEditing(null)
    setFormError(null)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setFormError(null)

    const { registrationNumber, make, model, year } = form
    if (!registrationNumber.trim() || !make.trim() || !model.trim() || !year) {
      setFormError('Registration number, make, model, and year are required.')
      return
    }
    if (year < 1886 || year > CURRENT_YEAR + 1) {
      setFormError(`Year must be between 1886 and ${CURRENT_YEAR + 1}.`)
      return
    }

    setSaving(true)
    try {
      if (editing) {
        await updateVehicle(editing._id, form)
        setSuccessMsg('Vehicle updated successfully.')
      } else {
        await createVehicle(form)
        setSuccessMsg('Vehicle created successfully.')
      }
      closeForm()
      await loadVehicles()
      setTimeout(() => setSuccessMsg(null), 3000)
    } catch (e) {
      setFormError(e.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(vehicle) {
    try {
      await deleteVehicle(vehicle._id)
      setConfirmDelete(null)
      setSuccessMsg('Vehicle and all its documents deleted.')
      await loadVehicles()
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
          <h1>Vehicles</h1>
          <p>Manage your registered vehicles</p>
        </div>
        <div className="page-toolbar-actions">
          <button className="btn btn-primary" id="add-vehicle-btn" onClick={openCreate}>
            ＋ Add Vehicle
          </button>
        </div>
      </div>

      {error && <Alert type="error">{error}</Alert>}
      {successMsg && <Alert type="success">{successMsg}</Alert>}

      {loading ? (
        <div className="loading-center">
          <div className="spinner" />
          <p>Loading vehicles…</p>
        </div>
      ) : vehicles.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">🚗</div>
            <h3>No vehicles registered</h3>
            <p>Add your first vehicle to start managing documents.</p>
            <button className="btn btn-primary" onClick={openCreate}>+ Add First Vehicle</button>
          </div>
        </div>
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Registration</th>
                <th>Make & Model</th>
                <th>Year</th>
                <th>Notes</th>
                <th>Added</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {vehicles.map(v => (
                <tr key={v._id}>
                  <td><strong>{v.registrationNumber}</strong></td>
                  <td>{v.make} {v.model}</td>
                  <td>{v.year}</td>
                  <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {v.notes || <span style={{ color: 'var(--color-text-muted)' }}>—</span>}
                  </td>
                  <td>{new Date(v.createdAt).toLocaleDateString()}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 'var(--spacing-2)' }}>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => openEdit(v)}
                        id={`edit-vehicle-${v._id}`}
                      >
                        ✏️ Edit
                      </button>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => setConfirmDelete(v)}
                        id={`delete-vehicle-${v._id}`}
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

      {/* Add / Edit Modal */}
      <Modal
        isOpen={showForm}
        onClose={closeForm}
        title={editing ? 'Edit Vehicle' : 'Add New Vehicle'}
        footer={
          <>
            <button className="btn btn-secondary" onClick={closeForm} disabled={saving}>Cancel</button>
            <button
              className="btn btn-primary"
              onClick={handleSubmit}
              disabled={saving}
              id="save-vehicle-btn"
            >
              {saving ? 'Saving…' : editing ? 'Update Vehicle' : 'Add Vehicle'}
            </button>
          </>
        }
      >
        {formError && <Alert type="error">{formError}</Alert>}
        <div className="form-grid">
          <div className="form-group">
            <label className="form-label" htmlFor="v-reg">
              Registration Number <span className="required">*</span>
            </label>
            <input
              id="v-reg"
              className="form-input"
              value={form.registrationNumber}
              onChange={e => setForm(f => ({ ...f, registrationNumber: e.target.value.toUpperCase() }))}
              placeholder="e.g. MH01AB1234"
              maxLength={20}
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="v-year">
              Year <span className="required">*</span>
            </label>
            <input
              id="v-year"
              className="form-input"
              type="number"
              value={form.year}
              onChange={e => setForm(f => ({ ...f, year: parseInt(e.target.value) || '' }))}
              min={1886}
              max={CURRENT_YEAR + 1}
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="v-make">
              Make <span className="required">*</span>
            </label>
            <input
              id="v-make"
              className="form-input"
              value={form.make}
              onChange={e => setForm(f => ({ ...f, make: e.target.value }))}
              placeholder="e.g. Toyota"
              maxLength={50}
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="v-model">
              Model <span className="required">*</span>
            </label>
            <input
              id="v-model"
              className="form-input"
              value={form.model}
              onChange={e => setForm(f => ({ ...f, model: e.target.value }))}
              placeholder="e.g. Camry"
              maxLength={50}
            />
          </div>
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="v-notes">Notes</label>
          <textarea
            id="v-notes"
            className="form-textarea"
            value={form.notes}
            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            placeholder="Optional notes about the vehicle…"
            maxLength={500}
            rows={3}
          />
        </div>
      </Modal>

      {/* Confirm Delete Modal */}
      <Modal
        isOpen={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="Confirm Deletion"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setConfirmDelete(null)}>Cancel</button>
            <button
              className="btn btn-danger"
              onClick={() => handleDelete(confirmDelete)}
              id="confirm-delete-vehicle-btn"
            >
              Delete Vehicle
            </button>
          </>
        }
      >
        <div className="confirm-body">
          <div className="confirm-icon">🗑️</div>
          <p className="confirm-message">
            Are you sure you want to delete <strong>{confirmDelete?.registrationNumber}</strong>?
            This will also permanently delete all associated documents and files.
          </p>
        </div>
      </Modal>
    </div>
  )
}
