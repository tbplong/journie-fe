import type { AppNotification } from '../store/notificationStore'
import { readAccounts } from './accountStore'
import { ApiError, CRUD_TIMEOUT_MS, latency, readStore, remoteOr, requestJson, writeStore } from './http'

/**
 * Notifications sent to a user (UC 3.5, 6.13, 6.15): `GET /me/notifications`, `PATCH /me/notifications/{id}`,
 * `DELETE /me/notifications/{id}`, and for admins `GET /admin/channels`, `POST /admin/notifications`. Until the backend has them an
 * admin's message is written into the inbox of each account on this browser only.
 */
const INBOX_KEY = 'journie-inbox-v1'
const SENT_KEY = 'journie-sent-notifications-v1'

type Inbox = Record<string, AppNotification[]>
const readInbox = () => readStore<Inbox>(INBOX_KEY, {})

export const listInbox = (userId: string) =>
  remoteOr<AppNotification[]>(
    'notifications',
    () => requestJson<AppNotification[]>('GET', '/me/notifications', undefined, CRUD_TIMEOUT_MS),
    () => latency(() => readInbox()[userId] ?? [], 80, 200),
  )

function editInbox(userId: string, change: (items: AppNotification[]) => AppNotification[]) {
  const inbox = readInbox()
  writeStore(INBOX_KEY, { ...inbox, [userId]: change(inbox[userId] ?? []) })
}

export const markInboxRead = (userId: string, id: string) =>
  remoteOr<true>(
    'notifications',
    () => requestJson<void>('PATCH', `/me/notifications/${encodeURIComponent(id)}`, { read: true }, CRUD_TIMEOUT_MS).then(() => true as const),
    () => latency(() => (editInbox(userId, (items) => items.map((item) => (item.id === id ? { ...item, read: true } : item))), true as const), 40, 100),
  )

export const removeInbox = (userId: string, id: string) =>
  remoteOr<true>(
    'notifications',
    () => requestJson<void>('DELETE', `/me/notifications/${encodeURIComponent(id)}`, undefined, CRUD_TIMEOUT_MS).then(() => true as const),
    () => latency(() => (editInbox(userId, (items) => items.filter((item) => item.id !== id)), true as const), 40, 100),
  )

export type ChannelId = 'in_app' | 'email' | 'push'
export type Channel = { id: ChannelId; enabled: boolean; reason?: string }

/** UC 6.12: the channels and whether each can deliver now. Only the in-app inbox works without a backend. */
export const listChannels = () =>
  remoteOr<Channel[]>(
    'channels',
    () => requestJson<Channel[]>('GET', '/admin/channels', undefined, CRUD_TIMEOUT_MS),
    () =>
      latency(
        () => [
          { id: 'in_app' as const, enabled: true },
          { id: 'email' as const, enabled: false, reason: 'no-mail-server' },
          { id: 'push' as const, enabled: false, reason: 'no-push-server' },
        ],
        100,
        200,
      ),
  )

export type Audience = { kind: 'all' } | { kind: 'users'; userIds: string[] }
export type OutgoingNotification = { channel: ChannelId; audience: Audience; titleVi: string; titleEn: string; bodyVi: string; bodyEn: string; link?: string }
export type SentNotification = OutgoingNotification & { id: string; at: string; delivered: number; senderId: string }

export const listSent = () =>
  remoteOr<SentNotification[]>(
    'notifications-admin',
    () => requestJson<SentNotification[]>('GET', '/admin/notifications', undefined, CRUD_TIMEOUT_MS),
    () => latency(() => readStore<SentNotification[]>(SENT_KEY, []), 100, 200),
  )

/** UC 6.13. On the device only the in-app channel can deliver, into the inboxes kept in this browser. */
export const sendNotification = (message: OutgoingNotification, senderId: string) =>
  remoteOr<SentNotification>(
    'notifications-admin',
    () => requestJson<SentNotification>('POST', '/admin/notifications', message, CRUD_TIMEOUT_MS),
    () =>
      latency(() => {
        if (message.channel !== 'in_app') throw new ApiError('channel-unavailable', 'This channel cannot deliver yet')
        const targets = message.audience.kind === 'all' ? readAccounts().filter((a) => a.role === 'traveler' && a.status !== 'blocked').map((a) => a.id) : message.audience.userIds
        const at = new Date().toISOString()
        const inbox = readInbox()
        for (const userId of targets) {
          const note: AppNotification = { id: `a${Date.now().toString(36)}${userId.slice(-3)}`, kind: 'announcement', vi: message.titleVi, en: message.titleEn, bodyVi: message.bodyVi, bodyEn: message.bodyEn, at, read: false, to: message.link || '/app/notifications', userId }
          inbox[userId] = [note, ...(inbox[userId] ?? [])].slice(0, 50)
        }
        writeStore(INBOX_KEY, inbox)
        const sent: SentNotification = { ...message, id: `sent-${Date.now().toString(36)}`, at, delivered: targets.length, senderId }
        writeStore(SENT_KEY, [sent, ...readStore<SentNotification[]>(SENT_KEY, [])].slice(0, 100))
        return sent
      }, 400, 700),
  )

/** Shows a system notification when the page is in the background and the traveler allowed it (UC 3.5). */
export function systemNotify(title: string, body?: string) {
  try {
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted' || !document.hidden) return
    new Notification(title, { body, icon: '/android-chrome-192x192.png', tag: 'journie' })
  } catch {
    /* some browsers only allow notifications from a service worker */
  }
}
