import { Diamond } from 'lucide-react'
import { useLanguage } from '../hooks/useLanguage'

const COPIES = 3

/** Value props drifting past as a ticker. Only the first copy is exposed to assistive tech. */
export function HighlightsBar() {
  const { messages } = useLanguage()

  return (
    <div className="bg-forest py-4 text-paper" aria-label={messages.accessibility.highlights}>
      <div className="marquee">
        <div className="marquee-track">
          {Array.from({ length: COPIES * 2 }, (_, copy) => (
            <ul
              key={copy}
              className="flex shrink-0 items-center"
              aria-hidden={copy === 0 ? undefined : true}
            >
              {messages.highlights.map((highlight) => (
                <li
                  key={highlight}
                  className="flex items-center gap-7 pr-7 text-[0.65rem] font-semibold uppercase tracking-[0.2em]"
                >
                  <span className="whitespace-nowrap">{highlight}</span>
                  <Diamond aria-hidden="true" size={9} className="shrink-0 fill-sun text-sun" />
                </li>
              ))}
            </ul>
          ))}
        </div>
      </div>
    </div>
  )
}
