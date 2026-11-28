import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type NotificationKind = 'traffic' | 'closure' | 'weather' | 'delay' | 'info' | 'success' | 'announcement'

export type AppNotification = {
  id: string
  kind: NotificationKind
  vi: string
  en: string
  bodyVi?: string
  bodyEn?: string
  at: string
  read: boolean
  to?: string
  /** Whose note it is; notes saved before this was kept show to whoever is signed in. */
  userId?: string
}

type State = {
  items: AppNotification[]
  push: (item: Omit<AppNotification, 'id' | 'at' | 'read'>) => void
  markRead: (id: string) => void
  markAllRead: (userId?: string) => void
  remove: (id: string) => void
  clear: (userId?: string) => void
}

const mine = (item: AppNotification, userId?: string) => !userId || !item.userId || item.userId === userId

/** Notes made on this device (trip alerts, plan changes); notes sent by an admin come from `api/notifications.ts`. */
export const useNotificationStore = create<State>()(
  persist(
    (set) => ({
      items: [],
      push: (item) =>
        set((state) => ({
          items: [{ ...item, id: `n${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`, at: new Date().toISOString(), read: false }, ...state.items].slice(0, 40),
        })),
      markRead: (id) => set((state) => ({ items: state.items.map((item) => (item.id === id ? { ...item, read: true } : item)) })),
      markAllRead: (userId) => set((state) => ({ items: state.items.map((item) => (mine(item, userId) ? { ...item, read: true } : item)) })),
      remove: (id) => set((state) => ({ items: state.items.filter((item) => item.id !== id) })),
      clear: (userId) => set((state) => ({ items: state.items.filter((item) => !mine(item, userId)) })),
    }),
    { name: 'journie-notifications', version: 1 },
  ),
)
