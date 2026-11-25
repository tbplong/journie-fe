import { useDeferredValue, useId, useMemo, useState, type ReactNode, type Ref } from 'react'
import { AnimatePresence, motion, type Variants } from 'motion/react'
import { FolderPlus, Heart, List, ListPlus, Loader2, Map as MapIcon, MapPinned, Search, Sparkles, X } from 'lucide-react'
import { Link } from 'react-router'
import { PlacesTable } from '../../components/admin/PlacesTable'
import { ModuleGate } from '../../components/ModuleGate'
import { priceTierOf, searchPois, type PriceTier, type SearchHit } from '../../api/places'
import { readProfile } from '../../api/profile'
import { track } from '../../api/analytics'
import { SET_MAX_ITEMS } from '../../api/poiSets'
import { useCatalog, useModuleEnabled, useProfile, useSaveProfile } from '../../api/queries'
import { CategoryIcon, SkyIcon, WeatherIcon } from '../../components/icons'
import { RouteMap } from '../../components/map/RouteMap'
import { PageHeader } from '../../components/PageHeader'
import { EASE_OUT, popItem } from '../../components/motion/variants'
import { PlaceImage } from '../../components/place/PlaceImage'
import { PoiSheet } from '../../components/place/PoiSheet'
import { CategoryName, EmptyState } from '../../components/ui/primitives'
import { HeartBurst } from '../../components/ui/HeartBurst'
import { cheer } from '../../lib/cheer'
import { categories, categoryIds } from '../../domain/categories'
import { cities, cityById, poisByCity } from '../../domain/pois'
import { windowsOn } from '../../domain/solver'
import { fmtTime } from '../../domain/time'
import type { CategoryId, CityId } from '../../domain/types'
import { useTr } from '../../hooks/useTr'
import { useAuthStore } from '../../store/authStore'
import { useCityStore } from '../../store/cityStore'
import { useUiStore } from '../../store/uiStore'
import { useSky } from '../../store/weatherStore'

const NEAR_SUGGESTION: Record<CityId, [string, string]> = {
  'sai-gon': ['cà phê gần Chợ Bến Thành', 'coffee near Ben Thanh Market'],
  'ha-noi': ['cà phê gần Hồ Gươm', 'coffee near Hoan Kiem Lake'],
  'da-nang': ['cà phê gần Cầu Rồng', 'coffee near Dragon Bridge'],
  hue: ['cà phê gần Đại Nội', 'coffee near the Imperial City'],
}

const SUGGESTIONS: [string, string][] = [
  ['ăn sáng', 'breakfast'],
  ['hoàng hôn', 'sunset'],
  ['thiên nhiên', 'nature'],
  ['chợ đêm', 'night market'],
]

const nowMinutes = () => {
  const date = new Date()
  return date.getHours() * 60 + date.getMinutes()
}

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value]
}

const SPRING = { type: 'spring', stiffness: 420, damping: 34 } as const

/** Page blocks rise in turn; `custom` is the block's delay and its children cascade after it, capped so the tail never waits. */
const block: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: (delay: number = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE_OUT, delay, delayChildren: (i: number) => delay + 0.12 + Math.min(i, 10) * 0.035 } }),
}

/** `.chip` also transitions transform in CSS, which would trail behind motion's per-frame updates. */
/** Postcards drawn at a time. */
const PAGE = 48

const CHIP_COLORS = { transition: 'background-color 260ms ease, color 260ms ease, border-color 260ms ease' }

export function DiscoverPage() {
  // The admin manages the places as data, so they get a table instead of the postcards
  const admin = useAuthStore((state) => state.user?.role === 'admin')
  if (admin) return <PlacesTable />
  return (
    <ModuleGate id="discover">
      <Discover />
    </ModuleGate>
  )
}

