import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation, useNavigationType, useOutlet } from 'react-router'
import { AnimatePresence, motion, MotionGlobalConfig } from 'motion/react'
import { Activity, Bell, Briefcase, Building2, ChartColumn, ChevronDown, Database, FolderHeart, LayoutGrid, LogOut, MapPin, Megaphone, Sparkles, UserCog, Users, X, type LucideIcon } from 'lucide-react'
import { logout as logoutRequest } from '../api/auth'
import { SetChooser } from '../components/sets/SetChooser'
import { useNotifications } from '../hooks/useNotifications'
import { useHereWeather } from '../hooks/useHereWeather'
import { useMotionPrefs } from '../hooks/useMotionPrefs'
import { homeFor, type Role } from '../store/authStore'
import { useCatalog, useTrips } from '../api/queries'
import { NavIcon, type NavIconName } from '../components/icons'
import { LangSwitch } from '../components/LangSwitch'
import { MagicCursor, SPARKLE_EVENT } from '../components/MagicCursor'
import { DiCompanion } from '../components/mascot/DiCompanion'
import { Toasts } from '../components/ui/Toasts'
import { SkyBody } from '../components/weather/SkyBody'
import { WeatherChip } from '../components/weather/WeatherChip'
import { WeatherLayer } from '../components/weather/WeatherLayer'
import { siteConfig } from '../content/site'
import { DrawnBackdrop } from '../components/DrawnBackdrop'
import { pickScene, SCENES } from '../content/scenes'
import { cityById } from '../domain/pois'
import { useTr } from '../hooks/useTr'
import { useAuthStore } from '../store/authStore'
import { useCityStore } from '../store/cityStore'
import { usePortalStore } from '../store/portalStore'
import { useSky, useWeatherStore } from '../store/weatherStore'
import { useUiStore } from '../store/uiStore'
import { fmtTime } from '../domain/time'
import { tripTitle } from '../domain/tripText'
import { Logo } from '../components/Logo'
import { PageBoundary } from './PageBoundary'
import { pageCommitted, useMoveLink } from './pageTransition'
import { enterEntry, persistScroll, recalledScroll, rememberScroll, restoreScroll } from './scrollMemory'

/** A nav entry draws Journie's own icon, or a plain line icon for the pages that have none. */
type NavItem = { to: string; end?: boolean; icon: NavIconName | LucideIcon; vi: string; en: string }

const travelerNav: NavItem[] = [
  { to: '/app', end: true, icon: 'home', vi: 'Trang chủ', en: 'Home' },
  { to: '/app/plan', icon: 'plan', vi: 'Tạo lịch trình', en: 'New itinerary' },
  { to: '/app/trips', icon: 'trips', vi: 'Chuyến đi', en: 'My trips' },
  { to: '/app/discover', icon: 'discover', vi: 'Khám phá', en: 'Discover' },
  { to: '/app/recommend', icon: Sparkles, vi: 'Gợi ý địa điểm', en: 'Recommendations' },
  { to: '/app/sets', icon: FolderHeart, vi: 'Bộ sưu tập', en: 'My sets' },
  { to: '/app/profile', icon: 'profile', vi: 'Hồ sơ & sở thích', en: 'Profile' },
  { to: '/app/account', icon: 'account', vi: 'Tài khoản', en: 'Account' },
]

const adminNav: NavItem[] = [
  { to: '/app/analytics', icon: ChartColumn, vi: 'Tổng quan', en: 'Dashboard' },
  { to: '/app/admin/data', icon: Database, vi: 'Dữ liệu & mô hình', en: 'Data & model' },
  { to: '/app/admin/users', icon: Users, vi: 'Người dùng', en: 'Users' },
  { to: '/app/admin/businesses', icon: Building2, vi: 'Doanh nghiệp', en: 'Businesses' },
  { to: '/app/admin/modules', icon: LayoutGrid, vi: 'Phân hệ', en: 'Modules' },
  { to: '/app/admin/notifications', icon: Megaphone, vi: 'Gửi thông báo', en: 'Notifications' },
  { to: '/app/admin/activity', icon: Activity, vi: 'Lịch sử hoạt động', en: 'Activity' },
  { to: '/app/discover', icon: MapPin, vi: 'Dữ liệu điểm đến', en: 'Places data' },
  { to: '/app/account', icon: UserCog, vi: 'Tài khoản', en: 'Account' },
]

