import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useIsFetching } from '@tanstack/react-query'
import { AnimatePresence, motion, type Variants } from 'motion/react'
import { ArrowUpRight, Check, FolderPlus, Heart, Layers, Route, Sparkles, Trash2, X } from 'lucide-react'
import { track } from '../../api/analytics'
import type { PoiSet } from '../../api/poiSets'
import { readProfile } from '../../api/profile'
import { useDeleteSet, useProfile, useRestoreSet, useSets } from '../../api/queries'
import { ModuleGate } from '../../components/ModuleGate'
import { EASE_OUT } from '../../components/motion/variants'
import { PageHeader } from '../../components/PageHeader'
import { PlaceImage } from '../../components/place/PlaceImage'
import { ConfirmSheet } from '../../components/ui/ConfirmSheet'
import { DeviceOnlyNote } from '../../components/ui/DeviceOnlyNote'
import { EmptyState, LoadError, Skeleton } from '../../components/ui/primitives'
import { citiesOf, journeyRoute, mergedPlaces } from '../../domain/journey'
import { poiById } from '../../domain/pois'
import { formatDate } from '../../domain/time'
import { useTr } from '../../hooks/useTr'
import { useAuthStore } from '../../store/authStore'
import { toast } from '../../store/toastStore'

const grid: Variants = { hidden: {}, show: { transition: { delayChildren: (i: number) => Math.min(i, 8) * 0.06 } } }
const card: Variants = {
  hidden: { opacity: 0, y: 26, scale: 0.97 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.55, ease: EASE_OUT } },
  exit: { opacity: 0, scale: 0.94, transition: { duration: 0.16 } },
}

/** UC 1.11 "View POI set list", with delete (UC 1.12) and the way into create (UC 1.13/1.14). */
export function SetsPage() {
  return (
    <ModuleGate id="sets">
      <Sets />
    </ModuleGate>
  )
}

