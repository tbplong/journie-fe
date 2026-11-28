import { useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { Link } from 'react-router'
import { useMutation } from '@tanstack/react-query'
import { AnimatePresence, motion, stagger, type Variants } from 'motion/react'
import { Activity, Bell, Camera, Loader2, Mail, Trash2 } from 'lucide-react'
import { changePassword, normalizePhone, removeAvatar, requestEmailChange, requestPasswordReset, updateAccount, uploadAvatar, validPhone } from '../../api/auth'
import { track } from '../../api/analytics'
import { ApiError } from '../../api/http'
import { DeviceOnlyNote } from '../../components/ui/DeviceOnlyNote'
import { Sheet } from '../../components/ui/Sheet'
import { EASE_OUT } from '../../components/motion/variants'
import { PageHeader } from '../../components/PageHeader'
import { useTr } from '../../hooks/useTr'
import { useAuthStore } from '../../store/authStore'
import { toast } from '../../store/toastStore'

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MIN_PASSWORD = 6
const INPUT = 'mt-1.5 h-11 w-full max-w-sm border border-forest/25 bg-white px-3 text-sm outline-none transition-colors focus:border-terracotta'

const page: Variants = { hidden: {}, show: { transition: { delayChildren: stagger(0.1, { startDelay: 0.08 }) } } }
const card: Variants = {
  hidden: { opacity: 0, y: 30, scale: 0.97 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.6, ease: EASE_OUT, delayChildren: stagger(0.06, { startDelay: 0.16 }) } },
}
const row: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE_OUT } },
}

function Field({ id, label, hint, error, children }: { id: string; label: string; hint?: string; error?: string; children: React.ReactNode }) {
  return (
    <motion.div variants={row}>
      <label htmlFor={id} className="block text-[0.8rem] font-semibold text-ink/75">
        {label}
      </label>
      {children}
      <AnimatePresence mode="wait" initial={false}>
        {error ? (
          <motion.p key={error} initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0, x: [0, -5, 5, -3, 3, 0] }} exit={{ opacity: 0, transition: { duration: 0.12 } }} transition={{ duration: 0.38, ease: EASE_OUT }} className="mt-1 text-xs text-pomegranate">
            {error}
          </motion.p>
        ) : (
          hint && (
            <motion.p key="hint" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.12 } }} className="mt-1 text-xs text-ink/50">
              {hint}
            </motion.p>
          )
        )}
      </AnimatePresence>
    </motion.div>
  )
}

