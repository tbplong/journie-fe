import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, Loader2, Lock, LockOpen, Search, Trash2, UserPlus } from 'lucide-react'
import { normalizePhone, validPhone } from '../../../api/auth'
import { ApiError } from '../../../api/http'
import { createEmployee, deleteEmployee, listEmployees, RESOURCES, setEmployeeStatus, updateEmployee, type Employee, type Resource } from '../../../api/staff'
import { StatusBadge } from '../../../components/admin/StatusBadge'
import { PageHeader } from '../../../components/PageHeader'
import { ConfirmSheet } from '../../../components/ui/ConfirmSheet'
import { DeviceOnlyNote } from '../../../components/ui/DeviceOnlyNote'
import { EmptyState, Skeleton } from '../../../components/ui/primitives'
import { Sheet } from '../../../components/ui/Sheet'
import { useTr } from '../../../hooks/useTr'
import { useAuthStore, type AccountStatus, type StaffRole } from '../../../store/authStore'
import { toast } from '../../../store/toastStore'

const PAGE_SIZE = 10
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const INPUT = 'mt-1.5 h-11 w-full border border-forest/25 bg-white px-3 text-sm outline-none focus:border-terracotta'
const STAFF_ROLES: StaffRole[] = ['manager', 'planner', 'viewer']

function useLabels() {
  const { tr } = useTr()
  const role = (value: StaffRole | undefined) => ({ manager: tr('Quản lý', 'Manager'), planner: tr('Lên lịch', 'Planner'), viewer: tr('Chỉ xem', 'Viewer') })[value ?? 'viewer']
  const roleHint = (value: StaffRole) => ({ manager: tr('Làm mọi việc, kể cả quản lý nhân viên.', 'Everything, including managing staff.'), planner: tr('Sửa địa điểm và xem báo cáo.', 'Edit places and see reports.'), viewer: tr('Chỉ xem số liệu.', 'Only sees the numbers.') })[value]
  const resource = (value: Resource) => ({ dashboard: tr('Bảng điều khiển', 'Dashboard'), places: tr('Địa điểm của doanh nghiệp', 'Business places'), reports: tr('Báo cáo & xuất file', 'Reports & export'), employees: tr('Quản lý nhân viên', 'Staff management') })[value]
  return { role, roleHint, resource }
}

/** UC 5.16: what the employee may reach, one checkbox per business resource. */
function ResourcePicker({ value, onChange }: { value: Resource[]; onChange: (value: Resource[]) => void }) {
  const { tr } = useTr()
  const labels = useLabels()
  return (
    <fieldset>
      <legend className="text-[0.8rem] font-semibold text-ink/75">{tr('Được truy cập', 'Can access')}</legend>
      <div className="mt-1.5 grid gap-1.5 sm:grid-cols-2">
        {RESOURCES.map((resource) => (
          <label key={resource} className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={value.includes(resource)} onChange={(event) => onChange(event.target.checked ? [...value, resource] : value.filter((entry) => entry !== resource))} className="accent-[#d96745]" />
            {labels.resource(resource)}
          </label>
        ))}
      </div>
    </fieldset>
  )
}

function RolePicker({ id, value, onChange }: { id: string; value: StaffRole; onChange: (value: StaffRole) => void }) {
  const { tr } = useTr()
  const labels = useLabels()
  return (
    <div>
      <label htmlFor={id} className="block text-[0.8rem] font-semibold text-ink/75">
        {tr('Vai trò', 'Role')}
      </label>
      <select id={id} value={value} onChange={(event) => onChange(event.target.value as StaffRole)} className={INPUT}>
        {STAFF_ROLES.map((role) => (
          <option key={role} value={role}>
            {labels.role(role)}
          </option>
        ))}
      </select>
      <p className="mt-1 text-xs text-ink/55">{labels.roleHint(value)}</p>
    </div>
  )
}

