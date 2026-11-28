import { useEffect, useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router'
import { useMutation, useQuery } from '@tanstack/react-query'
import { motion } from 'motion/react'
import { ArrowLeft, KeyRound, Loader2, Mail, MailCheck, ShieldCheck } from 'lucide-react'
import { checkLink, confirmEmailChange, requestPasswordReset, requestUsernameReminder, resetPassword, type RecoveryResult } from '../../api/auth'
import { ApiError } from '../../api/http'
import { Khatam } from '../../components/art/Khatam'
import { AuthShell } from '../../components/auth/AuthShell'
import { useAuthItem } from '../../components/auth/entry'
import { RevealHeading } from '../../components/motion/RevealHeading'
import { Field } from '../../components/ui/Field'
import { useTr } from '../../hooks/useTr'
import { maskEmail, strengthOf } from '../../lib/passwordStrength'
import { useAuthStore } from '../../store/authStore'
import { toast } from '../../store/toastStore'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const RESEND_AFTER_S = 60
const MIN_PASSWORD = 6

const linkError = (error: unknown): [string, string] => {
  const code = error instanceof ApiError ? error.code : ''
  if (code === 'link-expired') return ['Liên kết đã hết hạn. Gửi lại một liên kết mới nhé.', 'This link has expired. Ask for a new one.']
  if (code === 'link-invalid') return ['Liên kết không hợp lệ hoặc đã được dùng.', 'This link is not valid or was already used.']
  return ['Chưa kiểm tra được liên kết, thử lại sau nhé.', 'Could not check the link; try again later.']
}

/** Why a new password was not saved: the link, or the password itself, or a busy server. */
const saveError = (error: unknown): [string, string] => {
  const status = error instanceof ApiError ? error.status : 0
  const code = error instanceof ApiError ? error.code : ''
  if (code === 'link-invalid' || code === 'link-expired') return linkError(error)
  if (status === 429) return ['Bạn thử hơi nhiều lần. Đợi một chút rồi thử lại.', 'Too many tries. Wait a moment and try again.']
  if (status === 422) return ['Mật khẩu này chưa đạt yêu cầu, chọn mật khẩu khác nhé.', 'This password is not accepted; pick another one.']
  return ['Chưa lưu được mật khẩu, thử lại sau nhé.', 'Could not save the password; try again later.']
}

function BackToLogin() {
  const { tr } = useTr()
  return (
    <Link to="/login" className="mt-5 inline-flex items-center gap-1.5 text-[0.84rem] font-semibold text-[color:var(--a-accent)] underline-offset-4 hover:underline">
      <ArrowLeft size={14} aria-hidden="true" /> {tr('Về trang đăng nhập', 'Back to sign in')}
    </Link>
  )
}

/** In demo mode no mail leaves the browser, so the link it would carry is shown here instead. */
function DevLink({ result }: { result: RecoveryResult }) {
  const { tr } = useTr()
  if (!result.devLink && !result.devName) return null
  return (
    <div className="mt-4 border border-dashed border-[color:var(--a-line)] p-3 text-xs text-[color:var(--a-muted)]">
      <p className="font-semibold text-[color:var(--a-ink)]">{tr('Chế độ thử: máy chủ chưa gửi được email.', 'Demo mode: the server cannot send mail yet.')}</p>
      {result.devLink && (
        <p className="mt-1">
          {tr('Liên kết trong email sẽ là: ', 'The link in the mail would be: ')}
          <a href={result.devLink} className="break-all font-semibold text-[color:var(--a-accent)] underline">
            {tr('mở liên kết', 'open the link')}
          </a>
        </p>
      )}
      {result.devName && <p className="mt-1">{tr(`Email sẽ nhắc: tài khoản này tên “${result.devName}”, đăng nhập bằng địa chỉ email bạn vừa nhập.`, `The mail would say: this account is “${result.devName}” and signs in with the email you entered.`)}</p>}
    </div>
  )
}

/**
 * UC 7.5 / 7.6 with 7.7 and 7.8: one email form for "forgot password" and "forgot username". The answer never says whether the
 * email has an account; after sending, a "check your inbox" screen offers a resend once the cooldown is over.
 */
export function ForgotPage() {
  const { tr } = useTr()
  const [params] = useSearchParams()
  const mode = params.get('mode') === 'username' ? 'username' : 'password'
  const initial = (useLocation().state as { email?: string } | null)?.email ?? ''
  const item = useAuthItem('left')
  const [email, setEmail] = useState(initial)
  const [error, setError] = useState<string>()
  const [sent, setSent] = useState<RecoveryResult | null>(null)
  const [cooldown, setCooldown] = useState(0)

  useEffect(() => {
    if (cooldown <= 0) return
    const timer = window.setTimeout(() => setCooldown((value) => value - 1), 1000)
    return () => window.clearTimeout(timer)
  }, [cooldown])

  const send = useMutation({
    mutationFn: (address: string) => (mode === 'username' ? requestUsernameReminder(address) : requestPasswordReset(address)),
    onSuccess: (result) => {
      setSent(result)
      setError(undefined)
      setCooldown(RESEND_AFTER_S)
    },
    onError: (failure) => {
      const status = failure instanceof ApiError ? failure.status : 0
      const wait = failure instanceof ApiError && failure.retryAfter ? failure.retryAfter : 0
      if (status === 429) {
        setCooldown(wait || RESEND_AFTER_S)
        setError(tr('Bạn gửi hơi nhiều lần. Đợi một chút rồi thử lại.', 'You asked a few times already. Wait a moment and try again.'))
      } else setError(tr('Chưa gửi được, thử lại sau ít phút.', 'Could not send it; try again in a few minutes.'))
    },
  })

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!EMAIL_PATTERN.test(email.trim())) return setError(tr('Email cần có dạng ten@vi-du.com.', 'Email should look like name@example.com.'))
    setError(undefined)
    send.mutate(email.trim())
  }

  const title = mode === 'username' ? tr('Quên tên đăng nhập', 'Forgot username') : tr('Quên mật khẩu', 'Forgot password')
  const lines = { idle: mode === 'username' ? tr('Journie đăng nhập bằng email. Mình gửi lời nhắc cho bạn nhé.', 'Journie signs in with your email. I will send you a reminder.') : tr('Không sao, ai cũng quên mà.', 'No worries, everyone forgets.') }

  return (
    <AuthShell lines={lines}>
      {sent ? (
        <div role="status">
          <MailCheck size={34} className="text-[color:var(--a-accent)]" aria-hidden="true" />
          <h1 className="h-display mt-3 text-[2rem] text-[color:var(--a-ink)]">{tr('Kiểm tra hộp thư', 'Check your inbox')}</h1>
          <p className="mt-2 text-sm text-[color:var(--a-ink)]">
            {mode === 'username'
              ? tr(`Nếu ${maskEmail(sent.email)} có tài khoản Journie, bạn sẽ nhận được email nhắc tên tài khoản.`, `If ${maskEmail(sent.email)} has a Journie account, a reminder with the account name is on its way.`)
              : tr(`Nếu ${maskEmail(sent.email)} có tài khoản Journie, bạn sẽ nhận được liên kết đặt lại mật khẩu, dùng được trong 30 phút.`, `If ${maskEmail(sent.email)} has a Journie account, a reset link is on its way. It works for 30 minutes.`)}
          </p>
          <p className="mt-2 text-xs text-[color:var(--a-muted)]">{tr('Không thấy? Xem thư mục Spam hoặc Quảng cáo.', 'Nothing there? Look in Spam or Promotions.')}</p>
          <DevLink result={sent} />
          {error && (
            <p role="alert" className="mt-3 text-sm font-medium text-[color:var(--a-error)]">
              {error}
            </p>
          )}
          <button type="button" className="auth-btn mt-5 w-full" disabled={cooldown > 0 || send.isPending} onClick={() => send.mutate(sent.email)}>
            {send.isPending ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : null}
            {cooldown > 0 ? tr(`Gửi lại sau ${cooldown}s`, `Resend in ${cooldown}s`) : tr('Gửi lại', 'Resend')}
          </button>
          <BackToLogin />
        </div>
      ) : (
        <form onSubmit={submit} noValidate>
          <RevealHeading as="h1" immediate parts={[{ text: title }]} className="h-display text-[2.1rem] text-[color:var(--a-ink)] sm:text-[2.4rem]" />
          <motion.p variants={item} className="mt-2 text-sm text-[color:var(--a-muted)]">
            {mode === 'username'
              ? tr('Nhập email bạn nghĩ đã dùng; mình gửi lời nhắc tài khoản tới đó.', 'Enter the email you think you used; a reminder goes there.')
              : tr('Nhập email của tài khoản; mình gửi liên kết đặt lại mật khẩu.', 'Enter your account email; a reset link goes there.')}
          </motion.p>
          <motion.div variants={item} className="mt-5">
            <Field label="Email" type="email" name="email" autoComplete="email" inputMode="email" spellCheck={false} icon={<Mail size={17} />} value={email} error={error} onChange={(event) => setEmail(event.target.value)} disabled={send.isPending} />
          </motion.div>
          <motion.div variants={item} className="grid">
            <button type="submit" className="auth-btn" disabled={send.isPending || cooldown > 0}>
              {send.isPending && <Khatam size={16} className="!animate-[spin-slow_2.4s_linear_infinite]" />}
              {cooldown > 0 ? tr(`Thử lại sau ${cooldown}s`, `Try again in ${cooldown}s`) : mode === 'username' ? tr('Gửi lời nhắc', 'Send reminder') : tr('Gửi liên kết đặt lại', 'Send reset link')}
            </button>
          </motion.div>
          <motion.p variants={item} className="mt-4 text-center text-xs text-[color:var(--a-muted)]">
            {mode === 'username' ? (
              <Link to="/forgot" className="font-semibold text-[color:var(--a-accent)] hover:underline">
                {tr('Quên mật khẩu thì sao?', 'Forgot the password instead?')}
              </Link>
            ) : (
              <Link to="/forgot?mode=username" className="font-semibold text-[color:var(--a-accent)] hover:underline">
                {tr('Không nhớ email đăng nhập?', 'Not sure which email you used?')}
              </Link>
            )}
          </motion.p>
          <BackToLogin />
        </form>
      )}
    </AuthShell>
  )
}