function Discover() {
  const { tr, place } = useTr()
  const user = useAuthStore((state) => state.user)!
  const viewPill = useId()
  const { discover, setDiscover, resetDiscover, openPoi, openSetChooser } = useUiStore()
  const profile = useProfile().data ?? readProfile(user.id, user.name)
  const saveProfile = useSaveProfile()
  const city = useCityStore((state) => state.city)
  const setCity = useCityStore((state) => state.setCity)
  // The city being browsed, not where the traveler stands: rain there suggests indoor places
  const sky = useSky(city)
  const catalog = useCatalog(city)

  // Typing stays instant while the (cheap) filtering work trails behind.
  const deferredQuery = useDeferredValue(discover.query)
  // `catalog.data` changes when the places finish loading, which is what re-runs the search
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const cityPois = useMemo(() => poisByCity(city), [city, catalog.data])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const hits = useMemo(() => searchPois({ ...discover, query: deferredQuery, city }), [discover, deferredQuery, city, catalog.data])
  const anchor = hits.find((hit) => hit.anchor)?.anchor
  const filtersActive = discover.categories.length + discover.prices.length > 0 || discover.indoorOnly
  const canSave = useModuleEnabled('sets') && user.role === 'traveler'
  // The list grows a page at a time; a new search or filter starts from the first page again
  const listKey = JSON.stringify([city, deferredQuery, discover.categories, discover.prices, discover.indoorOnly, discover.sort])
  const [shown, setShown] = useState({ key: listKey, count: PAGE })
  if (shown.key !== listKey) setShown({ key: listKey, count: PAGE })
  const visible = hits.slice(0, shown.count)
  const saveable = visible.slice(0, SET_MAX_ITEMS)
  const wet = (sky.weather === 'rain' || sky.weather === 'storm') && !discover.indoorOnly

  const toggleSaved = (id: string) => {
    const saved = profile.saved.includes(id)
    if (!saved) cheer()
    saveProfile.mutate({ ...profile, saved: saved ? profile.saved.filter((p) => p !== id) : [...profile.saved, id] })
  }

  return (
    <>
      <PageHeader
        title={user.role === 'traveler' ? tr('Khám phá', 'Discover') : tr('Dữ liệu điểm đến', 'Places data')}
        actions={
          user.role === 'traveler' && (
            <>
              <Link to="/app/sets" className="btn-ghost btn-sm">
                <FolderPlus size={15} aria-hidden="true" /> {tr('Bộ sưu tập', 'My sets')}
              </Link>
              <Link to="/app/recommend" className="btn-gold btn-sm">
                <Sparkles size={15} aria-hidden="true" /> {tr('Gợi ý cho tôi', 'Recommend for me')}
              </Link>
            </>
          )
        }
      />

      <motion.form
        role="search"
        onSubmit={(event) => {
          event.preventDefault()
          if (discover.query.trim()) track({ type: 'search', detail: discover.query.trim() })
        }}
        variants={block}
        custom={0.05}
        initial="hidden"
        animate="show"
        className="search-ticket relative"
      >
        <Search size={20} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-terracotta" aria-hidden="true" />
        <input
          value={discover.query}
          onChange={(event) => setDiscover({ query: event.target.value })}
          aria-label={tr('Tìm địa điểm', 'Search places')}
          placeholder={tr('Tìm quán cà phê, bảo tàng…', 'Search cafés, museums…')}
          className="h-14 w-full border border-forest/30 bg-white/80 pl-12 pr-12 text-[1.05rem] outline-none transition-[border-color,box-shadow] placeholder:text-ink/40 focus:border-terracotta focus:shadow-[0_0_0_4px_rgba(217,103,69,0.14)]"
        />
        <AnimatePresence>
          {discover.query && (
            <motion.button
              type="button"
              onClick={() => setDiscover({ query: '' })}
              initial={{ opacity: 0, scale: 0.6, rotate: -90 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              exit={{ opacity: 0, scale: 0.6, transition: { duration: 0.15 } }}
              transition={SPRING}
              className="absolute right-3 top-1/2 grid size-9 -translate-y-1/2 place-items-center text-ink/45 hover:text-ink"
              aria-label={tr('Xóa từ khóa', 'Clear search')}
            >
              <X size={18} />
            </motion.button>
          )}
        </AnimatePresence>
      </motion.form>
      <motion.div variants={block} custom={0.1} initial="hidden" animate="show" className="mt-3 flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-ink/50">{tr('Thử:', 'Try:')}</span>
        {wet && (
          <motion.button initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={SPRING} whileTap={{ scale: 0.95 }} style={CHIP_COLORS} type="button" className="chip !min-h-8 !border-jade !bg-jade/12 !text-xs !text-jade-ink" onClick={() => setDiscover({ indoorOnly: true })}>
            <SkyIcon phase={sky.phase} weather="rain" size={20} />
            {tr('Đang mưa nên chỉ hiện chỗ trong nhà', 'Raining, so showing indoor places only')}
          </motion.button>
        )}
        {[NEAR_SUGGESTION[city], ...SUGGESTIONS].map(([v, e]) => (
          <motion.button key={v} type="button" variants={popItem} whileHover={{ y: -2 }} whileTap={{ scale: 0.95 }} style={CHIP_COLORS} className="chip !min-h-8 !text-xs" onClick={() => setDiscover({ query: tr(v, e) })}>
            {tr(v, e)}
          </motion.button>
        ))}
      </motion.div>

      <motion.section variants={block} custom={0.16} initial="hidden" animate="show" className="panel mt-6 p-4 sm:p-5" aria-label={tr('Bộ lọc', 'Filters')}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="h-display text-lg text-forest">{tr('Chọn điểm dừng cho tấm bưu thiếp', 'Pick your postcard')}</p>
          <div className="flex items-center gap-3">
            {filtersActive && (
              <button type="button" onClick={() => resetDiscover()} className="text-xs font-semibold text-terracotta-ink hover:underline">
                {tr('Xóa bộ lọc', 'Clear filters')}
              </button>
            )}
            <div role="group" aria-label={tr('Chế độ xem', 'View')} className="inline-flex bg-forest/6 p-0.5">
              {(['list', 'map'] as const).map((view) => {
                const on = discover.view === view
                return (
                  <button key={view} type="button" aria-pressed={on} onClick={() => setDiscover({ view })} className={`relative inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-colors ${on ? 'text-paper' : 'text-ink/60 hover:text-ink'}`}>
                    {on && <motion.span layoutId={`view-${viewPill}`} className="absolute inset-0 bg-forest" transition={SPRING} aria-hidden="true" />}
                    <span className="relative inline-flex items-center gap-1.5">
                      {view === 'list' ? <List size={14} aria-hidden="true" /> : <MapIcon size={14} aria-hidden="true" />}
                      {view === 'list' ? tr('Bưu thiếp', 'Postcards') : tr('Bản đồ', 'Map')}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        <FilterRow label={tr('Ở đâu', 'Where')}>
          <ul className="flex flex-wrap gap-2">
            {cities.map((option) => {
              const on = option.id === city
              return (
                <li key={option.id}>
                  <motion.button
                    type="button"
                    aria-pressed={on}
                    onClick={() => setCity(option.id)}
                    variants={popItem}
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.95 }}
                    transition={SPRING}
                    className={`border px-3 py-1.5 text-[0.8rem] font-semibold transition-colors ${on ? 'border-forest bg-forest text-paper' : 'border-forest/20 bg-white/70 text-ink/75 hover:border-terracotta'}`}
                  >
                    {tr(option.name, option.nameEn)}
                  </motion.button>
                </li>
              )
            })}
          </ul>
        </FilterRow>

        <FilterRow label={tr('Làm gì', 'What')}>
          <ul className="flex flex-wrap gap-2">
            {categoryIds.filter((cat) => cityPois.some((poi) => poi.cat === cat)).map((cat) => {
              const on = discover.categories.includes(cat)
              return (
                <li key={cat}>
                  <motion.button
                    type="button"
                    aria-pressed={on}
                    onClick={() => setDiscover({ categories: toggle<CategoryId>(discover.categories, cat) })}
                    variants={popItem}
                    whileHover={{ y: -3, rotate: -2 }}
                    whileTap={{ scale: 0.93 }}
                    transition={SPRING}
                    className={`relative flex items-center gap-1.5 border py-1 pl-1.5 pr-3 text-[0.8rem] font-semibold transition-colors ${on ? 'border-forest bg-white/70 text-paper' : 'border-forest/20 bg-white/70 text-ink/75 hover:border-terracotta'}`}
                  >
                    <AnimatePresence initial={false}>
                      {on && <motion.span key="fill" className="absolute -inset-px bg-forest" initial={{ opacity: 0, scale: 0.3 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.7, transition: { duration: 0.16 } }} transition={{ duration: 0.38, ease: EASE_OUT }} aria-hidden="true" />}
                    </AnimatePresence>
                    <motion.span animate={on ? { scale: [1, 1.3, 1], rotate: [0, -12, 0] } : { scale: 1 }} transition={{ duration: 0.45 }} className="relative block">
                      <CategoryIcon cat={cat} size={30} />
                    </motion.span>
                    <span className="relative">{tr(categories[cat].vi, categories[cat].en)}</span>
                  </motion.button>
                </li>
              )
            })}
          </ul>
        </FilterRow>

        <div className="mt-5 grid gap-x-8 gap-y-5 border-t border-dashed border-forest/20 pt-5 md:grid-cols-[auto_auto_1fr] md:items-end">
          <div>
            <p className="mb-2 text-xs font-semibold text-ink/55">{tr('Túi tiền', 'Spend')}</p>
            <ul className="flex gap-2.5">
              {(
                [
                  ['free', '0', tr('Miễn phí', 'Free')],
                  ['low', '₫', tr('Dưới 100.000 VND', 'Under 100,000 VND')],
                  ['mid', '₫₫', tr('100.000–300.000 VND', '100,000–300,000 VND')],
                  ['high', '₫₫₫', tr('Trên 300.000 VND', 'Over 300,000 VND')],
                ] as [PriceTier, string, string][]
              ).map(([tier, mark, hint]) => (
                <motion.li key={tier} variants={popItem}>
                  <Coin on={discover.prices.includes(tier)} mark={mark} hint={hint} onClick={() => setDiscover({ prices: toggle<PriceTier>(discover.prices, tier) })} />
                </motion.li>
              ))}
            </ul>
          </div>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-3 md:justify-end">
            <motion.button type="button" role="switch" aria-checked={discover.indoorOnly} onClick={() => setDiscover({ indoorOnly: !discover.indoorOnly })} variants={popItem} whileTap={{ scale: 0.95 }} className={`flex items-center gap-2 border px-3 py-1.5 text-[0.8rem] font-semibold transition-colors ${discover.indoorOnly ? 'border-jade bg-jade/12 text-jade-ink' : 'border-forest/20 text-ink/70 hover:border-terracotta'}`}>
              <motion.span animate={discover.indoorOnly ? { rotate: [0, -14, 10, 0], y: [0, -3, 0] } : { rotate: 0, y: 0 }} transition={{ duration: 0.5 }} className="block">
                <WeatherIcon kind="rain" size={24} />
              </motion.span>
              {tr('Trốn mưa', 'Rain-proof')}
            </motion.button>
            <SortTabs
              value={discover.sort}
              onChange={(sort) => setDiscover({ sort })}
              options={[
                { value: 'relevance', label: tr('Hợp nhất', 'Best match') },
                { value: 'quality', label: tr('Nổi bật', 'Top picks') },
                { value: 'price', label: tr('Giá thấp', 'Lowest price') },
                { value: 'distance', label: tr('Gần nhất', 'Nearest'), disabled: !anchor },
              ]}
            />
          </div>
        </div>
      </motion.section>

      <motion.div variants={block} custom={0.24} initial="hidden" animate="show" className="mb-4 mt-6 flex flex-wrap items-center justify-between gap-2" aria-live="polite">
        <p className="text-sm font-semibold text-ink/70">
          <motion.span key={hits.length} className="inline-block" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: EASE_OUT }}>
            {hits.length}
          </motion.span>{' '}
          {tr('tấm bưu thiếp', 'postcards')}
          {anchor && (
            <motion.span initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={SPRING} className="ml-2 inline-flex items-center gap-1.5 bg-forest/8 px-2.5 py-1 text-xs font-bold text-forest">
              <MapPinned size={13} aria-hidden="true" /> {tr('Quanh', 'Around')} {place.name(anchor.name)} · ≤ 4 km
            </motion.span>
          )}
        </p>
      </motion.div>

      {cityPois.length === 0 && catalog.data === 0 ? (
        <Settle key={`none-${city}`}>
          <EmptyState
            title={tr(`Chưa có địa điểm ở ${cityById[city].name}`, `No places in ${cityById[city].nameEn} yet`)}
            body={tr('Dữ liệu đang được bổ sung, bạn quay lại sau nhé.', 'The data is on its way, check back soon.')}
          />
        </Settle>
      ) : cityPois.length === 0 ? (
        <Settle key={catalog.isError ? 'error' : 'loading'}>
          {catalog.isError ? (
            <EmptyState
              title={tr('Chưa tải được địa điểm', 'Could not load the places')}
              body={tr('Chưa tải được, thử lại nhé.', 'Could not load, try again.')}
              action={
                <button type="button" className="btn-ghost" onClick={() => catalog.refetch()}>
                  {tr('Thử lại', 'Try again')}
                </button>
              }
            />
          ) : (
            <p className="flex items-center gap-2 py-8 text-sm text-ink/60" role="status">
              <Loader2 size={16} className="animate-spin" aria-hidden="true" /> {tr('Đang tải địa điểm…', 'Loading places…')}
            </p>
          )}
        </Settle>
      ) : hits.length === 0 ? (
        <Settle key="none">
          <EmptyState
            title={tr('Không tìm thấy địa điểm nào', 'No places found')}
            body={tr('Thử bỏ bớt bộ lọc xem.', 'Try dropping a filter.')}
            action={
              <button type="button" className="btn-ghost" onClick={() => resetDiscover()}>
                {tr('Đặt lại tìm kiếm', 'Reset search')}
              </button>
            }
          />
        </Settle>
      ) : discover.view === 'map' ? (
        <motion.div key="map" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, ease: EASE_OUT }} className="panel overflow-hidden">
          <RouteMap
            stops={[]}
            className="h-[34rem] w-full"
            fitKey={hits.map((hit) => hit.poi.id).join()}
            center={cityById[city]}
            extras={hits.slice(0, 80).map((hit) => ({ id: hit.poi.id, lat: hit.poi.lat, lng: hit.poi.lng, label: place.name(hit.poi.name), color: categories[hit.poi.cat].color }))}
            onExtraClick={openPoi}
          />
        </motion.div>
      ) : (
        <>
          {canSave && (
            <div className="mb-4 flex justify-end">
              <button type="button" className="btn-ghost btn-sm" onClick={() => openSetChooser(saveable.map((hit) => hit.poi.id))}>
                <ListPlus size={15} aria-hidden="true" /> {tr(`Lưu ${saveable.length} nơi này thành bộ sưu tập`, `Save these ${saveable.length} places as a set`)}
              </button>
            </div>
          )}
          <ul className="relative grid gap-5 sm:grid-cols-2 2xl:grid-cols-3">
            <AnimatePresence mode="popLayout">
              {visible.map((hit, index) => (
                <Postcard key={hit.poi.id} hit={hit} index={index} saved={profile.saved.includes(hit.poi.id)} onToggle={() => toggleSaved(hit.poi.id)} onOpen={() => openPoi(hit.poi.id)} onAddToSet={canSave ? () => openSetChooser([hit.poi.id]) : undefined} />
              ))}
            </AnimatePresence>
          </ul>
          {hits.length > visible.length && (
            <div className="mt-6 flex justify-center">
              <button type="button" className="btn-ghost" onClick={() => setShown({ key: listKey, count: shown.count + PAGE })}>
                {tr(`Xem thêm (còn ${hits.length - visible.length} nơi)`, `Show more (${hits.length - visible.length} left)`)}
              </button>
            </div>
          )}
        </>
      )}
      <PoiSheet />
    </>
  )
}