/** The admin menu by what the admin is doing: watching, checking data, or managing. */
const adminGroups: { vi: string; en: string; items: string[] }[] = [
  { vi: 'Giám sát', en: 'Monitor', items: ['/app/analytics', '/app/admin/activity'] },
  { vi: 'Dữ liệu', en: 'Data', items: ['/app/admin/data', '/app/discover'] },
  { vi: 'Quản lý', en: 'Manage', items: ['/app/admin/users', '/app/admin/businesses', '/app/admin/modules', '/app/admin/notifications'] },
  { vi: 'Cá nhân', en: 'Personal', items: ['/app/account'] },
]

const businessNav: NavItem[] = [
  { to: '/app/business', icon: 'analytics', vi: 'Bảng điều khiển', en: 'Dashboard' },
  { to: '/app/employees', icon: Briefcase, vi: 'Nhân viên', en: 'Employees' },
  { to: '/app/discover', icon: 'discover', vi: 'Dữ liệu điểm đến', en: 'Places data' },
  { to: '/app/account', icon: 'account', vi: 'Tài khoản', en: 'Account' },
]

const navFor = (role: Role) => (role === 'admin' ? adminNav : role === 'business' ? businessNav : travelerNav)

/** On the desktop top bar these pages sit in the avatar menu, so the bar keeps to the pages used most. */
const IN_MENU = ['/app/sets', '/app/profile', '/app/account']

/** The phone tab bar holds five at most; the rest stay in the side menu (and their pages link to each other). */
const MOBILE: Record<Role, string[]> = {
  traveler: ['/app', '/app/trips', '/app/plan', '/app/discover', '/app/sets'],
  admin: ['/app/analytics', '/app/admin/users', '/app/admin/modules', '/app/admin/notifications', '/app/account'],
  business: ['/app/business', '/app/employees', '/app/discover', '/app/account'],
}

