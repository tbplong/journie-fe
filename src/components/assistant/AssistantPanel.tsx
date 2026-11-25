import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useLocation } from 'react-router'
import { useQueryClient } from '@tanstack/react-query'
import { create } from 'zustand'
import { MapPin, RotateCw, SendHorizontal, X } from 'lucide-react'
import { askAssistant, ASSISTANT_MAX_TEXT, ASSISTANT_MAX_TURNS, cleanGuides, cleanPlaces, type AssistantDestination, type AssistantGuide, type AssistantPlace, type AssistantRequest, type AssistantTrip } from '../../api/assistant'
import { loadPlaces } from '../../api/catalog'
import { ApiError } from '../../api/http'
import { catalogQuery, useTrip } from '../../api/queries'
import { cities, cityById, poiById } from '../../domain/pois'
import { addDays } from '../../domain/time'
import { tripTitle } from '../../domain/tripText'
import type { CityId, Trip } from '../../domain/types'
import { siteConfig } from '../../content/site'
import { useTr } from '../../hooks/useTr'
import { onSignedOut, PERSONAL_TAB_KEYS } from '../../store/authStore'
import { useCityStore } from '../../store/cityStore'
import { useUiStore } from '../../store/uiStore'
import type { Language } from '../../types/i18n'
import { PoiSheet } from '../place/PoiSheet'

/** `city` is the city a reply was asked about, so the places it names can be loaded from that city's catalogue. */
type ChatMessage = { id: string; role: 'user' | 'assistant'; text: string; places?: AssistantPlace[]; guides?: AssistantGuide[]; city?: CityId }
type AskContext = Omit<AssistantRequest, 'messages'> & { emptyReply: string }

// Removed on sign-out by the auth store, so the next person in this tab starts afresh
const HISTORY_KEY = PERSONAL_TAB_KEYS.assistantHistory
const COUNT_KEY = PERSONAL_TAB_KEYS.assistantAsked
/** Questions one browser tab may ask (a guard on the model's quota); the count shows only for the last few. */
const QUESTION_LIMIT = 30
const WARN_WHEN_LEFT = 5

const TRIP_PAGE = /^\/app\/trips\/([^/]+)/

