import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { useMutation } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'motion/react'
import { AlertCircle, Briefcase, Compass, KeyRound, Mail, ShieldCheck } from 'lucide-react'
import { AntibotField } from '../../components/auth/AntibotField'
import { demoAccounts, login } from '../../api/auth'
import { track } from '../../api/analytics'
import { ApiError } from '../../api/http'
import { Khatam, StarRule } from '../../components/art/Khatam'
import { AuthShell } from '../../components/auth/AuthShell'
import { useAuthEntry, useAuthItem } from '../../components/auth/entry'
import { useLight } from '../../components/auth/light-context'
import { LampToggle } from '../../components/auth/LampToggle'
import { useMascotField } from '../../components/auth/useMascotField'
import { useMascot } from '../../components/mascot/mascot-context'
import { RevealHeading } from '../../components/motion/RevealHeading'
import { EASE_OUT } from '../../components/motion/variants'
import { Field } from '../../components/ui/Field'
import { useTr } from '../../hooks/useTr'
import { homeFor, useAuthStore, type SessionUser } from '../../store/authStore'
import { usePortalStore } from '../../store/portalStore'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const SUCCESS_POP = { type: 'spring', stiffness: 480, damping: 17 } as const
const LABEL_OUT = { opacity: 0, y: -10, transition: { duration: 0.14, ease: [0.4, 0, 1, 1] } } as const

export function LoginPage() {
  const { tr } = useTr()
  const [formError, setFormError] = useState<string | null>(null)

  const lines = {
    idle: tr('Chào, mình là Journie.', "Hi, I'm Journie."),
    watching: tr('Gõ email đi, mình chỉ nhìn thôi.', 'Type your email, I am only watching.'),
    hiding: tr('Mình nhắm mắt rồi. Gõ mật khẩu đi.', 'Eyes shut. Go on, type your password.'),
    peeking: tr('Bật đèn rồi đó, mình liếc có xíu thôi nha.', 'Light is on, I will only peek a tiny bit.'),
    thinking: tr('Đợi mình xíu, đang dò đường…', 'One sec, finding the way…'),
    error: formError ?? tr('Ủa, chưa khớp rồi nè.', 'Hm, that does not match.'),
    joy: tr('Tuyệt! Mình đi thôi nào!', "Great! Let's go!"),
  }

  return (
    <AuthShell lines={lines}>
      <LoginForm onFormError={setFormError} />
    </AuthShell>
  )
}