function ItemIcon({ icon, size, tone }: { icon: NavItem['icon']; size: number; tone?: { a: string; b: string } }) {
  if (typeof icon === 'string') return <NavIcon name={icon} size={size} tone={tone} />
  const Icon = icon
  return <Icon size={Math.round(size * 0.82)} strokeWidth={1.8} aria-hidden="true" />
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(-2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}

function Avatar({ name, src, size = 40 }: { name: string; src?: string; size?: number }) {
  if (src) return <img src={src} alt="" width={size} height={size} className="shrink-0 rounded-full border-2 border-sun object-cover" style={{ width: size, height: size }} />
  return (
    <span className="grid shrink-0 place-items-center rounded-full border-2 border-sun bg-forest text-[0.72rem] font-bold text-sun" style={{ width: size, height: size }} aria-hidden="true">
      {initials(name)}
    </span>
  )
}

/** "On the road" pill in the top bar while a trip is live; it opens the live view. */
function LiveChip({ night }: { night: boolean }) {
  const { tr, language } = useTr()
  const { data: trips } = useTrips()
  const live = trips?.find((trip) => trip.status === 'live')
  if (!live) return null
  const city = cityById[live.city]
  return (
    <Link
      to={`/app/trips/${live.id}/live`}
      title={`${tripTitle(live, language)} · ${language === 'vi' ? city.name : city.nameEn} · ${fmtTime(live.dayStart)}–${fmtTime(live.dayEnd)}`}
      className={`mr-1 flex items-center gap-2 rounded-full border border-firuze/45 bg-firuze/10 px-3 py-1.5 text-xs font-bold transition-colors hover:bg-firuze/20 ${night ? 'text-firuze' : 'text-forest'}`}
    >
      <span className="pulse-dot size-2 rounded-full bg-firuze" aria-hidden="true" />
      <span className="max-xl:sr-only">{tr('Đang đi', 'On the road')}</span>
    </Link>
  )
}

const roleLabel = (role: Role, tr: (vi: string, en: string) => string) => (role === 'admin' ? tr('Quản trị viên', 'Platform admin') : role === 'business' ? tr('Doanh nghiệp', 'Business') : tr('Lữ khách', 'Traveler'))

/** The avatar on the top bar: who is signed in, the less used pages, and signing out. Closes on Esc or a click outside. */
function AccountMenu({ items, night, onLogout }: { items: NavItem[]; night: boolean; onLogout: () => void }) {
  const { tr } = useTr()
  const user = useAuthStore((state) => state.user)!
  const go = useMoveLink()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const menuId = useId()

  useEffect(() => {
    if (!open) return
    const onDown = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setOpen(false)
      buttonRef.current?.focus()
    }
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div className="relative" ref={ref}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={`flex items-center gap-1 rounded-full py-1 pl-1 pr-1.5 transition-colors ${night ? 'text-paper/70 hover:bg-paper/10' : 'text-ink/60 hover:bg-forest/8'}`}
        aria-label={tr('Tài khoản và trang khác', 'Account and more pages')}
        aria-expanded={open}
        aria-controls={menuId}
      >
        <Avatar name={user.name} src={user.avatarUrl} size={34} />
        <ChevronDown size={15} className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            id={menuId}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4, transition: { duration: 0.12 } }}
            transition={{ duration: 0.16 }}
            className="absolute right-0 top-full z-50 mt-2 w-64 origin-top-right overflow-hidden border border-forest/20 bg-paper text-ink shadow-[0_24px_50px_-20px_rgba(13,40,34,0.6)]"
          >
            <div className="border-b border-forest/10 px-4 py-3">
              <p className="truncate text-sm font-semibold">{user.name}</p>
              <p className="truncate text-xs text-ink/55">{roleLabel(user.role, tr)}</p>
            </div>
            <ul className="py-1">
              {items.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.end}
                    onClick={(event) => {
                      setOpen(false)
                      go(item.to, 'lateral')(event)
                    }}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-ink/80 transition-colors hover:bg-forest/6 aria-[current=page]:text-terracotta-ink">
                    <ItemIcon icon={item.icon} size={20} />
                    {tr(item.vi, item.en)}
                  </NavLink>
                </li>
              ))}
            </ul>
            <button type="button" onClick={onLogout} className="flex w-full items-center gap-3 border-t border-forest/10 px-4 py-2.5 text-sm font-medium text-ink/75 transition-colors hover:bg-forest/6 hover:text-terracotta-ink">
              <LogOut size={17} aria-hidden="true" />
              {tr('Đăng xuất', 'Sign out')}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/**
 * Desktop navigation along the top: the logo, the main pages spread evenly across the bar (icons only below 1280px, with
 * their names as tooltips), then the trip on the road, weather, language, notifications and the avatar menu. Clear over
 * the page at the top, frosted once the page scrolls under it.
 */
