import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { useMutation } from '@tanstack/react-query'
import { AnimatePresence, motion, stagger, type Variants } from 'motion/react'
import { KeyRound, Mail, UserRound } from 'lucide-react'
import { AntibotField } from '../../components/auth/AntibotField'
import { strengthOf } from '../../lib/passwordStrength'
import { saveOnboarding } from '../../api/profile'
import { register } from '../../api/auth'
import { ApiError } from '../../api/http'
import { Khatam } from '../../components/art/Khatam'
import { AuthShell } from '../../components/auth/AuthShell'
import { useAuthEntry, useAuthItem } from '../../components/auth/entry'
import { useLight } from '../../components/auth/light-context'
import { LampToggle } from '../../components/auth/LampToggle'
import { useMascotField } from '../../components/auth/useMascotField'
import { CategoryIcon } from '../../components/icons'
import { useMascot } from '../../components/mascot/mascot-context'
import { RevealHeading } from '../../components/motion/RevealHeading'
import { EASE_OUT, popItem } from '../../components/motion/variants'
import { Field } from '../../components/ui/Field'
import { useTr } from '../../hooks/useTr'
import { useAuthStore } from '../../store/authStore'
import { usePortalStore } from '../../store/portalStore'
import type { CategoryId } from '../../domain/types'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const STYLES: { id: CategoryId; vi: string; en: string }[] = [
  { id: 'food', vi: 'Ăn ngon', en: 'Food' },
  { id: 'culture', vi: 'Văn hóa', en: 'Culture' },
  { id: 'nature', vi: 'Thiên nhiên', en: 'Nature' },
  { id: 'beach', vi: 'Biển', en: 'Beach' },
  { id: 'cafe', vi: 'Cà phê', en: 'Cafés' },
  { id: 'adventure', vi: 'Phiêu lưu', en: 'Adventure' },
]

const SUCCESS_POP = { type: 'spring', stiffness: 480, damping: 17 } as const
const LABEL_OUT = { opacity: 0, y: -10, transition: { duration: 0.14, ease: [0.4, 0, 1, 1] } } as const
const chipGroup: Variants = { hidden: {}, show: { transition: { delayChildren: stagger(0.045, { startDelay: 0.12 }) } } }

export function RegisterPage() {
  const { tr } = useTr()
  const [formError, setFormError] = useState<string | null>(null)

  const lines = {
    idle: tr('Chào, mình là Journie. Bạn tên gì nhỉ?', "Hi, I'm Journie. What's your name?"),
    watching: tr('Tên đẹp đó, mình nhớ rồi.', 'Nice name, I will remember it.'),
    hiding: tr('Chọn mật khẩu mạnh nhé, mình không nhìn đâu.', "Pick a strong one. I'm not looking."),
    peeking: tr('Bật đèn rồi đó, mình liếc có xíu thôi nha.', 'Light is on, I will only peek a tiny bit.'),
    thinking: tr('Đang vẽ bản đồ riêng cho bạn…', 'Drawing your own map…'),
    error: formError ?? tr('Ủa, bạn coi lại giùm mình chút.', 'Hm, could you check that again?'),
    joy: tr('Xong rồi, đi thôi!', "All set, let's go!"),
  }

  return (
    <AuthShell lines={lines}>
      <RegisterForm onFormError={setFormError} />
    </AuthShell>
  )
}

