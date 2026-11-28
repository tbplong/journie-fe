import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, ChevronLeft, ChevronRight, Lock, LockOpen, Search, Trash2 } from 'lucide-react'
import { deleteUser, getUser, listUsers, setUserStatus, type UserRow } from '../../../api/admin'
import { ApiError } from '../../../api/http'
import { ActivityList } from '../../../components/admin/ActivityList'
import { StatusBadge } from '../../../components/admin/StatusBadge'
import { PageHeader } from '../../../components/PageHeader'
import { ConfirmSheet } from '../../../components/ui/ConfirmSheet'
import { DeviceOnlyNote } from '../../../components/ui/DeviceOnlyNote'
import { EmptyState, LoadError, Skeleton } from '../../../components/ui/primitives'
import { isNotFound } from '../../../api/errorText'
import { categories, categoryIds } from '../../../domain/categories'
import { useTr } from '../../../hooks/useTr'
import { useAuthStore, type AccountStatus, type Role } from '../../../store/authStore'
import { toast } from '../../../store/toastStore'

const PAGE_SIZE = 10

function adminErrorText(error: unknown): [string, string] {
  const code = error instanceof ApiError ? error.code : ''
  if (code === 'cannot-act-on-self') return ['Bạn không thể làm việc này với chính tài khoản mình.', 'You cannot do this to your own account.']
  if (code === 'last-admin') return ['Không thể khoá hay xoá quản trị viên cuối cùng.', 'The last admin cannot be blocked or deleted.']
  if (error instanceof ApiError && error.status === 403) return ['Bạn không có quyền làm việc này.', 'You are not allowed to do this.']
  return ['Chưa thực hiện được, thử lại nhé.', 'Could not do it, try again.']
}

const roleName = (role: Role, tr: (vi: string, en: string) => string) => ({ traveler: tr('Lữ khách', 'Traveler'), admin: tr('Quản trị viên', 'Admin'), business: tr('Doanh nghiệp', 'Business') })[role]

/** The block / unblock / delete actions with their confirmations, shared by the list and the detail page. */
function useUserActions(onDeleted?: () => void) {
  const { tr } = useTr()
  const me = useAuthStore((state) => state.user)!
  const client = useQueryClient()
  const [target, setTarget] = useState<{ user: UserRow; action: 'block' | 'unblock' | 'delete' } | null>(null)
  const done = () => {
    client.invalidateQueries({ queryKey: ['admin-users'] })
    client.invalidateQueries({ queryKey: ['admin-user'] })
    setTarget(null)
  }
  const status = useMutation({
    mutationFn: ({ id, next, reason }: { id: string; next: 'active' | 'blocked'; reason: string }) => setUserStatus(me.id, id, next, reason),
    onSuccess: (_ok, { next }) => {
      done()
      toast('success', next === 'blocked' ? tr('Đã khoá tài khoản', 'Account blocked') : tr('Đã mở khoá tài khoản', 'Account unblocked'))
    },
    onError: (error) => toast('danger', tr(...adminErrorText(error))),
  })
  const remove = useMutation({
    mutationFn: (id: string) => deleteUser(me.id, id),
    onSuccess: () => {
      done()
      toast('info', tr('Đã xoá tài khoản', 'Account deleted'))
      onDeleted?.()
    },
    onError: (error) => toast('danger', tr(...adminErrorText(error))),
  })
  const sheet = (
    <ConfirmSheet
      open={!!target}
      onClose={() => setTarget(null)}
      danger={target?.action !== 'unblock'}
      busy={status.isPending || remove.isPending}
      title={target?.action === 'delete' ? tr('Xoá tài khoản này?', 'Delete this account?') : target?.action === 'block' ? tr('Khoá tài khoản này?', 'Block this account?') : tr('Mở khoá tài khoản này?', 'Unblock this account?')}
      description={
        target?.action === 'delete'
          ? tr('Tài khoản, lịch trình, bộ sưu tập và hồ sơ của người này bị xoá hẳn, không lấy lại được.', 'The account, its trips, sets and profile are removed for good.')
          : target?.action === 'block'
            ? tr('Người này không đăng nhập được nữa cho tới khi được mở khoá.', 'They cannot sign in until unblocked.')
            : tr('Người này đăng nhập lại được bình thường.', 'They can sign in again as usual.')
      }
      confirmLabel={target?.action === 'delete' ? tr('Xoá vĩnh viễn', 'Delete for good') : target?.action === 'block' ? tr('Khoá', 'Block') : tr('Mở khoá', 'Unblock')}
      typeToConfirm={target?.action === 'delete' ? target.user.email : undefined}
      reasonLabel={target?.action === 'block' ? tr('Lý do (không bắt buộc)', 'Reason (optional)') : undefined}
      onConfirm={(reason) => {
        if (!target) return
        if (target.action === 'delete') remove.mutate(target.user.id)
        else status.mutate({ id: target.user.id, next: target.action === 'block' ? 'blocked' : 'active', reason })
      }}
    >
      <p className="text-sm font-semibold">
        {target?.user.name} · {target?.user.email}
      </p>
    </ConfirmSheet>
  )
  return { ask: (user: UserRow, action: 'block' | 'unblock' | 'delete') => setTarget({ user, action }), sheet, me }
}

