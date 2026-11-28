import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { useMoveLink } from '../../app/pageTransition'
import { useIsFetching } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowDown, ArrowLeft, ArrowUp, FolderPlus, Heart, Loader2, Plus, Save, Sparkles, Trash2, X } from 'lucide-react'
import { track } from '../../api/analytics'
import { SET_MAX_ITEMS, SET_NAME_MAX } from '../../api/poiSets'
import { readProfile } from '../../api/profile'
import { useAddToSet, useCreateSet, useDeleteSet, useProfile, useRemoveFromSet, useRestoreSet, useSaveProfile, useSet, useUpdateSet } from '../../api/queries'
import { ModuleGate } from '../../components/ModuleGate'
import { EASE_OUT } from '../../components/motion/variants'
import { PageHeader } from '../../components/PageHeader'
import { PoiSheet } from '../../components/place/PoiSheet'
import { PoiPicker } from '../../components/sets/PoiPicker'
import { ConfirmSheet } from '../../components/ui/ConfirmSheet'
import { DeviceOnlyNote } from '../../components/ui/DeviceOnlyNote'
import { CategoryGlyph, EmptyState, LoadError, Skeleton } from '../../components/ui/primitives'
import { isNotFound } from '../../api/errorText'
import { poiById } from '../../domain/pois'
import { useTr } from '../../hooks/useTr'
import { useAuthStore } from '../../store/authStore'
import { toast } from '../../store/toastStore'
import { useUiStore } from '../../store/uiStore'

const INPUT = 'h-11 w-full border border-forest/25 bg-white px-3 text-sm outline-none transition-colors focus:border-terracotta'

/** `/app/sets/new` builds a set by hand (UC 1.14), `/app/sets/favourites` is the heart list, any other id is a saved set. */
export function SetPage() {
  const { id } = useParams()
  return <ModuleGate id="sets">{id === 'new' ? <SetBuilder /> : id === 'favourites' ? <Favourites /> : <SavedSet id={id!} />}</ModuleGate>
}

/**
 * One place in a set: open its details, move it, take it out. Only places this browser has loaded can be drawn; the list re-renders
 * when a city's places arrive, and moves swap two shown places inside the whole list, so places not loaded keep their spot.
 */
function PlaceList({ poiIds, onMove, onRemove }: { poiIds: string[]; onMove?: (next: string[]) => void; onRemove: (poiId: string) => void }) {
  const { tr, place } = useTr()
  const openPoi = useUiStore((state) => state.openPoi)
  const loading = useIsFetching({ queryKey: ['catalog'] }) > 0
  const known = poiIds.filter((poiId) => poiById[poiId])
  const hidden = poiIds.length - known.length
  const move = (index: number, dir: -1 | 1) => onMove?.(swapped(poiIds, known[index], known[index + dir]))
  const note = hidden > 0 && (
    <p className="py-3 text-center text-xs text-ink/55">
      {loading ? tr('Đang tải thêm địa điểm…', 'Loading more places…') : tr(`${hidden} nơi chưa tải được trên máy này.`, `${hidden} places are not loaded on this device.`)}
    </p>
  )
  if (!known.length) return note || <p className="py-6 text-center text-sm text-ink/55">{tr('Chưa có địa điểm nào. Bấm “Thêm địa điểm” để chọn.', 'No places yet. Tap “Add places” to pick some.')}</p>
  return (
    <>
      <ol className="space-y-2">
        <AnimatePresence initial={false}>
          {known.map((poiId, index) => {
            const poi = poiById[poiId]
            return (
              <motion.li key={poiId} layout initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0, transition: { duration: 0.35, ease: EASE_OUT } }} exit={{ opacity: 0, transition: { duration: 0.12 } }} className="panel flex items-center gap-3 p-2.5">
                <span className="tabular w-6 shrink-0 text-center text-xs font-bold text-ink/45">{index + 1}</span>
                <CategoryGlyph cat={poi.cat} size={36} />
                <button type="button" onClick={() => openPoi(poiId)} className="min-w-0 flex-1 text-left">
                  <span className="block truncate text-sm font-semibold hover:underline">{place.name(poi.name)}</span>
                  <span className="block truncate text-xs text-ink/55">{place.blurb(poi)}</span>
                </button>
                {onMove && (
                  <span className="flex shrink-0 flex-col">
                    <button type="button" disabled={index === 0} onClick={() => move(index, -1)} className="grid h-5 w-8 place-items-center text-ink/40 hover:text-lapis disabled:opacity-25" aria-label={tr('Chuyển lên', 'Move up')}>
                      <ArrowUp size={14} />
                    </button>
                    <button type="button" disabled={index === known.length - 1} onClick={() => move(index, 1)} className="grid h-5 w-8 place-items-center text-ink/40 hover:text-lapis disabled:opacity-25" aria-label={tr('Chuyển xuống', 'Move down')}>
                      <ArrowDown size={14} />
                    </button>
                  </span>
                )}
                <button type="button" onClick={() => onRemove(poiId)} className="grid size-9 shrink-0 place-items-center text-ink/40 transition-colors hover:text-pomegranate" aria-label={tr(`Bỏ ${place.name(poi.name)}`, `Remove ${place.name(poi.name)}`)}>
                  <X size={16} />
                </button>
              </motion.li>
            )
          })}
        </AnimatePresence>
      </ol>
      {note}
    </>
  )
}

