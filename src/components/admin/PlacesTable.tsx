import { useDeferredValue, useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, RotateCcw, Search } from 'lucide-react'
import { useCatalog } from '../../api/queries'
import { categories, categoryIds } from '../../domain/categories'
import { plain } from '../../domain/placeText'
import { cities, poisByCity } from '../../domain/pois'
import type { CategoryId, CityId, Poi } from '../../domain/types'
import { useTr } from '../../hooks/useTr'
import { useCityStore } from '../../store/cityStore'
import { useUiStore } from '../../store/uiStore'
import { PageHeader } from '../PageHeader'
import { PoiSheet } from '../place/PoiSheet'
import { Skeleton } from '../ui/primitives'

type Issue = 'price' | 'hours' | 'doubt'
type Quality = 'all' | 'complete' | Issue
type SortKey = 'name' | 'kind' | 'area' | 'price' | 'hours'

const PAGE_SIZE = 50
const DOUBTFUL = new Set(['hours_maybe_closed', 'hours_low_confidence', 'hours_contradicted'])

const issuesOf = (poi: Poi): Issue[] => {
  const issues: Issue[] = []
  if (!poi.costKnown && !poi.priceLevel) issues.push('price')
  if (!poi.hours) issues.push('hours')
  else if (poi.flags.some((flag) => DOUBTFUL.has(flag))) issues.push('doubt')
  return issues
}

// Every address ends in "Thành phố …", so without this a search for "pho" would match every place
const CITY_PART = /(?:^|,)\s*(?:thành phố|tp\.?)\s+[^,]*/gi
const fold = (text: string) => text.normalize('NFC').toLowerCase()

/** A search typed without accents ignores them; one typed with accents keeps them, so "Phở" does not find "Phố". */
const matches = (poi: Poi, query: string) => {
  const text = `${poi.name} ${poi.area} ${poi.address.replace(CITY_PART, '')}`
  return plain(query) === query ? plain(text).toLowerCase().includes(query.toLowerCase()) : fold(text).includes(fold(query))
}