function LoginForm({ onFormError }: { onFormError: (message: string | null) => void }) {
  const { tr } = useTr()
  const { setMood, setFocusPoint, originRef } = useMascot()
  const signIn = useAuthStore((state) => state.signIn)
  const ended = useAuthStore((state) => state.ended)
  const openPortal = usePortalStore((state) => state.open)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const light = useLight()
  const lamp = light.on
  const setLamp = light.setOn
  const [remember, setRemember] = useState(true)
  const [errors, setErrors] = useState<{ email?: string; password?: string; antibot?: string }>({})
  const [antibot, setAntibot] = useState<string | null>(null)
  const [antibotReset, setAntibotReset] = useState(0)
  const [done, setDone] = useState(false)
  const navigate = useNavigate()
  // A page that sent the visitor here to sign in (a shared trip, a deep link) is where they go back to
  const from = (useLocation().state as { from?: string } | null)?.from
  const typingRef = useRef<number | null>(null)

  const item = useAuthItem('left')
  const entry = useAuthEntry()

  const emailField = useMascotField('text')
  const passwordField = useMascotField('secret', lamp)

  const enterApp = (user: SessionUser, token: string | null) => {
    const rect = originRef.current?.getBoundingClientRect()
    const origin = rect ? { x: rect.left + rect.width / 2, y: rect.top + rect.height * 0.4 } : undefined
    window.setTimeout(() => {
      signIn(user, { token, remember })
      track({ type: 'login' })
      openPortal(from?.startsWith('/') ? from : homeFor(user.role), origin)
    }, 1100)
  }

  const mutation = useMutation({
    mutationFn: login,
    onMutate: () => {
      setMood('thinking')
      setFocusPoint(null)
      onFormError(null)
    },
    onSuccess: ({ user, token }) => {
      setMood('joy')
      setDone(true)
      enterApp(user, token)
    },
    onError: (error) => {
      const code = error instanceof ApiError ? error.code : 'unknown'
      const status = error instanceof ApiError ? error.status : 0
      setAntibotReset((value) => value + 1)
      const wait = error instanceof ApiError && error.retryAfter ? ` ${error.retryAfter}s` : ''
      const message =
        code === 'user_not_found'
          ? tr('Email này chưa có tài khoản. Kiểm tra lại hoặc đăng ký mới.', 'No account uses this email. Check it or sign up.')
          : code === 'invalid_credentials'
            ? tr('Mật khẩu chưa đúng. Thử lại hoặc đặt lại mật khẩu.', 'That password is not right. Try again or reset it.')
            : code === 'account_blocked'
              ? tr('Tài khoản này đang bị khoá. Liên hệ quản trị viên để mở lại.', 'This account is blocked. Contact the admin to have it unblocked.')
              : code === 'account_invited'
                ? tr('Tài khoản chưa kích hoạt. Mở liên kết mời trong email để đặt mật khẩu.', 'This account is not active yet. Open the invite link in your email to set a password.')
                : code === 'antibot-failed'
                  ? tr('Bước xác minh chưa qua, làm lại giúp mình nhé.', 'The human check did not pass; please do it again.')
                  : status === 429 || code === 'rate-limited'
                    ? tr(`Thử quá nhiều lần. Đợi${wait || ' ít phút'} rồi thử lại.`, `Too many tries. Wait${wait || ' a few minutes'} and try again.`)
                    : status > 0
                      ? tr('Máy chủ báo lỗi. Thử lại sau ít phút.', 'The server reported an error. Try again shortly.')
                      : tr('Không kết nối được máy chủ. Thử lại sau ít phút.', 'Could not reach the server. Try again shortly.')
      if (code === 'user_not_found') setErrors({ email: message })
      else if (code === 'invalid_credentials') setErrors({ password: message })
      else if (code === 'antibot-failed') setErrors({ antibot: message })
      onFormError(code === 'invalid_credentials' ? tr('Ối, mật khẩu chưa khớp. Thử lại nhé?', "Oops, that password doesn't match. Try again?") : message)
      setMood('error')
      window.setTimeout(() => setMood('idle'), 2400)
    },
  })

  const busy = mutation.isPending || done

  useEffect(() => () => {
    if (typingRef.current) window.clearTimeout(typingRef.current)
  }, [])

  const validate = () => {
    const next: typeof errors = {}
    if (!email.trim()) next.email = tr('Nhập email bạn đã đăng ký.', 'Enter the email you signed up with.')
    else if (!EMAIL_PATTERN.test(email.trim())) next.email = tr('Email cần có dạng ten@vi-du.com.', 'Email should look like name@example.com.')
    if (!password) next.password = tr('Nhập mật khẩu của bạn.', 'Enter your password.')
    if (!antibot) next.antibot = tr('Hoàn tất bước xác minh trước nhé.', 'Finish the human check first.')
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const submit = (event?: FormEvent) => {
    event?.preventDefault()
    if (busy) return
    if (!validate()) {
      onFormError(tr('Ủa, còn thiếu chút thông tin.', 'Hm, something is still missing.'))
      setMood('error')
      window.setTimeout(() => setMood('idle'), 2000)
      return
    }
    mutation.mutate({ email, password, remember, antibotToken: antibot ?? undefined })
  }

  /** One-tap demo: types the credentials in character by character while Journie reacts, then signs in. */
  const fillDemo = (kind: keyof typeof demoAccounts) => {
    if (busy) return
    const account = demoAccounts[kind]
    setErrors({})
    onFormError(null)
    setEmail('')
    setPassword('')
    setLamp(false)
    let step = 0
    const total = account.email.length + account.password.length
    setMood('watching')
    const tick = () => {
      step += 1
      if (step <= account.email.length) {
        setEmail(account.email.slice(0, step))
        const rect = emailField.ref.current?.getBoundingClientRect()
        if (rect) setFocusPoint({ x: rect.left + Math.min(rect.width - 28, 30 + step * 8.6), y: rect.top + rect.height / 2 })
      } else {
        if (step === account.email.length + 1) {
          setMood('hiding')
          setFocusPoint(null)
        }
        setPassword(account.password.slice(0, step - account.email.length))
      }
      if (step < total) typingRef.current = window.setTimeout(tick, 34)
      // The demo chips stand for a signed-in demo, so they skip the human check the typed form asks for
      else typingRef.current = window.setTimeout(() => mutation.mutate({ email: account.email, password: account.password, remember }), 280)
    }
    tick()
  }

  return (
    <form onSubmit={submit} noValidate>
      <RevealHeading as="h1" immediate delay={entry === 'arrive' ? 0.3 : 0} parts={[{ text: tr('Đăng nhập', 'Sign in') }]} className="h-display text-[2.2rem] text-[color:var(--a-ink)] sm:text-[2.6rem]" />
      {ended && (
        <p role="status" className="mt-3 border-l-2 border-[color:var(--a-accent)] px-3 py-2 text-xs font-medium text-[color:var(--a-ink)]">
          {tr('Phiên đăng nhập đã hết. Đăng nhập lại nhé.', 'Your session has ended. Please sign in again.')}
        </p>
      )}

      <div className="mt-6">
        <motion.div variants={item}>
          <Field
            label="Email"
            type="email"
            name="email"
            autoComplete="email"
            inputMode="email"
            spellCheck={false}
            placeholder={tr('ten@vi-du.com', 'name@example.com')}
            icon={<Mail size={17} />}
            value={email}
            error={errors.email}
            inputRef={emailField.ref}
            onFocus={emailField.onFocus}
            onBlur={emailField.onBlur}
            onChange={(event) => {
              setEmail(event.target.value)
              setErrors((current) => ({ ...current, email: undefined }))
              emailField.track()
            }}
            disabled={busy}
          />
        </motion.div>
        <motion.div variants={item}>
          <Field
            label={tr('Mật khẩu', 'Password')}
            type="password"
            name="password"
            autoComplete="current-password"
            placeholder="••••••••"
            icon={<KeyRound size={17} />}
            value={password}
            error={errors.password}
            inputRef={passwordField.ref}
            lit={{ on: lamp, value: password }}
            onFocus={passwordField.onFocus}
            onBlur={passwordField.onBlur}
            onChange={(event) => {
              setPassword(event.target.value)
              setErrors((current) => ({ ...current, password: undefined }))
              passwordField.track()
            }}
            disabled={busy}
            trailing={<LampToggle on={lamp} onToggle={(center) => { setLamp(!lamp); if (!lamp) light.aimAt(center.fieldX, center.fieldY) }} labelOn={tr('Tắt đèn pin', 'Turn the torch off')} labelOff={tr('Bật đèn pin: rọi để đọc mật khẩu', 'Turn the torch on: shine it to read the password')} />}
          />
        </motion.div>
      </div>

      <motion.div variants={item} className="flex items-center justify-between gap-3 text-[0.8rem]">
        <label className="flex cursor-pointer items-center gap-2 text-[color:var(--a-ink)]">
          <input type="checkbox" className="peer sr-only" checked={remember} onChange={(event) => setRemember(event.target.checked)} />
          <span className="grid size-[1.15rem] place-items-center border border-[color:var(--a-line)] text-transparent transition-colors peer-checked:border-[color:var(--a-primary)] peer-checked:bg-[color:var(--a-primary)] peer-checked:text-[color:var(--a-primary-ink)] peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-terracotta">
            <Khatam size={11} />
          </span>
          {tr('Ghi nhớ tôi', 'Remember me')}
        </label>
        <span className="flex flex-col items-end gap-0.5">
          <button type="button" className="font-semibold text-[color:var(--a-accent)] underline-offset-4 hover:underline" onClick={() => navigate('/forgot', { state: { email: email.trim() } })}>
            {tr('Quên mật khẩu?', 'Forgot password?')}
          </button>
          <button type="button" className="text-[0.72rem] text-[color:var(--a-muted)] underline-offset-4 hover:underline" onClick={() => navigate('/forgot?mode=username', { state: { email: email.trim() } })}>
            {tr('Quên tên đăng nhập?', 'Forgot username?')}
          </button>
        </span>
      </motion.div>

      <motion.div variants={item} className="mt-3">
        <AntibotField onToken={(token) => {
          setAntibot(token)
          if (token) setErrors((current) => ({ ...current, antibot: undefined }))
        }} resetKey={antibotReset} disabled={busy} />
        {errors.antibot && <p className="-mt-2 mb-2 text-xs font-medium text-[color:var(--a-error)]" role="alert">{errors.antibot}</p>}
      </motion.div>

      <motion.div variants={item} whileTap={busy ? undefined : { scale: 0.97 }} className="relative mt-5 grid">
        <button type="submit" className="auth-btn" disabled={busy}>
          <AnimatePresence mode="wait" initial={false}>
            {done ? (
              <motion.span key="done" initial={{ opacity: 0, y: 10, scale: 0.7 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={SUCCESS_POP} className="inline-flex items-center gap-2">
                <motion.span initial={{ scale: 0, rotate: -50 }} animate={{ scale: 1, rotate: 0 }} transition={{ ...SUCCESS_POP, delay: 0.08 }} className="inline-flex">
                  <ShieldCheck size={18} aria-hidden="true" />
                </motion.span>
                {tr('Đã xác thực', 'Verified')}
              </motion.span>
            ) : mutation.isPending ? (
              <motion.span key="load" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={LABEL_OUT} className="inline-flex items-center gap-2">
                <Khatam size={16} className="!animate-[spin-slow_2.4s_linear_infinite]" /> {tr('Đang dò đường…', 'Checking the route…')}
              </motion.span>
            ) : (
              <motion.span key="idle" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={LABEL_OUT}>
                {tr('Đăng nhập', 'Sign in')}
              </motion.span>
            )}
          </AnimatePresence>
        </button>
        {done && (
          <motion.span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 rounded-[2px] border-2 border-sun"
            initial={{ opacity: 0.9, scaleX: 1, scaleY: 1 }}
            animate={{ opacity: 0, scaleX: 1.06, scaleY: 1.45 }}
            transition={{ duration: 0.8, ease: EASE_OUT }}
          />
        )}
      </motion.div>

      <AnimatePresence>
        {mutation.isError && !(mutation.error instanceof ApiError) && (
          <motion.p role="alert" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto', x: [0, -7, 6, -4, 2, 0] }} exit={{ opacity: 0, height: 0 }} transition={{ x: { duration: 0.42, ease: 'easeInOut', delay: 0.1 } }} className="mt-3 flex items-start gap-2 overflow-hidden border-l-2 border-[color:var(--a-error)] px-3 py-2 text-xs font-medium text-[color:var(--a-error)]">
            <AlertCircle size={15} className="mt-px shrink-0" aria-hidden="true" />
            {tr('Có lỗi, thử lại nhé.', 'Something went wrong, try again.')}
          </motion.p>
        )}
      </AnimatePresence>

      <motion.div variants={item}>
        <StarRule className="my-5 !text-[color:var(--a-accent)]" />
      </motion.div>

      <motion.p variants={item} className="mb-2.5 text-center text-xs text-[color:var(--a-muted)]">{tr('Muốn xem thử ngay? Dùng tài khoản mẫu:', 'Want a look around? Use a demo account:')}</motion.p>
      <motion.div variants={item} className="grid grid-cols-3 gap-2.5">
        <button type="button" className="demo-chip" onClick={() => fillDemo('traveler')} disabled={busy}>
          <Compass size={16} aria-hidden="true" />
          <span>
            <strong>{tr('Lữ khách', 'Traveler')}</strong>
            <small>{tr('Lập và đi chuyến', 'Plan and travel')}</small>
          </span>
        </button>
        <button type="button" className="demo-chip" onClick={() => fillDemo('admin')} disabled={busy}>
          <ShieldCheck size={16} aria-hidden="true" />
          <span>
            <strong>{tr('Quản trị viên', 'Admin')}</strong>
            <small>{tr('Người dùng, phân hệ', 'Users, modules')}</small>
          </span>
        </button>
        <button type="button" className="demo-chip" onClick={() => fillDemo('business')} disabled={busy}>
          <Briefcase size={16} aria-hidden="true" />
          <span>
            <strong>{tr('Doanh nghiệp', 'Business')}</strong>
            <small>{tr('Số liệu, nhân viên', 'Stats, staff')}</small>
          </span>
        </button>
      </motion.div>

      <motion.p variants={item} className="mt-5 text-center text-[0.84rem] text-[color:var(--a-muted)]">
        {tr('Chưa có tài khoản?', 'New here?')}{' '}
        <Link to="/register" className="font-bold text-[color:var(--a-accent)] underline-offset-4 hover:underline">
          {tr('Đăng ký miễn phí', 'Create a free account')}
        </Link>
      </motion.p>
    </form>
  )
}
