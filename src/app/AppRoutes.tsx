import { lazy, Suspense, useEffect } from 'react'
import { Link, Navigate, Route, Routes } from 'react-router'
import { Skeleton } from '../components/ui/primitives'
import { useTr } from '../hooks/useTr'
import { useAuthStore, type Role } from '../store/authStore'
import { AppShell } from './AppShell'
import { RequireAuth } from './guards'

const pageLoaders: (() => Promise<unknown>)[] = []

/**
 * A page whose code arrives on first use. Once fetched (preloaded below) it renders straight away: React.lazy alone would
 * still suspend for a moment on first show and flash the loading skeleton, which reads as a page reload.
 */
const lazyPage = <T extends Record<string, React.ComponentType>>(loader: () => Promise<T>, name: keyof T & string) => {
  let Loaded: React.ComponentType | undefined
  const load = () =>
    loader().then((module) => {
      Loaded = module[name]
      return module
    })
  pageLoaders.push(load)
  const Lazy = lazy(() => load().then((module) => ({ default: module[name] as React.ComponentType })))
  return function Page() {
    return Loaded ? <Loaded /> : <Lazy />
  }
}

const Dashboard = lazyPage(() => import('../pages/app/Dashboard'), 'Dashboard')
const PlanPage = lazyPage(() => import('../pages/app/PlanPage'), 'PlanPage')
const TripsPage = lazyPage(() => import('../pages/app/TripsPage'), 'TripsPage')
const TripPage = lazyPage(() => import('../pages/app/TripPage'), 'TripPage')
const JourneyPage = lazyPage(() => import('../pages/app/JourneyPage'), 'JourneyPage')
const LivePage = lazyPage(() => import('../pages/app/LivePage'), 'LivePage')
const DiscoverPage = lazyPage(() => import('../pages/app/DiscoverPage'), 'DiscoverPage')
const ProfilePage = lazyPage(() => import('../pages/app/ProfilePage'), 'ProfilePage')
const AccountPage = lazyPage(() => import('../pages/app/AccountPage'), 'AccountPage')
const AnalyticsPage = lazyPage(() => import('../pages/app/AnalyticsPage'), 'AnalyticsPage')
const RecommendPage = lazyPage(() => import('../pages/app/RecommendPage'), 'RecommendPage')
const SetsPage = lazyPage(() => import('../pages/app/SetsPage'), 'SetsPage')
const SetPage = lazyPage(() => import('../pages/app/SetPage'), 'SetPage')
const NotificationsPage = lazyPage(() => import('../pages/app/NotificationsPage'), 'NotificationsPage')
const MyActivityPage = lazyPage(() => import('../pages/app/admin/ActivityPage'), 'MyActivityPage')
const AdminActivityPage = lazyPage(() => import('../pages/app/admin/ActivityPage'), 'AdminActivityPage')
const DataPage = lazyPage(() => import('../pages/app/admin/DataPage'), 'DataPage')
const UsersPage = lazyPage(() => import('../pages/app/admin/UsersPage'), 'UsersPage')
const UserDetailPage = lazyPage(() => import('../pages/app/admin/UsersPage'), 'UserDetailPage')
const ModulesPage = lazyPage(() => import('../pages/app/admin/ModulesPage'), 'ModulesPage')
const AdminNotificationsPage = lazyPage(() => import('../pages/app/admin/AdminNotificationsPage'), 'AdminNotificationsPage')
const BusinessesPage = lazyPage(() => import('../pages/app/admin/BusinessesPage'), 'BusinessesPage')
const BusinessPage = lazyPage(() => import('../pages/app/business/BusinessPage'), 'BusinessPage')
const EmployeesPage = lazyPage(() => import('../pages/app/business/EmployeesPage'), 'EmployeesPage')

function PageFallback() {
  const { tr } = useTr()
  return (
    <div className="space-y-4" role="status" aria-label={tr('Đang tải', 'Loading')}>
      <Skeleton className="h-10 w-72" />
      <Skeleton className="h-4 w-96 max-w-full" />
      <div className="grid gap-4 pt-4 md:grid-cols-3">
        <Skeleton className="h-40" />
        <Skeleton className="h-40" />
        <Skeleton className="h-40" />
      </div>
    </div>
  )
}

function Home() {
  const role = useAuthStore((state) => state.user?.role)
  if (role === 'admin') return <Navigate to="/app/analytics" replace />
  if (role === 'business') return <Navigate to="/app/business" replace />
  return <Dashboard />
}

/** Pages only some roles may open, each behind its role check. */
const ROLE_PAGES: [path: string, Page: React.ComponentType, roles: Role[]][] = [
  ['plan', PlanPage, ['traveler']],
  ['recommend', RecommendPage, ['traveler']],
  ['sets', SetsPage, ['traveler']],
  ['sets/:id', SetPage, ['traveler']],
  ['analytics', AnalyticsPage, ['admin']],
  ['admin/data', DataPage, ['admin']],
  ['admin/users', UsersPage, ['admin']],
  ['admin/users/:id', UserDetailPage, ['admin']],
  ['admin/modules', ModulesPage, ['admin']],
  ['admin/notifications', AdminNotificationsPage, ['admin']],
  ['admin/activity', AdminActivityPage, ['admin']],
  ['admin/businesses', BusinessesPage, ['admin']],
  ['business', BusinessPage, ['business']],
  ['employees', EmployeesPage, ['business']],
]

function NotFound() {
  const { tr } = useTr()
  return (
    <div className="panel mx-auto mt-10 max-w-lg px-6 py-12 text-center">
      <p className="h-display text-5xl text-gold">404</p>
      <h1 className="h-display mt-2 text-2xl text-forest">{tr('Lạc đường rồi', 'You wandered off the map')}</h1>
      <p className="mt-2 text-sm text-ink/60">{tr('Trang này không tồn tại hoặc đã được dời đi.', 'This page does not exist or has moved.')}</p>
      <Link to="/app" className="btn-gold mt-6">
        {tr('Về trang chủ', 'Back home')}
      </Link>
    </div>
  )
}

export function AppRoutes() {
  // Every page's code is fetched once the app is idle, so moving between pages never waits on a download or flashes a skeleton
  useEffect(() => {
    const preload = () => pageLoaders.forEach((load) => void load().catch(() => undefined))
    // Safari has no requestIdleCallback
    if (typeof window.requestIdleCallback === 'function') {
      const id = window.requestIdleCallback(preload, { timeout: 3000 })
      return () => window.cancelIdleCallback(id)
    }
    const timer = window.setTimeout(preload, 1500)
    return () => window.clearTimeout(timer)
  }, [])

  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route
          index
          element={
            <Suspense fallback={<PageFallback />}>
              <Home />
            </Suspense>
          }
        />
        {[
          ['trips', TripsPage],
          ['trips/:id', TripPage],
          ['trips/:id/live', LivePage],
          ['journeys/:id', JourneyPage],
          ['discover', DiscoverPage],
          ['profile', ProfilePage],
          ['account', AccountPage],
          ['notifications', NotificationsPage],
          ['history', MyActivityPage],
        ].map(([path, Page]) => {
          const Component = Page as React.ComponentType
          return (
            <Route
              key={path as string}
              path={path as string}
              element={
                <Suspense fallback={<PageFallback />}>
                  <Component />
                </Suspense>
              }
            />
          )
        })}
        {ROLE_PAGES.map(([path, Page, roles]) => (
          <Route
            key={path}
            path={path}
            element={
              <RequireAuth role={roles}>
                <Suspense fallback={<PageFallback />}>
                  <Page />
                </Suspense>
              </RequireAuth>
            }
          />
        ))}
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}