function RegisterForm({ onFormError }: { onFormError: (message: string | null) => void }) {
  const { tr } = useTr()
  const { setMood, originRef } = useMascot()
  const signIn = useAuthStore((state) => state.signIn)
  const openPortal = usePortalStore((state) => state.open)

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const light = useLight()
  const lamp = light.on
  const setLamp = light.setOn
  const [again, setAgain] = useState('')
  const [antibot, setAntibot] = useState<string | null>(null)
  const [antibotReset, setAntibotReset] = useState(0)
  const [styles, setStyles] = useState<string[]>([])
  const [errors, setErrors] = useState<{ name?: string; email?: string; password?: string; again?: string; antibot?: string }>({})
  const [done, setDone] = useState(false)

  const item = useAuthItem('right')
  const entry = useAuthEntry()
  const nameField = useMascotField('text')
  const emailField = useMascotField('text')
  const passwordField = useMascotField('secret', lamp)
  const strength = strengthOf(password)
  const strengthLabel = [tr('Quá ngắn', 'Too short'), tr('Yếu', 'Weak'), tr('Tạm được', 'Fair'), tr('Khá tốt', 'Good'), tr('Mạnh', 'Strong'), tr('Rất mạnh', 'Excellent')][password ? Math.max(1, strength) : 0]

  const mutation = useMutation({
    mutationFn: register,
    onMutate: () => {
      setMood('thinking')
      onFormError(null)
    },
    onSuccess: ({ user, token }) => {
      saveOnboarding(user.id, styles)
      setMood('joy')
      setDone(true)
      const rect = originRef.current?.getBoundingClientRect()
      const origin = rect ? { x: rect.left + rect.width / 2, y: rect.top + rect.height * 0.4 } : undefined
      window.setTimeout(() => {
        signIn(user, { token })
        openPortal('/app', origin)
      }, 1100)
    },
    onError: (error) => {
      setAntibotReset((value) => value + 1)
      const code = error instanceof ApiError ? error.code : ''
      const status = error instanceof ApiError ? error.status : 0
      const taken = code === 'email_taken'
      const message = taken
        ? tr('Email này có tài khoản rồi, đăng nhập đi nhé.', 'This email already has an account, sign in instead.')
        : code === 'antibot-failed'
          ? tr('Bước xác minh chưa qua, làm lại giúp mình nhé.', 'The human check did not pass; please do it again.')
          : status === 429
            ? tr('Thử quá nhiều lần, đợi ít phút rồi thử lại.', 'Too many tries; wait a few minutes and try again.')
            : status === 422
              ? tr('Có ô chưa hợp lệ, kiểm tra lại giúp mình.', 'Some field is not valid; please check again.')
              : status > 0
                ? tr('Máy chủ báo lỗi, thử lại sau ít phút.', 'The server reported an error; try again shortly.')
                : tr('Không kết nối được máy chủ.', 'Could not reach the server.')
      if (taken) setErrors({ email: message })
      else if (code === 'antibot-failed') setErrors({ antibot: message })
      onFormError(taken ? tr('Email này có người dùng rồi!', 'That email is already taken!') : message)
      setMood('error')
      window.setTimeout(() => setMood('idle'), 2400)
    },
  })

  const busy = mutation.isPending || done

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (busy) return
    const next: typeof errors = {}
    if (name.trim().length < 2) next.name = tr('Nhập tên bạn (ít nhất 2 ký tự).', 'Enter your name (2+ characters).')
    if (!EMAIL_PATTERN.test(email.trim())) next.email = tr('Email cần có dạng ten@vi-du.com.', 'Email should look like name@example.com.')
    if (password.length < 6) next.password = tr('Mật khẩu cần ít nhất 6 ký tự.', 'Password needs at least 6 characters.')
    if (again !== password) next.again = tr('Hai mật khẩu chưa giống nhau.', 'The two passwords do not match.')
    if (!antibot) next.antibot = tr('Hoàn tất bước xác minh trước nhé.', 'Finish the human check first.')
    setErrors(next)
    if (Object.keys(next).length) {
      onFormError(tr('Ủa, còn vài ô chưa ổn.', 'Hm, a few fields are not right yet.'))
      setMood('error')
      window.setTimeout(() => setMood('idle'), 2000)
      return
    }
    mutation.mutate({ name, email, password, antibotToken: antibot ?? undefined })
  }

  return (
    <form onSubmit={submit} noValidate>
      <RevealHeading as="h1" immediate delay={entry === 'arrive' ? 0.3 : 0} parts={[{ text: tr('Tạo tài khoản', 'Create account') }]} className="h-display text-[2.1rem] text-[color:var(--a-ink)] sm:text-[2.5rem]" />

      <div className="mt-5">
        <motion.div variants={item}>
          <Field
            label={tr('Tên của bạn', 'Your name')}
            name="name"
            autoComplete="name"
            placeholder={tr('Nguyễn Minh Anh', 'Alex Nguyen')}
            icon={<UserRound size={17} />}
            value={name}
            error={errors.name}
            inputRef={nameField.ref}
            onFocus={nameField.onFocus}
            onBlur={nameField.onBlur}
            onChange={(event) => {
              setName(event.target.value)
              setErrors((current) => ({ ...current, name: undefined }))
              nameField.track()
            }}
            disabled={busy}
          />
        </motion.div>
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
            name="new-password"
            autoComplete="new-password"
            placeholder={tr('Ít nhất 6 ký tự', 'At least 6 characters')}
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
        <motion.div variants={item}>
          <Field
            label={tr('Nhập lại mật khẩu', 'Password again')}
            type="password"
            name="confirm-password"
            autoComplete="new-password"
            icon={<KeyRound size={17} />}
            value={again}
            error={errors.again}
            onChange={(event) => {
              setAgain(event.target.value)
              setErrors((current) => ({ ...current, again: undefined }))
            }}
            disabled={busy}
          />
        </motion.div>
        <motion.div variants={item} className="mb-4 mt-1 flex items-center gap-3" aria-live="polite">
          <div className="flex gap-1" aria-hidden="true">
            {[0, 1, 2, 3, 4].map((index) => (
              <motion.span key={index} animate={{ scale: strength > index ? [1, 1.35, 1] : 1, rotate: strength > index ? 45 : 0 }} transition={{ duration: 0.4 }} className={strength > index ? 'text-sun drop-shadow-[0_0_6px_rgba(240,185,75,0.9)]' : 'text-[color:var(--a-ink)] opacity-20'}>
                <Khatam size={15} />
              </motion.span>
            ))}
          </div>
          <motion.span key={strengthLabel} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28, ease: EASE_OUT }} className="text-xs font-medium text-[color:var(--a-muted)]">
            {strengthLabel}
          </motion.span>
        </motion.div>
      </div>

      <motion.fieldset variants={item} className="mb-5">
        <legend className="mb-2 text-[0.78rem] font-semibold text-[color:var(--a-ink)]">{tr('Bạn thích đi kiểu nào? (không bắt buộc)', 'What kind of traveler are you? (optional)')}</legend>
        <motion.div variants={chipGroup} className="flex flex-wrap gap-2">
          {STYLES.map((style) => {
            const active = styles.includes(style.id)
            return (
              <motion.span key={style.id} variants={popItem} className="inline-flex">
                <button type="button" aria-pressed={active} onClick={() => setStyles((current) => (active ? current.filter((id) => id !== style.id) : [...current, style.id]))} className="auth-chip">
                  <motion.span key={active ? 'on' : 'off'} initial={active ? { scale: 0.4, rotate: -24 } : false} animate={{ scale: 1, rotate: 0 }} transition={SUCCESS_POP} className="inline-flex">
                    <CategoryIcon cat={style.id} size={20} />
                  </motion.span>
                  {tr(style.vi, style.en)}
                </button>
              </motion.span>
            )
          })}
        </motion.div>
      </motion.fieldset>

      <motion.div variants={item}>
        <AntibotField
          onToken={(token) => {
            setAntibot(token)
            if (token) setErrors((current) => ({ ...current, antibot: undefined }))
          }}
          resetKey={antibotReset}
          disabled={busy}
        />
        {errors.antibot && (
          <p className="-mt-2 mb-2 text-xs font-medium text-[color:var(--a-error)]" role="alert">
            {errors.antibot}
          </p>
        )}
      </motion.div>

      <motion.div variants={item} whileTap={busy ? undefined : { scale: 0.97 }} className="relative grid">
        <button type="submit" className="auth-btn" disabled={busy}>
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={done ? 'd' : mutation.isPending ? 'l' : 'i'}
              initial={done ? { opacity: 0, y: 10, scale: 0.7 } : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={LABEL_OUT}
              transition={done ? SUCCESS_POP : { duration: 0.3, ease: EASE_OUT }}
              className="inline-flex items-center gap-2"
            >
              {mutation.isPending && <Khatam size={16} className="!animate-[spin-slow_2.4s_linear_infinite]" />}
              {done ? tr('Chào mừng!', 'Welcome!') : mutation.isPending ? tr('Đang chuẩn bị…', 'Getting ready…') : tr('Tạo tài khoản', 'Create account')}
            </motion.span>
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

      <motion.p variants={item} className="mt-5 text-center text-[0.84rem] text-[color:var(--a-muted)]">
        {tr('Đã có tài khoản?', 'Already have an account?')}{' '}
        <Link to="/login" className="font-bold text-[color:var(--a-accent)] underline-offset-4 hover:underline">
          {tr('Đăng nhập', 'Sign in')}
        </Link>
      </motion.p>
    </form>
  )
}
