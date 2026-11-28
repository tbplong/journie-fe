import { useState, type ReactNode } from 'react'
import { ArrowDown, ArrowUp, Download, Funnel, Loader2, RotateCcw } from 'lucide-react'
import { exportReport, type Stats } from '../../api/admin'
import { categories, categoryIds } from '../../domain/categories'
import { cities, cityById } from '../../domain/pois'
import { placeName } from '../../domain/placeText'
import type { CategoryId, CityId } from '../../domain/types'
import type { useDashboardFilters } from '../../hooks/useDashboardFilters'
import { useTr } from '../../hooks/useTr'
import { downloadFile, toCsv } from '../../lib/csv'
import { toast } from '../../store/toastStore'
import { BarList, Donut, Kpi, LineChart } from '../charts/Charts'
import { SERIES_COLORS } from '../charts/palette'
import { Skeleton } from '../ui/primitives'
import { DecisionQueue } from './DecisionQueue'

type Filters = ReturnType<typeof useDashboardFilters>
type KpiLabel = Record<string, [string, string]>

const KPI_LABELS: KpiLabel = {
  users: ['Lữ khách', 'Travelers'],
  trips: ['Lịch trình tạo ra', 'Itineraries created'],
  live: ['Đang đi', 'Live now'],
  replans: ['Lần đề xuất đổi lịch', 'Replans proposed'],
  searches: ['Lượt tìm kiếm', 'Searches'],
  sets: ['Bộ sưu tập', 'POI sets'],
  places: ['Địa điểm của bạn', 'Your places'],
  inclusions: ['Lần có trong lịch trình', 'Itinerary inclusions'],
  saves: ['Lượt lưu', 'Saves'],
  opens: ['Lượt xem chi tiết', 'Detail views'],
  reports: ['Báo cáo sai thông tin', 'Problem reports'],
}

/** UC 4.6: date range, city and kind of place, all kept in the address. */
function Toolbar({ f, onExport, exporting }: { f: Filters; onExport: () => void; exporting: boolean }) {
  const { tr, language } = useTr()
  const select = 'h-10 border border-forest/20 bg-white px-2 text-sm outline-none focus:border-lapis'
  return (
    <div className="dash-filters panel mb-6 flex flex-wrap items-end gap-3 p-4" role="group" aria-label={tr('Bộ lọc', 'Filters')}>
      <Funnel size={16} className="mb-3 text-lapis" aria-hidden="true" />
      <label className="text-xs font-semibold text-ink/60">
        {tr('Từ ngày', 'From')}
        <input type="date" value={f.filters.from ?? ''} max={f.filters.to} onChange={(event) => f.set({ from: event.target.value })} className={`${select} mt-1 block`} />
      </label>
      <label className="text-xs font-semibold text-ink/60">
        {tr('Đến ngày', 'To')}
        <input type="date" value={f.filters.to ?? ''} min={f.filters.from} onChange={(event) => f.set({ to: event.target.value })} className={`${select} mt-1 block`} />
      </label>
      <label className="text-xs font-semibold text-ink/60">
        {tr('Thành phố', 'City')}
        <select value={f.filters.city ?? 'all'} onChange={(event) => f.set({ city: event.target.value })} className={`${select} mt-1 block`}>
          <option value="all">{tr('Tất cả', 'All')}</option>
          {cities.map((city) => (
            <option key={city.id} value={city.id}>
              {language === 'vi' ? city.name : city.nameEn}
            </option>
          ))}
        </select>
      </label>
      <label className="text-xs font-semibold text-ink/60">
        {tr('Loại địa điểm', 'Kind of place')}
        <select value={f.filters.category ?? 'all'} onChange={(event) => f.set({ cat: event.target.value })} className={`${select} mt-1 block`}>
          <option value="all">{tr('Tất cả', 'All')}</option>
          {categoryIds.map((cat) => (
            <option key={cat} value={cat}>
              {tr(categories[cat].vi, categories[cat].en)}
            </option>
          ))}
        </select>
      </label>
      <button type="button" className="btn-ghost btn-sm mb-0.5" onClick={f.reset}>
        <RotateCcw size={14} aria-hidden="true" /> {tr('Đặt lại', 'Reset')}
      </button>
      <button type="button" className="btn-gold btn-sm mb-0.5 ml-auto" onClick={onExport} disabled={exporting}>
        {exporting ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : <Download size={14} aria-hidden="true" />} {tr('Xuất CSV', 'Export CSV')}
      </button>
    </div>
  )
}

/** A chart block with its title. */
function Card({ title, children, className = '' }: { title: string; children: ReactNode; className?: string }) {
  return (
    <section className={`dash-card panel p-5 ${className}`}>
      <h2 className="mb-3 text-sm font-bold text-ink">{title}</h2>
      {children}
    </section>
  )
}

