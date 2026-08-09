import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore'

import AppLayout from '@/components/layout/AppLayout'
import LoginPage from '@/pages/auth/LoginPage'
import SignupPage from '@/pages/auth/SignupPage'
import DashboardPage from '@/pages/dashboard/DashboardPage'
import ResumePage from '@/pages/resume/ResumePage'
import CompaniesPage from '@/pages/companies/CompaniesPage'
import CareerPage from '@/pages/career/CareerPage'
import ApplicationsPage from '@/pages/applications/ApplicationsPage'
import InterviewsPage from '@/pages/interviews/InterviewsPage'
import AssistantPage from '@/pages/assistant/AssistantPage'
import AnalyticsPage from '@/pages/analytics/AnalyticsPage'
import SettingsPage from '@/pages/settings/SettingsPage'

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
})

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
          <Route path="/signup" element={<PublicRoute><SignupPage /></PublicRoute>} />

          {/* Protected routes inside shell */}
          <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/resume" element={<ResumePage />} />
            <Route path="/companies" element={<CompaniesPage />} />
            <Route path="/career" element={<CareerPage />} />
            <Route path="/applications" element={<ApplicationsPage />} />
            <Route path="/interviews" element={<InterviewsPage />} />
            <Route path="/assistant" element={<AssistantPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
