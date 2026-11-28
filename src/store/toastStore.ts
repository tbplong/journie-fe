import { create } from 'zustand'
import { cheer } from '../lib/cheer'

export type ToastTone = 'info' | 'success' | 'warning' | 'danger'

/** A button in the toast, such as "Undo"; pressing it also closes the toast. */
export type ToastAction = { label: string; run: () => void }

export type Toast = {
  id: number
  tone: ToastTone
  title: string
  body?: string
  action?: ToastAction
}

type ToastState = {
  toasts: Toast[]
  push: (toast: Omit<Toast, 'id'>, ttl?: number) => void
  dismiss: (id: number) => void
}

let nextId = 1

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],
  push: (toast, ttl = 5200) => {
    const id = nextId++
    set((state) => ({ toasts: [...state.toasts.slice(-3), { ...toast, id }] }))
    window.setTimeout(() => get().dismiss(id), ttl)
  },
  dismiss: (id) => set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) })),
}))

/** A toast with an action stays a little longer, so there is time to press it. */
export const toast = (tone: ToastTone, title: string, body?: string, action?: ToastAction) => {
  if (tone === 'success') cheer()
  useToastStore.getState().push({ tone, title, body, action }, action ? 8000 : 5200)
}