/** The list with two places traded. */
const swapped = (list: string[], a: string, b: string) => list.map((id) => (id === a ? b : id === b ? a : id))

/** UC 2.19 starts here too: the plan page reads the places from router state. */
function PlanFromButton({ poiIds, name }: { poiIds: string[]; name: string }) {
  const { tr } = useTr()
  const navigate = useNavigate()
  return (
    <button type="button" className="btn-gold btn-sm" disabled={!poiIds.length} onClick={() => navigate('/app/plan', { state: { poiIds, setName: name } })}>
      <Sparkles size={15} aria-hidden="true" /> {tr('Lên lịch trình từ bộ này', 'Plan a trip from this set')}
    </button>
  )
}

function BackLink() {
  const { tr } = useTr()
  const go = useMoveLink()
  return (
    <Link to="/app/sets" onClick={go('/app/sets', 'back')} className="inline-flex items-center gap-1.5 hover:underline">
      <ArrowLeft size={14} aria-hidden="true" /> {tr('Bộ sưu tập', 'My sets')}
    </Link>
  )
}

function SavedSet({ id }: { id: string }) {
  const { tr } = useTr()
  const navigate = useNavigate()
  const query = useSet(id)
  const update = useUpdateSet()
  const add = useAddToSet()
  const removeItem = useRemoveFromSet()
  const remove = useDeleteSet()
  const restore = useRestoreSet()
  const [picking, setPicking] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const set = query.data

  if (query.isLoading) return <Skeleton className="h-96" />
  if (!set && query.isError && !isNotFound(query.error)) return <LoadError onRetry={() => query.refetch()} />
  if (!set) {
    return (
      <EmptyState
        title={tr('Không tìm thấy bộ sưu tập', 'Set not found')}
        body={tr('Có thể nó đã bị xoá.', 'It may have been deleted.')}
        action={
          <Link to="/app/sets" className="btn-gold">
            {tr('Về bộ sưu tập', 'Back to my sets')}
          </Link>
        }
      />
    )
  }

  // A name or note the server turned down goes back to the saved one, so the page never shows text that was not kept
  const rename = (input: HTMLInputElement) => {
    const name = input.value.trim()
    if (!name) input.value = set.name
    else if (name !== set.name) update.mutate({ id: set.id, name }, { onError: () => (input.value = set.name) })
  }
  const describe = (input: HTMLTextAreaElement) => {
    if (input.value.trim() !== set.description) update.mutate({ id: set.id, description: input.value }, { onError: () => (input.value = set.description) })
  }
  const takeOut = (poiId: string) => {
    const before = set.poiIds
    removeItem.mutate({ id: set.id, poiId }, { onSuccess: () => toast('info', tr('Đã bỏ khỏi bộ sưu tập', 'Removed from the set'), undefined, { label: tr('Hoàn tác', 'Undo'), run: () => update.mutate({ id: set.id, poiIds: before }) }) })
  }

  return (
    <>
      <PageHeader
        kicker={<BackLink />}
        title={set.name}
        titleNode={
          <input
            key={set.name}
            defaultValue={set.name}
            maxLength={SET_NAME_MAX}
            aria-label={tr('Đổi tên bộ sưu tập', 'Rename the set')}
            onBlur={(event) => rename(event.target)}
            onKeyDown={(event) => event.key === 'Enter' && (event.target as HTMLInputElement).blur()}
            className="h-display w-full min-w-[12rem] max-w-[40rem] border-b border-transparent bg-transparent outline-none transition-colors hover:border-forest/25 focus:border-gold"
          />
        }
        actions={
          <>
            <button type="button" className="btn-ghost btn-sm !text-pomegranate" onClick={() => setConfirm(true)} aria-label={tr('Xoá bộ sưu tập', 'Delete the set')}>
              <Trash2 size={15} aria-hidden="true" />
            </button>
            <PlanFromButton poiIds={set.poiIds} name={set.name} />
          </>
        }
      />
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <section className="panel p-4 sm:p-5" aria-label={tr('Các địa điểm', 'Places')}>
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-sm font-bold text-ink">
              {set.poiIds.length} {tr('địa điểm', 'places')}
            </h2>
            <button type="button" className="btn-ghost btn-sm" onClick={() => setPicking(true)} disabled={set.poiIds.length >= SET_MAX_ITEMS}>
              <Plus size={15} aria-hidden="true" /> {tr('Thêm địa điểm', 'Add places')}
            </button>
          </div>
          <PlaceList poiIds={set.poiIds} onMove={(poiIds) => update.mutate({ id: set.id, poiIds })} onRemove={takeOut} />
        </section>
        <aside className="panel space-y-3 p-5">
          <label htmlFor="set-description" className="block text-[0.8rem] font-semibold text-ink/75">
            {tr('Ghi chú', 'Note')}
          </label>
          <textarea
            id="set-description"
            key={set.description}
            defaultValue={set.description}
            rows={4}
            maxLength={300}
            onBlur={(event) => describe(event.target)}
            placeholder={tr('Bộ này để làm gì? Ví dụ: đi với bạn bè cuối tuần.', 'What is this set for? e.g. a weekend with friends.')}
            className="w-full resize-none border border-forest/25 bg-white px-3 py-2 text-sm outline-none focus:border-terracotta"
          />
          <DeviceOnlyNote feature="poi-sets" />
        </aside>
      </div>
      <PoiPicker
        open={picking}
        onClose={() => setPicking(false)}
        title={tr(`Thêm vào “${set.name}”`, `Add to “${set.name}”`)}
        exclude={set.poiIds}
        confirmLabel={(n) => tr(`Thêm ${n} nơi`, `Add ${n} places`)}
        onConfirm={(poiIds) => add.mutate({ id: set.id, poiIds }, { onSuccess: () => toast('success', tr(`Đã thêm ${poiIds.length} nơi`, `Added ${poiIds.length} places`)) })}
      />
      <ConfirmSheet
        open={confirm}
        onClose={() => setConfirm(false)}
        busy={remove.isPending}
        danger
        title={tr('Xoá bộ sưu tập này?', 'Delete this set?')}
        description={tr('Các địa điểm vẫn còn trong Khám phá. Bạn có thể hoàn tác ngay sau đó.', 'The places stay in Discover. You can undo right after.')}
        confirmLabel={tr('Xoá', 'Delete')}
        onConfirm={() =>
          remove.mutate(set.id, {
            onSuccess: () => {
              track({ type: 'set_deleted', detail: `${set.poiIds.length}` })
              navigate('/app/sets', { replace: true })
              toast('info', tr(`Đã xoá “${set.name}”`, `Deleted “${set.name}”`), undefined, { label: tr('Hoàn tác', 'Undo'), run: () => restore.mutate(set.id) })
            },
          })
        }
      >
        <p className="text-sm font-semibold text-ink">{set.name}</p>
      </ConfirmSheet>
      <PoiSheet />
    </>
  )
}

