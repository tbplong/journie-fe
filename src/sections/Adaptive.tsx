import { useId, useRef } from 'react'
import { motion, useInView, useScroll } from 'motion/react'
import { BellRing, Clock3, Map, TrainFront, Umbrella, WalletCards, type LucideIcon } from 'lucide-react'
import { RevealHeading } from '../components/motion/RevealHeading'
import { trackSpotlight } from '../components/motion/Spotlight'
import { BayScene } from '../components/scenes/BayScene'
import { useLanguage } from '../hooks/useLanguage'
import { useMotionPrefs } from '../hooks/useMotionPrefs'

const featureIcons: LucideIcon[] = [Umbrella, Clock3, TrainFront, WalletCards]

const ROUTE = 'M34 272C88 230 126 240 174 202C222 164 259 188 310 146C361 104 400 130 445 92C490 54 526 73 566 42'
const JAM = 'M310 146C361 104 400 130 445 92'
const BYPASS = 'M310 146C326 196 410 178 445 92'
const NODES = [
  [34, 272],
  [174, 202],
  [310, 146],
  [445, 92],
  [566, 42],
] as const

const ease = [0.22, 1, 0.36, 1] as const

/** The route draws itself, a traffic jam flares between two stops, then a bypass is found. */
function RouteMap() {
  const { reduced } = useMotionPrefs()
  const ref = useRef<SVGSVGElement>(null)
  const inView = useInView(ref, { once: true, amount: 0.4 })
  const maskId = `route-${useId().replace(/:/g, '')}`
  const show = inView || reduced

  return (
    <svg
      ref={ref}
      className="absolute inset-x-[8%] top-[26%] h-[58%] w-[84%]"
      viewBox="0 0 600 340"
      fill="none"
      aria-hidden="true"
    >
      <defs>
        <mask id={maskId}>
          <motion.path
            d={ROUTE}
            stroke="white"
            strokeWidth="12"
            initial={{ pathLength: reduced ? 1 : 0 }}
            animate={{ pathLength: show ? 1 : 0 }}
            transition={{ duration: 2.2, ease: 'easeInOut' }}
          />
        </mask>
      </defs>

      <path d={ROUTE} stroke="#F4B942" strokeWidth="3" strokeDasharray="7 10" mask={`url(#${maskId})`} />

      <motion.path
        d={JAM}
        stroke="#E16F4A"
        strokeWidth="5"
        strokeLinecap="round"
        initial={{ opacity: 0 }}
        animate={show ? { opacity: reduced ? 0.25 : [0, 1, 0.3, 1, 0.3, 1, 0.12] } : { opacity: 0 }}
        transition={{ delay: reduced ? 0 : 1.9, duration: 2.2, times: [0, 0.12, 0.3, 0.5, 0.65, 0.8, 1] }}
      />

      <motion.path
        d={BYPASS}
        stroke="#F7F2E8"
        strokeWidth="3.5"
        strokeLinecap="round"
        initial={{ pathLength: reduced ? 1 : 0, opacity: 0 }}
        animate={show ? { pathLength: 1, opacity: 1 } : { pathLength: 0, opacity: 0 }}
        transition={{ delay: reduced ? 0 : 3.6, duration: 1.1, ease }}
      />

      {NODES.map(([cx, cy], index) => (
        <motion.circle
          key={index}
          cx={cx}
          cy={cy}
          r="9"
          fill={index === NODES.length - 1 ? '#F4B942' : '#E16F4A'}
          stroke="#F7F2E8"
          strokeWidth="4"
          style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
          initial={{ scale: reduced ? 1 : 0 }}
          animate={{ scale: show ? 1 : 0 }}
          transition={{ delay: reduced ? 0 : 0.35 + index * 0.42, type: 'spring', stiffness: 320, damping: 14 }}
        />
      ))}

      {!reduced && show && (
        <circle r="5" fill="#F7F2E8">
          <animateMotion dur="9s" repeatCount="indefinite" begin="2.4s" path={ROUTE} />
        </circle>
      )}
    </svg>
  )
}

