import type { SessionUser } from '../store/authStore'
import { readStore, writeStore } from './http'

/**
 * The accounts kept in this browser while the backend has no users table. Demo only: the password is stored as typed, so nothing
 * here may ship; once `/auth/*` exists these functions are only reached when the backend has no such route.
 */
export type Account = SessionUser & { password: string; createdAt?: string; lastActiveAt?: string; blockedReason?: string }

const ACCOUNTS_KEY = 'journie-accounts-v1'

/** Demo accounts shown as one-tap chips on the login page. */
export const demoAccounts = {
  traveler: { email: 'lu.khach@journie.vn', password: 'journie123' },
  admin: { email: 'ba@journie.vn', password: 'journie123' },
  business: { email: 'doanhnghiep@journie.vn', password: 'journie123' },
} as const

const seed: Account[] = [
  { id: 'u-traveler', name: 'Lữ Khách', email: demoAccounts.traveler.email, role: 'traveler', password: demoAccounts.traveler.password, status: 'active' },
  { id: 'u-admin', name: 'Platform Admin', email: demoAccounts.admin.email, role: 'admin', password: demoAccounts.admin.password, status: 'active' },
  { id: 'u-business', name: 'Doanh nghiệp mẫu', email: demoAccounts.business.email, role: 'business', password: demoAccounts.business.password, status: 'active', businessId: 'b-demo' },
]

/** Stored accounts, with any demo account added since this browser first saved its list. */
export function readAccounts(): Account[] {
  const stored = readStore<Account[]>(ACCOUNTS_KEY, [])
  const missing = seed.filter((demo) => !stored.some((entry) => entry.id === demo.id))
  return [...stored, ...missing]
}

export const writeAccounts = (accounts: Account[]) => writeStore(ACCOUNTS_KEY, accounts)

export const publicUser = ({ password: _password, createdAt: _created, lastActiveAt: _last, blockedReason: _reason, ...user }: Account): SessionUser => user

export const findByEmail = (email: string) => readAccounts().find((entry) => entry.email.toLowerCase() === email.trim().toLowerCase())

/** One-time links (password reset, invite, email change) kept on the device until the backend mails real ones. */
export type LinkToken = { token: string; userId: string; purpose: 'reset' | 'invite' | 'email'; email: string; expiresAt: string; usedAt?: string }

const TOKENS_KEY = 'journie-link-tokens-v1'

export const readTokens = () => readStore<LinkToken[]>(TOKENS_KEY, [])
export const writeTokens = (tokens: LinkToken[]) => writeStore(TOKENS_KEY, tokens.slice(-50))

export function newToken(userId: string, purpose: LinkToken['purpose'], email: string, minutes = 30): LinkToken {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  const token = [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('')
  const entry: LinkToken = { token, userId, purpose, email, expiresAt: new Date(Date.now() + minutes * 60_000).toISOString() }
  writeTokens([...readTokens().filter((t) => !(t.userId === userId && t.purpose === purpose && !t.usedAt)), entry])
  return entry
}

/** The link a mail would carry, on this site. */
export const linkFor = (path: string, token: string) => `${window.location.origin}${path}?token=${token}`