function Details() {
  const { tr } = useTr()
  const user = useAuthStore((state) => state.user)!
  const updateUser = useAuthStore((state) => state.updateUser)
  const [name, setName] = useState(user.name)
  const [phone, setPhone] = useState(user.phone ?? '')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [changingEmail, setChangingEmail] = useState(false)

  const save = useMutation({
    mutationFn: updateAccount,
    onSuccess: (saved) => {
      updateUser({ ...user, ...saved })
      setPhone(saved.phone ?? '')
      track({ type: 'account_updated' })
      toast('success', tr('Đã lưu', 'Saved'))
    },
    onError: (error) => {
      const status = error instanceof ApiError ? error.status : 0
      setErrors({ name: status === 422 ? tr('Thông tin chưa hợp lệ, kiểm tra lại nhé.', 'Something is not valid; please check.') : status === 401 ? tr('Phiên đăng nhập đã hết, đăng nhập lại nhé.', 'Your session ended; please sign in again.') : tr('Chưa lưu được, thử lại nhé.', 'Could not save, try again.') })
    },
  })

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const next: Record<string, string> = {}
    if (name.trim().length < 2) next.name = tr('Tên cần ít nhất 2 ký tự.', 'Name needs at least 2 characters.')
    const e164 = phone.trim() ? normalizePhone(phone) : ''
    if (e164 && !validPhone(e164)) next.phone = tr('Số điện thoại chưa đúng.', 'This phone number does not look right.')
    setErrors(next)
    if (Object.keys(next).length === 0) save.mutate({ id: user.id, name, phone: e164 })
  }

  const same = name.trim() === user.name && (phone.trim() ? normalizePhone(phone) : '') === (user.phone ?? '')

  return (
    <motion.form variants={card} onSubmit={submit} noValidate className="panel space-y-4 p-5 sm:p-6" aria-labelledby="details">
      <motion.h2 variants={row} id="details" className="h-display text-xl text-forest">
        {tr('Thông tin của bạn', 'Your details')}
      </motion.h2>
      <Field id="a-name" label={tr('Tên', 'Name')} error={errors.name}>
        <input id="a-name" value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" className={INPUT} />
      </Field>
      <motion.div variants={row}>
        <p className="block text-[0.8rem] font-semibold text-ink/75">Email</p>
        <div className="mt-1.5 flex max-w-sm items-center gap-2">
          <span className="flex h-11 min-w-0 flex-1 items-center truncate border border-forest/15 bg-cream/60 px-3 text-sm">{user.email}</span>
          <button type="button" className="btn-ghost btn-sm shrink-0" onClick={() => setChangingEmail(true)}>
            <Mail size={14} aria-hidden="true" /> {tr('Đổi', 'Change')}
          </button>
        </div>
        {user.pendingEmail && <p className="mt-1 text-xs text-sun-ink">{tr(`Đang chờ xác nhận: ${user.pendingEmail}. Mở liên kết trong hộp thư đó.`, `Waiting for confirmation: ${user.pendingEmail}. Open the link sent there.`)}</p>}
      </motion.div>
      <Field id="a-phone" label={tr('Số điện thoại', 'Phone')} hint={tr('Không bắt buộc. Số Việt Nam viết 09… sẽ lưu thành +849…', 'Optional. A Vietnamese 09… number is stored as +849…')} error={errors.phone}>
        <div className="flex max-w-sm gap-2">
          <input id="a-phone" type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} autoComplete="tel" className={`${INPUT} !max-w-none`} />
          {phone && (
            <button type="button" className="btn-ghost btn-sm mt-1.5 shrink-0" onClick={() => setPhone('')} aria-label={tr('Xoá số điện thoại', 'Remove the phone number')}>
              <Trash2 size={14} aria-hidden="true" />
            </button>
          )}
        </div>
      </Field>
      <motion.div variants={row}>
        <button type="submit" className="btn-gold btn-sm" disabled={save.isPending || same}>
          {save.isPending && <Loader2 size={15} className="animate-spin" aria-hidden="true" />}
          {tr('Lưu', 'Save')}
        </button>
      </motion.div>
      <ChangeEmailSheet open={changingEmail} onClose={() => setChangingEmail(false)} />
    </motion.form>
  )
}

/** UC 5.6: a new address only replaces the old one after its confirmation link is opened; the password is asked first. */
function ChangeEmailSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { tr } = useTr()
  const user = useAuthStore((state) => state.user)!
  const updateUser = useAuthStore((state) => state.updateUser)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  // Set once the link is sent; `devLink` only while no mail can leave this browser
  const [sent, setSent] = useState<{ devLink?: string } | null>(null)
  const change = useMutation({
    mutationFn: requestEmailChange,
    onSuccess: (result) => {
      updateUser({ ...user, pendingEmail: result.pendingEmail })
      setSent({ devLink: result.devLink })
      setPassword('')
      toast('success', tr('Đã gửi email xác nhận', 'Confirmation sent'), tr(`Mở liên kết trong hộp thư ${result.pendingEmail}.`, `Open the link sent to ${result.pendingEmail}.`))
    },
    onError: (error) => {
      const code = error instanceof ApiError ? error.code : ''
      setErrors(code === 'invalid_credentials' ? { password: tr('Mật khẩu chưa đúng.', 'The password is not right.') } : code === 'email_taken' ? { email: tr('Email này có người dùng rồi.', 'Someone already uses this email.') } : { email: tr('Chưa gửi được, thử lại nhé.', 'Could not send it, try again.') })
    },
  })
  const submit = (event: FormEvent) => {
    event.preventDefault()
    const found: Record<string, string> = {}
    if (!EMAIL.test(email.trim())) found.email = tr('Email này chưa đúng dạng.', 'This email does not look right.')
    else if (email.trim().toLowerCase() === user.email) found.email = tr('Đây là email hiện tại.', 'That is your current email.')
    if (!password) found.password = tr('Nhập mật khẩu hiện tại.', 'Enter your current password.')
    setErrors(found)
    if (!Object.keys(found).length) change.mutate({ id: user.id, email, password })
  }
  const close = () => {
    setSent(null)
    setErrors({})
    onClose()
  }
  return (
    <Sheet open={open} onClose={close} placement="center" width="max-w-md" title={tr('Đổi email', 'Change email')} description={tr('Email cũ vẫn dùng được cho tới khi bạn xác nhận email mới.', 'Your current email keeps working until you confirm the new one.')}>
      {sent ? (
        <div className="space-y-3 text-sm text-ink/75">
          <p>{tr('Đã gửi liên kết xác nhận tới địa chỉ mới.', 'A confirmation link went to the new address.')}</p>
          {sent.devLink && (
            <p className="border border-dashed border-forest/25 p-3 text-xs">
              {tr('Chế độ thử (chưa gửi được email): ', 'Demo mode (no mail is sent yet): ')}
              <a href={sent.devLink} className="font-semibold text-lapis underline">
                {tr('mở liên kết xác nhận', 'open the confirmation link')}
              </a>
            </p>
          )}
          <button type="button" className="btn-gold btn-sm" onClick={close}>
            {tr('Xong', 'Done')}
          </button>
        </div>
      ) : (
        <form onSubmit={submit} noValidate className="space-y-3">
          <Field id="ce-email" label={tr('Email mới', 'New email')} error={errors.email}>
            <input id="ce-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" className={INPUT} />
          </Field>
          <Field id="ce-password" label={tr('Mật khẩu hiện tại', 'Current password')} error={errors.password}>
            <input id="ce-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" className={INPUT} />
          </Field>
          <button type="submit" className="btn-gold btn-sm" disabled={change.isPending}>
            {change.isPending && <Loader2 size={15} className="animate-spin" aria-hidden="true" />}
            {tr('Gửi liên kết xác nhận', 'Send confirmation link')}
          </button>
        </form>
      )}
    </Sheet>
  )
}

const AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const AVATAR_MAX_BYTES = 2 * 1024 * 1024
const AVATAR_SIZE = 256

/** Crops the middle square of a picture and shrinks it to 256 px WebP, so what is sent (or kept) stays small. */
async function squareAvatar(file: File): Promise<{ blob: Blob; dataUrl: string }> {
  const bitmap = await createImageBitmap(file)
  const side = Math.min(bitmap.width, bitmap.height)
  const canvas = document.createElement('canvas')
  canvas.width = AVATAR_SIZE
  canvas.height = AVATAR_SIZE
  canvas.getContext('2d')!.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, AVATAR_SIZE, AVATAR_SIZE)
  bitmap.close()
  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('encode'))), 'image/webp', 0.85))
  return { blob, dataUrl: canvas.toDataURL('image/webp', 0.85) }
}

/** UC 5.3 "Avatar image upload": pick, preview the square crop, then save or cancel; remove goes back to initials. */
function AvatarCard() {
  const { tr } = useTr()
  const user = useAuthStore((state) => state.user)!
  const updateUser = useAuthStore((state) => state.updateUser)
  const input = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<{ blob: Blob; dataUrl: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const upload = useMutation({
    mutationFn: () => uploadAvatar(user.id, preview!.blob, preview!.dataUrl),
    onSuccess: (saved) => {
      updateUser({ ...user, ...saved })
      setPreview(null)
      toast('success', tr('Đã cập nhật ảnh đại diện', 'Profile picture updated'))
    },
    onError: () => setError(tr('Chưa tải lên được, thử lại nhé.', 'Could not upload it, try again.')),
  })
  const remove = useMutation({
    mutationFn: () => removeAvatar(user.id),
    onSuccess: (saved) => {
      updateUser({ ...user, ...saved, avatarUrl: undefined })
      toast('info', tr('Đã bỏ ảnh đại diện', 'Profile picture removed'))
    },
  })
  const pick = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setError(null)
    if (!AVATAR_TYPES.includes(file.type)) return setError(tr('Chỉ nhận ảnh JPG, PNG hoặc WebP.', 'Only JPG, PNG or WebP pictures.'))
    if (file.size > AVATAR_MAX_BYTES) return setError(tr('Ảnh tối đa 2 MB.', 'Pictures can be up to 2 MB.'))
    try {
      setPreview(await squareAvatar(file))
    } catch {
      setError(tr('Không đọc được ảnh này.', 'This picture could not be read.'))
    }
  }
  const shown = preview?.dataUrl ?? user.avatarUrl
  return (
    <motion.section variants={card} className="panel p-5 sm:p-6" aria-labelledby="avatar-title">
      <motion.h2 variants={row} id="avatar-title" className="h-display text-xl text-forest">
        {tr('Ảnh đại diện', 'Profile picture')}
      </motion.h2>
      <motion.div variants={row} className="mt-4 flex flex-wrap items-center gap-5">
        {shown ? (
          <img src={shown} alt={tr('Ảnh đại diện', 'Profile picture')} width={96} height={96} className="size-24 rounded-full border-2 border-sun object-cover" />
        ) : (
          <span className="grid size-24 place-items-center rounded-full border-2 border-sun bg-forest text-2xl font-bold text-sun" aria-hidden="true">
            {user.name.split(/\s+/).filter(Boolean).slice(-2).map((part) => part[0]?.toUpperCase()).join('')}
          </span>
        )}
        <div className="space-y-2">
          <input ref={input} type="file" accept={AVATAR_TYPES.join(',')} className="sr-only" onChange={pick} aria-label={tr('Chọn ảnh', 'Choose a picture')} />
          {preview ? (
            <div className="flex flex-wrap gap-2">
              <button type="button" className="btn-gold btn-sm" onClick={() => upload.mutate()} disabled={upload.isPending}>
                {upload.isPending && <Loader2 size={15} className="animate-spin" aria-hidden="true" />}
                {tr('Lưu ảnh', 'Save picture')}
              </button>
              <button type="button" className="btn-ghost btn-sm" onClick={() => setPreview(null)}>
                {tr('Huỷ', 'Cancel')}
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              <button type="button" className="btn-ghost btn-sm" onClick={() => input.current?.click()}>
                <Camera size={15} aria-hidden="true" /> {user.avatarUrl ? tr('Đổi ảnh', 'Change picture') : tr('Tải ảnh lên', 'Upload a picture')}
              </button>
              {user.avatarUrl && (
                <button type="button" className="btn-ghost btn-sm !text-pomegranate" onClick={() => remove.mutate()} disabled={remove.isPending}>
                  <Trash2 size={15} aria-hidden="true" /> {tr('Bỏ ảnh', 'Remove')}
                </button>
              )}
            </div>
          )}
          <p className="text-xs text-ink/50">{tr('JPG, PNG hoặc WebP, tối đa 2 MB. Ảnh được cắt vuông.', 'JPG, PNG or WebP up to 2 MB. Cropped to a square.')}</p>
          {error && (
            <p className="text-xs font-medium text-pomegranate" role="alert">
              {error}
            </p>
          )}
          <DeviceOnlyNote feature="avatar" />
        </div>
      </motion.div>
    </motion.section>
  )
}