/** UC 5.4: the page a reset (or invite) link opens; the new password is set once and the link stops working. */
export function ResetPasswordPage() {
  const { tr } = useTr()
  const navigate = useNavigate()
  const token = useSearchParams()[0].get('token') ?? ''
  const item = useAuthItem('left')
  const check = useQuery({ queryKey: ['link', token], queryFn: () => checkLink(token), enabled: !!token, retry: false })
  const [password, setPassword] = useState('')
  const [again, setAgain] = useState('')
  const [errors, setErrors] = useState<{ password?: string; again?: string }>({})
  const strength = strengthOf(password)
  const invite = check.data?.purpose === 'invite'

  const save = useMutation({
    mutationFn: () => resetPassword(token, password),
    onSuccess: () => {
      toast('success', invite ? tr('Tài khoản đã sẵn sàng', 'Your account is ready') : tr('Đã đặt mật khẩu mới', 'New password set'), tr('Đăng nhập bằng mật khẩu mới nhé.', 'Sign in with the new password.'))
      navigate('/login', { replace: true })
    },
    onError: (error) => setErrors({ password: tr(...saveError(error)) }),
  })

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const next: typeof errors = {}
    if (password.length < MIN_PASSWORD) next.password = tr(`Mật khẩu cần ít nhất ${MIN_PASSWORD} ký tự.`, `The password needs ${MIN_PASSWORD}+ characters.`)
    if (again !== password) next.again = tr('Hai mật khẩu chưa giống nhau.', 'The two passwords do not match.')
    setErrors(next)
    if (!Object.keys(next).length) save.mutate()
  }

  const lines = { idle: invite ? tr('Chào mừng! Đặt mật khẩu để bắt đầu nhé.', 'Welcome! Set a password to get started.') : tr('Chọn một mật khẩu mới thật chắc nhé.', 'Pick a strong new password.') }
  const broken = !token || check.isError

  return (
    <AuthShell lines={lines}>
      {check.isLoading ? (
        <p className="flex items-center gap-2 text-sm text-[color:var(--a-muted)]" role="status">
          <Loader2 size={16} className="animate-spin" aria-hidden="true" /> {tr('Đang kiểm tra liên kết…', 'Checking the link…')}
        </p>
      ) : broken ? (
        <div role="alert">
          <h1 className="h-display text-[2rem] text-[color:var(--a-ink)]">{tr('Liên kết không dùng được', 'This link cannot be used')}</h1>
          <p className="mt-2 text-sm text-[color:var(--a-ink)]">{token ? tr(...linkError(check.error)) : tr('Thiếu mã trong liên kết.', 'The link has no code.')}</p>
          <Link to="/forgot" className="auth-btn mt-5 inline-grid w-full">
            {tr('Gửi liên kết mới', 'Send a new link')}
          </Link>
          <BackToLogin />
        </div>
      ) : (
        <form onSubmit={submit} noValidate>
          <RevealHeading as="h1" immediate parts={[{ text: invite ? tr('Kích hoạt tài khoản', 'Activate your account') : tr('Đặt mật khẩu mới', 'Set a new password') }]} className="h-display text-[2.1rem] text-[color:var(--a-ink)]" />
          {check.data && <motion.p variants={item} className="mt-2 text-sm text-[color:var(--a-muted)]">{maskEmail(check.data.email)}</motion.p>}
          <motion.div variants={item} className="mt-5">
            <Field label={tr('Mật khẩu mới', 'New password')} type="password" name="new-password" autoComplete="new-password" icon={<KeyRound size={17} />} value={password} error={errors.password} onChange={(event) => setPassword(event.target.value)} disabled={save.isPending} />
            <div className="-mt-2 mb-3 flex items-center gap-1" aria-label={tr(`Độ mạnh ${strength}/5`, `Strength ${strength} of 5`)} role="img">
              {[0, 1, 2, 3, 4].map((index) => (
                <span key={index} className={strength > index ? 'text-sun' : 'text-[color:var(--a-ink)] opacity-20'}>
                  <Khatam size={13} />
                </span>
              ))}
            </div>
            <Field label={tr('Nhập lại mật khẩu', 'Password again')} type="password" name="confirm-password" autoComplete="new-password" icon={<KeyRound size={17} />} value={again} error={errors.again} onChange={(event) => setAgain(event.target.value)} disabled={save.isPending} />
          </motion.div>
          <motion.div variants={item} className="grid">
            <button type="submit" className="auth-btn" disabled={save.isPending}>
              {save.isPending && <Khatam size={16} className="!animate-[spin-slow_2.4s_linear_infinite]" />}
              {tr('Lưu mật khẩu', 'Save password')}
            </button>
          </motion.div>
          <BackToLogin />
        </form>
      )}
    </AuthShell>
  )
}