/** The admin's view of the places: find one, filter by what its data is missing, and open its details. */
export function PlacesTable() {
  const { tr, place, price, language } = useTr()
  const openPoi = useUiStore((state) => state.openPoi)
  const city = useCityStore((state) => state.city)
  const setCity = useCityStore((state) => state.setCity)
  const catalog = useCatalog(city)
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<CategoryId | 'all'>('all')
  const [quality, setQuality] = useState<Quality>('all')
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: 'name', dir: 1 })
  const deferred = useDeferredValue(query)

  // `catalog.data` changes when the places finish loading
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const all = useMemo(() => poisByCity(city), [city, catalog.data])
  const counts = useMemo(() => {
    const count: Record<Quality, number> = { all: all.length, complete: 0, price: 0, hours: 0, doubt: 0 }
    for (const poi of all) {
      const issues = issuesOf(poi)
      if (!issues.length) count.complete += 1
      for (const issue of issues) count[issue] += 1
    }
    return count
  }, [all])

  const rows = useMemo(() => {
    const needle = deferred.trim()
    const collator = new Intl.Collator(language === 'vi' ? 'vi' : 'en')
    const kind = (poi: Poi) => tr(categories[poi.cat].vi, categories[poi.cat].en)
    // A place with no price or hours goes last whichever way the column is sorted
    const number = (value: number | null, other: number | null) => (value === null ? (other === null ? 0 : 1) : other === null ? -1 : (value - other) * sort.dir)
    const compare = (a: Poi, b: Poi) => {
      if (sort.key === 'price') return number(a.costKnown ? a.cost : null, b.costKnown ? b.cost : null)
      if (sort.key === 'hours') return number(a.hours ? a.open : null, b.hours ? b.open : null)
      const text = (poi: Poi) => (sort.key === 'kind' ? kind(poi) : sort.key === 'area' ? poi.area : poi.name)
      return collator.compare(text(a), text(b)) * sort.dir
    }
    return all
      .filter((poi) => category === 'all' || poi.cat === category)
      .filter((poi) => {
        if (quality === 'all') return true
        const issues = issuesOf(poi)
        return quality === 'complete' ? !issues.length : issues.includes(quality)
      })
      .filter((poi) => !needle || matches(poi, needle))
      .sort((a, b) => compare(a, b) || collator.compare(a.name, b.name))
  }, [all, category, deferred, language, quality, sort, tr])

  // A new search, filter or sort starts from the first page
  const listKey = JSON.stringify([city, deferred, category, quality, sort])
  const [paging, setPaging] = useState({ key: listKey, page: 0 })
  if (paging.key !== listKey) setPaging({ key: listKey, page: 0 })
  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE))
  const page = Math.min(paging.page, pages - 1)
  const visible = rows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  const filtered = query !== '' || category !== 'all' || quality !== 'all'
  const reset = () => {
    setQuery('')
    setCategory('all')
    setQuality('all')
  }
  const issueLabel: Record<Issue, string> = { price: tr('Thiếu giá', 'No price'), hours: tr('Thiếu giờ', 'No hours'), doubt: tr('Giờ chưa chắc', 'Hours unsure') }
  const select = 'h-10 w-full border border-forest/20 bg-white px-2 text-sm outline-none focus:border-lapis'
  const loading = catalog.isLoading && !all.length

  const head = (key: SortKey, label: string, className = '') => (
    <th scope="col" aria-sort={sort.key === key ? (sort.dir === 1 ? 'ascending' : 'descending') : 'none'} className={`sticky top-0 z-10 px-3 py-2 text-left ${className}`}>
      <button type="button" onClick={() => setSort((now) => (now.key === key ? { key, dir: now.dir === 1 ? -1 : 1 } : { key, dir: 1 }))} className="inline-flex min-h-6 items-center gap-1 font-semibold hover:text-lapis">
        {label}
        {sort.key === key && (sort.dir === 1 ? <ArrowUp size={12} aria-hidden="true" /> : <ArrowDown size={12} aria-hidden="true" />)}
      </button>
    </th>
  )

  return (
    <>
      <PageHeader title={tr('Dữ liệu điểm đến', 'Places data')} subtitle={tr('Tra cứu địa điểm và tìm những nơi còn thiếu thông tin.', 'Look up places and find the ones with missing information.')} />

      <div className="dash-filters panel grid grid-cols-2 items-end gap-3 p-4 lg:grid-cols-[minmax(14rem,2fr)_repeat(3,minmax(9rem,1fr))_auto]" role="search">
        <label className="col-span-2 text-xs font-semibold text-ink/60 lg:col-span-1">
          {tr('Tìm kiếm', 'Search')}
          <span className="relative mt-1 block">
            <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-ink/60" aria-hidden="true" />
            <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={tr('Tên, phường hoặc địa chỉ', 'Name, ward or address')} className={`${select} !pl-7`} />
          </span>
        </label>
        <label className="text-xs font-semibold text-ink/60">
          {tr('Thành phố', 'City')}
          <select value={city} onChange={(event) => setCity(event.target.value as CityId)} className={`${select} mt-1 block`}>
            {cities.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {language === 'vi' ? entry.name : entry.nameEn}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-semibold text-ink/60">
          {tr('Loại địa điểm', 'Kind of place')}
          <select value={category} onChange={(event) => setCategory(event.target.value as CategoryId | 'all')} className={`${select} mt-1 block`}>
            <option value="all">{tr('Tất cả', 'All')}</option>
            {categoryIds.map((cat) => (
              <option key={cat} value={cat}>
                {tr(categories[cat].vi, categories[cat].en)}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-semibold text-ink/60">
          {tr('Tình trạng dữ liệu', 'Data status')}
          <select value={quality} onChange={(event) => setQuality(event.target.value as Quality)} className={`${select} mt-1 block`}>
            <option value="all">{tr(`Tất cả (${counts.all})`, `All (${counts.all})`)}</option>
            <option value="price">{`${issueLabel.price} (${counts.price})`}</option>
            <option value="hours">{`${issueLabel.hours} (${counts.hours})`}</option>
            <option value="doubt">{`${issueLabel.doubt} (${counts.doubt})`}</option>
            <option value="complete">{tr(`Đầy đủ (${counts.complete})`, `Complete (${counts.complete})`)}</option>
          </select>
        </label>
        <button type="button" className="btn-ghost btn-sm" onClick={reset} disabled={!filtered}>
          <RotateCcw size={14} aria-hidden="true" /> {tr('Đặt lại', 'Reset')}
        </button>
      </div>

      {loading ? (
        <div className="panel space-y-2 p-4" role="status" aria-label={tr('Đang tải địa điểm', 'Loading places')}>
          {Array.from({ length: 8 }, (_, index) => (
            <Skeleton key={index} className="h-7" />
          ))}
        </div>
      ) : catalog.isError && !all.length ? (
        <div role="alert" className="panel flex flex-wrap items-center justify-between gap-3 p-4 text-sm text-pomegranate">
          {tr('Chưa tải được địa điểm của thành phố này.', 'Could not load the places of this city.')}
          <button type="button" className="btn-ghost btn-sm" onClick={() => catalog.refetch()}>
            {tr('Thử lại', 'Try again')}
          </button>
        </div>
      ) : rows.length === 0 ? (
        <div className="panel flex flex-wrap items-center justify-between gap-3 p-4 text-sm text-ink/60">
          {all.length ? tr('Không có địa điểm nào khớp bộ lọc.', 'No places match these filters.') : tr('Thành phố này chưa có dữ liệu.', 'No places in this city yet.')}
          {filtered && (
            <button type="button" className="btn-ghost btn-sm" onClick={reset}>
              <RotateCcw size={14} aria-hidden="true" /> {tr('Đặt lại bộ lọc', 'Reset filters')}
            </button>
          )}
        </div>
      ) : (
        <section className="panel overflow-hidden" aria-label={tr('Danh sách địa điểm', 'Places list')}>
          <div className="overflow-auto lg:max-h-[calc(100dvh-15.5rem)]">
            <table className="w-full text-sm">
              <thead className="text-xs">
                <tr>
                  {head('name', tr('Địa điểm', 'Place'))}
                  {head('kind', tr('Loại', 'Kind'), 'hidden md:table-cell')}
                  {head('area', tr('Khu vực', 'Area'), 'hidden lg:table-cell')}
                  {head('price', tr('Giá', 'Price'))}
                  {head('hours', tr('Giờ mở cửa', 'Hours'), 'hidden xl:table-cell')}
                  <th scope="col" className="sticky top-0 z-10 hidden px-3 py-2 text-left font-semibold sm:table-cell">
                    {tr('Cảnh báo', 'Flags')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {visible.map((poi) => {
                  const issues = issuesOf(poi)
                  const kind = tr(categories[poi.cat].vi, categories[poi.cat].en)
                  return (
                    <tr key={poi.id}>
                      <td className="w-full max-w-0 px-3 py-1.5 lg:w-auto lg:max-w-[16rem]">
                        <button type="button" onClick={() => openPoi(poi.id)} className="block min-h-6 max-w-full truncate text-left font-medium text-lapis hover:underline">
                          {place.name(poi.name)}
                        </button>
                        <span className="block truncate text-xs text-ink/60 md:hidden">
                          {kind}
                          {poi.area && ` · ${place.area(poi.area)}`}
                        </span>
                      </td>
                      <td className="hidden whitespace-nowrap px-3 py-1.5 text-ink/60 md:table-cell">{kind}</td>
                      <td className="hidden max-w-[13rem] truncate px-3 py-1.5 text-ink/60 lg:table-cell">{poi.area ? place.area(poi.area) : '–'}</td>
                      <td className="max-w-[6.5rem] px-3 py-1.5 text-[0.8rem] leading-snug sm:max-w-none sm:whitespace-nowrap sm:text-sm">{price(poi)}</td>
                      <td className="hidden max-w-[15rem] truncate px-3 py-1.5 text-xs text-ink/60 xl:table-cell" title={poi.hours ? place.hours(poi.hours) : undefined}>
                        {poi.hours ? place.hours(poi.hours) : '–'}
                      </td>
                      <td className="hidden px-3 py-1.5 sm:table-cell">
                        {issues.length === 0 ? (
                          <span className="console-level" data-level="ok">
                            {tr('Đầy đủ', 'Complete')}
                          </span>
                        ) : (
                          <span className="flex flex-wrap gap-1">
                            {issues.map((issue) => (
                              <span key={issue} className="console-level" data-level="review">
                                {issueLabel[issue]}
                              </span>
                            ))}
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--console-line)] px-3 py-2 text-xs text-ink/60">
            <span className="tabular" aria-live="polite">
              {tr(`${page * PAGE_SIZE + 1}–${page * PAGE_SIZE + visible.length} trong ${rows.length} địa điểm`, `${page * PAGE_SIZE + 1}–${page * PAGE_SIZE + visible.length} of ${rows.length} places`)}
            </span>
            <span className="flex items-center gap-2">
              <button type="button" className="btn-ghost btn-sm" disabled={page === 0} onClick={() => setPaging({ key: listKey, page: page - 1 })} aria-label={tr('Trang trước', 'Previous page')}>
                <ChevronLeft size={14} aria-hidden="true" />
              </button>
              <span className="tabular">{tr(`Trang ${page + 1}/${pages}`, `Page ${page + 1} of ${pages}`)}</span>
              <button type="button" className="btn-ghost btn-sm" disabled={page >= pages - 1} onClick={() => setPaging({ key: listKey, page: page + 1 })} aria-label={tr('Trang sau', 'Next page')}>
                <ChevronRight size={14} aria-hidden="true" />
              </button>
            </span>
          </div>
        </section>
      )}
      <PoiSheet />
    </>
  )
}
