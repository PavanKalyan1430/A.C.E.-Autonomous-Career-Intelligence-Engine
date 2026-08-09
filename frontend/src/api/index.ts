import axios from 'axios'
import { useAuthStore } from '@/store/authStore'

const api = axios.create({
  baseURL: '/api/v1',
  headers: { 'Content-Type': 'application/json' },
})

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Handle 401 globally
api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout()
    }
    return Promise.reject(error)
  }
)

export default api

// ─── Auth ────────────────────────────────────────────────────────────────────
export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', new URLSearchParams({ username: email, password }), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    }),
  register: (email: string, password: string) =>
    api.post('/auth/register', { email, password }),
  me: () => api.get('/auth/me'),
}

// ─── Resume ──────────────────────────────────────────────────────────────────
export const resumeApi = {
  upload: (file: File) => {
    const form = new FormData()
    form.append('file', file)
    return api.post('/resume/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  getLatest: () => api.get('/resume/latest'),
}

// ─── Company ─────────────────────────────────────────────────────────────────
export const companyApi = {
  getInsights: (name: string) => api.get(`/company/${encodeURIComponent(name)}`),
}

// ─── Agent ───────────────────────────────────────────────────────────────────
export const agentApi = {
  query: (message: string) => api.post('/agent/query', { message }),
}

// ─── Memory ──────────────────────────────────────────────────────────────────
export const memoryApi = {
  getAll: () => api.get('/memory/'),
  create: (category: string, memory_text: string) =>
    api.post('/memory/', { category, memory_text }),
}

// ─── Analytics ───────────────────────────────────────────────────────────────
export const analyticsApi = {
  getDashboard: () => api.get('/analytics/dashboard'),
}