/** UC 3.5: whether the browser may show Journie's notifications while the app is in the background. */
function NotificationPrefs() {
  const { tr } = useTr()
  const supported = typeof Notification !== 'undefined'
  const [permission, setPermission] = useState(supported ? Notification.permission : 'denied')
  return (
    <motion.section variants={card} className="panel space-y-3 p-5 sm:p-6" aria-labelledby="notify-title">
      <motion.h2 variants={row} id="notify-title" className="h-display flex items-center gap-2 text-xl text-forest">
        <Bell size={18} className="text-terracotta" aria-hidden="true" /> {tr('Thông báo & hoạt động', 'Notifications & activity')}
      </motion.h2>
      <motion.p variants={row} className="text-sm text-ink/70">
        {!supported
          ? tr('Trình duyệt này không hỗ trợ thông báo hệ thống.', 'This browser does not support system notifications.')
          : permission === 'granted'
            ? tr('Thông báo hệ thống đang bật: bạn sẽ thấy cảnh báo chuyến đi cả khi đang ở ứng dụng khác.', 'System notifications are on: trip alerts reach you even in another app.')
            : permission === 'denied'
              ? tr('Bạn đã chặn thông báo. Mở cài đặt trang trong trình duyệt để bật lại.', 'Notifications are blocked. Turn them back on in the browser’s site settings.')
              : tr('Bật thông báo hệ thống để nhận cảnh báo chuyến đi khi đang tắt màn hình.', 'Turn on system notifications to get trip alerts while the screen is off.')}
      </motion.p>
      <motion.div variants={row} className="flex flex-wrap gap-2">
        {supported && permission === 'default' && (
          <button type="button" className="btn-gold btn-sm" onClick={() => Notification.requestPermission().then(setPermission)}>
            <Bell size={15} aria-hidden="true" /> {tr('Bật thông báo', 'Turn on notifications')}
          </button>
        )}
        <Link to="/app/notifications" className="btn-ghost btn-sm">
          {tr('Xem thông báo', 'See notifications')}
        </Link>
        <Link to="/app/history" className="btn-ghost btn-sm">
          <Activity size={15} aria-hidden="true" /> {tr('Lịch sử hoạt động', 'Activity history')}
        </Link>
        <Link to="/app/profile" className="btn-ghost btn-sm">
          {tr('Chọn loại cảnh báo', 'Choose alert types')}
        </Link>
      </motion.div>
    </motion.section>
  )
}

