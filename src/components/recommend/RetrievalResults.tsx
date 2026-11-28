import { useState, type ReactNode } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { motion } from 'motion/react'
import { Check, ChevronDown, Info, Loader2, Shuffle, TriangleAlert } from 'lucide-react'
import { PAGE_SIZE, retrievePlaces, takePlaces } from '../../api/catalog'
import { apiErrorText } from '../../api/errorText'
import { EASE_OUT } from '../motion/variants'
import type { Extraction } from '../../domain/extraction'
import { poiById } from '../../domain/pois'
import type { PoiCard, RetrievalResponse } from '../../domain/retrieval'
import { serverText } from '../../domain/serverText'
import { useTr } from '../../hooks/useTr'
import { useUiStore } from '../../store/uiStore'
import { CategoryGlyph } from '../ui/primitives'

type Props = {
  /** The request as the backend reads it, already set to the trip's city. */
  extraction: Extraction
  selected: string[]
  onSelectedChange: (ids: string[]) => void
  /** Buttons under the list, given what is ticked (e.g. "Save as set", "Use these places"). */
  actions?: (selected: string[], all: string[]) => ReactNode
}

/** The backend's standard interest sections, broader than a keyword or place-kind section the same search returns. */
const BROAD = new Set(['food', 'cafe', 'culture', 'museum', 'park', 'nature', 'shopping', 'beach', 'nightlife'])

const fetchPage = async (extraction: Extraction, options: Parameters<typeof retrievePlaces>[1]) => {
  const response = await retrievePlaces(extraction, options)
  // Registers the places so their details sheet and the planner can read them
  takePlaces(response)
  return response
}

/**
 * The backend's recommendation for a request, shown as a list (UC 1.1, 1.3, 2.9): the must-visit places it pinned, names it could
 * not decide between (pick one), names it did not find, and one section per interest with "show more" paging and the reasons each
 * place fits. "Other suggestions" asks again with a new seed.
 */