function RowActions({ user, ask, self }: { user: UserRow; ask: (user: UserRow, action: 'block' | 'unblock' | 'delete') => void; self: boolean }) {
  const { tr } = useTr()
  if (self) return <span className="text-xs text-ink/40">{tr('Bạn', 'You')}</span>
  return (
    <span className="flex justify-end gap-1">
      {user.status === 'blocked' ? (
        <button type="button" className="grid size-8 place-items-center text-ink/50 hover:text-jade-ink" onClick={() => ask(user, 'unblock')} aria-label={tr(`Mở khoá ${user.name}`, `Unblock ${user.name}`)} title={tr('Mở khoá', 'Unblock')}>
          <LockOpen size={15} />
        </button>
      ) : (
        <button type="button" className="grid size-8 place-items-center text-ink/50 hover:text-sun-ink" onClick={() => ask(user, 'block')} aria-label={tr(`Khoá ${user.name}`, `Block ${user.name}`)} title={tr('Khoá', 'Block')}>
          <Lock size={15} />
        </button>
      )}
      <button type="button" className="grid size-8 place-items-center text-ink/50 hover:text-pomegranate" onClick={() => ask(user, 'delete')} aria-label={tr(`Xoá ${user.name}`, `Delete ${user.name}`)} title={tr('Xoá', 'Delete')}>
        <Trash2 size={15} />
      </button>
    </span>
  )
}