function readSession<T>(key: string, fallback: T): T {
  try {
    const raw = sessionStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function writeSession(key: string, value: unknown) {
  try {
    sessionStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* storage blocked or full: the conversation keeps working in memory */
  }
}

const cityIdOf = (value: unknown): CityId | undefined => cities.find((entry) => entry.id === value || entry.destination === value)?.id

/** The conversation this tab saved, each message checked field by field: a damaged or older entry must not break the panel. */
function readHistory(): ChatMessage[] {
  const raw = readSession<unknown>(HISTORY_KEY, [])
  if (!Array.isArray(raw)) return []
  return (raw as unknown[])
    .flatMap((item): ChatMessage[] => {
      if (!item || typeof item !== 'object') return []
      const { id, role, text, places, guides, city } = item as Record<string, unknown>
      if (typeof id !== 'string' || typeof text !== 'string' || (role !== 'user' && role !== 'assistant')) return []
      return [role === 'user' ? { id, role, text } : { id, role, text, places: cleanPlaces(places), guides: cleanGuides(guides), city: cityIdOf(city) }]
    })
    .slice(-ASSISTANT_MAX_TURNS)
}

function readCount(): number {
  const count = Number(readSession<unknown>(COUNT_KEY, 0))
  return Number.isFinite(count) && count > 0 ? Math.floor(count) : 0
}

const newId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`

type AssistantState = {
  messages: ChatMessage[]
  asked: number
  pending: boolean
  /**
   * The last request's error; `wait` is how long the server asked to wait (Retry-After), in ms, counted from `retryAt - wait`. `id`
   * tells one failure from the next, so the same error twice is announced twice.
   */
  failure: { id: string; error: unknown; retryAt: number; wait: number } | null
  /** Bumped when places named in replies have been loaded, so their chips turn into buttons. */
  placesLoaded: number
  ask: (question: string, context: AskContext) => void
  retry: (context: AskContext) => void
  /**
   * Loads the places replies name that this browser does not know yet, from the city each reply was about (`fallback` for older
   * history), with `loadCity` loading a whole city's catalogue.
   */
  loadNamedPlaces: (fallback: CityId, loadCity: (city: CityId) => Promise<unknown>) => void
  /** Forgets the conversation and the count (the person signed out); an answer still on its way is dropped. */
  reset: () => void
}

/** Cities whose catalogue the panel has asked for in this tab: once each, as the reply's places are not in it if it did not help. */
const catalogAsked = new Set<CityId>()

/** The conversation outlives the panel: closing it mid-question keeps the answer coming, and the tab keeps the last 12 turns. */
const useAssistant = create<AssistantState>((set, get) => {
  // Bumped by `reset`, so a request sent before it does not write its answer into the next person's conversation
  let generation = 0

  const save = (messages: ChatMessage[]) => {
    const kept = messages.slice(-ASSISTANT_MAX_TURNS)
    writeSession(HISTORY_KEY, kept)
    set({ messages: kept })
  }

  const run = async ({ emptyReply, ...context }: AskContext) => {
    const sent = generation
    set({ pending: true, failure: null })
    try {
      const response = await askAssistant({ ...context, messages: get().messages.map(({ role, text }) => ({ role, text })) })
      if (sent !== generation) return
      // The city the server answered for: "Ở Hà Nội ăn phở ở đâu?" asked from Saigon names Hanoi places, which load from Hanoi's catalogue
      const city = cityIdOf(response.destination) ?? cityIdOf(context.destination)
      save([...get().messages, { id: newId(), role: 'assistant', text: response.reply.trim() || emptyReply, places: response.places, guides: response.guides, city }])
      set({ pending: false })
    } catch (error) {
      if (sent !== generation) return
      const busy = error instanceof ApiError && (error.status === 429 || error.code === 'llm-rate-limited')
      const wait = busy && error.retryAfter ? error.retryAfter * 1000 : 0
      set({ pending: false, failure: { id: newId(), error, retryAt: Date.now() + wait, wait } })
    }
  }

  return {
    messages: readHistory(),
    asked: readCount(),
    pending: false,
    failure: null,
    placesLoaded: 0,
    ask: (question, context) => {
      const { pending, asked, messages } = get()
      const text = question.trim().slice(0, ASSISTANT_MAX_TEXT)
      if (!text || pending || asked >= QUESTION_LIMIT) return
      writeSession(COUNT_KEY, asked + 1)
      set({ asked: asked + 1 })
      save([...messages, { id: newId(), role: 'user', text }])
      void run(context)
    },
    retry: (context) => {
      const { pending, messages } = get()
      if (!pending && messages.at(-1)?.role === 'user') void run(context)
    },
    loadNamedPlaces: (fallback, loadCity) => {
      const named = get().messages.flatMap((message) => (message.places ?? []).map((item) => ({ id: item.id, city: message.city ?? fallback })))
      const missing = () => named.filter((item) => !poiById[item.id])
      const before = missing().length
      if (!before) return
      void (async () => {
        await loadPlaces(missing().map((item) => item.id))
        // No backend route answers place ids yet, so a reply's city is loaded the way Discover loads it (`POST /retrieval`)
        const wanted = [...new Set(missing().map((item) => item.city))].filter((target) => !catalogAsked.has(target))
        for (const target of wanted) catalogAsked.add(target)
        // A city that failed to load may be asked again with the next reply
        await Promise.all(wanted.map((target) => loadCity(target).catch(() => catalogAsked.delete(target))))
        if (missing().length < before) set((state) => ({ placesLoaded: state.placesLoaded + 1 }))
      })()
    },
    reset: () => {
      generation += 1
      set({ messages: [], asked: 0, pending: false, failure: null })
    },
  }
})

onSignedOut(() => useAssistant.getState().reset())

/** The trip on screen in the shape the backend takes: its name, city and the stops of each day by name. */
function tripSummary(trip: Trip, language: Language): AssistantTrip {
  return {
    title: tripTitle(trip, language),
    city: cityById[trip.city].destination,
    days: trip.days.map((day, index) => ({
      date: addDays(trip.startDate, index),
      stops: day.stops.map((stop) => poiById[stop.poiId]?.name).filter((name): name is string => !!name),
    })),
  }
}

/** What went wrong, in Journie's words, and whether asking again could help. */
function failureText(error: unknown): { text: [vi: string, en: string]; retry: boolean } {
  const code = error instanceof ApiError ? error.code : ''
  const status = error instanceof ApiError ? error.status : 0
  if (status === 429 || code === 'llm-rate-limited') {
    const wait = error instanceof ApiError && error.retryAfter ? error.retryAfter : 0
    return {
      text: wait
        ? [`Đông người hỏi quá, chờ mình ${wait} giây rồi thử lại nha.`, `Lots of questions right now. Give me ${wait} seconds, then try again.`]
        : ['Đông người hỏi quá, chờ mình chút rồi thử lại nha.', 'Lots of questions right now. Give me a moment, then try again.'],
      retry: true,
    }
  }
  if (status === 422) return { text: ['Câu này mình chưa nhận được, thử viết gọn lại nha.', 'I could not take that one. Try a shorter question?'], retry: false }
  if (code === 'llm-not-configured' || code === 'not-configured' || ((status === 404 || status === 405) && code.startsWith('http-')))
    return { text: ['Journie chưa trò chuyện được lúc này. Lát nữa thử lại nha.', 'Journie cannot chat right now. Try again a bit later.'], retry: true }
  if (code === 'llm-timeout' || code === 'timeout' || status === 504) return { text: ['Mình nghĩ lâu quá, thử hỏi lại nha.', 'That took me too long. Try asking again?'], retry: true }
  if (code === 'llm-upstream-error' || code === 'invalid-llm-output' || status === 502) return { text: ['Câu trả lời bị trục trặc giữa chừng, thử lại nha.', 'Something went wrong with my answer. Try again?'], retry: true }
  if (status > 0) return { text: ['Máy chủ đang trục trặc, thử lại sau nha.', 'The server hit a snag. Try again soon.'], retry: true }
  return { text: ['Chưa kết nối được với Journie. Kiểm tra mạng rồi thử lại nha.', 'Could not reach Journie. Check your connection and try again.'], retry: true }
}

/** A reply as plain text: blank lines split paragraphs, and lines that start with "- " form a list. */
function ReplyText({ text }: { text: string }) {
  const nodes: ReactNode[] = []
  text.split(/\n\s*\n/).forEach((block, blockIndex) => {
    let bullets: string[] = []
    let lines: string[] = []
    const flush = (at: number) => {
      if (lines.length) nodes.push(<p key={`p${blockIndex}-${at}`} className="whitespace-pre-line">{lines.join('\n')}</p>)
      if (bullets.length)
        nodes.push(
          <ul key={`u${blockIndex}-${at}`} className="list-disc space-y-1 pl-5">
            {bullets.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>,
        )
      lines = []
      bullets = []
    }
    block.split('\n').forEach((raw, lineIndex) => {
      const line = raw.trimEnd()
      if (!line.trim()) return
      const bullet = line.match(/^\s*[-•]\s+(.*)$/)
      if (bullet) {
        if (lines.length) flush(lineIndex)
        bullets.push(bullet[1])
      } else {
        if (bullets.length) flush(lineIndex)
        lines.push(line)
      }
    })
    flush(-1)
  })
  return <div className="space-y-2">{nodes}</div>
}

/**
 * "Ask Journie": a small chat beside the corner companion, answered by the backend (`POST /assistant`) from the places it knows.
 * Anchored above Journie on wider screens and a bottom sheet on phones; a panel, not a modal, so the page stays usable.
 */
export function AssistantPanel({ id, onClose }: { id: string; onClose: () => void }) {
  const { tr, place, language } = useTr()
  const titleId = useId()
  const location = useLocation()
  const panelRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const [draft, setDraft] = useState('')
  // The failure whose Retry-After has run out
  const [cooledFor, setCooledFor] = useState<AssistantState['failure']>(null)

  // The whole store, so chips re-render when the places they name finish loading (`placesLoaded`)
  const { messages, asked, pending, failure, ask, retry, loadNamedPlaces } = useAssistant()
  const openPoi = useUiStore((state) => state.openPoi)
  // A page shows its own place sheet once it has mounted one (not while it loads or shows an error); until then the panel brings one, so one sheet opens, never two
  const ownSheet = useUiStore((state) => state.pageSheets === 0)
  const city = useCityStore((state) => state.city)
  const tripId = location.pathname.match(TRIP_PAGE)?.[1]
  const trip = useTrip(tripId).data
  const here = trip?.city ?? city
  const queryClient = useQueryClient()
  // Through the query cache, so Discover reuses a catalogue loaded here, and a city it already loaded is not fetched again
  const loadCity = useCallback((target: CityId) => queryClient.fetchQuery(catalogQuery(target)), [queryClient])

  const left = Math.max(0, QUESTION_LIMIT - asked)
  const spent = left === 0
  const last = messages.at(-1)
  const unanswered = !pending && last?.role === 'user'
  const problem = unanswered ? (failure ? failureText(failure.error) : { text: ['Câu trước mình chưa kịp trả lời.', 'I had not answered that one yet.'] as [string, string], retry: true }) : null

  // Read out to screen readers: that Journie is busy, then the reply or the error, only for what happens while the panel is open (not
  // the history it opens with). Keyed, so the same error twice in a row is a new line and read again.
  const [openedWith] = useState(() => messages.at(-1)?.id)
  const announce: { key: string; text: string } | null = pending
    ? { key: 'pending', text: tr('Journie đang trả lời', 'Journie is replying') }
    : problem && failure
      ? { key: failure.id, text: tr(...problem.text) }
      : last?.role === 'assistant' && last.id !== openedWith
        ? { key: last.id, text: last.text }
        : null

  const context = (): AskContext => ({
    destination: cityById[here].destination as AssistantDestination,
    trip: trip ? tripSummary(trip, language) : null,
    language,
    emptyReply: tr('Mình chưa nghĩ ra câu trả lời, hỏi cách khác thử nha.', 'I could not come up with an answer. Try asking another way?'),
  })

  const send = (text: string) => {
    if (!text.trim() || pending || spent) return
    ask(text, context())
    setDraft('')
  }

  useEffect(() => {
    const timer = window.setTimeout(() => (inputRef.current?.disabled ? panelRef.current : inputRef.current)?.focus(), 30)
    return () => window.clearTimeout(timer)
  }, [])

  // Chips turn into buttons once their places are known: on opening (the history) and after each reply
  useEffect(() => {
    loadNamedPlaces(here, loadCity)
  }, [messages, here, loadCity, loadNamedPlaces])

  // Back to the input once the answer is in: it was disabled while waiting, which drops focus. With no questions left, the panel holds it.
  useEffect(() => {
    if (pending) return
    const active = document.activeElement
    if (!active || active === document.body || panelRef.current?.contains(active)) (spent ? panelRef.current : inputRef.current)?.focus()
  }, [pending, spent])

  useEffect(() => {
    const list = listRef.current
    if (list) list.scrollTop = list.scrollHeight
  }, [messages.length, pending, failure])

  // After a 429/503 with Retry-After, the retry button waits for the time the server asked for.
  const cooling = !!failure && failure.wait > 0 && cooledFor !== failure
  useEffect(() => {
    if (!failure || failure.wait <= 0) return
    const timer = window.setTimeout(() => setCooledFor(failure), Math.max(0, failure.retryAt - Date.now()))
    return () => window.clearTimeout(timer)
  }, [failure])

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    // Only an Escape pressed inside the panel closes it; a place sheet opened from here handles its own.
    if (event.key === 'Escape' && panelRef.current?.contains(event.target as Node)) {
      event.stopPropagation()
      onClose()
    }
  }

  const onInputKey = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    // Vietnamese typing (Telex, VNI) composes letters: Enter then confirms the word, it does not send
    if (event.key !== 'Enter' || event.shiftKey || event.nativeEvent.isComposing) return
    event.preventDefault()
    send(draft)
  }

  const starters: [string, string][] = [
    [`Gợi ý một ngày ở ${cityById[here].name}`, `Plan a day in ${cityById[here].nameEn}`],
    ['Trời mưa thì đi đâu?', 'Where to go when it rains?'],
    ['Tối nay uống gì?', 'Where to grab a drink tonight?'],
  ]

  return createPortal(
    <>
      <div
        ref={panelRef}
        id={id}
        role="dialog"
        aria-modal="false"
        aria-labelledby={titleId}
        tabIndex={-1}
        data-lenis-prevent
        onKeyDown={onKeyDown}
        className="fixed inset-x-0 bottom-0 z-[60] flex max-h-[85dvh] flex-col rounded-t-lg outline-none border-t border-forest/15 bg-paper pb-[env(safe-area-inset-bottom)] shadow-[0_-12px_40px_-12px_rgba(13,40,34,0.35)] sm:inset-x-auto sm:bottom-[10.8rem] sm:right-3 sm:max-h-[min(34rem,calc(100dvh-11.8rem))] sm:w-[23rem] sm:rounded-md sm:border sm:pb-0 sm:shadow-2xl lg:bottom-[6.6rem] lg:right-5 lg:max-h-[min(36rem,calc(100dvh-7.6rem))]"
      >
        <header className="flex items-center gap-2.5 border-b border-forest/10 px-4 py-3">
          <img src={siteConfig.logoMark} alt="" width="384" height="512" className="h-7 w-auto" />
          <h2 id={titleId} className="h-display flex-1 text-xl text-forest">
            {tr('Hỏi Journie', 'Ask Journie')}
          </h2>
          <button type="button" onClick={onClose} className="grid size-9 place-items-center text-ink/55 transition-colors hover:text-terracotta" aria-label={tr('Đóng', 'Close')}>
            <X size={18} />
          </button>
        </header>

        <div ref={listRef} className="min-h-[12rem] flex-1 space-y-3 overflow-y-auto overscroll-contain px-4 py-4 text-[0.92rem] leading-relaxed">
          {messages.length === 0 && (
            <div className="space-y-3">
              <p className="max-w-[88%] rounded-md border border-forest/12 bg-white/70 px-3 py-2 text-ink">
                {tr('Chào bạn, mình là Journie. Hỏi mình chỗ ăn, chỗ chơi hay lịch trình đều được nha.', 'Hi, Journie here. Ask me about food, things to do or your plan.')}
              </p>
              {!spent && (
                <div className="flex flex-wrap gap-2">
                  {starters.map(([vi, en]) => (
                    <button key={vi} type="button" className="chip bg-white/60" onClick={() => send(tr(vi, en))} disabled={pending}>
                      {tr(vi, en)}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {messages.map((message) =>
            message.role === 'user' ? (
              <div key={message.id} className="flex justify-end">
                <p className="max-w-[85%] whitespace-pre-wrap break-words rounded-md bg-forest px-3 py-2 text-paper">
                  <span className="sr-only">{tr('Bạn: ', 'You: ')}</span>
                  {message.text}
                </p>
              </div>
            ) : (
              <div key={message.id} className="max-w-[88%] space-y-2">
                <div className="break-words rounded-md border border-forest/12 bg-white/70 px-3 py-2 text-ink">
                  <span className="sr-only">{tr('Journie: ', 'Journie: ')}</span>
                  <ReplyText text={message.text} />
                </div>
                {!!message.places?.length && (
                  <ul className="flex flex-wrap gap-1.5" aria-label={tr('Địa điểm được nhắc tới', 'Places mentioned')}>
                    {message.places.map((item) => {
                      const name = place.name(item.name)
                      const area = item.area ? place.area(item.area) : null
                      return (
                        <li key={item.id}>
                          {poiById[item.id] ? (
                            <button type="button" onClick={() => openPoi(item.id)} className="chip bg-white/60" title={area ?? undefined}>
                              <MapPin size={13} aria-hidden="true" />
                              {name}
                            </button>
                          ) : (
                            <span className="chip cursor-default border-dashed text-ink/60" title={area ?? undefined}>
                              <MapPin size={13} aria-hidden="true" />
                              {name}
                            </span>
                          )}
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>
            ),
          )}

          {pending && (
            <div className="max-w-[88%]">
              <p className="inline-block rounded-md border border-forest/12 bg-white/70 px-3 py-1 text-lg leading-none text-ink/70">
                <span aria-hidden="true" className="inline-block animate-pulse motion-reduce:animate-none">
                  …
                </span>
                <span className="sr-only">{tr('Journie đang trả lời', 'Journie is replying')}</span>
              </p>
            </div>
          )}

          {problem && (
            <div className="max-w-[88%] rounded-md border border-terracotta/40 bg-terracotta/5 px-3 py-2 text-[0.85rem] text-terracotta-ink">
              <p>{tr(...problem.text)}</p>
              {problem.retry && (
                <button
                  type="button"
                  onClick={() => retry(context())}
                  disabled={cooling}
                  className="mt-2 inline-flex items-center gap-1.5 border border-terracotta/60 px-2.5 py-1 text-[0.78rem] font-semibold transition-colors hover:bg-terracotta hover:text-white disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-terracotta-ink"
                >
                  <RotateCw size={13} aria-hidden="true" />
                  {tr('Thử lại', 'Try again')}
                </button>
              )}
            </div>
          )}

          {spent && (
            <p className="max-w-[88%] rounded-md border border-forest/12 bg-cream/70 px-3 py-2 text-ink">
              {tr('Hôm nay mình trò chuyện nhiều quá rồi, Journie xin nghỉ xíu nha. Lát nữa quay lại hỏi tiếp, mình vẫn ở đây.', 'We have chatted a lot today, so Journie is taking a little break. Come back later and ask away, I will still be here.')}
            </p>
          )}
        </div>

        <form
          className="border-t border-forest/10 px-3 py-3"
          onSubmit={(event) => {
            event.preventDefault()
            send(draft)
          }}
        >
          <div className="flex items-end gap-2">
            <label htmlFor={`${id}-input`} className="sr-only">
              {tr('Câu hỏi cho Journie', 'Your question for Journie')}
            </label>
            <textarea
              ref={inputRef}
              id={`${id}-input`}
              rows={2}
              value={draft}
              maxLength={ASSISTANT_MAX_TEXT}
              disabled={pending || spent}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={onInputKey}
              placeholder={spent ? tr('Lát nữa hỏi tiếp nha', 'Ask again later') : tr('Hỏi Journie điều gì đó…', 'Ask Journie something…')}
              className="max-h-32 min-h-[2.75rem] flex-1 resize-none rounded-md border border-forest/20 bg-white/80 px-3 py-2 text-[0.92rem] leading-snug text-ink outline-none transition-colors placeholder:text-ink/40 focus:border-forest disabled:cursor-not-allowed disabled:opacity-60"
            />
            <button type="submit" disabled={pending || spent || !draft.trim()} className="grid size-11 shrink-0 place-items-center rounded-md bg-forest text-paper transition-colors hover:bg-terracotta disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-forest" aria-label={tr('Gửi', 'Send')}>
              <SendHorizontal size={18} aria-hidden="true" />
            </button>
          </div>
          {(draft.length >= ASSISTANT_MAX_TEXT - 200 || (left > 0 && left <= WARN_WHEN_LEFT)) && (
            <div className="mt-1.5 flex justify-between gap-3 px-1 text-[0.72rem] text-ink/55">
              <span>{left > 0 && left <= WARN_WHEN_LEFT ? tr(`Còn ${left} câu nữa là Journie phải nghỉ xíu nha.`, `${left} more ${left === 1 ? 'question' : 'questions'} before Journie takes a little break.`) : ''}</span>
              {draft.length >= ASSISTANT_MAX_TEXT - 200 && (
                <span>
                  {draft.length}/{ASSISTANT_MAX_TEXT}
                </span>
              )}
            </div>
          )}
        </form>

        <p className="sr-only" aria-live="polite">
          {announce && <span key={announce.key}>{announce.text}</span>}
        </p>
      </div>
      {ownSheet && <PoiSheet spare />}
    </>,
    document.body,
  )
}
