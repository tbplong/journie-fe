import { useState, type CSSProperties } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'motion/react'
import { mapillaryThumb } from '../../api/mapillary'
import { useGooglePhoto } from '../../api/placePhoto'
import { EASE_OUT } from '../motion/variants'
import { placeMedia } from '../../domain/placeMedia'
import type { Poi } from '../../domain/types'
import { useTr } from '../../hooks/useTr'

const SIX_HOURS = 6 * 60 * 60 * 1000

function Blank({ text, className }: { text: string; className: string }) {
  return <div className={`absolute inset-0 grid size-full place-items-center bg-forest/10 text-[0.72rem] font-semibold text-ink/45 ${className}`}>{text}</div>
}

/** A photo that settles in (fade and a slight zoom-out) once its pixels have arrived, instead of popping in line by line. */
function Photo({ src, className, style }: { src: string; className: string; style?: CSSProperties }) {
  const [ready, setReady] = useState(false)
  return (
    <motion.img
      ref={(node) => {
        // A cached image may have finished before React listened for `load`.
        if (node?.complete && node.naturalWidth > 0) setReady(true)
      }}
      src={src}
      alt=""
      referrerPolicy="no-referrer"
      loading="lazy"
      decoding="async"
      style={style}
      initial={false}
      animate={ready ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 1.06 }}
      transition={{ duration: 0.7, ease: EASE_OUT }}
      onLoad={() => setReady(true)}
      onError={() => setReady(true)}
      className={`absolute inset-0 size-full object-cover ${className}`}
    />
  )
}

/** A Mapillary street photo: its address is fetched now because Mapillary's addresses expire. */
function StreetPhoto({ id, user, near, className }: { id: string; user: string; near?: boolean; className: string }) {
  const { tr } = useTr()
  const thumb = useQuery({ queryKey: ['mapillary', id], queryFn: () => mapillaryThumb(id), staleTime: SIX_HOURS, gcTime: SIX_HOURS, retry: 1 })
  if (thumb.isError) return <Blank text={tr('Chưa có ảnh thật', 'No photo yet')} className={className} />
  if (!thumb.data) return <div className={`skeleton absolute inset-0 size-full ${className}`} aria-hidden="true" />
  return (
    <>
      <Photo src={thumb.data} className={className} />
      <span className="absolute bottom-1 right-1.5 max-w-[80%] truncate bg-black/45 px-1 text-[0.58rem] leading-4 text-white/85">
        {near && `${tr('Phố quanh quán', 'Street nearby')} · `}© Mapillary @{user}
      </span>
    </>
  )
}

/**
 * The picture for a place: a real photograph of that place (or of its street frontage) when one is known, and a plain "no photo yet"
 * tile otherwise. A drawing would not tell anyone what the place looks like. Fills its (relatively positioned) parent.
 */
export function PlaceImage({ poi, className = '' }: { poi: Poi; className?: string }) {
  const media = placeMedia(poi)
  if (media.kind === 'google') return <GooglePhotoImage poi={poi} placeId={media.placeId} className={className} />
  return <MediaImage media={media} className={className} />
}

/** A Google Maps photo of the place, credited on the picture as Google asks; on any failure the next kind of picture is shown. */
function GooglePhotoImage({ poi, placeId, className }: { poi: Poi; placeId: string; className: string }) {
  const photo = useGooglePhoto(placeId)
  if (photo.isError) return <MediaImage media={placeMedia(poi, false)} className={className} />
  if (!photo.data) return <div className={`skeleton absolute inset-0 size-full ${className}`} aria-hidden="true" />
  const author = photo.data.authors[0]?.name
  return (
    <>
      <Photo src={photo.data.photoUri} className={className} />
      <span className="absolute bottom-1 right-1.5 max-w-[80%] truncate bg-black/45 px-1 text-[0.58rem] leading-4 text-white/85">
        {author ? `${author} · ` : ''}Google Maps
      </span>
    </>
  )
}

function MediaImage({ media, className }: { media: ReturnType<typeof placeMedia>; className: string }) {
  const { tr } = useTr()
  if (media.kind === 'none' || media.kind === 'google') return <Blank text={tr('Chưa có ảnh thật', 'No photo yet')} className={className} />
  if (media.kind === 'street') return <StreetPhoto id={media.id} user={media.credit.street?.user ?? ''} near={media.credit.street?.near} className={className} />
  return <Photo src={media.src} style={media.style} className={className} />
}