/** An empty or loading notice that rises in rather than snapping into place. */
function Settle({ children }: { children: ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: 18, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.55, ease: EASE_OUT }}>
      {children}
    </motion.div>
  )
}

function FilterRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="mt-4 grid items-start gap-x-4 gap-y-1.5 sm:grid-cols-[4.5rem_minmax(0,1fr)]">
      <span className="pt-2 text-xs font-semibold text-ink/55">{label}</span>
      {children}
    </div>
  )
}

/** Price as a coin that flips when picked. */
function Coin({ on, mark, hint, onClick }: { on: boolean; mark: string; hint: string; onClick: () => void }) {
  return (
    <motion.button type="button" aria-pressed={on} onClick={onClick} whileTap={{ scale: 0.9 }} className="group flex w-[3.9rem] flex-col items-center gap-1" aria-label={`${mark} ${hint}`}>
      <motion.span
        animate={{ rotateY: on ? 360 : 0, y: on ? -3 : 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 26 }}
        className={`grid size-11 place-items-center rounded-full border-2 text-[0.8rem] font-bold transition-colors ${on ? 'border-forest bg-sun text-forest shadow-[0_6px_0_-2px_rgba(23,63,53,0.35)]' : 'border-forest/30 bg-paper text-ink/60 group-hover:border-terracotta'}`}
        style={{ transformStyle: 'preserve-3d' }}
      >
        {mark}
      </motion.span>
      <span className="text-[0.64rem] font-medium text-ink/55">{hint}</span>
    </motion.button>
  )
}

