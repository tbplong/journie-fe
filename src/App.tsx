import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router'
import { PortalWipe } from './components/PortalWipe'
import { SkySwitch } from './components/weather/SkySwitch'
import { SiteLayout } from './layouts/SiteLayout'
import { LandingPage } from './pages/LandingPage'
import { GuestOnly, RequireAuth } from './app/guards'
import { PageBoundary } from './app/PageBoundary'
import { useTr } from './hooks/useTr'

const LoginPage = lazy(() => import('./pages/auth/LoginPage').then((m) => ({ default: m.LoginPage })))
const RegisterPage = lazy(() => import('./pages/auth/RegisterPage').then((m) => ({ default: m.RegisterPage })))
const IconSheet = lazy(() => import('./pages/IconSheet').then((m) => ({ default: m.IconSheet })))
const ArtSheet = lazy(() => import('./pages/ArtSheet').then((m) => ({ default: m.ArtSheet })))
const AppRoutes = lazy(() => import('./app/AppRoutes').then((m) => ({ default: m.AppRoutes })))
const ForgotPage = lazy(() => import('./pages/auth/RecoveryPages').then((m) => ({ default: m.ForgotPage })))
const ResetPasswordPage = lazy(() => import('./pages/auth/RecoveryPages').then((m) => ({ default: m.ResetPasswordPage })))
const ConfirmEmailPage = lazy(() => import('./pages/auth/RecoveryPages').then((m) => ({ default: m.ConfirmEmailPage })))
const SharedTripPage = lazy(() => import('./pages/SharedTripPage').then((m) => ({ default: m.SharedTripPage })))

function Splash() {
  const { tr } = useTr()
  return (
    <div className="grid min-h-dvh place-items-center bg-night" role="status" aria-label={tr('Đang tải', 'Loading')}>
      <div className="size-10 animate-spin rounded-full border-2 border-gold/30 border-t-gold" />
    </div>
  )
}

export default function App() {
  return (
    <>
      <PortalWipe />
      <SkySwitch />
      <Suspense fallback={<Splash />}>
        <Routes>
          <Route
            path="/"
            element={
              <SiteLayout>
                <LandingPage />
              </SiteLayout>
            }
          />
          <Route path="/login" element={<GuestOnly><LoginPage /></GuestOnly>} />
          <Route path="/register" element={<GuestOnly><RegisterPage /></GuestOnly>} />
          <Route path="/forgot" element={<GuestOnly><ForgotPage /></GuestOnly>} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/confirm-email" element={<ConfirmEmailPage />} />
          <Route path="/s/:token" element={<PageBoundary><SharedTripPage /></PageBoundary>} />
          <Route
            path="/app/*"
            element={
              <RequireAuth>
                <AppRoutes />
              </RequireAuth>
            }
          />
          {import.meta.env.DEV && <Route path="/__icons" element={<IconSheet />} />}
          {import.meta.env.DEV && <Route path="/__art" element={<ArtSheet />} />}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </>
  )
}
