import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Brain, Check, Download, Loader2, RefreshCw } from 'lucide-react'
import { getTrainingJob, listItineraries, listTrainingJobs, startTraining } from '../../../api/admin'
import { flushEvents, readEvents } from '../../../api/analytics'
import { ApiError, endpointMissing, isDeviceOnly } from '../../../api/http'
import { listReports, resolveReport } from '../../../api/poiReports'
import { PageHeader } from '../../../components/PageHeader'
import { ConfirmSheet } from '../../../components/ui/ConfirmSheet'
import { DeviceOnlyNote } from '../../../components/ui/DeviceOnlyNote'
import { Skeleton } from '../../../components/ui/primitives'
import { cityById, poiById } from '../../../domain/pois'
import { useDashboardFilters } from '../../../hooks/useDashboardFilters'
import { useTr } from '../../../hooks/useTr'
import { downloadFile, toCsv } from '../../../lib/csv'
import { toast } from '../../../store/toastStore'

/** UC 4.1 "Collect itinerary data", extended by UC 4.2 "Train model", plus the queue of place reports (UC 1.5). */
export function DataPage() {
  const { tr, language, money } = useTr()
  const client = useQueryClient()
  const f = useDashboardFilters()
  const rows = useQuery({ queryKey: ['admin-itineraries', f.filters], queryFn: () => listItineraries(f.filters) })
  const reports = useQuery({ queryKey: ['poi-reports'], queryFn: listReports })
  const [confirm, setConfirm] = useState(false)
  const [jobId, setJobId] = useState<string | null>(null)
  const queued = readEvents().filter((event) => !event.sent).length

  const sync = useMutation({
    mutationFn: flushEvents,
    onSuccess: (sent) => {
      client.invalidateQueries({ queryKey: ['admin-itineraries'] })
      toast(sent ? 'success' : 'info', sent ? tr(`Đã gửi ${sent} sự kiện lên máy chủ`, `Sent ${sent} events to the server`) : tr('Không có gì mới để gửi', 'Nothing new to send'), isDeviceOnly('events') ? tr('Máy chủ chưa có API nhận dữ liệu; dữ liệu vẫn nằm trong hàng đợi trên máy này.', 'The server has no API to receive data yet; it stays queued on this device.') : undefined)
    },
  })
  const jobs = useQuery({ queryKey: ['train-jobs'], queryFn: listTrainingJobs, retry: false })
  const trainUnavailable = jobs.isError && endpointMissing(jobs.error)
  const job = useQuery({ queryKey: ['train-job', jobId], queryFn: () => getTrainingJob(jobId!), enabled: !!jobId, refetchInterval: (query) => (query.state.status === 'error' || (query.state.data && ['succeeded', 'failed'].includes(query.state.data.status)) ? false : 2000) })
  const train = useMutation({
    mutationFn: startTraining,
    onSuccess: (started) => {
      setJobId(started.id)
      setConfirm(false)
    },
    onError: (error) => {
      setConfirm(false)
      const forbidden = error instanceof ApiError && error.status === 403
      toast('danger', forbidden ? tr('Bạn không có quyền huấn luyện mô hình', 'You are not allowed to train the model') : endpointMissing(error) ? tr('Máy chủ chưa có API huấn luyện', 'The server has no training API yet') : tr('Chưa bắt đầu huấn luyện được', 'Could not start training'))
    },
  })
  const resolve = useMutation({ mutationFn: resolveReport, onSuccess: () => client.invalidateQueries({ queryKey: ['poi-reports'] }) })

  const list = rows.data ?? []
  const exportCsv = () =>
    downloadFile(
      `journie-itineraries-${new Date().toISOString().slice(0, 10)}.csv`,
      toCsv(['id', 'user', 'city', 'days', 'stops', 'budget_vnd', 'status', 'created_at'], list.map((row) => [row.id, row.userName, row.city, row.days, row.stops, row.budget, row.status, row.createdAt])),
    )
  const running = job.data && !['succeeded', 'failed'].includes(job.data.status)

  return (
    <>
      <PageHeader title={tr('Dữ liệu lịch trình & mô hình', 'Itinerary data & model')} subtitle={tr('Thu thập lịch trình người dùng tạo để cải thiện gợi ý, rồi huấn luyện lại mô hình khi đủ dữ liệu.', 'Collect the itineraries people make to improve suggestions, then retrain the model once there is enough.')} />
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <section className="panel p-5" aria-labelledby="collected">
          <div className="mb-4 flex flex-wrap items-end gap-3">
            <h2 id="collected" className="mr-auto text-sm font-bold text-ink">
              {tr(`${list.length} lịch trình đã thu thập`, `${list.length} itineraries collected`)}
            </h2>
            <label className="text-xs font-semibold text-ink/60">
              {tr('Từ', 'From')}
              <input type="date" value={f.filters.from ?? ''} onChange={(event) => f.set({ from: event.target.value })} className="mt-1 block h-9 border border-forest/20 bg-white px-2 text-sm" />
            </label>
            <label className="text-xs font-semibold text-ink/60">
              {tr('Đến', 'To')}
              <input type="date" value={f.filters.to ?? ''} onChange={(event) => f.set({ to: event.target.value })} className="mt-1 block h-9 border border-forest/20 bg-white px-2 text-sm" />
            </label>
            <button type="button" className="btn-ghost btn-sm" onClick={() => sync.mutate()} disabled={sync.isPending}>
              {sync.isPending ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : <RefreshCw size={14} aria-hidden="true" />} {tr('Thu thập / đồng bộ', 'Collect / sync')} {queued > 0 && `(${queued})`}
            </button>
            <button type="button" className="btn-ghost btn-sm" onClick={exportCsv} disabled={!list.length}>
              <Download size={14} aria-hidden="true" /> CSV
            </button>
          </div>
          {rows.isLoading ? (
            <Skeleton className="h-60" />
          ) : list.length === 0 ? (
            <p className="py-8 text-center text-sm text-ink/55">{tr('Chưa có lịch trình nào trong khoảng này.', 'No itineraries in this range.')}</p>
          ) : (
            <div className="max-h-[30rem] overflow-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-paper text-left text-xs text-ink/60">
                  <tr>
                    <th scope="col" className="px-2 py-2 font-semibold">{tr('Người tạo', 'Owner')}</th>
                    <th scope="col" className="px-2 py-2 font-semibold">{tr('Thành phố', 'City')}</th>
                    <th scope="col" className="px-2 py-2 font-semibold">{tr('Ngày / điểm', 'Days / stops')}</th>
                    <th scope="col" className="hidden px-2 py-2 font-semibold sm:table-cell">{tr('Ngân sách', 'Budget')}</th>
                    <th scope="col" className="px-2 py-2 font-semibold">{tr('Tạo lúc', 'Created')}</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((row) => (
                    <tr key={row.id} className="border-t border-forest/8">
                      <td className="px-2 py-2">{row.userName}</td>
                      <td className="px-2 py-2">{language === 'vi' ? cityById[row.city]?.name : cityById[row.city]?.nameEn}</td>
                      <td className="tabular px-2 py-2">
                        {row.days} / {row.stops}
                      </td>
                      <td className="tabular hidden px-2 py-2 sm:table-cell">{money(row.budget)}</td>
                      <td className="tabular px-2 py-2 text-xs text-ink/55">{new Date(row.createdAt).toLocaleDateString(language === 'vi' ? 'vi-VN' : 'en-US')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <DeviceOnlyNote feature="admin-itineraries" className="mt-3">
            {tr('Máy chủ chưa lưu lịch trình, nên đây chỉ là các lịch trình tạo trên trình duyệt này.', 'The server does not store itineraries yet, so these are only the ones made in this browser.')}
          </DeviceOnlyNote>
        </section>

        <div className="space-y-6">
          <section className="panel-night p-5 text-paper" aria-labelledby="train">
            <h2 id="train" className="h-display flex items-center gap-2 text-xl">
              <Brain size={19} className="text-gold" aria-hidden="true" /> {tr('Huấn luyện mô hình', 'Train the model')}
            </h2>
            <p className="mt-2 text-sm text-paper/75">{tr('Dùng dữ liệu đã thu thập để huấn luyện lại mô hình xếp hạng gợi ý. Việc này chạy trên máy chủ.', 'Use the collected data to retrain the suggestion ranking model. This runs on the server.')}</p>
            {job.data && (
              <div className="mt-4 space-y-2 text-sm" aria-live="polite">
                <p>
                  {tr('Trạng thái', 'Status')}: <strong>{job.data.status}</strong>
                  {job.data.modelVersion && ` · ${tr('phiên bản', 'version')} ${job.data.modelVersion}`}
                </p>
                <div className="h-2 overflow-hidden rounded-full bg-paper/15" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(job.data.progress * 100)}>
                  <div className="h-full bg-gold" style={{ width: `${Math.round(job.data.progress * 100)}%` }} />
                </div>
                {job.data.metrics && <p className="tabular text-xs text-paper/70">{Object.entries(job.data.metrics).map(([key, value]) => `${key}: ${value}`).join(' · ')}</p>}
                {job.data.error && <p className="text-xs text-terracotta">{job.data.error}</p>}
              </div>
            )}
            <button type="button" className="btn-gold btn-sm mt-4" disabled={trainUnavailable || list.length === 0 || !!running || train.isPending} onClick={() => setConfirm(true)}>
              {running ? <Loader2 size={15} className="animate-spin" aria-hidden="true" /> : <Brain size={15} aria-hidden="true" />} {tr('Huấn luyện lại', 'Retrain')}
            </button>
            {job.isError && <p className="mt-2 text-xs text-terracotta">{tr('Chưa đọc được trạng thái huấn luyện từ máy chủ.', 'Could not read the training status from the server.')}</p>}
            {trainUnavailable && <p className="mt-2 text-xs text-paper/65">{tr('Máy chủ chưa có API huấn luyện (POST /admin/train), nên chưa chạy được.', 'The server has no training API (POST /admin/train) yet, so this cannot run.')}</p>}
            {(jobs.data ?? []).length > 0 && (
              <ul className="mt-4 space-y-1 border-t border-paper/15 pt-3 text-xs text-paper/70">
                {(jobs.data ?? []).slice(0, 5).map((entry) => (
                  <li key={entry.id}>
                    {new Date(entry.startedAt).toLocaleString()} · {entry.status} {entry.modelVersion && `· ${entry.modelVersion}`}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="panel p-5" aria-labelledby="reports">
            <h2 id="reports" className="text-sm font-bold text-ink">
              {tr('Báo cáo sai thông tin địa điểm', 'Place problem reports')}
            </h2>
            {(reports.data ?? []).length === 0 ? (
              <p className="mt-2 text-sm text-ink/55">{tr('Chưa có báo cáo nào.', 'No reports yet.')}</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {(reports.data ?? []).slice(0, 20).map((report) => (
                  <li key={report.id} className="flex items-start gap-2 border-b border-forest/8 pb-2 text-sm">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">{poiById[report.poiId]?.name ?? report.poiId}</p>
                      <p className="text-xs text-ink/60">
                        {{ closed: tr('Đã đóng cửa', 'Closed'), hours: tr('Sai giờ', 'Wrong hours'), address: tr('Sai địa chỉ', 'Wrong address'), other: tr('Khác', 'Other') }[report.type]}
                        {report.note && ` · ${report.note}`}
                      </p>
                    </div>
                    {report.status === 'open' ? (
                      <button type="button" className="btn-ghost btn-sm shrink-0" onClick={() => resolve.mutate(report.id)}>
                        <Check size={14} aria-hidden="true" /> {tr('Đã xử lý', 'Resolved')}
                      </button>
                    ) : (
                      <span className="shrink-0 text-xs text-jade-ink">{tr('Đã xử lý', 'Resolved')}</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
            <DeviceOnlyNote feature="poi-reports" className="mt-3" />
          </section>
        </div>
      </div>
      <ConfirmSheet
        open={confirm}
        onClose={() => setConfirm(false)}
        onConfirm={() => train.mutate()}
        busy={train.isPending}
        title={tr('Bắt đầu huấn luyện?', 'Start training?')}
        description={tr(`Mô hình sẽ học từ ${list.length} lịch trình. Gợi ý hiện tại vẫn chạy trong lúc huấn luyện.`, `The model will learn from ${list.length} itineraries. Current suggestions keep working meanwhile.`)}
        confirmLabel={tr('Bắt đầu', 'Start')}
      />
    </>
  )
}
