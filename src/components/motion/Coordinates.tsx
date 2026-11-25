import { useEffect } from 'react'
import { animate, motion, useMotionValue, useTransform } from 'motion/react'
import { useMotionPrefs } from '../../hooks/useMotionPrefs'
import { formatCoordinates } from '../../utils/formatters'

type Props = {
  latitude: number
  longitude: number
  className?: string
}

/** GPS-style readout that rolls from the previous coordinates to the new ones. */
export function Coordinates({ latitude, longitude, className }: Props) {
  const { reduced } = useMotionPrefs()
  const lat = useMotionValue(latitude)
  const lng = useMotionValue(longitude)
  const text = useTransform([lat, lng], ([la, lo]: number[]) => formatCoordinates(la, lo))

  useEffect(() => {
    const options = { duration: reduced ? 0 : 1.4, ease: [0.22, 1, 0.36, 1] as const }
    const controls = [animate(lat, latitude, options), animate(lng, longitude, options)]
    return () => controls.forEach((control) => control.stop())
  }, [latitude, longitude, lat, lng, reduced])

  return <motion.span className={`tabular-nums ${className ?? ''}`}>{text}</motion.span>
}