function Sets() {
  const { tr, language } = useTr()
  const user = useAuthStore((state) => state.user)!
  const sets = useSets()
  const profile = useProfile().data ?? readProfile(user.id, user.name)
  const remove = useDeleteSet()
  const restore = useRestoreSet()
  const [deleting, setDeleting] = useState<PoiSet | null>(null)
  const navigate = useNavigate()
  // Several sets picked to be merged into one trip, in the order they were ticked
  const [merging, setMerging] = useState(false)
  const [chosen, setChosen] = useState<string[]>([])
  // The covers come from the loaded places; re-render once a city's places arrive
  useIsFetching({ queryKey: ['catalog'] })

  const confirmDelete = () => {
    if (!deleting) return
    const set = deleting
    remove.mutate(set.id, {
      onSuccess: () => {
        track({ type: 'set_deleted', detail: `${set.poiIds.length}` })
        setDeleting(null)
        toast('info', tr(`Đã xoá “${set.name}”`, `Deleted “${set.name}”`), undefined, { label: tr('Hoàn tác', 'Undo'), run: () => restore.mutate(set.id) })
      },
    })
  }

  const list = sets.data ?? []
  const options = [{ id: 'favourites', name: tr('Yêu thích', 'Favourites'), poiIds: profile.saved }, ...list.map((set) => ({ id: set.id, name: set.name, poiIds: set.poiIds }))]
  const picked = chosen.map((id) => options.find((option) => option.id === id)).filter((option) => option !== undefined)
  const merged = mergedPlaces(picked.map((option) => option.poiIds))
  const mergedCities = citiesOf(merged)
  const toggle = (id: string) => setChosen((current) => (current.includes(id) ? current.filter((entry) => entry !== id) : [...current, id]))
  const stopMerging = () => {
    setMerging(false)
    setChosen([])
  }
  const planMerged = () => {
    navigate('/app/plan', { state: { poiIds: merged, setName: picked.map((option) => option.name).join(' + ') } })
  }

  return (
    <>
      <PageHeader
        title={tr('Bộ sưu tập', 'My sets')}
        subtitle={tr('Gom các nơi bạn thích thành từng bộ, rồi dùng một bộ để lên lịch trình.', 'Group the places you like into sets, then plan a trip from one.')}
        actions={
          merging ? (
            <button type="button" className="btn-ghost btn-sm" onClick={stopMerging}>
              <X size={15} aria-hidden="true" /> {tr('Thôi gộp', 'Cancel merge')}
            </button>
          ) : (
            <>
              {options.filter((option) => option.poiIds.length).length >= 2 && (
                <button type="button" className="btn-ghost btn-sm" onClick={() => setMerging(true)}>
                  <Layers size={15} aria-hidden="true" /> {tr('Gộp thành một chuyến', 'Merge into one trip')}
                </button>
              )}
              <Link to="/app/sets/new" className="btn-gold btn-sm">
                <FolderPlus size={15} aria-hidden="true" /> {tr('Tạo bộ sưu tập', 'New set')}
              </Link>
            </>
          )
        }
      />
      <DeviceOnlyNote feature="poi-sets" className="-mt-4 mb-5" />
      {merging && (
        <p className="-mt-2 mb-5 text-sm text-ink/70">
          {tr('Chọn các bộ muốn gộp. Điểm trùng chỉ tính một lần; nếu các điểm ở nhiều thành phố, chuyến đi chia thành từng chặng theo ngày.', 'Pick the sets to merge. A place in two sets counts once; places in several cities make a journey with one leg per city, day by day.')}
        </p>
      )}

      <AnimatePresence>
        {merging && (
          <motion.div
            className="sticky top-[4.5rem] z-20 mb-5"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.22, ease: EASE_OUT }}
            role="region"
            aria-label={tr('Gộp bộ sưu tập', 'Merge sets')}
          >
            {/* The sticky wrapper is separate because `.panel` sets position: relative, which beats `sticky` */}
            <div className="merge-bar panel flex flex-wrap items-center gap-3 px-4 py-3">
            <p className="min-w-0 flex-1 text-sm text-ink/80">
              <strong className="tabular text-ink">{tr(`Đã chọn ${picked.length} bộ · ${merged.length} điểm`, `${picked.length} sets · ${merged.length} places`)}</strong>
              {mergedCities.length > 1 && <span className="block text-xs text-ink/60">{tr('Hành trình', 'Journey')}: {journeyRoute(mergedCities, language)}</span>}
            </p>
            <button type="button" className="btn-gold btn-sm" disabled={picked.length < 2 || !merged.length} onClick={planMerged}>
              <Route size={15} aria-hidden="true" /> {tr('Lập một chuyến đi', 'Plan one trip')}
            </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {sets.isLoading ? (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-56" />
          ))}
        </div>
      ) : (
        <motion.ul className="grid gap-5 md:grid-cols-2 xl:grid-cols-3" variants={grid} initial="hidden" animate="show">
          <motion.li variants={card}>
            <SetCard to="/app/sets/favourites" name={tr('Yêu thích', 'Favourites')} poiIds={profile.saved} favourite selecting={merging} selected={chosen.includes('favourites')} onToggle={() => toggle('favourites')} />
          </motion.li>
          <AnimatePresence mode="popLayout">
            {list.map((set) => (
              <motion.li key={set.id} layout variants={card} exit="exit">
                <SetCard to={`/app/sets/${set.id}`} name={set.name} description={set.description} poiIds={set.poiIds} updatedAt={set.updatedAt} onDelete={() => setDeleting(set)} selecting={merging} selected={chosen.includes(set.id)} onToggle={() => toggle(set.id)} />
              </motion.li>
            ))}
          </AnimatePresence>
        </motion.ul>
      )}

      {sets.isError ? (
        <div className="mt-6">
          <LoadError onRetry={() => sets.refetch()} />
        </div>
      ) : !sets.isLoading && list.length === 0 && (
        <div className="mt-6">
          <EmptyState
            title={tr('Chưa có bộ sưu tập nào', 'No sets yet')}
            body={tr('Lưu nơi bạn thích từ Khám phá hoặc từ gợi ý, hoặc tự chọn từng nơi.', 'Save places from Discover or from a recommendation, or pick them one by one.')}
            action={
              <div className="flex flex-wrap justify-center gap-2">
                <Link to="/app/recommend" className="btn-gold">
                  <Sparkles size={16} aria-hidden="true" /> {tr('Nhận gợi ý', 'Get recommendations')}
                </Link>
                <Link to="/app/sets/new" className="btn-ghost">
                  {tr('Tự tạo bộ sưu tập', 'Build one by hand')}
                </Link>
              </div>
            }
          />
        </div>
      )}


      <ConfirmSheet
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        busy={remove.isPending}
        danger
        title={tr('Xoá bộ sưu tập này?', 'Delete this set?')}
        description={tr('Các địa điểm vẫn còn trong Khám phá; chỉ bộ sưu tập bị xoá. Bạn có thể hoàn tác ngay sau đó.', 'The places stay in Discover; only the set goes. You can undo right after.')}
        confirmLabel={tr('Xoá', 'Delete')}
      >
        <p className="text-sm font-semibold text-ink">{deleting?.name}</p>
      </ConfirmSheet>
    </>
  )
}

