import type { SessionUser } from '../store/authStore'
import { findByEmail, linkFor, newToken, publicUser, readAccounts, readTokens, writeAccounts, writeTokens, type Account } from './accountStore'
import { ApiError, CRUD_TIMEOUT_MS, isDeviceOnly, latency, remoteOr, requestJson } from './http'

export { demoAccounts } from './accountStore'

/** What the backend's auth routes return: the user and a bearer token. */
type SessionDto = { user: SessionUser; token: string }
export type Session = { user: SessionUser; token: string | null }

export type LoginInput = { email: string; password: string; remember?: boolean; antibotToken?: string }
export type RegisterInput = { name: string; email: string; password: string; antibotToken?: string }

const mail = (email: string) => email.trim().toLowerCase()

/**
 * Each group of routes falls back to the device on its own, so one route the backend lacks (say `POST /me/email`) does not move
 * sign-in itself to the device. Account edits follow sign-in: while signing in runs on the device, so do they.
 */
const RECOVERY = 'auth-recovery'
const accountFeature = () => (isDeviceOnly('auth') ? 'auth' : 'account')

/** Use case "Log in": `POST /auth/login`; on the device the password is compared with the stored one. */
export function login({ email, password, remember = true, antibotToken }: LoginInput): Promise<Session> {
  return remoteOr<Session>(
    'auth',
    () => requestJson<SessionDto>('POST', '/auth/login', { email: mail(email), password, remember, antibot_token: antibotToken }, CRUD_TIMEOUT_MS),
    () =>
      latency(() => {
        const account = findByEmail(email)
        if (!account) throw new ApiError('user_not_found', 'No account uses this email')
        if (account.status === 'invited') throw new ApiError('account_invited', 'The invite has not been accepted yet')
        if (account.password !== password) throw new ApiError('invalid_credentials', 'Password does not match')
        if (account.status === 'blocked') throw new ApiError('account_blocked', 'This account is blocked')
        writeAccounts(readAccounts().map((entry) => (entry.id === account.id ? { ...entry, lastActiveAt: new Date().toISOString() } : entry)))
        return { user: publicUser(account), token: null }
      }, 900, 1300),
  )
}

export function register({ name, email, password, antibotToken }: RegisterInput): Promise<Session> {
  return remoteOr<Session>(
    'auth',
    () => requestJson<SessionDto>('POST', '/auth/register', { name: name.trim(), email: mail(email), password, antibot_token: antibotToken }, CRUD_TIMEOUT_MS),
    () =>
      latency(() => {
        if (findByEmail(email)) throw new ApiError('email_taken', 'Email already registered')
        const now = new Date().toISOString()
        const account: Account = { id: `u-${Date.now().toString(36)}`, name: name.trim(), email: mail(email), role: 'traveler', status: 'active', password, createdAt: now, lastActiveAt: now }
        writeAccounts([...readAccounts(), account])
        return { user: publicUser(account), token: null }
      }, 900, 1300),
  )
}

/** Tells the backend the session is over; nothing to do on the device. */
export const logout = () => remoteOr('auth-logout', () => requestJson<void>('POST', '/auth/logout', {}, CRUD_TIMEOUT_MS), () => undefined).catch(() => undefined)

/** `devLink` is set only while the link is made on the device: no mail is sent, so the page shows it instead. */
export type RecoveryResult = { email: string; devLink?: string; devName?: string }

/**
 * Use case "Forget password" (UC 5.4/7.5): `POST /auth/forgot-password`. The answer is the same whether or not the email has an
 * account, so the form cannot be used to find out who is registered.
 */
export function requestPasswordReset(email: string): Promise<RecoveryResult> {
  return remoteOr<RecoveryResult>(
    RECOVERY,
    () => requestJson<void>('POST', '/auth/forgot-password', { email: mail(email) }, CRUD_TIMEOUT_MS).then(() => ({ email: mail(email) })),
    () =>
      latency(() => {
        const account = findByEmail(email)
        if (!account || account.status === 'blocked') return { email: mail(email) }
        return { email: mail(email), devLink: linkFor('/reset-password', newToken(account.id, 'reset', account.email).token) }
      }, 600, 900),
  )
}