function SortTabs<T extends string>({ value, onChange, options }: { value: T; onChange: (value: T) => void; options: { value: T; label: string; disabled?: boolean }[] }) {
  const id = useId()
  const { tr } = useTr()
  return (
    <div role="radiogroup" aria-label={tr('Sắp xếp', 'Sort')} className="flex flex-wrap gap-x-4 gap-y-1">
      {options.map((option) => {
        const active = option.value === value
        return (
          <button key={option.value} type="button" role="radio" aria-checked={active} disabled={option.disabled} onClick={() => onChange(option.value)} className={`relative pb-1 text-[0.8rem] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-35 ${active ? 'text-forest' : 'text-ink/55 hover:text-ink'}`}>
            {option.label}
            {active && <motion.span layoutId={`sort-${id}`} className="absolute inset-x-0 bottom-0 h-0.5 bg-terracotta" transition={{ type: 'spring', stiffness: 420, damping: 32 }} />}
          </button>
        )
      })}
    </div>
  )
}

/** A circular postmark: city name running round the rim, category sticker in the middle. */
function Postmark({ city, cat }: { city: string; cat: CategoryId }) {
  const id = useId()
  const { tr } = useTr()
  return (
    <svg viewBox="0 0 80 80" className="postmark" aria-hidden="true">
      <defs>
        <path id={id} d="M40 40m-29 0a29 29 0 1 1 58 0a29 29 0 1 1 -58 0" />
      </defs>
      <circle cx="40" cy="40" r="37" fill="none" stroke="currentColor" strokeWidth="1.6" strokeDasharray="2 3.2" />
      <circle cx="40" cy="40" r="22" fill="none" stroke="currentColor" strokeWidth="1.2" />
      <text fontSize="8.4" fontWeight="700" letterSpacing="1.9" fill="currentColor">
        <textPath href={`#${id}`}>{`${city.toUpperCase()} • ${tr('VIỆT NAM', 'VIETNAM')} • `}</textPath>
      </text>
      <foreignObject x="24" y="24" width="32" height="32">
        <div className="size-full">
          <CategoryIcon cat={cat} size={32} />
        </div>
      </foreignObject>
    </svg>
  )
}