function SetCard({ to, name, description, poiIds, updatedAt, favourite, onDelete, selecting, selected, onToggle }: { to: string; name: string; description?: string; poiIds: string[]; updatedAt?: string; favourite?: boolean; onDelete?: () => void; selecting?: boolean; selected?: boolean; onToggle?: () => void }) {
  const { tr, locale } = useTr()
  const covers = poiIds.map((id) => poiById[id]).filter(Boolean).slice(0, 3)
  const body = (
    <>
        <div className="relative grid h-32 grid-cols-3 gap-0.5 overflow-hidden bg-forest/10">
          {covers.length === 0 ? (
            <span className="col-span-3 grid place-items-center text-ink/35">{favourite ? <Heart size={30} aria-hidden="true" /> : <FolderPlus size={30} aria-hidden="true" />}</span>
          ) : (
            covers.map((poi, index) => (
              <span key={poi.id} className={`relative block overflow-hidden ${covers.length === 1 ? 'col-span-3' : covers.length === 2 && index === 0 ? 'col-span-2' : ''}`}>
                <PlaceImage poi={poi} />
              </span>
            ))
          )}
          <ArrowUpRight size={20} className="absolute right-3 top-3 text-paper drop-shadow transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden="true" />
        </div>
        <div className="p-4">
          <h2 className="h-display flex items-center gap-2 text-[1.2rem] text-forest">
            {favourite && <Heart size={16} className="text-terracotta" fill="currentColor" aria-hidden="true" />}
            <span className="truncate">{name}</span>
          </h2>
          {description && <p className="mt-1 line-clamp-2 text-xs text-ink/60">{description}</p>}
          <p className="tabular mt-2 text-xs text-ink/55">
            {poiIds.length} {tr('địa điểm', 'places')}
            {updatedAt && ` · ${tr('cập nhật', 'updated')} ${formatDate(updatedAt.slice(0, 10), locale, { day: 'numeric', month: 'short' })}`}
          </p>
        </div>
    </>
  )
  return (
    <article className={`panel group relative h-full overflow-hidden transition-shadow ${selected ? 'ring-[3px] ring-gold' : ''}`}>
      {selecting ? (
        <button type="button" className="block w-full text-left disabled:cursor-not-allowed disabled:opacity-50" aria-pressed={selected} disabled={!poiIds.length} onClick={onToggle} aria-label={tr(`Chọn ${name} để gộp`, `Pick ${name} to merge`)}>
          {body}
          <span className={`absolute left-3 top-3 grid size-7 place-items-center rounded-full border-2 transition-colors ${selected ? 'border-gold bg-gold text-night' : 'border-paper bg-night/35 text-transparent'}`} aria-hidden="true">
            <Check size={15} strokeWidth={3} />
          </span>
        </button>
      ) : (
        <Link to={to} className="block" aria-label={name}>
          {body}
        </Link>
      )}
      {onDelete && !selecting && (
        <button type="button" onClick={onDelete} className="absolute bottom-3 right-3 grid size-9 place-items-center text-ink/40 transition-colors hover:text-pomegranate" aria-label={tr(`Xoá ${name}`, `Delete ${name}`)}>
          <Trash2 size={16} />
        </button>
      )}
    </article>
  )
}
