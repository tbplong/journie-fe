import { useEffect, useId, useRef, useState, type MouseEvent } from 'react'
import { ShieldCheck } from 'lucide-react'
import { useTr } from '../../hooks/useTr'

const SITE_KEY: string | undefined = import.meta.env.VITE_ANTIBOT_SITE_KEY
const TURNSTILE_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'

type Turnstile = { render: (el: HTMLElement, options: Record<string, unknown>) => string; reset: (id: string) => void; remove: (id: string) => void }
declare global {
  interface Window {
    turnstile?: Turnstile
  }
}

let loading: Promise<void> | null = null
const loadTurnstile = () =>
  (loading ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = TURNSTILE_SRC
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('turnstile failed to load'))
    document.head.appendChild(script)
  }))

/** How long the stand-in "checks" after the tick, as the real widgets do, so the step reads as a check and not a toggle. */
const CHECK_MS = 900

type CheckState = 'idle' | 'checking' | 'done' | 'expired'

/**
 * UC 7.3 "Verify antibot": Cloudflare Turnstile when `VITE_ANTIBOT_SITE_KEY` is set, and the backend checks the token. Without a
 * key (local work, demos) a stand-in drawn like those widgets (tick the box, a short check, a green tick) lets the flow be
 * tried; its `local-…` token is not a real check and a backend with the secret refuses it.
 * `resetKey` changing (after a failed attempt) asks for a fresh check.
 */
export function AntibotField({ onToken, resetKey = 0, disabled }: { onToken: (token: string | null) => void; resetKey?: number; disabled?: boolean }) {
  const { tr, language } = useTr()
  const id = useId()
  const host = useRef<HTMLDivElement>(null)
  const widget = useRef<string | null>(null)
  const timer = useRef<number | undefined>(undefined)
  const [failed, setFailed] = useState(false)
  const [state, setState] = useState<CheckState>('idle')
  const onTokenRef = useRef(onToken)
  useEffect(() => {
    onTokenRef.current = onToken
  })

  useEffect(() => {
    if (!SITE_KEY || !host.current) return
    let cancelled = false
    loadTurnstile()
      .then(() => {
        if (cancelled || !host.current || !window.turnstile) return
        widget.current = window.turnstile.render(host.current, {
          sitekey: SITE_KEY,
          language,
          // Follow the sign-in page's own day or night, not the system's, and span the form like the fields do
          theme: host.current.closest('[data-phase]')?.getAttribute('data-phase') === 'night' ? 'dark' : 'light',
          size: 'flexible',
          callback: (token: string) => onTokenRef.current(token),
          'expired-callback': () => onTokenRef.current(null),
          'error-callback': () => onTokenRef.current(null),
        })
      })
      .catch(() => setFailed(true))
    return () => {
      cancelled = true
      if (widget.current) window.turnstile?.remove(widget.current)
      widget.current = null
    }
  }, [language])

  useEffect(() => () => window.clearTimeout(timer.current), [])

  // A failed sign-in uses up the token, so a new check is needed
  useEffect(() => {
    if (!resetKey) return
    onTokenRef.current(null)
    if (SITE_KEY && widget.current) window.turnstile?.reset(widget.current)
    else {
      window.clearTimeout(timer.current)
      setState('expired')
    }
  }, [resetKey])

  if (SITE_KEY) {
    return (
      <div className="mb-3">
        <div ref={host} className="min-h-[65px]" />
        {failed && <p className="text-xs text-[color:var(--a-error)]">{tr('Không tải được bước xác minh. Kiểm tra mạng rồi tải lại trang.', 'The check could not load. Check your connection and reload.')}</p>}
      </div>
    )
  }

  const start = (event: MouseEvent<HTMLButtonElement>) => {
    // Only a real press counts (a click or the space bar), never one sent by a script
    if (!event.isTrusted || state === 'checking' || state === 'done') return
    setState('checking')
    timer.current = window.setTimeout(() => {
      setState('done')
      onTokenRef.current(`local-${Date.now()}-${Math.floor(Math.random() * 1e6)}`)
    }, CHECK_MS)
  }

  const label =
    state === 'checking'
      ? tr('Đang xác minh…', 'Verifying…')
      : state === 'done'
        ? tr('Đã xác minh', 'Verified')
        : tr('Xác minh bạn là người', 'Verify you are human')

  return (
    <div className="antibot mb-3" data-state={state}>
      <button
        type="button"
        role="checkbox"
        aria-checked={state === 'done'}
        aria-describedby={state === 'expired' ? `${id}-note` : undefined}
        disabled={disabled || state === 'checking'}
        onClick={start}
        className="antibot-check"
      >
        <span className="antibot-box" aria-hidden="true">
          {state === 'checking' && <span className="antibot-spinner" />}
          {state === 'done' && (
            <svg viewBox="0 0 24 24" className="antibot-tick">
              <circle cx="12" cy="12" r="12" />
              <path d="M7 12.5l3.2 3.2L17 9" />
            </svg>
          )}
        </span>
        <span className="flex min-w-0 flex-col items-start text-left">
          <span className="antibot-label">{label}</span>
          {state === 'expired' && (
            <span id={`${id}-note`} className="text-[0.72rem] text-[color:var(--a-error)]">
              {tr('Đã hết hạn, hãy đánh dấu lại.', 'Expired, tick the box again.')}
            </span>
          )}
        </span>
      </button>
      <ShieldCheck className="antibot-brand" size={20} strokeWidth={1.8} aria-hidden="true" />
      <span className="sr-only" aria-live="polite">
        {state === 'checking' ? tr('Đang xác minh', 'Verifying') : state === 'done' ? tr('Đã xác minh bạn là người', 'You are verified as human') : ''}
      </span>
    </div>
  )
}
