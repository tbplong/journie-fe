import { create } from 'zustand'
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware'
import { onUnauthorized, setAuthToken } from '../api/http'

/** `business` runs one business's dashboard and staff; `admin` runs the platform. */
export type Role = 'traveler' | 'admin' | 'business'

export type AccountStatus = 'active' | 'blocked' | 'invited'

/** What an employee may do inside their business. */
export type StaffRole = 'manager' | 'planner' | 'viewer'

export type SessionUser = {
  id: string
  name: string
  email: string
  /** Optional contact number the traveler typed in the account page, stored as E.164 (+84...). */
  phone?: string
  role: Role
  /** Profile picture: a URL from the backend, or a small data URL while it is kept on the device. */
  avatarUrl?: string
  status?: AccountStatus
  /** A new address waiting for its confirmation link (UC "change email"). */
  pendingEmail?: string
  /** Set on employee accounts: the business they work for and their role there. */
  businessId?: string
  staffRole?: StaffRole
}

type AuthState = {
  user: SessionUser | null
  token: string | null
  signIn: (user: SessionUser, options?: { token?: string | null; remember?: boolean }) => void
  /** Replaces the signed-in user's details (after an account edit) without touching the token. */
  updateUser: (user: SessionUser) => void
  signOut: () => void
  /** True after the backend refused the session (401), so the sign-in page can say why; not kept across a reload. */
  ended: boolean
}

const REMEMBER_KEY = 'journie-remember'

const remembered = () => {
  try {
    return localStorage.getItem(REMEMBER_KEY) !== '0'
  } catch {
    return true
  }
}

/**
 * "Remember me": a remembered session lives in localStorage and survives closing the browser; otherwise it lives in sessionStorage
 * and ends with the tab. The flag itself stays in localStorage so a reload knows where to look.
 */
const sessionStorageSwitch: StateStorage = {
  getItem: (name) => {
    try {
      return (remembered() ? localStorage : sessionStorage).getItem(name)
    } catch {
      return null
    }
  },
  setItem: (name, value) => {
    try {
      const keep = remembered()
      ;(keep ? localStorage : sessionStorage).setItem(name, value)
      ;(keep ? sessionStorage : localStorage).removeItem(name)
    } catch {
      /* storage blocked: the session lasts for this page only */
    }
  },
  removeItem: (name) => {
    try {
      localStorage.removeItem(name)
      sessionStorage.removeItem(name)
    } catch {
      /* storage blocked */
    }
  },
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      ended: false,
      signIn: (user, options = {}) => {
        try {
          localStorage.setItem(REMEMBER_KEY, options.remember === false ? '0' : '1')
        } catch {
          /* storage blocked */
        }
        set({ user, token: options.token ?? null, ended: false })
      },
      updateUser: (user) => set({ user }),
      signOut: () => set({ user: null, token: null }),
    }),
    {
      name: 'journie-session',
      version: 2,
      storage: createJSONStorage(() => sessionStorageSwitch),
      partialize: ({ user, token }) => ({ user, token }),
      migrate: (state) => ({ token: null, ...(state as object) }) as AuthState,
    },
  ),
)

setAuthToken(useAuthStore.getState().token)
useAuthStore.subscribe((state) => setAuthToken(state.token))
// Only a signed-in session is ended, once: the requests still in flight answer 401 too. Leaving the user unset sends /app/* to /login.
onUnauthorized(() => {
  if (useAuthStore.getState().user) useAuthStore.setState({ user: null, token: null, ended: true })
})

/**
 * Calls `listener` each time the signed-in person leaves: they sign out, the backend refuses their session, or another account signs
 * in over it. Returns the call that stops listening.
 */
export function onSignedOut(listener: () => void) {
  return useAuthStore.subscribe((state, previous) => {
    if (previous.user && state.user?.id !== previous.user.id) listener()
  })
}

/** sessionStorage keys holding what the signed-in person did in this tab (the assistant's conversation and question count). */
export const PERSONAL_TAB_KEYS = { assistantHistory: 'journie-assistant-history', assistantAsked: 'journie-assistant-asked' } as const

// Dropped here, not by the assistant, whose code loads only once its panel opens: the next person in this tab starts afresh.
onSignedOut(() => {
  try {
    for (const key of Object.values(PERSONAL_TAB_KEYS)) sessionStorage.removeItem(key)
  } catch {
    /* storage blocked: nothing was kept */
  }
})

/** Where each role lands after signing in. */
export const homeFor = (role: Role | undefined) => (role === 'admin' ? '/app/analytics' : role === 'business' ? '/app/business' : '/app')
