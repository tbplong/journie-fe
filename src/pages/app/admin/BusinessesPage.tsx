import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Building2, Loader2, Plus } from 'lucide-react'
import { normalizePhone, validPhone } from '../../../api/auth'
import { ApiError } from '../../../api/http'
import { createBusiness, listBusinesses, type Business, type NewBusiness } from '../../../api/staff'
import { PageHeader } from '../../../components/PageHeader'
import { DeviceOnlyNote } from '../../../components/ui/DeviceOnlyNote'
import { EmptyState, Skeleton } from '../../../components/ui/primitives'
import { Sheet } from '../../../components/ui/Sheet'
import { useTr } from '../../../hooks/useTr'
import { toast } from '../../../store/toastStore'
import { StatusBadge } from '../../../components/admin/StatusBadge'

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const INPUT = 'mt-1.5 h-11 w-full border border-forest/25 bg-white px-3 text-sm outline-none focus:border-terracotta'

/** UC 5.17 "Create business account" and the list of businesses. The private model step (UC 5.18) waits for the backend. */
export function BusinessesPage() {
  const { tr, language } = useTr()
  const client = useQueryClient()
  const list = useQuery({ queryKey: ['businesses'], queryFn: listBusinesses })
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<NewBusiness>({ companyName: '', ownerName: '', ownerEmail: '', phone: '', plan: 'starter' })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [invite, setInvite] = useState<{ business: Business; devLink?: string } | null>(null)

  const create = useMutation({
    mutationFn: createBusiness,
    onSuccess: (result) => {
      client.invalidateQueries({ queryKey: ['businesses'] })
      client.invalidateQueries({ queryKey: ['admin-users'] })
      setInvite(result)
      setForm({ companyName: '', ownerName: '', ownerEmail: '', phone: '', plan: 'starter' })
      toast('success', tr('Đã tạo tài khoản doanh nghiệp', 'Business account created'), tr('Đã gửi lời mời cho chủ doanh nghiệp.', 'An invite went to the owner.'))
    },
    onError: (error) => setErrors(error instanceof ApiError && error.code === 'email_taken' ? { ownerEmail: tr('Email này đã có tài khoản.', 'This email already has an account.') } : { companyName: tr('Chưa tạo được, thử lại nhé.', 'Could not create it, try again.') }),
  })

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const found: Record<string, string> = {}
    if (form.companyName.trim().length < 2) found.companyName = tr('Nhập tên doanh nghiệp.', 'Enter the company name.')
    if (form.ownerName.trim().length < 2) found.ownerName = tr('Nhập tên chủ tài khoản.', 'Enter the owner’s name.')
    if (!EMAIL.test(form.ownerEmail.trim())) found.ownerEmail = tr('Email chưa đúng dạng.', 'This email does not look right.')
    if (form.phone.trim() && !validPhone(normalizePhone(form.phone))) found.phone = tr('Số điện thoại chưa đúng.', 'This phone number does not look right.')
    setErrors(found)
    if (!Object.keys(found).length) create.mutate(form)
  }

  const input = (key: keyof NewBusiness, label: string, type = 'text') => (
    <div>
      <label htmlFor={`b-${key}`} className="block text-[0.8rem] font-semibold text-ink/75">
        {label}
      </label>
      <input id={`b-${key}`} type={type} value={form[key]} onChange={(event) => setForm({ ...form, [key]: event.target.value })} aria-invalid={!!errors[key]} className={INPUT} />
      {errors[key] && <p className="mt-1 text-xs text-pomegranate">{errors[key]}</p>}
    </div>
  )

  return (
    <>
      <PageHeader
        title={tr('Doanh nghiệp', 'Businesses')}
        subtitle={tr('Tài khoản cho đối tác: họ xem số liệu địa điểm của mình và quản lý nhân viên.', 'Accounts for partners: they see their places’ numbers and manage their staff.')}
        actions={
          <button type="button" className="btn-gold btn-sm" onClick={() => setOpen(true)}>
            <Plus size={15} aria-hidden="true" /> {tr('Tạo doanh nghiệp', 'New business')}
          </button>
        }
      />
      {list.isLoading ? (
        <Skeleton className="h-64" />
      ) : !list.data?.length ? (
        <EmptyState title={tr('Chưa có doanh nghiệp nào', 'No businesses yet')} body={tr('Tạo tài khoản đầu tiên cho một đối tác.', 'Create the first account for a partner.')} />
      ) : (
        <div className="panel overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-ink/60">
              <tr>
                <th scope="col" className="px-4 py-3 font-semibold">{tr('Doanh nghiệp', 'Business')}</th>
                <th scope="col" className="hidden px-4 py-3 font-semibold sm:table-cell">{tr('Chủ tài khoản', 'Owner')}</th>
                <th scope="col" className="hidden px-4 py-3 font-semibold md:table-cell">{tr('Gói', 'Plan')}</th>
                <th scope="col" className="hidden px-4 py-3 font-semibold md:table-cell">{tr('Nhân viên', 'Staff')}</th>
                <th scope="col" className="px-4 py-3 font-semibold">{tr('Trạng thái', 'Status')}</th>
                <th scope="col" className="hidden px-4 py-3 font-semibold lg:table-cell">{tr('Ngày tạo', 'Created')}</th>
              </tr>
            </thead>
            <tbody>
              {list.data.map((business) => (
                <tr key={business.id} className="border-t border-forest/8">
                  <td className="px-4 py-2.5 font-semibold">
                    <Building2 size={14} className="mr-1.5 inline text-lapis" aria-hidden="true" />
                    {business.name}
                    <span className="block max-w-[12rem] truncate text-xs font-normal text-ink/60 sm:hidden">{business.ownerEmail}</span>
                  </td>
                  <td className="hidden px-4 py-2.5 sm:table-cell">
                    {business.ownerName}
                    <span className="block text-xs text-ink/55">{business.ownerEmail}</span>
                  </td>
                  <td className="hidden px-4 py-2.5 md:table-cell">{business.plan === 'pro' ? 'Pro' : 'Starter'}</td>
                  <td className="tabular hidden px-4 py-2.5 md:table-cell">{business.employees}</td>
                  <td className="px-4 py-2.5">
                    <StatusBadge status={business.status} />
                  </td>
                  <td className="tabular hidden px-4 py-2.5 text-xs text-ink/55 lg:table-cell">{business.createdAt ? new Date(business.createdAt).toLocaleDateString(language === 'vi' ? 'vi-VN' : 'en-US') : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <DeviceOnlyNote feature="businesses" className="mt-4" />

      <Sheet
        open={open}
        onClose={() => {
          setOpen(false)
          setInvite(null)
          setErrors({})
        }}
        title={tr('Tạo tài khoản doanh nghiệp', 'Create a business account')}
      >
        {invite ? (
          <div className="space-y-3 text-sm">
            <p>{tr(`Đã tạo “${invite.business.name}”. Chủ doanh nghiệp nhận email mời đặt mật khẩu.`, `Created “${invite.business.name}”. The owner gets an email to set a password.`)}</p>
            {invite.devLink && (
              <p className="border border-dashed border-forest/25 p-3 text-xs">
                {tr('Chế độ thử (chưa gửi được email): ', 'Demo mode (no mail is sent yet): ')}
                <a href={invite.devLink} className="font-semibold text-lapis underline">
                  {tr('liên kết mời', 'invite link')}
                </a>
              </p>
            )}
            <button type="button" className="btn-gold btn-sm" onClick={() => setInvite(null)}>
              {tr('Tạo thêm', 'Create another')}
            </button>
          </div>
        ) : (
          <form onSubmit={submit} noValidate className="space-y-4">
            {input('companyName', tr('Tên doanh nghiệp', 'Company name'))}
            {input('ownerName', tr('Tên chủ tài khoản', 'Owner name'))}
            {input('ownerEmail', tr('Email chủ tài khoản', 'Owner email'), 'email')}
            {input('phone', tr('Số điện thoại (không bắt buộc)', 'Phone (optional)'), 'tel')}
            <div>
              <label htmlFor="b-plan" className="block text-[0.8rem] font-semibold text-ink/75">
                {tr('Gói dịch vụ', 'Plan')}
              </label>
              <select id="b-plan" value={form.plan} onChange={(event) => setForm({ ...form, plan: event.target.value as NewBusiness['plan'] })} className={INPUT}>
                <option value="starter">Starter</option>
                <option value="pro">Pro</option>
              </select>
            </div>
            <div>
              <p className="block text-[0.8rem] font-semibold text-ink/75">{tr('Mô hình riêng', 'Private model')}</p>
              <p className="mt-1 text-xs text-ink/55">{tr('Dùng mô hình chung. Gán mô hình riêng cần API mô hình từ máy chủ (chưa có).', 'Uses the shared model. Assigning a private model needs a models API from the server (not there yet).')}</p>
            </div>
            <button type="submit" className="btn-gold btn-sm" disabled={create.isPending}>
              {create.isPending && <Loader2 size={15} className="animate-spin" aria-hidden="true" />}
              {tr('Tạo và gửi lời mời', 'Create and send invite')}
            </button>
          </form>
        )}
      </Sheet>
    </>
  )
}
