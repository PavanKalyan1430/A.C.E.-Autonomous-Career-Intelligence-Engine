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

// Handle 401 & 403 globally
api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
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
  query: (message: string, session_id?: number) => api.post('/agent/query', { message, session_id }),
  listSessions: () => api.get('/agent/sessions'),
  getSessionDetail: (id: number) => api.get(`/agent/sessions/${id}`),
  deleteSession: (id: number) => api.delete(`/agent/sessions/${id}`),
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

// ─── Career Intelligence ─────────────────────────────────────────────────────
export const careerApi = {
  getProfile: () => api.get('/career/profile'),
  getIntelligence: () => api.get('/career/intelligence'),
  refresh: () => api.post('/career/refresh'),
}

// ─── Applications ────────────────────────────────────────────────────────────
export const applicationsApi = {
  create: (payload: { company_name: string; role_title: string; status?: string; jd_text?: string }) =>
    api.post('/applications/', payload),
  list: (status_filter?: string) =>
    api.get('/applications/', { params: status_filter ? { status_filter } : {} }),
  update: (id: number, payload: { status?: string; company_name?: string; role_title?: string; jd_text?: string }) =>
    api.patch(`/applications/${id}`, payload),
  delete: (id: number) =>
    api.delete(`/applications/${id}`),
}

// ─── Interview ───────────────────────────────────────────────────────────────
export const interviewApi = {
  start: (payload: { role_title: string; company_name?: string; tech_stack_or_jd?: string }) =>
    api.post('/interview/start', payload),
  submitAnswer: (payload: { session_id: number; question_index: number; question: string; user_answer: string; speech_duration_seconds?: number }) =>
    api.post('/interview/submit-answer', payload),
  submitAudioAnswer: (formData: FormData) =>
    api.post('/interview/audio-answer', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  finish: (payload: { session_id: number }) =>
    api.post('/interview/finish', payload),
}