/**
 * UC 4.5 "Dashboard functions", shared by the admin dashboard (UC 4.3) and the business one (UC 4.4): filter and sort (4.6),
 * export (4.7) and charts (4.8) over whatever `stats` holds.
 */
export function DashboardView({ scope, f, stats, loading, error }: { scope: 'admin' | 'business'; f: Filters; stats?: Stats; loading: boolean; error?: unknown }) {
  const { tr, language } = useTr()
  const [exporting, setExporting] = useState(false)
  const admin = scope === 'admin'
  const name = (poiName: string) => placeName(poiName, language)
  // A kind or city the backend knows but this app does not yet is shown by its id instead of breaking the page
  const kind = (cat: CategoryId) => (categories[cat] ? tr(categories[cat].vi, categories[cat].en) : cat)
  const kindColor = (cat: CategoryId) => categories[cat]?.color ?? SERIES_COLORS[0]
  const cityName = (id: CityId) => (cityById[id] ? (language === 'vi' ? cityById[id].name : cityById[id].nameEn) : id)

  const rows = [...(stats?.places ?? [])].sort((a, b) => {
    const key = f.sort as 'trips' | 'saves' | 'reports' | 'name'
    const diff = key === 'name' ? a.name.localeCompare(b.name) : a[key] - b[key]
    return f.dir === 'asc' ? diff : -diff
  })

  const exportCsv = async () => {
    setExporting(true)
    try {
      const file = await exportReport(scope, f.filters)
      const stamp = new Date().toISOString().slice(0, 10)
      if (file) downloadFile(`journie-${scope}-${stamp}.csv`, file)
      // Nothing loaded (still loading, or the numbers failed): an empty file would only look like a report
      else if (!stats) throw new Error('no-stats')
      else downloadFile(`journie-${scope}-${stamp}.csv`, toCsv([tr('Địa điểm', 'Place'), tr('Loại', 'Kind'), tr('Có trong lịch trình', 'In itineraries'), tr('Lượt lưu', 'Saves'), tr('Báo cáo', 'Reports')], rows.map((row) => [name(row.name), kind(row.cat), row.trips, row.saves, row.reports])))
      toast('success', tr('Đã xuất báo cáo', 'Report exported'), tr(`${rows.length} dòng theo bộ lọc hiện tại.`, `${rows.length} rows with the current filters.`))
    } catch {
      toast('danger', tr('Chưa xuất được báo cáo', 'Could not export the report'))
    } finally {
      setExporting(false)
    }
  }

  const sortHead = (id: string, label: string) => (
    <th scope="col" aria-sort={f.sort === id ? (f.dir === 'asc' ? 'ascending' : 'descending') : 'none'} className="px-3 py-2 text-left">
      <button type="button" onClick={() => f.toggleSort(id)} className="inline-flex items-center gap-1 font-semibold hover:text-lapis">
        {label}
        {f.sort === id && (f.dir === 'asc' ? <ArrowUp size={12} aria-hidden="true" /> : <ArrowDown size={12} aria-hidden="true" />)}
      </button>
    </th>
  )

  return (
    <>
      <Toolbar f={f} onExport={exportCsv} exporting={exporting} />
      {loading ? (
        <div className="grid gap-4 md:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      ) : error || !stats ? (
        <p role="alert" className="panel p-6 text-sm text-pomegranate">
          {tr('Chưa tải được số liệu. Thử tải lại trang.', 'Could not load the numbers. Try reloading the page.')}
        </p>
      ) : (
        <div className={admin ? 'space-y-3' : 'space-y-6'}>
          {admin ? (
            <dl className="console-kpis">
              {stats.kpis.map((kpi) => (
                <div key={kpi.id}>
                  <dt>{tr(...(KPI_LABELS[kpi.id] ?? [kpi.id, kpi.id]))}</dt>
                  <dd>{kpi.value.toLocaleString(language === 'vi' ? 'vi-VN' : 'en-US')}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
              {stats.kpis.map((kpi) => (
                <Kpi key={kpi.id} label={tr(...(KPI_LABELS[kpi.id] ?? [kpi.id, kpi.id]))} value={kpi.value.toLocaleString(language === 'vi' ? 'vi-VN' : 'en-US')} />
              ))}
            </div>
          )}
          <div className={admin ? 'grid items-start gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)]' : 'grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]'}>
            {admin && <DecisionQueue funnel={stats.funnel} />}
            <Card title={tr('Hoạt động theo ngày', 'Activity by day')}>
              <LineChart
                title={tr('Hoạt động theo ngày', 'Activity by day')}
                series={[
                  { key: 'created', label: tr('Tạo lịch trình', 'Created'), color: SERIES_COLORS[0] },
                  { key: 'edited', label: tr('Chỉnh sửa', 'Edited'), color: SERIES_COLORS[1] },
                  { key: 'replans', label: tr('Đổi lịch', 'Replans'), color: SERIES_COLORS[2] },
                ]}
                points={stats.series}
              />
            </Card>
            {!admin && (
              <Card title={tr('Loại địa điểm trong lịch trình', 'Kinds of place in itineraries')}>
                <Donut title={tr('Loại địa điểm trong lịch trình', 'Kinds of place in itineraries')} items={[...stats.categories].sort((a, b) => b.count - a.count).map((entry) => ({ label: kind(entry.cat), value: entry.count, color: kindColor(entry.cat) }))} />
              </Card>
            )}
          </div>
          <div className={admin ? 'grid items-start gap-3 lg:grid-cols-3' : 'grid gap-6 lg:grid-cols-2'}>
            {admin && (
              <Card title={tr('Loại địa điểm trong lịch trình', 'Kinds of place in itineraries')}>
                <BarList title={tr('Loại địa điểm trong lịch trình', 'Kinds of place in itineraries')} items={[...stats.categories].sort((a, b) => b.count - a.count).map((entry) => ({ label: kind(entry.cat), value: entry.count }))} />
              </Card>
            )}
            <Card title={tr('Địa điểm xuất hiện nhiều nhất', 'Most planned places')}>
              <BarList title={tr('Địa điểm xuất hiện nhiều nhất', 'Most planned places')} items={[...stats.places].sort((a, b) => b.trips - a.trips).slice(0, 8).filter((p) => p.trips > 0).map((p) => ({ label: name(p.name), value: p.trips, color: kindColor(p.cat) }))} />
            </Card>
            {scope === 'admin' ? (
              <Card title={tr('Đổi lịch khi có sự cố', 'Replanning on incidents')}>
                <BarList
                  title={tr('Đổi lịch khi có sự cố', 'Replanning on incidents')}
                  items={[
                    { label: tr('Đề xuất cho người dùng', 'Proposed to the traveler'), value: stats.funnel.suggested, color: SERIES_COLORS[2] },
                    { label: tr('Chấp nhận', 'Accepted'), value: stats.funnel.accepted, color: SERIES_COLORS[3] },
                    { label: tr('Giữ lịch cũ / hết hạn', 'Kept / expired'), value: stats.funnel.dismissed, color: SERIES_COLORS[1] },
                    { label: tr('Tự chỉnh (thay đổi nhỏ)', 'Adjusted automatically'), value: stats.funnel.auto, color: SERIES_COLORS[4] },
                  ]}
                />
                {stats.cities.length > 0 && (
                  <p className="mt-4 text-xs text-ink/55">
                    {tr('Theo thành phố: ', 'By city: ')}
                    {stats.cities.map((entry) => `${cityName(entry.city)} ${entry.count}`).join(' · ')}
                  </p>
                )}
              </Card>
            ) : (
              <Card title={tr('Được lưu nhiều nhất', 'Most saved')}>
                <BarList title={tr('Được lưu nhiều nhất', 'Most saved')} items={[...stats.places].sort((a, b) => b.saves - a.saves).slice(0, 8).filter((p) => p.saves > 0).map((p) => ({ label: name(p.name), value: p.saves }))} color={SERIES_COLORS[1]} />
              </Card>
            )}
          </div>
          <Card title={tr('Chi tiết theo địa điểm', 'By place')}>
            {rows.length === 0 ? (
              <p className="py-6 text-center text-sm text-ink/50">{tr('Chưa có địa điểm nào trong bộ lọc này.', 'No places in this filter.')}</p>
            ) : (
              <div className="max-h-[28rem] overflow-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-paper text-xs text-ink/60">
                    <tr>
                      {sortHead('name', tr('Địa điểm', 'Place'))}
                      <th scope="col" className="px-3 py-2 text-left font-semibold">
                        {tr('Loại', 'Kind')}
                      </th>
                      {sortHead('trips', tr('Trong lịch trình', 'In itineraries'))}
                      {sortHead('saves', tr('Lượt lưu', 'Saves'))}
                      {sortHead('reports', tr('Báo cáo', 'Reports'))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, 200).map((row) => (
                      <tr key={row.poiId} className="border-t border-forest/8">
                        <td className="px-3 py-2">{name(row.name)}</td>
                        <td className="px-3 py-2 text-ink/60">{kind(row.cat)}</td>
                        <td className="tabular px-3 py-2">{row.trips}</td>
                        <td className="tabular px-3 py-2">{row.saves}</td>
                        <td className={`tabular px-3 py-2 ${row.reports ? 'font-semibold text-pomegranate' : ''}`}>{row.reports}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}
    </>
  )
}