function Favourites() {
  const { tr } = useTr()
  const user = useAuthStore((state) => state.user)!
  const profile = useProfile().data ?? readProfile(user.id, user.name)
  const save = useSaveProfile()
  const openSetChooser = useUiStore((state) => state.openSetChooser)
  const [picking, setPicking] = useState(false)
  return (
    <>
      <PageHeader
        kicker={<BackLink />}
        title={tr('Yêu thích', 'Favourites')}
        titleNode={
          <span className="flex items-center gap-2">
            <Heart size={26} className="text-terracotta" fill="currentColor" aria-hidden="true" /> {tr('Yêu thích', 'Favourites')}
          </span>
        }
        subtitle={tr('Những nơi bạn thả tim. Lưu cả danh sách thành một bộ có tên khi cần.', 'The places you hearted. Save the whole list as a named set when you need one.')}
        actions={
          <>
            <button type="button" className="btn-ghost btn-sm" disabled={!profile.saved.length} onClick={() => openSetChooser(profile.saved)}>
              <FolderPlus size={15} aria-hidden="true" /> {tr('Lưu thành bộ', 'Save as a set')}
            </button>
            <PlanFromButton poiIds={profile.saved} name={tr('Yêu thích', 'Favourites')} />
          </>
        }
      />
      <section className="panel p-4 sm:p-5">
        <div className="mb-4 flex justify-end">
          <button type="button" className="btn-ghost btn-sm" onClick={() => setPicking(true)}>
            <Plus size={15} aria-hidden="true" /> {tr('Thêm địa điểm', 'Add places')}
          </button>
        </div>
        <PlaceList poiIds={profile.saved} onMove={(saved) => save.mutate({ ...profile, saved })} onRemove={(poiId) => save.mutate({ ...profile, saved: profile.saved.filter((entry) => entry !== poiId) })} />
      </section>
      <PoiPicker open={picking} onClose={() => setPicking(false)} title={tr('Thêm vào Yêu thích', 'Add to favourites')} exclude={profile.saved} onConfirm={(poiIds) => save.mutate({ ...profile, saved: [...profile.saved, ...poiIds] })} />
      <PoiSheet />
    </>
  )
}

