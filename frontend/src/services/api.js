// API service — all requests go to /api (relative URL)
// This works correctly in both Vite dev (proxy) and Nginx production.
// Never hardcode localhost as the production host.
import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
})

// --- Vehicles ---
export const getVehicles = () => api.get('/vehicles').then(r => r.data)
export const getVehicle = (id) => api.get(`/vehicles/${id}`).then(r => r.data)
export const createVehicle = (data) => api.post('/vehicles', data).then(r => r.data)
export const updateVehicle = (id, data) => api.put(`/vehicles/${id}`, data).then(r => r.data)
export const deleteVehicle = (id) => api.delete(`/vehicles/${id}`).then(r => r.data)

// --- Documents ---
export const getDocuments = (vehicleId) => {
  const params = vehicleId ? { vehicleId } : {}
  return api.get('/documents', { params }).then(r => r.data)
}
export const getDocument = (id) => api.get(`/documents/${id}`).then(r => r.data)
export const uploadDocument = (formData) =>
  api.post('/documents', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 60000,
  }).then(r => r.data)
export const deleteDocument = (id) => api.delete(`/documents/${id}`).then(r => r.data)
export const getDownloadUrl = (id) => `/api/documents/${id}/download`

// --- Dashboard ---
export const getDashboardStats = () => api.get('/dashboard/stats').then(r => r.data)

// --- Health ---
export const getHealth = () => api.get('/health').then(r => r.data)

// Intercept to format errors consistently
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const message =
      err.response?.data?.message ||
      err.response?.data?.error ||
      err.message ||
      'Unknown error'
    const error = new Error(message)
    error.status = err.response?.status
    return Promise.reject(error)
  }
)