export function Adaptive() {
  const { messages } = useLanguage()
  const ref = useRef<HTMLElement>(null)
  const alertRef = useRef<HTMLDivElement>(null)
  const alertInView = useInView(alertRef, { once: true, amount: 0.6 })
  const { reduced } = useMotionPrefs()
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })

  return (
    <section
      ref={ref}
      id="thich-ung"
      className="section-padding relative scroll-mt-20 overflow-hidden bg-cream pb-[clamp(11rem,18vw,16rem)]"
    >
      <BayScene progress={scrollYProgress} />

      <div className="container-shell relative">
        <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
          <div>
            <p className="section-kicker">{messages.adaptive.kicker}</p>
            <RevealHeading
              className="section-title mt-5"
              parts={[{ text: messages.adaptive.title }]}
            />
          </div>
          <p className="max-w-lg text-base leading-7 text-ink/65 lg:ml-auto">{messages.adaptive.description}</p>
        </div>

        <div className="mt-14 grid gap-5 lg:mt-20 lg:grid-cols-[1.05fr_0.95fr]">
          <motion.div
            initial={{ opacity: 0, y: 48 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '0px 0px -10% 0px' }}
            transition={{ duration: 0.95, ease }}
            className="route-canvas relative min-h-[31rem] overflow-hidden bg-forest p-7 text-paper shadow-[0_30px_70px_-30px_rgba(23,63,53,0.55)] sm:p-10"
          >
            <div className="relative z-10 flex items-start justify-between">
              <div>
                <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-sun">
                  {messages.adaptive.mapLabel}
                </p>
                <h3 className="mt-2 font-display text-3xl">{messages.adaptive.mapTitle}</h3>
              </div>
              <Map aria-hidden="true" size={28} strokeWidth={1.5} className="text-paper/60" />
            </div>

            <RouteMap />

            {messages.adaptive.mapPlaces.map((place, index) => {
              const positions = [
                'bottom-[13%] left-[7%] max-w-28',
                'bottom-[31%] left-[25%] max-w-24',
                'left-[47%] top-[46%] max-w-24',
                'right-[19%] top-[31%] max-w-28',
                'right-[3%] top-[18%] max-w-24',
              ]
              return (
                <motion.span
                  key={place}
                  initial={{ opacity: reduced ? 1 : 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true, amount: 0.4 }}
                  transition={{ delay: reduced ? 0 : 0.5 + index * 0.42, duration: 0.6 }}
                  className={`absolute text-xs font-medium ${positions[index]}`}
                >
                  {place}
                </motion.span>
              )
            })}

            <motion.div
              ref={alertRef}
              initial={{ opacity: 0, y: 26, scale: 0.94 }}
              animate={alertInView || reduced ? { opacity: 1, y: 0, scale: 1 } : {}}
              transition={{ delay: reduced ? 0 : 4.4, type: 'spring', stiffness: 220, damping: 20 }}
              className="absolute bottom-7 right-7 max-w-[17rem] border border-paper/15 bg-paper p-4 text-ink shadow-xl sm:bottom-10 sm:right-10"
            >
              <p className="flex items-center gap-2 text-xs font-semibold">
                <BellRing aria-hidden="true" size={15} className="text-terracotta" />
                {messages.adaptive.alertTitle}
              </p>
              <p className="mt-1.5 text-[0.68rem] leading-5 text-ink/55">{messages.adaptive.alertDescription}</p>
            </motion.div>
          </motion.div>

          <div className="border border-forest/15 bg-paper shadow-[0_30px_70px_-40px_rgba(23,63,53,0.4)]">
            {messages.adaptive.features.map(({ title, description }, index) => {
              const Icon = featureIcons[index]
              return (
                <motion.article
                  key={index}
                  initial={{ opacity: 0, x: 40 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: '0px 0px -8% 0px' }}
                  transition={{ duration: 0.8, delay: index * 0.11, ease }}
                  onPointerMove={trackSpotlight}
                  className="spotlight hover-line group grid grid-cols-[auto_1fr] gap-5 border-b border-forest/15 p-6 last:border-b-0 sm:p-8"
                >
                  <span className="grid size-11 place-items-center border border-forest/15 text-forest transition-all duration-500 group-hover:-rotate-6 group-hover:bg-terracotta group-hover:text-paper">
                    <Icon aria-hidden="true" size={19} strokeWidth={1.7} />
                  </span>
                  <div>
                    <div className="flex items-center justify-between gap-4">
                      <h3 className="font-display text-xl font-medium">{title}</h3>
                      <span className="text-xs text-ink/25">0{index + 1}</span>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-ink/58">{description}</p>
                  </div>
                </motion.article>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
