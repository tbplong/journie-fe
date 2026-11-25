import { useState, type ReactNode } from 'react'
import { motion } from 'motion/react'
import { cityImage } from '../domain/cityMedia'
import { cityById } from '../domain/pois'
import type { CityId } from '../domain/types'
import { EASE_OUT } from './motion/variants'

/** Settles from a slight zoom once the lazy photo has arrived, not on mount, so the motion is never spent before any pixels show. */
function CoverPhoto({ src }: { src: string }) {
  const [ready, setReady] = useState(false)
  return (
    <motion.img
      ref={(node) => {
        // A cached image may have finished before React listened for `load`.
        if (node?.complete && node.naturalWidth > 0) setReady(true)
      }}
      src={src}
      alt=""
      loading="lazy"
      decoding="async"
      initial={false}
      animate={ready ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 1.12 }}
      transition={{ duration: 1.2, ease: EASE_OUT, opacity: { duration: 0.5, ease: EASE_OUT } }}
      onLoad={() => setReady(true)}
      onError={() => setReady(true)}
      className="absolute inset-0 -z-10 size-full object-cover"
    />
  )
}

/**
 * Destination backdrop: the given photo (a trip's own standout place, `useTripCover`), else the city's photo when we have a
 * real one, else its plain colour (a drawing would not show the place).
 */
export function CityCover({ city, src: photo, className = '', children, overlay = 'from-night/80 via-night/20 to-transparent' }: { city: CityId; src?: string; className?: string; children?: ReactNode; overlay?: string }) {
  const src = photo ?? cityImage[city]
  const tint = cityById[city].tint
  return (
    <div className={`relative isolate overflow-hidden ${className}`} style={{ background: tint }}>
      {src && <CoverPhoto key={src} src={src} />}
      <div className={`absolute inset-0 -z-10 bg-gradient-to-t ${overlay}`} />
      {children}
    </div>
  )
}
