import { siteConfig } from '../content/site'

type Props = {
  /** `dark` ink on light backgrounds, `light` cream on dark ones. */
  tone?: 'dark' | 'light'
  /** Height of the lamp mark; the wordmark scales with it. Any CSS length, `clamp()` included. */
  height?: string
  className?: string
}

/**
 * The Journie lockup with the wordmark set in the web's own display face instead of the baked-in picture lettering,
 * so the logo and the headings share one typeface. The lamp is the picture; the name is live text.
 */
export function Logo({ tone = 'dark', height = '3.5rem', className = '' }: Props) {
  const light = tone === 'light'
  return (
    <span className={`inline-flex flex-col items-center ${className}`} style={{ ['--logo-h' as string]: height, gap: 'calc(var(--logo-h) * 0.06)' }}>
      <img src={light ? siteConfig.logoMarkLight : siteConfig.logoMark} alt="" className="w-auto" style={{ height: 'var(--logo-h)' }} />
      <span className={`relative font-display font-medium leading-none tracking-[-0.03em] ${light ? 'text-paper' : 'text-forest'}`} style={{ fontSize: 'calc(var(--logo-h) * 0.4)' }}>
        Journie
        <svg viewBox="0 0 24 24" aria-hidden="true" className="absolute" style={{ width: '0.46em', height: '0.46em', right: '-0.5em', top: '-0.1em' }}>
          <path d="M12 1Q13.6 10.4 23 12Q13.6 13.6 12 23Q10.4 13.6 1 12Q10.4 10.4 12 1Z" fill="#e8b84a" />
        </svg>
      </span>
    </span>
  )
}
