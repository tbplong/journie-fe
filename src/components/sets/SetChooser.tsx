import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { Check, FolderPlus, Loader2, Plus } from 'lucide-react'
import { track } from '../../api/analytics'
import { SET_NAME_MAX } from '../../api/poiSets'
import { useAddToSet, useCreateSet, useRemoveFromSet, useSets } from '../../api/queries'
import { poiById } from '../../domain/pois'
import { useTr } from '../../hooks/useTr'
import { toast } from '../../store/toastStore'
import { useUiStore } from '../../store/uiStore'
import { DeviceOnlyNote } from '../ui/DeviceOnlyNote'
import { Sheet } from '../ui/Sheet'

/**
 * UC 1.16 "Choose POI to add to set" and UC 1.6 "Save POI list": pick the sets the place (or the whole list) goes in, or start a new
 * set right here. Mounted once in the app shell and opened through `openSetChooser`.
 */
export function SetChooser() {
  const { tr, place } = useTr()
  const poiIds = useUiStore((state) => state.setChooser)
  const close = useUiStore((state) => state.openSetChooser)
  const sets = useSets()
  const add = useAddToSet()
  const remove = useRemoveFromSet()
  const create = useCreateSet()
  const [name, setName] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)

  const ids = poiIds ?? []
  const single = ids.length === 1
  const label = single ? place.name(poiById[ids[0]]?.name ?? '') : tr(`${ids.length} địa điểm`, `${ids.length} places`)

  const toggle = (setId: string, setName: string, has: boolean) => {
    setBusyId(setId)
    const done = () => setBusyId(null)
    if (has && single) {
      remove.mutate({ id: setId, poiId: ids[0] }, { onSuccess: () => toast('info', tr(`Đã bỏ khỏi “${setName}”`, `Removed from “${setName}”`)), onSettled: done })
    } else {
      add.mutate(
        { id: setId, poiIds: ids },
        {
          onSuccess: () => {
            track({ type: 'poi_saved', poiId: single ? ids[0] : undefined, detail: `set:${ids.length}` })
            toast('success', tr(`Đã lưu vào “${setName}”`, `Saved to “${setName}”`), label)
          },
          onSettled: done,
        },
      )
    }
  }

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!name.trim()) return
    create.mutate(
      { name, poiIds: ids },
      {
        onSuccess: (set) => {
          track({ type: 'set_created', detail: `${ids.length}` })
          toast('success', tr('Đã tạo bộ sưu tập', 'Set created'), typeof set === 'string' ? undefined : `${set.name} · ${label}`)
          setName('')
        },
      },
    )
  }

  return (
    <Sheet open={!!poiIds} onClose={() => close(null)} placement="center" width="max-w-md" title={tr('Lưu vào bộ sưu tập', 'Save to a set')} description={label}>
      {sets.isLoading ? (
        <p className="flex items-center gap-2 text-sm text-ink/60">
          <Loader2 size={15} className="animate-spin" aria-hidden="true" /> {tr('Đang tải…', 'Loading…')}
        </p>
      ) : sets.isError ? (
        <p role="alert" className="text-sm text-pomegranate">
          {tr('Chưa tải được bộ sưu tập của bạn.', 'Could not load your sets.')}{' '}
          <button type="button" className="font-semibold underline" onClick={() => sets.refetch()}>
            {tr('Thử lại', 'Try again')}
          </button>
        </p>
      ) : (sets.data ?? []).length === 0 ? (
        <p className="text-sm text-ink/60">{tr('Bạn chưa có bộ sưu tập nào. Tạo cái đầu tiên ngay dưới đây.', 'No sets yet. Make the first one below.')}</p>
      ) : (
        <ul className="space-y-1.5" aria-label={tr('Bộ sưu tập của bạn', 'Your sets')}>
          {(sets.data ?? []).map((set) => {
            const has = ids.every((id) => set.poiIds.includes(id))
            return (
              <li key={set.id}>
                <button
                  type="button"
                  aria-pressed={has}
                  disabled={busyId === set.id || (has && !single)}
                  onClick={() => toggle(set.id, set.name, has)}
                  className={`flex w-full items-center gap-3 border px-3 py-2.5 text-left text-sm transition-colors disabled:opacity-60 ${has ? 'border-firuze bg-firuze/10' : 'border-forest/15 bg-white/70 hover:border-gold'}`}
                >
                  <span className={`grid size-5 shrink-0 place-items-center border ${has ? 'border-firuze bg-firuze text-white' : 'border-forest/30'}`} aria-hidden="true">
                    {busyId === set.id ? <Loader2 size={12} className="animate-spin" /> : has && <Check size={13} />}
                  </span>
                  <span className="min-w-0 flex-1 truncate font-semibold">{set.name}</span>
                  <span className="tabular shrink-0 text-xs text-ink/50">{set.poiIds.length}</span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
      <form onSubmit={submit} className="mt-5 border-t border-forest/10 pt-4">
        <label htmlFor="new-set-name" className="flex items-center gap-1.5 text-[0.8rem] font-semibold text-ink/75">
          <FolderPlus size={14} aria-hidden="true" /> {tr('Bộ sưu tập mới', 'New set')}
        </label>
        <div className="mt-1.5 flex gap-2">
          <input id="new-set-name" value={name} maxLength={SET_NAME_MAX} onChange={(event) => setName(event.target.value)} placeholder={tr('Ví dụ: Cà phê Quận 1', 'e.g. District 1 cafés')} className="h-11 min-w-0 flex-1 border border-forest/25 bg-white px-3 text-sm outline-none focus:border-terracotta" />
          <button type="submit" className="btn-gold btn-sm shrink-0" disabled={!name.trim() || create.isPending}>
            {create.isPending ? <Loader2 size={15} className="animate-spin" aria-hidden="true" /> : <Plus size={15} aria-hidden="true" />} {tr('Tạo', 'Create')}
          </button>
        </div>
      </form>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <DeviceOnlyNote feature="poi-sets" />
        <Link to="/app/sets" onClick={() => close(null)} className="text-xs font-semibold text-lapis underline-offset-4 hover:underline">
          {tr('Quản lý bộ sưu tập', 'Manage sets')}
        </Link>
      </div>
    </Sheet>
  )
}