/** UC 5.6: the page the "confirm your new email" link opens. */
export function ConfirmEmailPage() {
  const { tr } = useTr()
  const token = useSearchParams()[0].get('token') ?? ''
  const user = useAuthStore((state) => state.user)
  const updateUser = useAuthStore((state) => state.updateUser)
  const confirm = useMutation({
    mutationFn: () => confirmEmailChange(token),
    onSuccess: (account) => {
      // A field the server leaves out is gone: the address waiting for confirmation is the one just confirmed
      if (user?.id === account.id) updateUser({ ...user, ...account, pendingEmail: account.pendingEmail })
    },
  })
  return (
    <AuthShell lines={{ idle: tr('Một bước nữa thôi.', 'Just one more step.') }}>
      {confirm.isSuccess ? (
        <div role="status">
          <ShieldCheck size={34} className="text-[color:var(--a-accent)]" aria-hidden="true" />
          <h1 className="h-display mt-3 text-[2rem] text-[color:var(--a-ink)]">{tr('Đã đổi email', 'Email changed')}</h1>
          <p className="mt-2 text-sm text-[color:var(--a-ink)]">{tr(`Từ giờ bạn đăng nhập bằng ${maskEmail(confirm.data.email)}.`, `From now on you sign in with ${maskEmail(confirm.data.email)}.`)}</p>
          <Link to={user ? '/app/account' : '/login'} className="auth-btn mt-5 inline-grid w-full">
            {user ? tr('Về trang tài khoản', 'Back to your account') : tr('Đăng nhập', 'Sign in')}
          </Link>
        </div>
      ) : (
        <div>
          <h1 className="h-display text-[2rem] text-[color:var(--a-ink)]">{tr('Xác nhận email mới', 'Confirm your new email')}</h1>
          <p className="mt-2 text-sm text-[color:var(--a-ink)]">{tr('Bấm nút dưới đây để dùng địa chỉ này cho tài khoản Journie.', 'Press the button below to use this address for your Journie account.')}</p>
          {confirm.isError && (
            <p role="alert" className="mt-3 text-sm font-medium text-[color:var(--a-error)]">
              {confirm.error instanceof ApiError && confirm.error.code === 'email_taken' ? tr('Email này đã có tài khoản khác dùng.', 'Another account already uses this email.') : tr(...linkError(confirm.error))}
            </p>
          )}
          <button type="button" className="auth-btn mt-5 w-full" disabled={!token || confirm.isPending} onClick={() => confirm.mutate()}>
            {confirm.isPending && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
            {tr('Xác nhận', 'Confirm')}
          </button>
          <BackToLogin />
        </div>
      )}
    </AuthShell>
  )
}
