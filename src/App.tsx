import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { AuthProvider } from './contexts/AuthContext'
import { MessagingProvider } from './contexts/MessagingContext'
import { ToastProvider } from './components/ui/Toast'
import { ErrorBoundary } from './components/ErrorBoundary'
import { DashboardView } from './pages/DashboardView'
import LoginPage from './pages/LoginPage'
import { AuthGuard } from './components/AuthGuard'
import { UpdateManager } from './components/UpdateManager'
import { MessagingPanel } from './components/messaging/MessagingPanel'
import { MessageToastStack } from './components/messaging/MessageToastStack'

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''

export default function App() {
  const content = (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<AuthGuard><Navigate to="/project/sdp-core" replace /></AuthGuard>} />
        <Route path="/project/:slug" element={<AuthGuard><DashboardView /></AuthGuard>} />
        <Route path="/admin" element={<Navigate to="/project/admin-portal" replace />} />
      </Routes>
    </BrowserRouter>
  )

  const wrapped = (
    <ErrorBoundary>
      <AuthProvider>
        <ToastProvider>
          <MessagingProvider>
            {content}
            <MessagingPanel />
            <MessageToastStack />
            <UpdateManager />
          </MessagingProvider>
        </ToastProvider>
      </AuthProvider>
    </ErrorBoundary>
  )

  if (!GOOGLE_CLIENT_ID) return wrapped

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      {wrapped}
    </GoogleOAuthProvider>
  )
}
