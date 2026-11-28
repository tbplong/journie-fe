import { useCallback, useMemo } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { markInboxRead, removeInbox } from '../api/notifications'
import { keys, useInbox } from '../api/queries'
import { useTr } from './useTr'
import { useAuthStore } from '../store/authStore'
import { toast } from '../store/toastStore'
import { useNotificationStore, type AppNotification } from '../store/notificationStore'

export type MergedNotification = AppNotification & { source: 'device' | 'inbox' }

/** The signed-in user's notes: the ones made on this device (trip alerts) and the ones sent to them (UC 6.15), newest first. */
export function useNotifications() {
  const userId = useAuthStore((state) => state.user?.id)
  const local = useNotificationStore((state) => state.items)
  const store = useNotificationStore()
  const inbox = useInbox()
  const client = useQueryClient()

  const items = useMemo<MergedNotification[]>(
    () =>
      [
        ...local.filter((item) => !item.userId || item.userId === userId).map((item) => ({ ...item, source: 'device' as const })),
        ...(inbox.data ?? []).map((item) => ({ ...item, source: 'inbox' as const })),
      ].sort((a, b) => b.at.localeCompare(a.at)),
    [local, inbox.data, userId],
  )

  const { tr } = useTr()
  const refreshInbox = useCallback(() => {
    if (userId) void client.invalidateQueries({ queryKey: keys.inbox(userId) })
  }, [client, userId])
  // A change the server did not take: say so and show the inbox as the server has it
  const failed = useCallback(() => {
    toast('danger', tr('Chưa cập nhật được thông báo', 'Could not update the notification'), tr('Thử lại sau nhé.', 'Try again later.'))
    refreshInbox()
  }, [tr, refreshInbox])

  const markRead = useCallback(
    (item: MergedNotification) => {
      if (item.read) return
      if (item.source === 'device') store.markRead(item.id)
      else if (userId) void markInboxRead(userId, item.id).then(refreshInbox, failed)
    },
    [store, userId, refreshInbox, failed],
  )

  const remove = useCallback(
    (item: MergedNotification) => {
      if (item.source === 'device') store.remove(item.id)
      else if (userId) void removeInbox(userId, item.id).then(refreshInbox, failed)
    },
    [store, userId, refreshInbox, failed],
  )

  const markAllRead = useCallback(() => {
    store.markAllRead(userId)
    if (userId) void Promise.all(items.filter((item) => item.source === 'inbox' && !item.read).map((item) => markInboxRead(userId, item.id))).then(refreshInbox, failed)
  }, [store, userId, items, refreshInbox, failed])

  const clear = useCallback(() => {
    store.clear(userId)
    if (userId) void Promise.all(items.filter((item) => item.source === 'inbox').map((item) => removeInbox(userId, item.id))).then(refreshInbox, failed)
  }, [store, userId, items, refreshInbox, failed])

  return { items, unread: items.filter((item) => !item.read).length, markRead, remove, markAllRead, clear }
}
