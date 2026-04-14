import { Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext.jsx'
import { AdminLayout } from './layouts/AdminLayout.jsx'
import { DashboardHomePage } from './pages/admin/DashboardHomePage.jsx'
import { OauthSettingsPage } from './pages/admin/OauthSettingsPage.jsx'
import { PricingPlansPage } from './pages/admin/PricingPlansPage.jsx'
import { SettingsPage } from './pages/admin/SettingsPage.jsx'
import { UsersPage } from './pages/admin/UsersPage.jsx'
import { LoginPage } from './pages/LoginPage.jsx'
import { SignupPage } from './pages/SignupPage.jsx'
import './App.css'

function AuthLayout({ children }) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-6">
        <header>
          <h1 className="text-2xl font-semibold tracking-tight">
            Blinkspeed admin
          </h1>
        </header>
        {children}
      </div>
    </div>
  )
}

function ProtectedRoute({ children }) {
  const { session } = useAuth()
  if (!session) {
    return <Navigate to="/login" replace />
  }
  return children
}

function PublicAuthRoute({ children }) {
  const { session } = useAuth()
  if (session) {
    return <Navigate to="/" replace />
  }
  return children
}

function AppRoutes() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <AuthLayout>
            <PublicAuthRoute>
              <LoginPage />
            </PublicAuthRoute>
          </AuthLayout>
        }
      />
      <Route
        path="/signup"
        element={
          <AuthLayout>
            <PublicAuthRoute>
              <SignupPage />
            </PublicAuthRoute>
          </AuthLayout>
        }
      />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardHomePage />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="oauth" element={<OauthSettingsPage />} />
        <Route path="pricing" element={<PricingPlansPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  )
}
