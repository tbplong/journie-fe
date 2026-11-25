import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { BellRing, Loader2, Mail, Send, Smartphone } from 'lucide-react'
import { listUsers } from '../../../api/admin'
import { ApiError } from '../../../api/http'
import { listChannels, listSent, sendNotification, type ChannelId } from '../../../api/notifications'
import { PageHeader } from '../../../components/PageHeader'
import { ConfirmSheet } from '../../../components/ui/ConfirmSheet'
import { DeviceOnlyNote } from '../../../components/ui/DeviceOnlyNote'
import { Skeleton } from '../../../components/ui/primitives'
import { useTr } from '../../../hooks/useTr'
import { useAuthStore } from '../../../store/authStore'
import { toast } from '../../../store/toastStore'

const CHANNEL_ICON = { in_app: BellRing, email: Mail, push: Smartphone }
const INPUT = 'mt-1.5 w-full border border-forest/25 bg-white px-3 text-sm outline-none focus:border-terracotta'

/** UC 6.12 "View channel list" → UC 6.9 "Choose channel" → UC 6.13 "Send notification", with what was sent before. */
export function AdminNotificationsPage() {
  const { tr, language } = useTr()
  const me = useAuthStore((state) => state.user)!
  const client = useQueryClient()
  const channels = useQuery({ queryKey: ['channels'], queryFn: listChannels })
  const sent = useQuery({ queryKey: ['sent-notifications'], queryFn: listSent })
  const travelers = useQuery({ queryKey: ['admin-users', 'notify'], queryFn: () => listUsers({ status: 'active', role: 'traveler', pageSize: 200 }) })
  const [channel, setChannel] = useState<ChannelId | null>(null)
  const [audience, setAudience] = useState<'all' | 'users'>('all')
  const [userIds, setUserIds] = useState<string[]>([])
  const [form, setForm] = useState({ titleVi: '', titleEn: '', bodyVi: '', bodyEn: '', link: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [confirm, setConfirm] = useState(false)

  const send = useMutation({
    mutationFn: () => sendNotification({ channel: channel!, audience: audience === 'all' ? { kind: 'all' } : { kind: 'users', userIds }, ...form, link: form.link.trim() || undefined }, me.id),
    onSuccess: (result) => {
      setConfirm(false)
      setForm({ titleVi: '', titleEn: '', bodyVi: '', bodyEn: '', link: '' })
      setUserIds([])
      client.invalidateQueries({ queryKey: ['sent-notifications'] })
      toast('success', tr('Đã gửi thông báo', 'Notification sent'), tr(`Tới ${result.delivered} người dùng.`, `To ${result.delivered} users.`))
    },
    onError: (error) => {
      setConfirm(false)
      toast('danger', error instanceof ApiError && error.code === 'channel-unavailable' ? tr('Kênh này chưa gửi được', 'This channel cannot deliver yet') : tr('Chưa gửi được', 'Could not send it'))
    },
  })

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const found: Record<string, string> = {}
    if (form.titleVi.trim().length < 3) found.titleVi = tr('Cần tiêu đề tiếng Việt (ít nhất 3 ký tự).', 'A Vietnamese title is needed (3+ characters).')
    if (form.titleEn.trim().length < 3) found.titleEn = tr('Cần tiêu đề tiếng Anh (ít nhất 3 ký tự).', 'An English title is needed (3+ characters).')
    if (audience === 'users' && !userIds.length) found.audience = tr('Chọn ít nhất một người nhận.', 'Pick at least one recipient.')
    if (form.link.trim() && !form.link.trim().startsWith('/app')) found.link = tr('Liên kết phải là một trang trong ứng dụng, bắt đầu bằng /app.', 'The link must be a page in the app, starting with /app.')
    setErrors(found)
    if (!Object.keys(found).length) setConfirm(true)
  }

  const field = (key: keyof typeof form, label: string, multiline = false) => (
    <div>
      <label htmlFor={`n-${key}`} className="block text-[0.8rem] font-semibold text-ink/75">
        {label}
      </label>
      {multiline ? (
        <textarea id={`n-${key}`} rows={3} maxLength={400} value={form[key]} onChange={(event) => setForm({ ...form, [key]: event.target.value })} className={`${INPUT} resize-none py-2`} />
      ) : (
        <input id={`n-${key}`} maxLength={120} value={form[key]} onChange={(event) => setForm({ ...form, [key]: event.target.value })} className={`${INPUT} h-11`} aria-invalid={!!errors[key]} />
      )}
      {errors[key] && <p className="mt-1 text-xs text-pomegranate">{errors[key]}</p>}
    </div>
  )

  return (
    <>
      <PageHeader title={tr('Gửi thông báo', 'Send notifications')} subtitle={tr('Chọn kênh, soạn nội dung hai thứ tiếng rồi gửi cho mọi người hoặc vài người.', 'Pick a channel, write it in both languages, and send it to everyone or a few people.')} />
      <section aria-labelledby="channels" className="mb-6">
        <h2 id="channels" className="mb-3 text-sm font-bold text-ink">
          {tr('Kênh gửi', 'Channels')}
        </h2>
        {channels.isLoading ? (
          <Skeleton className="h-24" />
        ) : (
          <div className="grid gap-3 sm:grid-cols-3" role="radiogroup" aria-label={tr('Chọn kênh', 'Choose a channel')}>
            {(channels.data ?? []).map((entry) => {
              const Icon = CHANNEL_ICON[entry.id]
              const name = { in_app: tr('Trong ứng dụng', 'In-app'), email: 'Email', push: tr('Thông báo đẩy', 'Push') }[entry.id]
              return (
                <button
                  key={entry.id}
                  type="button"
                  role="radio"
                  aria-checked={channel === entry.id}
                  disabled={!entry.enabled}
                  onClick={() => setChannel(entry.id)}
                  className={`panel flex items-start gap-3 p-4 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-55 ${channel === entry.id ? '!border-gold bg-gold/10' : 'hover:border-gold'}`}
                >
                  <Icon size={20} className="mt-0.5 text-lapis" aria-hidden="true" />
                  <span>
                    <span className="block font-bold">{name}</span>
                    <span className="block text-xs text-ink/60">
                      {entry.enabled
                        ? tr('Sẵn sàng', 'Ready')
                        : entry.reason === 'no-mail-server'
                          ? tr('Chưa có máy chủ gửi mail', 'No mail server yet')
                          : entry.reason === 'no-push-server'
                            ? tr('Chưa có máy chủ thông báo đẩy', 'No push server yet')
                            : tr('Chưa dùng được', 'Not available')}
                    </span>
                  </span>
                </button>
              )
            })}
          </div>
        )}
      </section>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <form onSubmit={submit} noValidate className="panel space-y-4 p-5" aria-labelledby="compose">
          <h2 id="compose" className="text-sm font-bold text-ink">
            {channel ? tr('Soạn thông báo', 'Write the notification') : tr('Chọn một kênh ở trên để soạn', 'Pick a channel above to write')}
          </h2>
          {/* Until a channel is picked every field is really disabled, for the keyboard too, not only greyed out */}
          <fieldset disabled={!channel} className={`space-y-4 ${channel ? '' : 'opacity-50'}`}>
            <fieldset>
              <legend className="text-[0.8rem] font-semibold text-ink/75">{tr('Người nhận', 'Recipients')}</legend>
              <div className="mt-1.5 flex gap-4 text-sm">
                <label className="flex items-center gap-1.5">
                  <input type="radio" name="audience" checked={audience === 'all'} onChange={() => setAudience('all')} className="accent-[#d96745]" /> {tr('Mọi lữ khách', 'Every traveler')}
                </label>
                <label className="flex items-center gap-1.5">
                  <input type="radio" name="audience" checked={audience === 'users'} onChange={() => setAudience('users')} className="accent-[#d96745]" /> {tr('Chọn người', 'Pick people')}
                </label>
              </div>
              {audience === 'users' && (
                <select multiple value={userIds} onChange={(event) => setUserIds([...event.target.selectedOptions].map((option) => option.value))} aria-label={tr('Người nhận', 'Recipients')} className="mt-2 h-32 w-full border border-forest/25 bg-white p-1 text-sm">
                  {(travelers.data?.items ?? []).map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name} · {user.email}
                    </option>
                  ))}
                </select>
              )}
              {errors.audience && <p className="mt-1 text-xs text-pomegranate">{errors.audience}</p>}
            </fieldset>
            <div className="grid gap-4 sm:grid-cols-2">
              {field('titleVi', tr('Tiêu đề (tiếng Việt)', 'Title (Vietnamese)'))}
              {field('titleEn', tr('Tiêu đề (tiếng Anh)', 'Title (English)'))}
              {field('bodyVi', tr('Nội dung (tiếng Việt)', 'Message (Vietnamese)'), true)}
              {field('bodyEn', tr('Nội dung (tiếng Anh)', 'Message (English)'), true)}
            </div>
            {field('link', tr('Mở trang khi bấm (không bắt buộc, ví dụ /app/discover)', 'Page to open (optional, e.g. /app/discover)'))}
            <button type="submit" className="btn-gold btn-sm" disabled={!channel || send.isPending}>
              <Send size={15} aria-hidden="true" /> {tr('Gửi', 'Send')}
            </button>
          </fieldset>
          <DeviceOnlyNote feature="notifications-admin">
            {tr('Máy chủ chưa có API thông báo; tin chỉ tới các tài khoản trên trình duyệt này.', 'The server has no notifications API yet; messages only reach the accounts in this browser.')}
          </DeviceOnlyNote>
        </form>

        <section className="panel p-5" aria-labelledby="history">
          <h2 id="history" className="text-sm font-bold text-ink">
            {tr('Đã gửi', 'Sent')}
          </h2>
          {(sent.data ?? []).length === 0 ? (
            <p className="mt-2 text-sm text-ink/55">{tr('Chưa gửi thông báo nào.', 'Nothing sent yet.')}</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {(sent.data ?? []).map((entry) => (
                <li key={entry.id} className="border-b border-forest/8 pb-2 text-sm">
                  <p className="font-semibold">{language === 'vi' ? entry.titleVi : entry.titleEn}</p>
                  <p className="text-xs text-ink/55">
                    {new Date(entry.at).toLocaleString(language === 'vi' ? 'vi-VN' : 'en-US')} · {tr(`${entry.delivered} người nhận`, `${entry.delivered} recipients`)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
      <ConfirmSheet
        open={confirm}
        onClose={() => setConfirm(false)}
        onConfirm={() => send.mutate()}
        busy={send.isPending}
        title={tr('Gửi thông báo này?', 'Send this notification?')}
        description={audience === 'all' ? tr('Mọi lữ khách đang hoạt động sẽ nhận được.', 'Every active traveler will get it.') : tr(`${userIds.length} người sẽ nhận được.`, `${userIds.length} people will get it.`)}
        confirmLabel={tr('Gửi ngay', 'Send now')}
      >
        <p className="text-sm font-semibold">{language === 'vi' ? form.titleVi : form.titleEn}</p>
        {send.isPending && <Loader2 size={15} className="mt-2 animate-spin" aria-hidden="true" />}
      </ConfirmSheet>
    </>
  )
}