/** UC 1.14 "Create POI set by hand": name it, add places one by one (UC 1.15), order them, then save. */
function SetBuilder() {
  const { tr } = useTr()
  const navigate = useNavigate()
  const create = useCreateSet()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [poiIds, setPoiIds] = useState<string[]>([])
  const [picking, setPicking] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!name.trim()) return setError(tr('Đặt tên cho bộ sưu tập nhé.', 'Give the set a name.'))
    setError(null)
    create.mutate(
      { name, description, poiIds },
      {
        onSuccess: (set) => {
          if (typeof set === 'string') return
          track({ type: 'set_created', detail: `${set.poiIds.length}` })
          toast('success', tr('Đã tạo bộ sưu tập', 'Set created'), set.name)
          navigate(`/app/sets/${set.id}`, { replace: true })
        },
      },
    )
  }

  return (
    <form onSubmit={submit} noValidate>
      <PageHeader
        kicker={<BackLink />}
        title={tr('Bộ sưu tập mới', 'New set')}
        actions={
          <>
            <button type="button" className="btn-ghost btn-sm" onClick={() => navigate('/app/sets')}>
              {tr('Huỷ', 'Cancel')}
            </button>
            <button type="submit" className="btn-gold btn-sm" disabled={create.isPending}>
              {create.isPending ? <Loader2 size={15} className="animate-spin" aria-hidden="true" /> : <Save size={15} aria-hidden="true" />} {tr('Lưu bộ sưu tập', 'Save set')}
            </button>
          </>
        }
      />
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <section className="panel space-y-4 p-5">
          <div>
            <label htmlFor="builder-name" className="block text-[0.8rem] font-semibold text-ink/75">
              {tr('Tên bộ sưu tập', 'Set name')}
            </label>
            <input id="builder-name" value={name} maxLength={SET_NAME_MAX} onChange={(event) => setName(event.target.value)} aria-invalid={!!error} aria-describedby="builder-name-error" className={`mt-1.5 ${INPUT}`} placeholder={tr('Ví dụ: Ăn vặt Quận 3', 'e.g. District 3 street food')} />
            <p id="builder-name-error" className="mt-1 min-h-4 text-xs text-pomegranate" aria-live="polite">
              {error}
            </p>
          </div>
          <div>
            <label htmlFor="builder-description" className="block text-[0.8rem] font-semibold text-ink/75">
              {tr('Ghi chú (không bắt buộc)', 'Note (optional)')}
            </label>
            <textarea id="builder-description" rows={3} maxLength={300} value={description} onChange={(event) => setDescription(event.target.value)} className="mt-1.5 w-full resize-none border border-forest/25 bg-white px-3 py-2 text-sm outline-none focus:border-terracotta" />
          </div>
          <DeviceOnlyNote feature="poi-sets" />
        </section>
        <section className="panel p-4 sm:p-5" aria-label={tr('Các địa điểm đã chọn', 'Chosen places')}>
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-sm font-bold text-ink">
              {poiIds.length} {tr('địa điểm', 'places')}
            </h2>
            <button type="button" className="btn-ghost btn-sm" onClick={() => setPicking(true)} disabled={poiIds.length >= SET_MAX_ITEMS}>
              <Plus size={15} aria-hidden="true" /> {tr('Thêm địa điểm', 'Add places')}
            </button>
          </div>
          <PlaceList poiIds={poiIds} onMove={setPoiIds} onRemove={(poiId) => setPoiIds((list) => list.filter((entry) => entry !== poiId))} />
        </section>
      </div>
      <PoiPicker open={picking} onClose={() => setPicking(false)} title={tr('Chọn địa điểm', 'Pick places')} exclude={poiIds} onConfirm={(ids) => setPoiIds((list) => [...list, ...ids.filter((id) => !list.includes(id))])} />
      <PoiSheet />
    </form>
  )
}