function Password() {
  const { tr } = useTr()
  const user = useAuthStore((state) => state.user)!
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [again, setAgain] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const change = useMutation({
    mutationFn: changePassword,
    onSuccess: () => {
      setCurrent('')
      setNext('')
      setAgain('')
      toast('success', tr('Đổi xong rồi', 'Password changed'), tr('Các thiết bị khác đang đăng nhập sẽ phải đăng nhập lại khi máy chủ hỗ trợ.', 'Other devices signed in will have to sign in again once the server supports it.'))
    },
    onError: (error) => {
      const wrong = error instanceof ApiError && error.code === 'invalid_credentials'
      setErrors({ current: wrong ? tr('Mật khẩu hiện tại chưa đúng.', 'The current password is not right.') : tr('Chưa đổi được, thử lại nhé.', 'Could not change it, try again.') })
    },
  })

  const reset = useMutation({
    mutationFn: requestPasswordReset,
    onSuccess: ({ email, devLink }) =>
      toast('success', tr('Đã gửi link đặt lại', 'Reset link sent'), tr(`Xem hộp thư của ${email} nhé.`, `Check the inbox of ${email}.`), devLink ? { label: tr('Chế độ thử: mở liên kết', 'Demo mode: open the link'), run: () => window.location.assign(devLink) } : undefined),
    onError: (error) =>
      toast('danger', tr('Chưa gửi được link', 'Could not send the link'), error instanceof ApiError && error.status === 429 ? tr('Bạn gửi hơi nhiều lần, đợi một chút rồi thử lại.', 'You asked a few times already; wait a moment and try again.') : tr('Thử lại sau ít phút nhé.', 'Try again in a few minutes.')),
  })

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const found: Record<string, string> = {}
    if (!current) found.current = tr('Nhập mật khẩu hiện tại.', 'Enter your current password.')
    if (next.length < MIN_PASSWORD) found.next = tr(`Mật khẩu mới cần từ ${MIN_PASSWORD} ký tự.`, `The new password needs ${MIN_PASSWORD}+ characters.`)
    else if (next === current) found.next = tr('Mật khẩu mới đang trùng mật khẩu cũ.', 'The new password is the same as the old one.')
    if (again !== next) found.again = tr('Hai mật khẩu chưa giống nhau.', 'The two passwords do not match.')
    setErrors(found)
    if (Object.keys(found).length === 0) change.mutate({ id: user.id, current, next })
  }

  return (
    <motion.form variants={card} onSubmit={submit} noValidate className="panel space-y-4 p-5 sm:p-6" aria-labelledby="password">
      <motion.h2 variants={row} id="password" className="h-display text-xl text-forest">
        {tr('Đổi mật khẩu', 'Change password')}
      </motion.h2>
      <Field id="a-current" label={tr('Mật khẩu hiện tại', 'Current password')} error={errors.current}>
        <input id="a-current" type="password" value={current} onChange={(event) => setCurrent(event.target.value)} autoComplete="current-password" className={INPUT} />
      </Field>
      <Field id="a-next" label={tr('Mật khẩu mới', 'New password')} error={errors.next}>
        <input id="a-next" type="password" value={next} onChange={(event) => setNext(event.target.value)} autoComplete="new-password" className={INPUT} />
      </Field>
      <Field id="a-again" label={tr('Nhập lại mật khẩu mới', 'New password again')} error={errors.again}>
        <input id="a-again" type="password" value={again} onChange={(event) => setAgain(event.target.value)} autoComplete="new-password" className={INPUT} />
      </Field>
      <motion.div variants={row} className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <button type="submit" className="btn-gold btn-sm" disabled={change.isPending}>
          {change.isPending && <Loader2 size={15} className="animate-spin" aria-hidden="true" />}
          {tr('Đổi mật khẩu', 'Change password')}
        </button>
        <button type="button" className="text-sm font-semibold text-lapis underline-offset-4 hover:underline disabled:opacity-50" disabled={reset.isPending} onClick={() => reset.mutate(user.email)}>
          {tr('Quên mật khẩu? Gửi link đặt lại', 'Forgot it? Send a reset link')}
        </button>
      </motion.div>
    </motion.form>
  )
}

export function AccountPage() {
  const { tr } = useTr()
  return (
    <>
      <PageHeader title={tr('Tài khoản', 'Account')} />
      <motion.div variants={page} initial="hidden" animate="show" className="grid items-start gap-6 lg:grid-cols-2">
        <AvatarCard />
        <NotificationPrefs />
        <Details />
        <Password />
      </motion.div>
    </>
  )
}
