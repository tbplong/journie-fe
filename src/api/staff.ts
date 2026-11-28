import type { AccountStatus, SessionUser, StaffRole } from '../store/authStore'
import { linkFor, newToken, publicUser, readAccounts, writeAccounts, type Account } from './accountStore'
import { normalizePhone } from './auth'
import { ApiError, CRUD_TIMEOUT_MS, latency, remoteOr, requestJson } from './http'
import type { Page } from './admin'

/**
 * Employees of a business (UC 5.9-5.16): `GET/POST /business/employees`, `GET/PATCH/DELETE /business/employees/{id}`,
 * `POST /business/employees/{id}/block|unblock`. Businesses themselves (UC 5.17): `GET/POST /admin/businesses`. Kept in this
 * browser's account list until the backend has them; an invite is a one-time link the new user opens to set a password.
 */

/** What an employee can reach inside the business. */
export type Resource = 'dashboard' | 'places' | 'reports' | 'employees'
export const RESOURCES: Resource[] = ['dashboard', 'places', 'reports', 'employees']

export type Employee = SessionUser & { resources: Resource[]; createdAt?: string; lastActiveAt?: string }
type StaffAccount = Account & { resources?: Resource[] }

const toEmployee = (account: StaffAccount): Employee => ({ ...publicUser(account), status: account.status ?? 'active', resources: account.resources ?? [], createdAt: account.createdAt, lastActiveAt: account.lastActiveAt })

const staffOf = (businessId: string) => (readAccounts() as StaffAccount[]).filter((a) => a.businessId === businessId && a.role !== 'business')

export type EmployeeQuery = { q?: string; status?: AccountStatus | 'all'; page?: number; pageSize?: number }

export const listEmployees = (businessId: string, { q = '', status = 'all', page = 1, pageSize = 10 }: EmployeeQuery) =>
  remoteOr<Page<Employee>>(
    'employees',
    () => requestJson<Page<Employee>>('GET', `/business/employees?${new URLSearchParams({ q, status, page: String(page), page_size: String(pageSize) })}`, undefined, CRUD_TIMEOUT_MS),
    () =>
      latency(() => {
        const needle = q.trim().toLowerCase()
        const all = staffOf(businessId)
          .map(toEmployee)
          .filter((e) => (status === 'all' || e.status === status) && (!needle || `${e.name} ${e.email}`.toLowerCase().includes(needle)))
          .sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''))
        return { items: all.slice((page - 1) * pageSize, page * pageSize), total: all.length, page, pageSize }
      }, 150, 320),
  )

export type NewEmployee = { businessId: string; name: string; email: string; phone: string; staffRole: StaffRole; resources: Resource[] }

/** UC 5.14 with 5.15 and 5.16: one call creates the account, sets its role and access, and sends the invite. */
export const createEmployee = (input: NewEmployee) =>
  remoteOr<{ employee: Employee; devLink?: string }>(
    'employees',
    () => requestJson<Employee>('POST', '/business/employees', { name: input.name.trim(), email: input.email.trim().toLowerCase(), phone: input.phone ? normalizePhone(input.phone) : null, role: input.staffRole, resources: input.resources }, CRUD_TIMEOUT_MS).then((employee) => ({ employee })),
    () =>
      latency(() => {
        const list = readAccounts()
        const email = input.email.trim().toLowerCase()
        if (list.some((a) => a.email.toLowerCase() === email)) throw new ApiError('email_taken', 'Email already registered')
        const account: StaffAccount = {
          id: `u-${Date.now().toString(36)}`,
          name: input.name.trim(),
          email,
          phone: input.phone ? normalizePhone(input.phone) : undefined,
          role: 'traveler',
          status: 'invited',
          businessId: input.businessId,
          staffRole: input.staffRole,
          resources: input.resources,
          // Invited accounts cannot sign in until the link sets a password; this one is never shown or used.
          password: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
        }
        writeAccounts([...list, account])
        return { employee: toEmployee(account), devLink: linkFor('/reset-password', newToken(account.id, 'invite', email, 7 * 24 * 60).token) }
      }, 500, 800),
  )

function editStaff(businessId: string, id: string, change: (account: StaffAccount) => StaffAccount | null) {
  const list = readAccounts() as StaffAccount[]
  const target = list.find((a) => a.id === id && a.businessId === businessId && a.role !== 'business')
  if (!target) throw new ApiError('user_not_found', 'No such employee')
  const next = change(target)
  writeAccounts(next ? list.map((a) => (a.id === id ? next : a)) : list.filter((a) => a.id !== id))
  return next ? toEmployee(next) : null
}