/** UC 5.9 "View employee list" with details (5.10), block (5.11), delete (5.12), role (5.13) and create (5.14-5.16). */
export function EmployeesPage() {
  const { tr, language } = useTr()
  const labels = useLabels()
  const user = useAuthStore((state) => state.user)!
  const businessId = user.businessId ?? user.id
  const client = useQueryClient()
  const [q, setQ] = useState('')
  const [status, setStatus] = useState<AccountStatus | 'all'>('all')
  const [page, setPage] = useState(1)
  const [creating, setCreating] = useState(false)
  const [viewing, setViewing] = useState<Employee | null>(null)
  const [deleting, setDeleting] = useState<Employee | null>(null)
  const list = useQuery({ queryKey: ['employees', businessId, q, status, page], queryFn: () => listEmployees(businessId, { q, status, page, pageSize: PAGE_SIZE }) })
  const pages = Math.max(1, Math.ceil((list.data?.total ?? 0) / PAGE_SIZE))
  // Deleting the last person on the last page leaves that page empty: step back to the last page that has someone
  if (list.data && page > pages) setPage(pages)
  const refresh = () => client.invalidateQueries({ queryKey: ['employees', businessId] })

  const block = useMutation({
    mutationFn: ({ id, next }: { id: string; next: 'active' | 'blocked' }) => setEmployeeStatus(businessId, id, next),
    onMutate: async ({ id, next }) => {
      setViewing((current) => (current?.id === id ? { ...current, status: next } : current))
    },
    onSuccess: (employee) => {
      refresh()
      setViewing((current) => (current?.id === employee.id ? employee : current))
      toast('success', employee.status === 'blocked' ? tr('Đã khoá nhân viên', 'Employee blocked') : tr('Đã mở khoá nhân viên', 'Employee unblocked'))
    },
    onError: () => {
      refresh()
      toast('danger', tr('Chưa đổi được', 'Could not change it'))
    },
  })
  const update = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: { staffRole?: StaffRole; resources?: Resource[] } }) => updateEmployee(businessId, id, patch),
    onSuccess: (employee) => {
      refresh()
      setViewing(employee)
      toast('success', tr('Đã cập nhật quyền', 'Access updated'))
    },
    onError: (error) => toast('danger', error instanceof ApiError && error.status === 403 ? tr('Bạn không có quyền này', 'You are not allowed to do this') : tr('Chưa lưu được', 'Could not save')),
  })
  const remove = useMutation({
    mutationFn: (id: string) => deleteEmployee(businessId, id),
    onSuccess: () => {
      refresh()
      setDeleting(null)
      setViewing(null)
      toast('info', tr('Đã xoá tài khoản nhân viên', 'Employee account deleted'))
    },
    onError: (error) => toast('danger', error instanceof ApiError && error.status === 404 ? tr('Nhân viên này không còn nữa', 'This employee no longer exists') : tr('Chưa xoá được', 'Could not delete it')),
  })

  return (
    <>
      <PageHeader
        title={tr('Nhân viên', 'Employees')}
        subtitle={tr('Ai trong doanh nghiệp được vào Journie và làm được gì.', 'Who in your business can use Journie, and what they can do.')}
        actions={
          <button type="button" className="btn-gold btn-sm" onClick={() => setCreating(true)}>
            <UserPlus size={15} aria-hidden="true" /> {tr('Thêm nhân viên', 'Add employee')}
          </button>
        }
      />
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
            aria-label={tr('Tìm nhân viên', 'Search employees')}
            className="h-10 w-full border border-forest/20 bg-white pl-9 pr-3 text-sm outline-none focus:border-lapis"
          />
        </div>
        <div role="group" aria-label={tr('Trạng thái', 'Status')} className="flex flex-wrap gap-1.5">
          {(['all', 'active', 'invited', 'blocked'] as const).map((value) => (
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
              {{ all: tr('Tất cả', 'All'), active: tr('Hoạt động', 'Active'), invited: tr('Chờ kích hoạt', 'Invited'), blocked: tr('Đã khoá', 'Blocked') }[value]}
            </button>
          ))}
        </div>
      </div>
      {list.isLoading ? (
        <Skeleton className="h-72" />
      ) : list.isError ? (
        <p role="alert" className="panel p-6 text-sm text-pomegranate">
          {tr('Chưa tải được danh sách.', 'Could not load the list.')}
        </p>
      ) : !list.data?.items.length ? (
        <EmptyState
          title={q || status !== 'all' ? tr('Không có ai khớp', 'Nobody matches') : tr('Chưa có nhân viên nào', 'No employees yet')}
          body={tr('Thêm nhân viên để họ cùng xem số liệu và quản lý địa điểm.', 'Add employees so they can see the numbers and manage places with you.')}
          action={
            <button type="button" className="btn-gold" onClick={() => setCreating(true)}>
              <UserPlus size={16} aria-hidden="true" /> {tr('Thêm nhân viên', 'Add employee')}
            </button>
          }
        />
      ) : (
        <div className="panel overflow-x-auto">
          <table className="w-full min-w-[40rem] text-sm">
            <thead className="text-left text-xs text-ink/60">
              <tr>
                <th scope="col" className="px-4 py-3 font-semibold">{tr('Tên', 'Name')}</th>
                <th scope="col" className="px-4 py-3 font-semibold">Email</th>
                <th scope="col" className="px-4 py-3 font-semibold">{tr('Vai trò', 'Role')}</th>
                <th scope="col" className="px-4 py-3 font-semibold">{tr('Trạng thái', 'Status')}</th>
                <th scope="col" className="px-4 py-3 font-semibold">{tr('Ngày tạo', 'Created')}</th>
                <th scope="col" className="px-4 py-3">
                  <span className="sr-only">{tr('Thao tác', 'Actions')}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {list.data.items.map((employee) => (
                <tr key={employee.id} className="border-t border-forest/8">
                  <td className="px-4 py-2.5">
                    <button type="button" className="font-semibold hover:underline" onClick={() => setViewing(employee)}>
                      {employee.name}
                    </button>
                  </td>
                  <td className="px-4 py-2.5 text-ink/70">{employee.email}</td>
                  <td className="px-4 py-2.5">{labels.role(employee.staffRole)}</td>
                  <td className="px-4 py-2.5">
                    <StatusBadge status={employee.status} />
                  </td>
                  <td className="tabular px-4 py-2.5 text-xs text-ink/55">{employee.createdAt ? new Date(employee.createdAt).toLocaleDateString(language === 'vi' ? 'vi-VN' : 'en-US') : '—'}</td>
                  <td className="px-4 py-2.5">
                    <span className="flex justify-end gap-1">
                      {employee.status === 'blocked' ? (
                        <button type="button" className="grid size-8 place-items-center text-ink/50 hover:text-jade-ink" onClick={() => block.mutate({ id: employee.id, next: 'active' })} aria-label={tr(`Mở khoá ${employee.name}`, `Unblock ${employee.name}`)}>
                          <LockOpen size={15} />
                        </button>
                      ) : (
                        <button type="button" className="grid size-8 place-items-center text-ink/50 hover:text-sun-ink" onClick={() => block.mutate({ id: employee.id, next: 'blocked' })} aria-label={tr(`Khoá ${employee.name}`, `Block ${employee.name}`)}>
                          <Lock size={15} />
                        </button>
                      )}
                      <button type="button" className="grid size-8 place-items-center text-ink/50 hover:text-pomegranate" onClick={() => setDeleting(employee)} aria-label={tr(`Xoá ${employee.name}`, `Delete ${employee.name}`)}>
                        <Trash2 size={15} />
                      </button>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <DeviceOnlyNote feature="employees" />
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

      <EmployeeSheet
        employee={viewing}
        onClose={() => setViewing(null)}
        onSave={(patch) => viewing && update.mutate({ id: viewing.id, patch })}
        saving={update.isPending}
        onBlock={(next) => viewing && block.mutate({ id: viewing.id, next })}
        onDelete={() => viewing && setDeleting(viewing)}
      />
      <CreateEmployeeSheet open={creating} onClose={() => setCreating(false)} businessId={businessId} onCreated={refresh} />
      <ConfirmSheet
        open={!!deleting}
        onClose={() => setDeleting(null)}
        danger
        busy={remove.isPending}
        title={tr('Xoá tài khoản nhân viên?', 'Delete this employee account?')}
        description={tr('Người này mất quyền truy cập ngay và không lấy lại được tài khoản.', 'They lose access at once and the account cannot be recovered.')}
        confirmLabel={tr('Xoá vĩnh viễn', 'Delete for good')}
        typeToConfirm={deleting?.name}
        onConfirm={() => deleting && remove.mutate(deleting.id)}
      />
    </>
  )
}

/** UC 5.10 with 5.13 and 5.16: one employee, with role, access and status changes. */
function EmployeeSheet({ employee, onClose, onSave, saving, onBlock, onDelete }: { employee: Employee | null; onClose: () => void; onSave: (patch: { staffRole: StaffRole; resources: Resource[] }) => void; saving: boolean; onBlock: (next: 'active' | 'blocked') => void; onDelete: () => void }) {
  const { tr, language } = useTr()
  const [draft, setDraft] = useState<{ id: string; staffRole: StaffRole; resources: Resource[] } | null>(null)
  if (employee && draft?.id !== employee.id) setDraft({ id: employee.id, staffRole: employee.staffRole ?? 'viewer', resources: employee.resources })
  // Closing drops unsaved changes, so reopening the same person shows what is stored
  if (!employee && draft) setDraft(null)
  const dirty = !!employee && !!draft && (draft.staffRole !== (employee.staffRole ?? 'viewer') || draft.resources.join() !== employee.resources.join())
  return (
    <Sheet
      open={!!employee}
      onClose={onClose}
      title={employee?.name ?? ''}
      description={employee?.email}
      footer={
        employee && (
          <div className="flex flex-wrap justify-between gap-2">
            <span className="flex gap-2">
              {employee.status === 'blocked' ? (
                <button type="button" className="btn-ghost btn-sm" onClick={() => onBlock('active')}>
                  <LockOpen size={15} aria-hidden="true" /> {tr('Mở khoá', 'Unblock')}
                </button>
              ) : (
                <button type="button" className="btn-ghost btn-sm" onClick={() => onBlock('blocked')}>
                  <Lock size={15} aria-hidden="true" /> {tr('Khoá', 'Block')}
                </button>
              )}
              <button type="button" className="btn-ghost btn-sm !text-pomegranate" onClick={onDelete}>
                <Trash2 size={15} aria-hidden="true" /> {tr('Xoá', 'Delete')}
              </button>
            </span>
            <button type="button" className="btn-gold btn-sm" disabled={!dirty || saving} onClick={() => draft && onSave({ staffRole: draft.staffRole, resources: draft.resources })}>
              {saving && <Loader2 size={15} className="animate-spin" aria-hidden="true" />}
              {tr('Lưu quyền', 'Save access')}
            </button>
          </div>
        )
      }
    >
      {employee && draft && (
        <div className="space-y-5">
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
            <dt className="text-ink/55">{tr('Trạng thái', 'Status')}</dt>
            <dd>
              <StatusBadge status={employee.status} />
            </dd>
            <dt className="text-ink/55">{tr('Điện thoại', 'Phone')}</dt>
            <dd>{employee.phone || '—'}</dd>
            <dt className="text-ink/55">{tr('Ngày tạo', 'Created')}</dt>
            <dd>{employee.createdAt ? new Date(employee.createdAt).toLocaleDateString(language === 'vi' ? 'vi-VN' : 'en-US') : '—'}</dd>
            <dt className="text-ink/55">{tr('Hoạt động gần nhất', 'Last active')}</dt>
            <dd>{employee.lastActiveAt ? new Date(employee.lastActiveAt).toLocaleString(language === 'vi' ? 'vi-VN' : 'en-US') : '—'}</dd>
          </dl>
          <RolePicker id="emp-role" value={draft.staffRole} onChange={(staffRole) => setDraft({ ...draft, staffRole })} />
          <ResourcePicker value={draft.resources} onChange={(resources) => setDraft({ ...draft, resources })} />
        </div>
      )}
    </Sheet>
  )
}

/** UC 5.14 "Create employee account": details (5.15), role and access (5.16), then an invite by email. */
function CreateEmployeeSheet({ open, onClose, businessId, onCreated }: { open: boolean; onClose: () => void; businessId: string; onCreated: () => void }) {
  const { tr } = useTr()
  const blank = { name: '', email: '', phone: '', staffRole: 'viewer' as StaffRole, resources: ['dashboard'] as Resource[] }
  const [form, setForm] = useState(blank)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [devLink, setDevLink] = useState<string | null | undefined>(undefined)
  const create = useMutation({
    mutationFn: createEmployee,
    onSuccess: (result) => {
      onCreated()
      setDevLink(result.devLink ?? null)
      setForm(blank)
      toast('success', tr('Đã thêm nhân viên', 'Employee added'), tr('Đã gửi lời mời đặt mật khẩu.', 'An invite to set a password was sent.'))
    },
    onError: (error) => setErrors(error instanceof ApiError && error.code === 'email_taken' ? { email: tr('Email này đã có tài khoản.', 'This email already has an account.') } : { name: tr('Chưa thêm được, thử lại nhé.', 'Could not add them, try again.') }),
  })
  const submit = (event: FormEvent) => {
    event.preventDefault()
    const found: Record<string, string> = {}
    if (form.name.trim().length < 2) found.name = tr('Nhập tên (ít nhất 2 ký tự).', 'Enter a name (2+ characters).')
    if (!EMAIL.test(form.email.trim())) found.email = tr('Email chưa đúng dạng.', 'This email does not look right.')
    if (form.phone.trim() && !validPhone(normalizePhone(form.phone))) found.phone = tr('Số điện thoại chưa đúng.', 'This phone number does not look right.')
    if (!form.resources.length) found.resources = tr('Chọn ít nhất một quyền truy cập.', 'Pick at least one area.')
    setErrors(found)
    if (!Object.keys(found).length) create.mutate({ businessId, ...form })
  }
  const close = () => {
    setDevLink(undefined)
    setErrors({})
    onClose()
  }
  const text = (key: 'name' | 'email' | 'phone', label: string, type = 'text') => (
    <div>
      <label htmlFor={`e-${key}`} className="block text-[0.8rem] font-semibold text-ink/75">
        {label}
      </label>
      <input id={`e-${key}`} type={type} value={form[key]} onChange={(event) => setForm({ ...form, [key]: event.target.value })} aria-invalid={!!errors[key]} className={INPUT} />
      {errors[key] && <p className="mt-1 text-xs text-pomegranate">{errors[key]}</p>}
    </div>
  )
  return (
    <Sheet open={open} onClose={close} title={tr('Thêm nhân viên', 'Add an employee')} description={tr('Nhân viên nhận email mời và tự đặt mật khẩu; bạn không cần gõ mật khẩu cho họ.', 'They get an invite by email and set their own password; you never type one for them.')}>
      {devLink !== undefined ? (
        <div className="space-y-3 text-sm">
          <p>{tr('Đã tạo tài khoản và gửi lời mời.', 'The account is created and the invite sent.')}</p>
          {devLink && (
            <p className="border border-dashed border-forest/25 p-3 text-xs">
              {tr('Chế độ thử (chưa gửi được email): ', 'Demo mode (no mail is sent yet): ')}
              <a href={devLink} className="font-semibold text-lapis underline">
                {tr('liên kết mời', 'invite link')}
              </a>
            </p>
          )}
          <button type="button" className="btn-gold btn-sm" onClick={() => setDevLink(undefined)}>
            {tr('Thêm người khác', 'Add someone else')}
          </button>
        </div>
      ) : (
        <form onSubmit={submit} noValidate className="space-y-4">
          <p className="text-xs font-bold uppercase tracking-wide text-ink/45">{tr('1. Thông tin', '1. Details')}</p>
          {text('name', tr('Họ tên', 'Full name'))}
          {text('email', 'Email', 'email')}
          {text('phone', tr('Số điện thoại (không bắt buộc)', 'Phone (optional)'), 'tel')}
          <p className="pt-2 text-xs font-bold uppercase tracking-wide text-ink/45">{tr('2. Vai trò & quyền', '2. Role & access')}</p>
          <RolePicker id="new-emp-role" value={form.staffRole} onChange={(staffRole) => setForm({ ...form, staffRole })} />
          <ResourcePicker value={form.resources} onChange={(resources) => setForm({ ...form, resources })} />
          {errors.resources && <p className="text-xs text-pomegranate">{errors.resources}</p>}
          <button type="submit" className="btn-gold btn-sm" disabled={create.isPending}>
            {create.isPending && <Loader2 size={15} className="animate-spin" aria-hidden="true" />}
            {tr('Tạo và gửi lời mời', 'Create and send invite')}
          </button>
        </form>
      )}
    </Sheet>
  )
}