function Postcard({ hit, index, saved, onToggle, onOpen, onAddToSet, ref }: { hit: SearchHit; index: number; saved: boolean; onToggle: () => void; onOpen: () => void; onAddToSet?: () => void; ref?: Ref<HTMLLIElement> }) {
  const { tr, place, language, price } = useTr()
  const vi = language === 'vi'
  const { poi, distanceKm } = hit
  const now = nowMinutes()
  const today = poi.windows ? windowsOn(poi, new Date().getDay()) : []
  const open = today.some(([from, until]) => from <= now && now < until)
  const color = categories[poi.cat].color
  const tier = priceTierOf(poi)
  const [burst, setBurst] = useState(0)

  // Motion stays on the <li>: an inline transform on the card itself would cancel its CSS hover lift.
  return (
    <motion.li
      ref={ref}
      layout="position"
      initial={{ opacity: 0, y: 34, scale: 0.95, rotate: index % 2 ? 1.4 : -1.4 }}
      whileInView={{ opacity: 1, y: 0, scale: 1, rotate: 0 }}
      viewport={{ once: true, margin: '0px 0px -6% 0px' }}
      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.18, ease: [0.4, 0, 1, 1] } }}
      transition={{ duration: 0.65, ease: EASE_OUT, delay: index < 9 ? index * 0.05 : (index % 3) * 0.05, layout: { type: 'spring', stiffness: 300, damping: 32 } }}
    >
      <div className="postcard group relative h-full" style={{ ['--pc' as string]: color }}>
        <button type="button" onClick={onOpen} className="flex h-full w-full flex-col text-left">
          <span className="postcard-art relative block h-36 overflow-hidden">
            <span className="postcard-scene absolute inset-0 block">
              <PlaceImage poi={poi} />
            </span>
            <svg viewBox="0 0 320 128" preserveAspectRatio="none" className="absolute inset-0 size-full" aria-hidden="true">
              <path className="postcard-route" d="M-6 112C54 52 96 118 150 78S244 30 330 70" fill="none" stroke="#fffaf0" strokeWidth="2.4" strokeLinecap="round" strokeDasharray="1 9" />
            </svg>
            <span className="postcard-icon absolute bottom-2 left-3 grid size-14 place-items-center rounded-full border-2 border-[#173f35] bg-[#fbf5e6] text-[#173f35] shadow-[3px_3px_0_rgba(23,63,53,0.25)]">
              <CategoryIcon cat={poi.cat} size={42} />
            </span>
            <span className="absolute right-2 top-2 rounded-full bg-[#fbf5e6]/88 text-[#173f35]/85 shadow-[0_1px_6px_rgba(13,40,34,0.25)]">
              <Postmark city={vi ? cityById[poi.city].name : cityById[poi.city].nameEn} cat={poi.cat} />
            </span>
          </span>

          <span className="flex flex-1 flex-col p-4 pt-3.5">
            <span className="h-display block text-[1.18rem] leading-tight text-forest">{place.name(poi.name)}</span>
            <span className="mt-1 block text-xs font-medium text-ink/55">
              <CategoryName cat={poi.cat} /> · {place.area(poi.area)}
              {distanceKm !== undefined && ` · ${distanceKm.toFixed(1)} km`}
            </span>

            <span className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-dashed border-forest/25 pt-3 text-xs">
              <span className="tabular font-semibold text-ink/80">
                {price(poi)}
              </span>
              <span className="ml-auto inline-flex items-center gap-1 text-[0.66rem] font-bold tracking-wider">
                {tier && tier !== 'free' && <span className="text-sun-ink">{{ low: '₫', mid: '₫₫', high: '₫₫₫' }[tier]}</span>}
                <span className={`border px-1.5 py-0.5 ${open ? 'border-jade-ink/60 text-jade-ink' : 'border-ink/20 text-ink/45'}`}>{open ? tr('ĐANG MỞ', 'OPEN') : !poi.windows ? tr('CHƯA RÕ GIỜ', 'HOURS UNKNOWN') : today.length ? today.map(([from, until]) => `${fmtTime(from)}–${fmtTime(until)}`).join(', ') : tr('NGHỈ HÔM NAY', 'CLOSED TODAY')}</span>
              </span>
            </span>
          </span>
        </button>

        <motion.button
          type="button"
          onClick={() => {
            if (!saved) setBurst((count) => count + 1)
            onToggle()
          }}
          whileTap={{ scale: 0.85 }}
          aria-pressed={saved}
          aria-label={saved ? tr('Bỏ yêu thích', 'Remove favourite') : tr('Yêu thích', 'Favourite')}
          className={`absolute left-2 top-2 grid size-10 place-items-center rounded-full bg-paper/85 backdrop-blur-sm transition-colors ${saved ? 'text-terracotta' : 'text-ink/40 hover:text-terracotta'}`}
        >
          <motion.span animate={saved ? { scale: [1, 1.5, 1], rotate: [0, -14, 0] } : { scale: 1 }} transition={{ duration: 0.4 }}>
            <Heart size={18} fill={saved ? 'currentColor' : 'none'} />
          </motion.span>
          {burst > 0 && <HeartBurst key={burst} />}
        </motion.button>
        {onAddToSet && (
          <motion.button
            type="button"
            onClick={onAddToSet}
            whileTap={{ scale: 0.85 }}
            aria-label={tr('Lưu vào bộ sưu tập', 'Save to a set')}
            title={tr('Lưu vào bộ sưu tập', 'Save to a set')}
            className="absolute left-14 top-2 grid size-10 place-items-center rounded-full bg-paper/85 text-ink/50 backdrop-blur-sm transition-colors hover:text-lapis"
          >
            <FolderPlus size={18} />
          </motion.button>
        )}
      </div>
    </motion.li>
  )
}