export function RetrievalResults({ extraction, selected, onSelectedChange, actions }: Props) {
  const { tr, place, language } = useTr()
  const [seed, setSeed] = useState<number | undefined>(undefined)
  const [more, setMore] = useState<Record<string, PoiCard[]>>({})
  const query = useQuery({ queryKey: ['retrieval', JSON.stringify(extraction), seed], queryFn: () => fetchPage(extraction, { limit: 8, seed }), staleTime: 5 * 60_000, retry: 0 })
  const page = useMutation({
    mutationFn: ({ key, offset }: { key: string; offset: number }) => fetchPage(extraction, { section: key, offset, limit: PAGE_SIZE, seed }),
    onSuccess: (response, { key }) => setMore((current) => ({ ...current, [key]: [...(current[key] ?? []), ...(response.sections.find((s) => s.key === key)?.items ?? [])] })),
  })

  const toggle = (id: string) => onSelectedChange(selected.includes(id) ? selected.filter((entry) => entry !== id) : [...selected, id])
  const reroll = () => {
    setMore({})
    setSeed(Math.floor(Math.random() * 2 ** 31))
  }

  if (query.isLoading) {
    return (
      <p className="flex items-center gap-2 py-8 text-sm text-ink/60" role="status">
        <Loader2 size={16} className="animate-spin" aria-hidden="true" /> {tr('Đang tìm địa điểm hợp với bạn…', 'Finding places that fit…')}
      </p>
    )
  }
  if (query.isError || !query.data) {
    return (
      <div role="alert" className="rounded-xl border border-pomegranate/30 bg-pomegranate/6 p-4 text-sm text-pomegranate">
        {tr(...apiErrorText(query.error))}
        <button type="button" className="btn-ghost btn-sm ml-3" onClick={() => query.refetch()}>
          {tr('Thử lại', 'Try again')}
        </button>
      </div>
    )
  }

  const data: RetrievalResponse = query.data
  if (data.status === 'unsupported_destination') return <p className="text-sm font-semibold text-sun-ink">{tr('Máy chủ chưa có dữ liệu cho thành phố này.', 'The server has no places for this city yet.')}</p>
  if (data.status === 'empty_extraction') return <p className="text-sm text-ink/60">{tr('Bạn chưa nói thích gì, thử thêm sở thích như “cà phê”, “bảo tàng”.', 'You have not said what you like yet; try adding interests such as “cafés” or “museums”.')}</p>

  // A specific ask ("chùa", "Bánh mì", a keyword of its own) comes before the broad interest it belongs to ("Văn hoá", "Ẩm thực")
  const sections = [...data.sections].sort((a, b) => Number(BROAD.has(a.key)) - Number(BROAD.has(b.key)))
  const all = [...new Set([...data.pinned, ...sections.flatMap((section) => [...section.items, ...(more[section.key] ?? [])])].map((card) => card.id))].filter((id) => poiById[id])
  const disambiguation = data.disambiguation.filter((entry) => entry.field === 'must_visit' || entry.field === 'preferred_places')

  return (
    <div className="space-y-6">
      {data.pinned.length > 0 && (
        <Group title={tr('Nơi bạn muốn đến', 'Places you asked for')}>
          {data.pinned.map((card) => (
            <CardRow key={card.id} card={card} on={selected.includes(card.id)} onToggle={() => toggle(card.id)} pinned />
          ))}
        </Group>
      )}

      {disambiguation.length > 0 && (
        <section className="rounded-xl border border-gold/50 bg-gold/10 p-4" aria-labelledby="disambiguation">
          <h3 id="disambiguation" className="flex items-center gap-2 text-sm font-bold text-ink">
            <Info size={15} className="text-sun-ink" aria-hidden="true" /> {tr('Bạn muốn nói nơi nào?', 'Which place did you mean?')}
          </h3>
          {disambiguation.map((entry) => {
            const picked = entry.candidates.find((card) => selected.includes(card.id))?.id ?? ''
            return (
              <fieldset key={entry.query} className="mt-3">
                <legend className="text-[0.8rem] font-semibold text-ink/75">“{entry.query}”</legend>
                <div className="mt-1.5 space-y-1">
                  {entry.candidates.map((card) => (
                    <label key={card.id} className="flex cursor-pointer items-center gap-2 text-sm">
                      <input
                        type="radio"
                        name={`dis-${entry.query}`}
                        checked={picked === card.id}
                        onChange={() => onSelectedChange([...selected.filter((id) => !entry.candidates.some((c) => c.id === id)), card.id])}
                        className="accent-[#d96745]"
                      />
                      <span className="font-semibold">{place.name(card.name)}</span>
                      <span className="truncate text-xs text-ink/55">{[card.ward && place.area(card.ward), card.address && place.address(card.address)].filter(Boolean).join(' · ')}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            )
          })}
        </section>
      )}

      {data.not_found.length > 0 && (
        <p className="flex items-start gap-2 text-[0.82rem] font-semibold text-sun-ink">
          <TriangleAlert size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
          {tr('Không tìm thấy: ', 'Not found: ')}
          {data.not_found.map((entry) => `“${entry.query}”`).join(', ')}. {tr('Thử viết tên khác hoặc chọn từ danh sách bên dưới.', 'Try another spelling or pick from the list below.')}
        </p>
      )}

      {sections.map((section) => {
        const items = [...section.items, ...(more[section.key] ?? [])]
        const left = section.total_matches - items.length
        return (
          <Group key={section.key} title={serverText(section.label, language)} hint={tr(`${section.total_matches} nơi phù hợp`, `${section.total_matches} matches`)} note={section.note}>
            {items.length === 0 && <li className="text-sm text-ink/55">{tr('Chưa có nơi nào khớp mục này.', 'Nothing matches this one yet.')}</li>}
            {items.map((card) => (
              <CardRow key={card.id} card={card} on={selected.includes(card.id)} onToggle={() => toggle(card.id)} />
            ))}
            {left > 0 && (
              <li>
                <button type="button" className="btn-ghost btn-sm w-full" disabled={page.isPending} onClick={() => page.mutate({ key: section.key, offset: items.length })}>
                  {page.isPending && page.variables?.key === section.key ? <Loader2 size={15} className="animate-spin" aria-hidden="true" /> : <ChevronDown size={15} aria-hidden="true" />}
                  {tr(`Xem thêm (${left})`, `Show more (${left})`)}
                </button>
              </li>
            )}
          </Group>
        )
      })}

      {data.warnings.length > 0 && <p className="text-xs text-ink/50">{data.warnings.map((warning) => serverText(warning, language)).join(' · ')}</p>}

      <div className="sticky bottom-20 z-10 flex flex-wrap items-center justify-between gap-3 border border-forest/15 bg-paper/95 px-4 py-3 shadow-lg backdrop-blur lg:bottom-4">
        <span className="tabular text-sm text-ink/70" aria-live="polite">
          {tr(`Đã chọn ${selected.length} / ${all.length}`, `${selected.length} of ${all.length} picked`)}
          {language === 'en' && <span className="ml-2 text-xs text-ink/45">(reasons are in Vietnamese)</span>}
        </span>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-ghost btn-sm" onClick={reroll} disabled={query.isFetching}>
            <Shuffle size={15} aria-hidden="true" /> {tr('Gợi ý khác', 'Other suggestions')}
          </button>
          <button type="button" className="btn-ghost btn-sm" onClick={() => onSelectedChange(selected.length === all.length ? [] : all)}>
            {selected.length === all.length ? tr('Bỏ chọn hết', 'Clear all') : tr('Chọn hết', 'Pick all')}
          </button>
          {actions?.(selected, all)}
        </div>
      </div>
    </div>
  )
}

function Group({ title, hint, note, children }: { title: string; hint?: string; note?: string | null; children: ReactNode }) {
  return (
    <section>
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <h3 className="h-display text-lg text-forest">{title}</h3>
        {hint && <span className="tabular text-xs text-ink/50">{hint}</span>}
      </div>
      {note && <p className="mb-2 text-xs text-ink/55">{note}</p>}
      <ul className="space-y-2">{children}</ul>
    </section>
  )
}

const DOUBT = new Set(['hours_maybe_closed', 'hours_low_confidence', 'hours_unknown', 'hours_contradicted', 'hours_closed'])

function CardRow({ card, on, onToggle, pinned }: { card: PoiCard; on: boolean; onToggle: () => void; pinned?: boolean }) {
  const { tr, place, price, language } = useTr()
  const openPoi = useUiStore((state) => state.openPoi)
  const poi = poiById[card.id]
  // The stated price reads like every other price in the app; the raw data text is in English
  const reasonText = (reason: string) => (reason.startsWith('Giá: ') && poi && (poi.costKnown || poi.priceLevel) ? `${tr('Giá', 'Price')}: ${price(poi)}` : serverText(reason, language))
  const doubtful = card.flags.some((flag) => DOUBT.has(flag))
  return (
    <motion.li initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: EASE_OUT }} className={`panel flex items-start gap-3 p-3 ${on ? '!border-terracotta bg-terracotta/5' : ''}`}>
      <button type="button" role="checkbox" aria-checked={on} onClick={onToggle} disabled={!poi} className={`mt-1 grid size-5 shrink-0 place-items-center border transition-colors ${on ? 'border-terracotta bg-terracotta text-white' : 'border-forest/30 bg-white'}`} aria-label={tr(`Chọn ${card.name}`, `Pick ${card.name}`)}>
        {on && <Check size={13} />}
      </button>
      {poi ? <CategoryGlyph cat={poi.cat} size={38} /> : <span className="size-[38px] shrink-0 bg-forest/10" aria-hidden="true" />}
      <div className="min-w-0 flex-1">
        <button type="button" onClick={() => poi && openPoi(poi.id)} disabled={!poi} className="block max-w-full truncate text-left text-sm font-semibold hover:underline">
          {poi ? place.name(poi.name) : card.name}
        </button>
        <p className="truncate text-xs text-ink/55">{poi ? place.blurb(poi) : card.ward && place.area(card.ward)}</p>
        {(card.reasons.length > 0 || pinned) && (
          <ul className="mt-1.5 flex flex-wrap gap-1" aria-label={tr('Vì sao hợp', 'Why it fits')}>
            {pinned && <li className="rounded-full bg-lapis px-2 py-0.5 text-[0.66rem] font-bold text-paper">{tr('Bạn đã nhắc tên', 'You named it')}</li>}
            {card.reasons.slice(0, 4).map((reason) => (
              <li key={reason} className="rounded-full bg-firuze/12 px-2 py-0.5 text-[0.66rem] font-semibold text-jade-ink">
                {reasonText(reason)}
              </li>
            ))}
          </ul>
        )}
        {doubtful && <p className="mt-1 text-[0.7rem] text-sun-ink">{tr('Giờ mở cửa chưa chắc chắn.', 'Opening hours are not certain.')}</p>}
      </div>
      <span className="tabular shrink-0 text-right text-[0.7rem] text-ink/45" title={tr('Mức độ phù hợp', 'Fit score')}>
        {Math.min(100, Math.round(card.score * 100))}%
      </span>
    </motion.li>
  )
}