function TopBar({ items, night, onLogout }: { items: NavItem[]; night: boolean; onLogout: () => void }) {
  const { tr, language } = useTr()
  const user = useAuthStore((state) => state.user)!
  const go = useMoveLink()
  const location = useLocation()
  const [scrolled, setScrolled] = useState(false)
  const [hovered, setHovered] = useState<string | null>(null)
  const navRef = useRef<HTMLElement>(null)
  const activeRef = useRef<HTMLDivElement>(null)
  const placedPath = useRef<string | null>(null)

  // The gold pill is a highlighted copy of the tabs clipped to the active one (after Emil Kowalski's tabs): sliding the clip
  // moves the pill and turns the text dark in the same stroke, so colour and movement never drift apart.
  useLayoutEffect(() => {
    const nav = navRef.current
    const layer = activeRef.current
    if (!nav || !layer) return
    let last = ''
    const place = (slide = false) => {
      const active = nav.querySelector<HTMLElement>('a[aria-current="page"]')
      let next = 'inset(50% 50% 50% 50% round 999px)'
      if (active) {
        const box = nav.getBoundingClientRect()
        const tab = active.getBoundingClientRect()
        const pad = (tab.height - 40) / 2
        next = `inset(${tab.top - box.top + pad}px ${box.right - tab.right}px ${box.bottom - tab.bottom + pad}px ${tab.left - box.left}px round 999px)`
      }
      // Unchanged spots are skipped, so a late measurement never cuts a slide short
      if (next === last) return
      last = next
      // The pill slides only when the page changes; a resize, a language switch or the font arriving just puts it in place
      layer.style.transition = slide ? '' : 'none'
      layer.style.clipPath = next
    }
    place(placedPath.current !== null && placedPath.current !== location.pathname)
    placedPath.current = location.pathname
    const settle = () => place()
    // The tabs move when the bar resizes, when a label changes width, or when the web font arrives
    const watch = new ResizeObserver(settle)
    watch.observe(nav)
    for (const tab of nav.querySelectorAll(':scope > a')) watch.observe(tab)
    void document.fonts.ready.then(settle)
    // Size reports only come with a rendered frame; measure again once the page has settled in any case
    window.addEventListener('load', settle)
    const late = window.setTimeout(settle, 800)
    return () => {
      watch.disconnect()
      window.removeEventListener('load', settle)
      window.clearTimeout(late)
    }
  }, [location.pathname, language])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const main = items.filter((item) => !IN_MENU.includes(item.to))
  const menu = items.filter((item) => IN_MENU.includes(item.to))

  return (
    <header className="topbar sticky top-0 z-40 hidden h-16 lg:block" data-scrolled={scrolled}>
      <div className="mx-auto flex h-full max-w-[90rem] items-center gap-4 px-10 xl:gap-8">
        <Link to={homeFor(user.role)} onClick={go(homeFor(user.role), 'lateral')} className="group flex shrink-0 items-center" aria-label="Journie">
          <Logo tone={night ? 'light' : 'dark'} height="2.25rem" className="transition-transform duration-500 group-hover:-rotate-3" />
          <span className="sr-only">Journie</span>
        </Link>
        <nav ref={navRef} className="relative flex h-full flex-1 items-stretch justify-evenly" aria-label={tr('Điều hướng chính', 'Main navigation')} onMouseLeave={() => setHovered(null)}>
          {main.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} onClick={go(item.to, 'lateral')} onMouseEnter={() => setHovered(item.to)} className="topbar-link" title={tr(item.vi, item.en)}>
              {/* A soft pill follows the pointer from tab to tab, on a spring */}
              {hovered === item.to && <motion.span layoutId="topbar-hover" className="topbar-hover" transition={{ type: 'spring', stiffness: 380, damping: 32 }} />}
              <span className="relative flex items-center gap-2">
                <span className="max-xl:hidden">
                  <ItemIcon icon={item.icon} size={22} />
                </span>
                <span>{tr(item.vi, item.en)}</span>
              </span>
            </NavLink>
          ))}
          <div ref={activeRef} className="topbar-active" aria-hidden="true" style={{ clipPath: 'inset(50% 50% 50% 50% round 999px)' }}>
            {main.map((item) => (
              <span key={item.to} className="topbar-link">
                <span className="relative flex items-center gap-2">
                  <span className="max-xl:hidden">
                    <ItemIcon icon={item.icon} size={22} />
                  </span>
                  <span>{tr(item.vi, item.en)}</span>
                </span>
              </span>
            ))}
          </div>
        </nav>
        <div className="flex shrink-0 items-center gap-1">
          {user.role === 'traveler' && <LiveChip night={night} />}
          <WeatherChip tone={night ? 'dark' : 'light'} align="right" compact />
          <LangSwitch tone={night ? 'dark' : 'light'} />
          <NotificationBell tone={night ? 'dark' : 'light'} />
          {menu.length > 0 && <AccountMenu items={menu} night={night} onLogout={onLogout} />}
        </div>
      </div>
    </header>
  )
}

