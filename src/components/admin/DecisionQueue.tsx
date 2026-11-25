import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router'
import { ChevronRight, CircleCheck, Info, TriangleAlert } from 'lucide-react'
import { listUsers, type Stats } from '../../api/admin'
import { readEvents } from '../../api/analytics'
import { listReports } from '../../api/poiReports'
import { useModules } from '../../api/queries'
import { useTr } from '../../hooks/useTr'

type Level = 'act' | 'review' | 'info'
type Row = { id: string; level: Level; what: string; detail?: string; count: number | string; to: string; action: string }

const ORDER: Record<Level, number> = { act: 0, review: 1, info: 2 }

/** What the admin should look at first, each with a count and a link to the page where it is handled. Built only from data the app already holds. */
export function DecisionQueue({ funnel }: { funnel: Stats['funnel'] }) {
  const { tr } = useTr()
  const reports = useQuery({ queryKey: ['poi-reports'], queryFn: listReports })
  const modules = useModules()
  const blocked = useQuery({ queryKey: ['admin-users', 'blocked-count'], queryFn: () => listUsers({ status: 'blocked', pageSize: 1 }) })
  const invited = useQuery({ queryKey: ['admin-users', 'invited-count'], queryFn: () => listUsers({ status: 'invited', pageSize: 1 }) })

  const open = (reports.data ?? []).filter((report) => report.status === 'open').length
  const off = (modules.data ?? []).filter((module) => !module.enabled).length
  const queued = readEvents().filter((event) => !event.sent).length
  const rate = funnel.suggested ? Math.round((funnel.accepted / funnel.suggested) * 100) : null

  const rows: Row[] = []
  if (open > 0) rows.push({ id: 'reports', level: 'act', what: tr('Báo cáo sai thông tin chưa xử lý', 'Unresolved place reports'), count: open, to: '/app/admin/data', action: tr('Xử lý', 'Resolve') })
  if (off > 0) rows.push({ id: 'modules', level: 'review', what: tr('Phân hệ đang tắt', 'Modules switched off'), detail: tr('Người dùng không dùng được các tính năng này', 'People cannot use these features'), count: off, to: '/app/admin/modules', action: tr('Xem', 'Review') })
  if (blocked.data?.total) rows.push({ id: 'blocked', level: 'review', what: tr('Tài khoản đang bị khoá', 'Blocked accounts'), count: blocked.data.total, to: '/app/admin/users', action: tr('Xem', 'Review') })
  if (invited.data?.total) rows.push({ id: 'invited', level: 'review', what: tr('Lời mời chưa được chấp nhận', 'Invites not accepted yet'), count: invited.data.total, to: '/app/admin/users', action: tr('Xem', 'Review') })
  if (queued > 0) rows.push({ id: 'events', level: 'info', what: tr('Sự kiện chưa gửi lên máy chủ', 'Events not sent to the server'), count: queued, to: '/app/admin/data', action: tr('Đồng bộ', 'Sync') })
  if (rate !== null) rows.push({ id: 'replans', level: 'info', what: tr('Tỉ lệ chấp nhận đổi lịch', 'Replan acceptance'), detail: tr(`${funnel.accepted}/${funnel.suggested} đề xuất`, `${funnel.accepted} of ${funnel.suggested} proposals`), count: `${rate}%`, to: '/app/admin/activity', action: tr('Xem', 'Review') })
  rows.sort((x, y) => ORDER[x.level] - ORDER[y.level])

  const label: Record<Level, string> = { act: tr('Cần xử lý', 'Action'), review: tr('Cần xem', 'Review'), info: tr('Theo dõi', 'Info') }
  const needsWork = rows.some((row) => row.level !== 'info')

  return (
    <section className="panel flex flex-col" aria-labelledby="decision-queue">
      <h2 id="decision-queue" className="console-title">
        {tr('Cần xử lý', 'Needs attention')}
      </h2>
      {!needsWork && (
        <p className="flex items-center gap-2 px-4 py-3 text-sm text-jade-ink">
          <CircleCheck size={16} aria-hidden="true" /> {tr('Không có việc nào đang chờ xử lý.', 'Nothing is waiting for you.')}
        </p>
      )}
      {rows.length > 0 && (
        <table className="w-full text-sm">
          <thead className="sr-only">
            <tr>
              <th scope="col">{tr('Mức độ', 'Level')}</th>
              <th scope="col">{tr('Nội dung', 'Item')}</th>
              <th scope="col">{tr('Số lượng', 'Count')}</th>
              <th scope="col">{tr('Thao tác', 'Action')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td className="w-24 py-2 pl-3 pr-1 sm:px-4">
                  <span className="console-level" data-level={row.level}>
                    {row.level === 'info' ? <Info size={13} aria-hidden="true" /> : <TriangleAlert size={13} aria-hidden="true" />}
                    {label[row.level]}
                  </span>
                </td>
                <td className="px-2 py-2">
                  <span className="font-medium text-ink">{row.what}</span>
                  {row.detail && <span className="block text-xs text-ink/60">{row.detail}</span>}
                </td>
                <td className="tabular w-16 px-2 py-2 text-right text-base font-semibold text-ink">{row.count}</td>
                <td className="w-20 py-2 pl-1 pr-3 text-right sm:w-24 sm:px-4">
                  <Link to={row.to} className="inline-flex min-h-6 items-center gap-0.5 whitespace-nowrap text-[0.8rem] font-semibold text-lapis hover:underline">
                    {row.action} <ChevronRight size={14} aria-hidden="true" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  )
}
