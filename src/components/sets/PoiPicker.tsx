import { useDeferredValue, useMemo, useState } from 'react'
import { Check, Loader2, Search } from 'lucide-react'
import { searchPois } from '../../api/places'
import { useCatalog } from '../../api/queries'
import { categories, categoryIds } from '../../domain/categories'
import { cities } from '../../domain/pois'
import type { CategoryId, CityId } from '../../domain/types'
import { useTr } from '../../hooks/useTr'
import { useCityStore } from '../../store/cityStore'
import { CategoryGlyph } from '../ui/primitives'
import { Sheet } from '../ui/Sheet'

type Props = {
  open: boolean
  onClose: () => void
  title: string
  /** Places already in the target: shown with a badge and not pickable, so nothing is added twice. */
  exclude?: string[]
  confirmLabel?: (count: number) => string
  onConfirm: (poiIds: string[]) => void
}

/** Rows drawn at a time. */
const PAGE = 40

/** UC 1.15 with 1.7: the general list of places, searchable and filtered by kind, to pick several at once. */
export function PoiPicker({ open, onClose, title, exclude = [], confirmLabel, onConfirm }: Props) {
  const { tr, place, language } = useTr()
  const picked = useCityStore((state) => state.city)
  const [city, setCity] = useState<CityId>(picked)
  const [query, setQuery] = useState('')
  const [cats, setCats] = useState<CategoryId[]>([])
  const [chosen, setChosen] = useState<string[]>([])
  const catalog = useCatalog(city)
  const deferred = useDeferredValue(query)
  const taken = useMemo(() => new Set(exclude), [exclude])
  // `catalog.data` changes once the places arrive, which is what re-runs the search
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const hits = useMemo(() => searchPois({ city, query: deferred, categories: cats, prices: [], indoorOnly: false, sort: 'relevance' }), [city, deferred, cats, catalog.data])
  // A new search, kind or city starts from the first page again
  const listKey = `${city}|${deferred}|${cats.join()}`
  const [shown, setShown] = useState({ key: listKey, count: PAGE })
  if (shown.key !== listKey) setShown({ key: listKey, count: PAGE })

  const close = () => {
    setChosen([])
    setQuery('')
    onClose()
  }
  const toggle = (id: string) => setChosen((list) => (list.includes(id) ? list.filter((entry) => entry !== id) : [...list, id]))

  return (
    <Sheet
      open={open}
      onClose={close}
      title={title}
      footer={
        <div className="flex items-center justify-between gap-3">
          <span className="tabular text-sm text-ink/60" aria-live="polite">
            {tr(`Đã chọn ${chosen.length}`, `${chosen.length} picked`)}
          </span>
          <button
            type="button"
            className="btn-gold btn-sm"
            disabled={!chosen.length}
            onClick={() => {
              onConfirm(chosen)
              close()
            }}
          >
            <Check size={15} aria-hidden="true" /> {confirmLabel ? confirmLabel(chosen.length) : tr('Thêm', 'Add')}
          </button>
        </div>
      }
    >
      <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
        <div className="relative">
          <Search size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink/40" aria-hidden="true" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={tr('Tìm theo tên, loại hoặc khu vực…', 'Search by name, kind or area…')} aria-label={tr('Tìm địa điểm', 'Search places')} className="h-11 w-full rounded-xl border border-forest/20 bg-white pl-10 pr-3 text-sm outline-none focus:border-lapis" />
        </div>
        <select value={city} onChange={(event) => setCity(event.target.value as CityId)} aria-label={tr('Thành phố', 'City')} className="h-11 rounded-xl border border-forest/20 bg-white px-3 text-sm outline-none focus:border-lapis">
          {cities.map((entry) => (
            <option key={entry.id} value={entry.id}>
              {language === 'vi' ? entry.name : entry.nameEn}
            </option>
          ))}
        </select>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5" role="group" aria-label={tr('Loại địa điểm', 'Kind of place')}>
        {categoryIds.map((cat) => {
          const on = cats.includes(cat)
          return (
            <button key={cat} type="button" aria-pressed={on} onClick={() => setCats((list) => (on ? list.filter((c) => c !== cat) : [...list, cat]))} className={`chip !min-h-8 !text-xs ${on ? 'chip-on' : ''}`}>
              {tr(categories[cat].vi, categories[cat].en)}
            </button>
          )
        })}
      </div>
      <ul className="mt-4 space-y-2">
        {hits.length === 0 && (
          <li className="flex items-center justify-center gap-2 py-8 text-sm text-ink/55">
            {catalog.isFetching ? (
              <>
                <Loader2 size={16} className="animate-spin" aria-hidden="true" /> {tr('Đang tải địa điểm…', 'Loading places…')}
              </>
            ) : catalog.data === 0 ? (
              tr('Thành phố này chưa có dữ liệu.', 'No places in this city yet.')
            ) : (
              tr('Không tìm thấy nơi nào khớp.', 'No place matches that.')
            )}
          </li>
        )}
        {hits.slice(0, shown.count).map(({ poi }) => {
          const already = taken.has(poi.id)
          const on = chosen.includes(poi.id)
          return (
            <li key={poi.id}>
              <label className={`panel flex cursor-pointer items-center gap-3 p-3 transition-colors ${on ? '!border-terracotta bg-terracotta/5' : ''} ${already ? 'cursor-not-allowed opacity-60' : 'hover:border-gold'}`}>
                <input type="checkbox" className="size-4 accent-[#d96745]" checked={on || already} disabled={already} onChange={() => toggle(poi.id)} />
                <CategoryGlyph cat={poi.cat} size={36} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{place.name(poi.name)}</span>
                  <span className="block truncate text-xs text-ink/55">{place.blurb(poi)}</span>
                </span>
                {already && <span className="shrink-0 rounded-full bg-lapis/10 px-2 py-0.5 text-[0.65rem] font-bold text-lapis">{tr('Đã có', 'Already in')}</span>}
              </label>
            </li>
          )
        })}
      </ul>
      {hits.length > shown.count && (
        <button type="button" className="btn-ghost btn-sm mt-3 w-full" onClick={() => setShown({ key: listKey, count: shown.count + PAGE })}>
          {tr(`Xem thêm (còn ${hits.length - shown.count} nơi)`, `Show more (${hits.length - shown.count} left)`)}
        </button>
      )}
    </Sheet>
  )
}