/** UC 6.2 "View users list" with block (6.7), unblock (6.8) and delete (6.6) on each row. */
export function UsersPage() {
  const { tr, language } = useTr()
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [status, setStatus] = useState<AccountStatus | 'all'>('all')
  const [role, setRole] = useState<Role | 'all'>('all')
  const [page, setPage] = useState(1)
  const users = useQuery({ queryKey: ['admin-users', q, status, role, page], queryFn: () => listUsers({ q, status, role, page, pageSize: PAGE_SIZE }) })
  const { ask, sheet, me } = useUserActions()
  const pages = Math.max(1, Math.ceil((users.data?.total ?? 0) / PAGE_SIZE))

  return (
    <>
      <PageHeader title={tr('Người dùng', 'Users')} subtitle={tr('Tìm, xem, khoá hoặc xoá tài khoản.', 'Find, view, block or delete accounts.')} />
      <div className="panel mb-5 flex flex-wrap items-center gap-3 p-4">
        <div className="relative min-w-[14rem] flex-1">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink/40" aria-hidden="true" />
          <input
            value={q}
            onChange={(event) => {
              setQ(event.target.value)
              setPage(1)
            }}
            placeholder={tr('Tìm theo tên hoặc email…', 'Search by name or email…')}
            aria-label={tr('Tìm người dùng', 'Search users')}
            className="h-10 w-full border border-forest/20 bg-white pl-9 pr-3 text-sm outline-none focus:border-lapis"
          />
        </div>
        <div role="group" aria-label={tr('Trạng thái', 'Status')} className="flex flex-wrap gap-1.5">
          {(['all', 'active', 'blocked', 'invited'] as const).map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={status === value}
              onClick={() => {
                setStatus(value)
                setPage(1)
              }}
              className={`chip !min-h-8 !text-xs ${status === value ? 'chip-on' : ''}`}
            >
              {{ all: tr('Tất cả', 'All'), active: tr('Hoạt động', 'Active'), blocked: tr('Đã khoá', 'Blocked'), invited: tr('Chờ kích hoạt', 'Invited') }[value]}
            </button>
          ))}
        </div>
        <select
          value={role}
          onChange={(event) => {
            setRole(event.target.value as Role | 'all')
            setPage(1)
          }}
          aria-label={tr('Vai trò', 'Role')}
          className="h-10 border border-forest/20 bg-white px-2 text-sm"
        >
          <option value="all">{tr('Mọi vai trò', 'Every role')}</option>
          <option value="traveler">{roleName('traveler', tr)}</option>
          <option value="business">{roleName('business', tr)}</option>
          <option value="admin">{roleName('admin', tr)}</option>
        </select>
      </div>
      {users.isLoading ? (
        <Skeleton className="h-80" />
      ) : !users.data?.items.length ? (
        <EmptyState title={tr('Không có ai khớp', 'Nobody matches')} body={tr('Thử bỏ bớt bộ lọc.', 'Try dropping a filter.')} />
      ) : (
        <div className="panel overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-ink/60">
              <tr>
                <th scope="col" className="px-4 py-3 font-semibold">{tr('Tên', 'Name')}</th>
                <th scope="col" className="hidden px-4 py-3 font-semibold md:table-cell">Email</th>
                <th scope="col" className="hidden px-4 py-3 font-semibold sm:table-cell">{tr('Vai trò', 'Role')}</th>
                <th scope="col" className="px-4 py-3 font-semibold">{tr('Trạng thái', 'Status')}</th>
                <th scope="col" className="hidden px-4 py-3 font-semibold lg:table-cell">{tr('Chuyến', 'Trips')}</th>
                <th scope="col" className="hidden px-4 py-3 font-semibold lg:table-cell">{tr('Hoạt động gần nhất', 'Last active')}</th>
                <th scope="col" className="px-4 py-3 text-right font-semibold">
                  <span className="sr-only">{tr('Thao tác', 'Actions')}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {users.data.items.map((user) => (
                <tr key={user.id} className="cursor-pointer border-t border-forest/8 hover:bg-gold/6" onClick={() => navigate(`/app/admin/users/${user.id}`)}>
                  <td className="px-4 py-2.5">
                    <Link to={`/app/admin/users/${user.id}`} onClick={(event) => event.stopPropagation()} className="font-semibold hover:underline">
                      {user.name}
                    </Link>
                    <span className="block max-w-[11rem] truncate text-xs text-ink/60 md:hidden">{user.email}</span>
                  </td>
                  <td className="hidden px-4 py-2.5 text-ink/70 md:table-cell">{user.email}</td>
                  <td className="hidden px-4 py-2.5 sm:table-cell">{roleName(user.role, tr)}</td>
                  <td className="px-4 py-2.5">
                    <StatusBadge status={user.status} />
                  </td>
                  <td className="tabular hidden px-4 py-2.5 lg:table-cell">{user.trips}</td>
                  <td className="tabular hidden px-4 py-2.5 text-xs text-ink/55 lg:table-cell">{user.lastActiveAt ? new Date(user.lastActiveAt).toLocaleDateString(language === 'vi' ? 'vi-VN' : 'en-US') : '—'}</td>
                  <td className="px-4 py-2.5" onClick={(event) => event.stopPropagation()}>
                    <RowActions user={user} ask={ask} self={user.id === me.id} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <DeviceOnlyNote feature="admin-users">{tr('Máy chủ chưa có API người dùng; danh sách là các tài khoản trên trình duyệt này.', 'The server has no users API yet; this lists the accounts in this browser.')}</DeviceOnlyNote>
        {pages > 1 && (
          <div className="flex items-center gap-2 text-sm">
            <button type="button" className="btn-ghost btn-sm" disabled={page <= 1} onClick={() => setPage(page - 1)} aria-label={tr('Trang trước', 'Previous page')}>
              <ChevronLeft size={15} />
            </button>
            <span className="tabular text-ink/60">
              {page}/{pages}
            </span>
            <button type="button" className="btn-ghost btn-sm" disabled={page >= pages} onClick={() => setPage(page + 1)} aria-label={tr('Trang sau', 'Next page')}>
              <ChevronRight size={15} />
            </button>
          </div>
        )}
      </div>
      {sheet}
    </>
  )
}

/** UC 6.5 "View users' accounts": profile (UC 6.11) and activity history (UC 6.10) of one account, with the same actions. */
export function UserDetailPage() {
  const { id = '' } = useParams()
  const { tr, language } = useTr()
  const navigate = useNavigate()
  const detail = useQuery({ queryKey: ['admin-user', id], queryFn: () => getUser(id), retry: false })
  const { ask, sheet, me } = useUserActions(() => navigate('/app/admin/users', { replace: true }))
  const user = detail.data?.user
  const profile = detail.data?.profile

  if (detail.isLoading) return <Skeleton className="h-96" />
  if (!user && detail.isError && !isNotFound(detail.error)) return <LoadError onRetry={() => detail.refetch()} />
  if (!user)
    return (
      <EmptyState
        title={tr('Không tìm thấy tài khoản', 'Account not found')}
        body={tr('Có thể đã bị xoá.', 'It may have been deleted.')}
        action={
          <Link to="/app/admin/users" className="btn-gold">
            {tr('Về danh sách', 'Back to the list')}
          </Link>
        }
      />
    )

  const picked = profile ? categoryIds.filter((cat) => (profile.interests[cat] ?? 0) >= 0.7) : []
  return (
    <>
      <PageHeader
        kicker={
          <Link to="/app/admin/users" className="inline-flex items-center gap-1.5 hover:underline">
            <ArrowLeft size={14} aria-hidden="true" /> {tr('Người dùng', 'Users')}
          </Link>
        }
        title={user.name}
        subtitle={user.email}
        actions={<RowActions user={user} ask={ask} self={user.id === me.id} />}
      />
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)]">
        <section className="panel p-5" aria-labelledby="profile-title">
          <h2 id="profile-title" className="text-sm font-bold text-ink">
            {tr('Hồ sơ', 'Profile')}
          </h2>
          <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
            <dt className="text-ink/55">{tr('Vai trò', 'Role')}</dt>
            <dd>{roleName(user.role, tr)}</dd>
            <dt className="text-ink/55">{tr('Trạng thái', 'Status')}</dt>
            <dd>
              <StatusBadge status={user.status} /> {user.blockedReason && <span className="text-xs text-ink/55">· {user.blockedReason}</span>}
            </dd>
            <dt className="text-ink/55">{tr('Điện thoại', 'Phone')}</dt>
            <dd>{user.phone || '—'}</dd>
            <dt className="text-ink/55">{tr('Ngày tạo', 'Created')}</dt>
            <dd>{user.createdAt ? new Date(user.createdAt).toLocaleDateString(language === 'vi' ? 'vi-VN' : 'en-US') : '—'}</dd>
            <dt className="text-ink/55">{tr('Số chuyến', 'Trips')}</dt>
            <dd className="tabular">{user.trips}</dd>
            {profile && (
              <>
                <dt className="text-ink/55">{tr('Nhịp độ', 'Pace')}</dt>
                <dd>{{ slow: tr('Thong thả', 'Slow'), balanced: tr('Vừa phải', 'Balanced'), fast: tr('Nhiều điểm', 'Packed') }[profile.pace]}</dd>
                <dt className="text-ink/55">{tr('Di chuyển', 'Transport')}</dt>
                <dd>{{ walk: tr('Đi bộ', 'Walk'), bike: tr('Xe máy', 'Motorbike'), taxi: 'Taxi' }[profile.transport]}</dd>
                <dt className="text-ink/55">{tr('Sở thích', 'Interests')}</dt>
                <dd>{picked.length ? picked.map((cat) => tr(categories[cat].vi, categories[cat].en)).join(', ') : '—'}</dd>
                <dt className="text-ink/55">{tr('Ăn kiêng', 'Dietary')}</dt>
                <dd>{profile.dietary.length ? profile.dietary.join(', ') : '—'}</dd>
                <dt className="text-ink/55">{tr('Đã lưu', 'Saved')}</dt>
                <dd className="tabular">{profile.saved.length}</dd>
              </>
            )}
          </dl>
        </section>
        <section className="panel p-5" aria-labelledby="activity-title">
          <h2 id="activity-title" className="mb-3 text-sm font-bold text-ink">
            {tr('Lịch sử hoạt động', 'Activity history')}
          </h2>
          <ActivityList userId={user.id} />
        </section>
      </div>
      {sheet}
    </>
  )
}