function NotificationBell({ tone = 'light' }: { tone?: 'light' | 'dark' }) {
  const { tr, language } = useTr()
  const { items, unread, markAllRead, markRead, remove, clear } = useNotifications()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && setOpen(false)
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={`relative grid size-11 place-items-center transition-colors ${tone === 'dark' ? 'text-paper/80 hover:text-sun' : 'text-ink/70 hover:text-terracotta'}`}
        aria-label={tr('Thông báo', 'Notifications')}
        aria-expanded={open}
      >
        <Bell size={20} />
        {unread > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute right-2 top-2 grid size-4 place-items-center rounded-full bg-pomegranate text-[0.6rem] font-bold text-white"
          >
            {unread > 9 ? '9+' : unread}
          </motion.span>
        )}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98, transition: { duration: 0.12 } }}
            transition={{ duration: 0.18 }}
            className="absolute right-0 top-full z-50 mt-1 w-[min(22rem,calc(100vw-2rem))] origin-top-right overflow-hidden border border-forest/25 bg-paper text-ink shadow-[0_24px_50px_-20px_rgba(13,40,34,0.6)]"
          >
            <div className="flex items-center justify-between border-b border-forest/10 px-4 py-3">
              <p className="text-sm font-bold">{tr('Thông báo', 'Notifications')}</p>
              <span className="flex gap-3">
                {unread > 0 && (
                  <button type="button" className="text-xs font-semibold text-lapis hover:underline" onClick={markAllRead}>
                    {tr('Đã đọc hết', 'Mark all read')}
                  </button>
                )}
                {items.length > 0 && (
                  <button type="button" className="text-xs font-semibold text-terracotta-ink hover:underline" onClick={clear}>
                    {tr('Xóa tất cả', 'Clear all')}
                  </button>
                )}
              </span>
            </div>
            <ul className="max-h-80 overflow-y-auto">
              {items.length === 0 && <li className="px-4 py-8 text-center text-sm text-ink/55">{tr('Chưa có thông báo.', 'Nothing yet.')}</li>}
              {items.slice(0, 12).map((item) => (
                <li key={item.id} className={`relative flex gap-2 border-b border-forest/8 px-4 py-3 last:border-0 ${item.read ? '' : 'bg-sun/8'}`}>
                  {!item.read && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-pomegranate" aria-label={tr('Chưa đọc', 'Unread')} />}
                  <Link
                    to={item.to ?? '/app/notifications'}
                    onClick={() => {
                      markRead(item)
                      setOpen(false)
                    }}
                    className="block min-w-0 flex-1"
                  >
                    <p className="text-sm font-semibold">{language === 'vi' ? item.vi : item.en}</p>
                    {(item.bodyVi || item.bodyEn) && <p className="mt-0.5 text-[0.8rem] leading-snug text-ink/65">{language === 'vi' ? item.bodyVi : item.bodyEn}</p>}
                    <p className="mt-1 text-[0.68rem] text-ink/45">{new Date(item.at).toLocaleString(language === 'vi' ? 'vi-VN' : 'en-US', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}</p>
                  </Link>
                  <button type="button" onClick={() => remove(item)} className="grid size-7 shrink-0 place-items-center text-ink/35 hover:text-pomegranate" aria-label={tr('Xoá thông báo', 'Delete notification')}>
                    <X size={14} />
                  </button>
                </li>
              ))}
            </ul>
            <Link to="/app/notifications" onClick={() => setOpen(false)} className="block border-t border-forest/10 px-4 py-2.5 text-center text-xs font-semibold text-lapis hover:underline">
              {tr('Xem tất cả thông báo', 'See all notifications')}
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/** Signs out behind the Journie title: the session ends once the dark stage has covered the page, so the sign-in page never shows through the spreading circle. */
function useLogout() {
  const signOut = useAuthStore((state) => state.signOut)
  const openPortal = usePortalStore((state) => state.open)
  const { reduced } = useMotionPrefs()
  return () => {
    void logoutRequest()
    openPortal('/login')
    if (reduced) signOut()
    else window.setTimeout(signOut, 520)
  }
}

export function AppShell() {
  const isAdmin = useAuthStore((state) => state.user?.role === 'admin')
  return isAdmin ? <ConsoleShell /> : <TravelShell />
}

const setStill = (on: boolean) => {
  MotionGlobalConfig.skipAnimations = on
}

/** The admin workspace: a plain decision-support layout, with no weather, mascot, cursor or page motion. */
function ConsoleShell() {
  const { tr } = useTr()
  const user = useAuthStore((state) => state.user)!
  const logout = useLogout()
  const location = useLocation()
  const outlet = useOutlet()
  const pickedCity = useCityStore((state) => state.city)
  useCatalog()
  useCatalog(pickedCity)

  // Set while rendering so a page's first frame is already still; the shared pages keep their motion for travelers
  useState(() => setStill(true))
  useLayoutEffect(() => {
    const root = document.documentElement
    setStill(true)
    root.dataset.console = ''
    return () => {
      setStill(false)
      delete root.dataset.console
    }
  }, [])
  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [location.pathname])


  return (
    <div className="console-root min-h-dvh lg:pl-56">
      <a href="#app-main" className="skip-link">
        {tr('Bỏ qua điều hướng', 'Skip navigation')}
      </a>
      <aside className="console-side fixed inset-y-0 left-0 z-40 hidden w-56 flex-col lg:flex">
        <Link to={homeFor(user.role)} className="flex h-14 items-center gap-2 border-b border-[var(--console-line)] px-4">
          <img src={siteConfig.logoMark} alt="" width="384" height="512" className="h-8 w-auto" />
          <span className="text-[0.95rem] font-semibold text-ink">Journie</span>
          <span className="text-xs text-ink/60">{tr('Quản trị', 'Admin')}</span>
        </Link>
        <nav className="flex-1 overflow-y-auto px-2 pb-3" aria-label={tr('Điều hướng chính', 'Main navigation')}>
          {adminGroups.map((group) => (
            <div key={group.en}>
              <p className="console-group">{tr(group.vi, group.en)}</p>
              {group.items.map((to) => {
                const item = adminNav.find((entry) => entry.to === to)!
                return (
                  <NavLink key={to} to={to} className="console-link">
                    <ItemIcon icon={item.icon} size={20} />
                    {tr(item.vi, item.en)}
                  </NavLink>
                )
              })}
            </div>
          ))}
        </nav>
        <div className="border-t border-[var(--console-line)] p-3">
          <div className="flex items-center gap-2">
            <div className="min-w-0 flex-1">
              <p className="truncate text-[0.82rem] font-semibold text-ink">{user.name}</p>
              <p className="truncate text-xs text-ink/60">{tr('Quản trị viên', 'Platform admin')}</p>
            </div>
            <NotificationBell />
            <button type="button" onClick={logout} className="grid size-9 place-items-center rounded text-ink/60 hover:bg-[var(--console-hover)]" aria-label={tr('Đăng xuất', 'Sign out')}>
              <LogOut size={17} />
            </button>
          </div>
          <div className="mt-2">
            <LangSwitch tone="light" />
          </div>
        </div>
      </aside>

      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-[var(--console-line)] bg-white px-3 lg:hidden">
        <Link to={homeFor(user.role)} className="flex items-center gap-2">
          <img src={siteConfig.logoMark} alt="" width="384" height="512" className="h-8 w-auto" />
          <span className="text-[0.95rem] font-semibold text-ink">Journie</span>
        </Link>
        <div className="flex items-center gap-1">
          <LangSwitch tone="light" />
          <NotificationBell />
          <button type="button" onClick={logout} className="grid size-10 place-items-center text-ink/60" aria-label={tr('Đăng xuất', 'Sign out')}>
            <LogOut size={18} />
          </button>
        </div>
      </header>

      <main id="app-main" className="mx-auto w-full max-w-[100rem] px-4 pb-24 pt-4 lg:px-6 lg:pb-8 lg:pt-5">
        <PageBoundary key={location.pathname}>{outlet}</PageBoundary>
      </main>
      <MobileTabs items={adminNav} />
      <SetChooser />
      <Toasts />
    </div>
  )
}

function TravelShell() {
  const { tr } = useTr()
  const user = useAuthStore((state) => state.user)!
  const logout = useLogout()
  const location = useLocation()
  const outlet = useOutlet()
  const pageKey = location.pathname.split('/').slice(0, 4).join('/')
  const sky = useSky()
  const effects = useWeatherStore((state) => state.effects)
  // The planning wait screen keeps its photo slideshow as the only moving thing, so the weather particles hold still under it
  const busyScreen = useUiStore((state) => state.busyScreen)
  const items = navFor(user.role)
  const pickedCity = useCityStore((state) => state.city)
  const night = sky.phase === 'night'
  // Each load lies on another drawing at random (and the page takes its colours); picking a city then brings that city's own
  const cityPicks = useCityStore((state) => state.picks)
  const [loadScene] = useState(pickScene)
  // A random drawing on every load; once the traveler picks a city (even the one already selected) its own drawing takes over
  const scene = cityPicks > 0 ? (SCENES.find((item) => item.id === pickedCity) ?? loadScene) : loadScene
  // Loads the places from the backend once; every page reads them from the shared list. Sài Gòn's always, as the saved trips are there.
  useCatalog()
  useCatalog(pickedCity)
  // The sky follows where the traveler is, once they share their location
  useHereWeather()

  // Scrolling works as on an ordinary website (scrollMemory.ts): the app keeps each history entry's position itself, so the
  // browser must not jump on its own, and every scroll is booked to the entry being read.
  const navigationType = useNavigationType()
  useEffect(() => {
    const browserDefault = window.history.scrollRestoration
    window.history.scrollRestoration = 'manual'
    let frame = 0
    const onScroll = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => rememberScroll(window.scrollY))
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('pagehide', persistScroll)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('pagehide', persistScroll)
      persistScroll()
      window.history.scrollRestoration = browserDefault
    }
  }, [])

  // A new page starts at the top; back, forward or a reload return to where that entry was left. A move made through a View
  // Transition (top bar, tabs, trip cards: pageTransition.ts) is animated there; any other page change fades in here. Then the
  // transition may picture it.
  const pageRef = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    enterEntry(location.key)
    const saved = navigationType === 'POP' ? recalledScroll(location.key) : undefined
    if (saved) restoreScroll(saved)
    else window.scrollTo({ top: 0, behavior: 'instant' })
    if (!document.documentElement.dataset.move && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      pageRef.current?.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 220, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' })
    }
    pageCommitted()
    // Only a new history entry moves the page; the navigation type comes with it
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.key])

  // Primary buttons throw a little lamp-dust where they were pressed.
  useEffect(() => {
    const onDown = (event: PointerEvent) => {
      const target = event.target as Element | null
      if (target?.closest('.btn-gold:not(:disabled)')) window.dispatchEvent(new CustomEvent(SPARKLE_EVENT, { detail: { x: event.clientX, y: event.clientY, count: 14 } }))
    }
    window.addEventListener('pointerdown', onDown, { passive: true })
    return () => window.removeEventListener('pointerdown', onDown)
  }, [])

  // The workspace theme is keyed on the root element so portals (sheets, toasts) follow it too; its tones follow the drawing behind.
  useLayoutEffect(() => {
    const root = document.documentElement
    root.dataset.appPhase = sky.phase
    root.dataset.appWeather = sky.weather
    root.dataset.appScene = scene.id
    return () => {
      delete root.dataset.appPhase
      delete root.dataset.appWeather
      delete root.dataset.appScene
    }
  }, [sky.phase, sky.weather, scene.id])


  return (
    <div className="app-bg app-root min-h-dvh" data-phase={sky.phase} data-weather={sky.weather}>
      {effects && <MagicCursor />}
      <SkyBody phase={sky.phase} weather={sky.weather} hidden={location.pathname === '/app'} />
      <DrawnBackdrop src={night ? scene.night : scene.day} night={night} className="fixed z-0" />
      <WeatherLayer phase={sky.phase} weather={sky.weather} calm still={!effects || busyScreen} />
      <a href="#app-main" className="skip-link">
        {tr('Bỏ qua điều hướng', 'Skip navigation')}
      </a>

      <TopBar items={items} night={night} onLogout={logout} />

      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-forest/12 bg-paper/90 px-3 backdrop-blur lg:hidden">
        <Link to={homeFor(user.role)} className="flex items-center gap-2" aria-label="Journie">
          <img src={siteConfig.logoMark} alt="" width="384" height="512" className="h-10 w-auto" />
          <span className="h-display text-xl text-forest max-[400px]:sr-only">Journie</span>
        </Link>
        <div className="flex items-center gap-1.5">
          <WeatherChip tone="light" align="right" compact />
          <LangSwitch tone="light" />
          <NotificationBell />
          <Link to="/app/account" aria-label={tr('Tài khoản', 'Account')} className="grid size-10 place-items-center">
            <Avatar name={user.name} src={user.avatarUrl} size={30} />
          </Link>
          <button type="button" onClick={logout} className="grid size-10 place-items-center text-ink/60" aria-label={tr('Đăng xuất', 'Sign out')}>
            <LogOut size={19} />
          </button>
        </div>
      </header>

      <main id="app-main" className="relative z-10 mx-auto w-full max-w-[90rem] px-4 pb-28 pt-6 sm:px-6 lg:px-10 lg:pb-14 lg:pt-9">
        {/* The page is the one named part of a page move (`app-page` in app.css); no transform here keeps fixed bars inside pages pinned. */}
        <div key={pageKey} ref={pageRef} className="app-page">
          {/* Keyed by the full path: a trip and its live view share the wrapper, but a crash on one must not stay on the other. */}
          <PageBoundary key={location.pathname}>{outlet}</PageBoundary>
        </div>
      </main>

      <MobileTabs items={items} />
      <DiCompanion />
      <SetChooser />
      <Toasts />
    </div>
  )
}