/** Use case "Forget username" (UC 7.6): accounts sign in by email, so the reminder mail says which name and email the account uses. */
export function requestUsernameReminder(email: string): Promise<RecoveryResult> {
  return remoteOr<RecoveryResult>(
    RECOVERY,
    () => requestJson<void>('POST', '/auth/forgot-username', { email: mail(email) }, CRUD_TIMEOUT_MS).then(() => ({ email: mail(email) })),
    () =>
      latency(() => {
        const account = findByEmail(email)
        return account ? { email: mail(email), devName: account.name } : { email: mail(email) }
      }, 600, 900),
  )
}

export type LinkCheck = { purpose: 'reset' | 'invite' | 'email'; email: string }

function liveToken(token: string) {
  const entry = readTokens().find((t) => t.token === token)
  if (!entry || entry.usedAt) throw new ApiError('link-invalid', 'This link is not valid')
  if (Date.parse(entry.expiresAt) < Date.now()) throw new ApiError('link-expired', 'This link has expired')
  return entry
}

/** Whether a reset, invite or email link can still be used, before the form is shown. */
export const checkLink = (token: string) =>
  remoteOr<LinkCheck>(
    RECOVERY,
    () => requestJson<LinkCheck>('GET', `/auth/links/${encodeURIComponent(token)}`, undefined, CRUD_TIMEOUT_MS),
    () => latency(() => {
      const entry = liveToken(token)
      return { purpose: entry.purpose, email: entry.email }
    }, 200, 400),
  )

/** Sets a new password from a reset or invite link (`POST /auth/reset-password`); the link works once. */
export function resetPassword(token: string, password: string) {
  return remoteOr<true>(
    RECOVERY,
    () => requestJson<void>('POST', '/auth/reset-password', { token, password }, CRUD_TIMEOUT_MS).then(() => true as const),
    () =>
      latency(() => {
        const entry = liveToken(token)
        if (entry.purpose === 'email') throw new ApiError('link-invalid', 'Not a password link')
        writeAccounts(readAccounts().map((a) => (a.id === entry.userId ? { ...a, password, status: a.status === 'invited' ? 'active' : a.status } : a)))
        writeTokens(readTokens().map((t) => (t.token === token ? { ...t, usedAt: new Date().toISOString() } : t)))
        return true as const
      }, 500, 800),
  )
}

/** E.164 for a Vietnamese number written the local way ("0912 345 678" becomes "+84912345678"); other countries need their +code. */
export function normalizePhone(raw: string): string {
  const digits = raw.replace(/[^\d+]/g, '')
  if (!digits) return ''
  if (digits.startsWith('+')) return `+${digits.slice(1).replace(/\D/g, '')}`
  if (digits.startsWith('84')) return `+${digits}`
  if (digits.startsWith('0')) return `+84${digits.slice(1)}`
  return `+84${digits}`
}

export const validPhone = (e164: string) => /^\+\d{9,15}$/.test(e164)

export type AccountInput = { id: string; name: string; phone: string }

const update = (id: string, patch: (account: Account) => Account) => {
  const list = readAccounts()
  const account = list.find((entry) => entry.id === id)
  if (!account) throw new ApiError('user_not_found', 'No account uses this id')
  const next = patch(account)
  writeAccounts(list.map((entry) => (entry.id === id ? next : entry)))
  return publicUser(next)
}

/** Use case "Changing account info" (UC 5.7): `PATCH /me` with the name and phone; the email has its own confirmed flow. */
export function updateAccount({ id, name, phone }: AccountInput): Promise<SessionUser> {
  const body = { name: name.trim(), phone: phone ? normalizePhone(phone) : null }
  return remoteOr<SessionUser>(
    accountFeature(),
    () => requestJson<SessionUser>('PATCH', '/me', body, CRUD_TIMEOUT_MS),
    () => latency(() => update(id, (a) => ({ ...a, name: body.name, phone: body.phone ?? undefined })), 500, 800),
  )
}