export const setEmployeeStatus = (businessId: string, id: string, status: 'active' | 'blocked') =>
  remoteOr<Employee>(
    'employees',
    () => requestJson<Employee>('POST', `/business/employees/${encodeURIComponent(id)}/${status === 'blocked' ? 'block' : 'unblock'}`, {}, CRUD_TIMEOUT_MS),
    () => latency(() => editStaff(businessId, id, (a) => ({ ...a, status: a.status === 'invited' && status === 'active' ? 'invited' : status }))!, 200, 400),
  )

export const updateEmployee = (businessId: string, id: string, patch: { staffRole?: StaffRole; resources?: Resource[] }) =>
  remoteOr<Employee>(
    'employees',
    () => requestJson<Employee>('PATCH', `/business/employees/${encodeURIComponent(id)}`, { role: patch.staffRole, resources: patch.resources }, CRUD_TIMEOUT_MS),
    () => latency(() => editStaff(businessId, id, (a) => ({ ...a, ...patch }))!, 200, 400),
  )

export const deleteEmployee = (businessId: string, id: string) =>
  remoteOr<true>(
    'employees',
    () => requestJson<void>('DELETE', `/business/employees/${encodeURIComponent(id)}`, undefined, CRUD_TIMEOUT_MS).then(() => true as const),
    () => latency(() => (editStaff(businessId, id, () => null), true as const), 250, 450),
  )

/* ───────── businesses (UC 5.17) ───────── */

export type Business = { id: string; name: string; ownerId: string; ownerName: string; ownerEmail: string; phone?: string; plan: 'starter' | 'pro'; status: AccountStatus; createdAt?: string; employees: number }

export const listBusinesses = () =>
  remoteOr<Business[]>(
    'businesses',
    () => requestJson<Business[]>('GET', '/admin/businesses', undefined, CRUD_TIMEOUT_MS),
    () =>
      latency(() => {
        const accounts = readAccounts() as (StaffAccount & { companyName?: string; plan?: Business['plan'] })[]
        return accounts
          .filter((a) => a.role === 'business' && a.businessId)
          .map((owner) => ({
            id: owner.businessId!,
            name: owner.companyName ?? owner.name,
            ownerId: owner.id,
            ownerName: owner.name,
            ownerEmail: owner.email,
            phone: owner.phone,
            plan: owner.plan ?? 'starter',
            status: owner.status ?? 'active',
            createdAt: owner.createdAt,
            employees: accounts.filter((a) => a.businessId === owner.businessId && a.role !== 'business').length,
          }))
      }, 150, 300),
  )

export type NewBusiness = { companyName: string; ownerName: string; ownerEmail: string; phone: string; plan: Business['plan'] }

export const createBusiness = (input: NewBusiness) =>
  remoteOr<{ business: Business; devLink?: string }>(
    'businesses',
    () => requestJson<Business>('POST', '/admin/businesses', { company_name: input.companyName.trim(), owner_name: input.ownerName.trim(), owner_email: input.ownerEmail.trim().toLowerCase(), phone: input.phone ? normalizePhone(input.phone) : null, plan: input.plan }, CRUD_TIMEOUT_MS).then((business) => ({ business })),
    () =>
      latency(() => {
        const list = readAccounts()
        const email = input.ownerEmail.trim().toLowerCase()
        if (list.some((a) => a.email.toLowerCase() === email)) throw new ApiError('email_taken', 'Email already registered')
        const businessId = `b-${Date.now().toString(36)}`
        const owner = {
          id: `u-${Date.now().toString(36)}`,
          name: input.ownerName.trim(),
          email,
          phone: input.phone ? normalizePhone(input.phone) : undefined,
          role: 'business' as const,
          status: 'invited' as const,
          businessId,
          companyName: input.companyName.trim(),
          plan: input.plan,
          password: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
        }
        writeAccounts([...list, owner])
        const business: Business = { id: businessId, name: owner.companyName, ownerId: owner.id, ownerName: owner.name, ownerEmail: email, phone: owner.phone, plan: input.plan, status: 'invited', createdAt: owner.createdAt, employees: 0 }
        return { business, devLink: linkFor('/reset-password', newToken(owner.id, 'invite', email, 7 * 24 * 60).token) }
      }, 500, 800),
  )