function MobileTabs({ items }: { items: NavItem[] }) {
  const { tr } = useTr()
  const user = useAuthStore((state) => state.user)!
  const go = useMoveLink()
  const tabs = MOBILE[user.role].map((to) => items.find((item) => item.to === to)).filter((item): item is NavItem => !!item)
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-sun/30 bg-night/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden" aria-label={tr('Điều hướng di động', 'Mobile navigation')}>
      <ul className={`mx-auto grid max-w-md ${tabs.length === 5 ? 'grid-cols-5' : tabs.length === 4 ? 'grid-cols-4' : 'grid-cols-3'}`}>
        {tabs.map((item, index) => {
          const center = user.role === 'traveler' && index === 2
          return (
            <li key={item.to} className="flex justify-center">
              <NavLink to={item.to} end={item.end} onClick={go(item.to, 'lateral')} className="relative flex h-16 w-full flex-col items-center justify-center gap-1 text-[0.62rem] font-semibold text-paper/65 aria-[current=page]:text-sun">
                {center ? (
                  <span className="-mt-7 grid size-14 place-items-center rounded-full bg-sun text-forest shadow-[0_10px_24px_-8px_rgba(240,185,75,0.8)] ring-4 ring-night">
                    <ItemIcon icon={item.icon} size={30} tone={{ a: '#d96745', b: '#fbf5e6' }} />
                  </span>
                ) : (
                  <ItemIcon icon={item.icon} size={25} />
                )}
                <span className={center ? 'sr-only' : ''}>{tr(item.vi, item.en).split(' ').slice(0, 2).join(' ')}</span>
              </NavLink>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