export type EmailChangeInput = { id: string; email: string; password: string }

/** UC 5.6: asks for a new address (`POST /me/email`); it changes only once the link mailed to that address is opened. */
export function requestEmailChange({ id, email, password }: EmailChangeInput): Promise<{ pendingEmail: string; devLink?: string }> {
  return remoteOr(
    accountFeature(),
    () => requestJson<{ pending_email: string }>('POST', '/me/email', { email: mail(email), password }, CRUD_TIMEOUT_MS).then((r) => ({ pendingEmail: r.pending_email })),
    () =>
      latency(() => {
        const list = readAccounts()
        const account = list.find((entry) => entry.id === id)
        if (!account) throw new ApiError('user_not_found', 'No account uses this id')
        if (account.password !== password) throw new ApiError('invalid_credentials', 'Password does not match')
        if (list.some((entry) => entry.id !== id && entry.email.toLowerCase() === mail(email))) throw new ApiError('email_taken', 'Email already registered')
        update(id, (a) => ({ ...a, pendingEmail: mail(email) }))
        return { pendingEmail: mail(email), devLink: linkFor('/confirm-email', newToken(id, 'email', mail(email), 24 * 60).token) }
      }, 600, 900),
  )
}

/** Opens an email-change link (`POST /me/email/confirm`) and returns the account with its new address. */
export function confirmEmailChange(token: string): Promise<SessionUser> {
  return remoteOr<SessionUser>(
    accountFeature(),
    () => requestJson<SessionUser>('POST', '/me/email/confirm', { token }, CRUD_TIMEOUT_MS),
    () =>
      latency(() => {
        const entry = liveToken(token)
        if (entry.purpose !== 'email') throw new ApiError('link-invalid', 'Not an email link')
        if (readAccounts().some((a) => a.id !== entry.userId && a.email.toLowerCase() === entry.email)) throw new ApiError('email_taken', 'Email already registered')
        writeTokens(readTokens().map((t) => (t.token === token ? { ...t, usedAt: new Date().toISOString() } : t)))
        return update(entry.userId, (a) => ({ ...a, email: entry.email, pendingEmail: undefined }))
      }, 400, 700),
  )
}

export type PasswordInput = { id: string; current: string; next: string }

/** Use case "Change password": `POST /me/password`; the current one has to match. */
export function changePassword({ id, current, next }: PasswordInput) {
  return remoteOr<true>(
    accountFeature(),
    () => requestJson<void>('POST', '/me/password', { current_password: current, new_password: next }, CRUD_TIMEOUT_MS).then(() => true as const),
    () =>
      latency(() => {
        const account = readAccounts().find((entry) => entry.id === id)
        if (!account) throw new ApiError('user_not_found', 'No account uses this id')
        if (account.password !== current) throw new ApiError('invalid_credentials', 'Password does not match')
        update(id, (a) => ({ ...a, password: next }))
        return true as const
      }, 600, 900),
  )
}

/** UC 5.3: `POST /me/avatar` (multipart). On the device the picture is the already shrunk data URL. */
export function uploadAvatar(id: string, file: Blob, dataUrl: string): Promise<SessionUser> {
  const form = new FormData()
  form.append('file', file, 'avatar.webp')
  return remoteOr<SessionUser>(
    'avatar',
    () => requestJson<SessionUser>('POST', '/me/avatar', form, CRUD_TIMEOUT_MS),
    () => latency(() => update(id, (a) => ({ ...a, avatarUrl: dataUrl })), 300, 600),
  )
}

export function removeAvatar(id: string): Promise<SessionUser> {
  return remoteOr<SessionUser>(
    'avatar',
    () => requestJson<SessionUser>('DELETE', '/me/avatar', undefined, CRUD_TIMEOUT_MS),
    () => latency(() => update(id, (a) => ({ ...a, avatarUrl: undefined })), 200, 400),
  )
}
