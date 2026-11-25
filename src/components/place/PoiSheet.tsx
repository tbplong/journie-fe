import { useEffect, useState } from 'react'
import { useParams } from 'react-router'
import { motion, stagger, type Variants } from 'motion/react'
import { Clock, ExternalLink, Flag, FolderPlus, Heart, MapPin, Plus, Tag, Wallet } from 'lucide-react'
import { myReport } from '../../api/poiReports'
import { ReportSheet } from './ReportSheet'
import { EASE_OUT, popItem } from '../motion/variants'
import { useMotionPrefs } from '../../hooks/useMotionPrefs'
import { readProfile, type Profile } from '../../api/profile'
import { useModuleEnabled, useProfile, useSaveProfile, useSaveTrip, useTrips } from '../../api/queries'
import { track } from '../../api/analytics'
import { addStop, shiftNote } from '../../domain/edit'
import { placeMedia } from '../../domain/placeMedia'
import { poiById } from '../../domain/pois'
import { violationText } from '../../domain/violation'
import { cheer } from '../../lib/cheer'
import { useTr } from '../../hooks/useTr'
import { useAuthStore } from '../../store/authStore'
import { toast } from '../../store/toastStore'
import { useUiStore } from '../../store/uiStore'
import { PlaceImage } from './PlaceImage'
import { useGooglePhoto } from '../../api/placePhoto'

/** The sheet's body plays in after the panel starts sliding, one block after another. */
const body: Variants = { hidden: {}, show: { transition: { delayChildren: stagger(0.06, { startDelay: 0.14 }) } } }
const block: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE_OUT, delayChildren: (i: number) => 0.08 + Math.min(i, 8) * 0.045 } },
}
const fade: Variants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { duration: 0.4, ease: EASE_OUT } } }
const tile: Variants = {
  hidden: { opacity: 0, y: 12, scale: 0.96 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.45, ease: EASE_OUT } },
}
/** The photo opens like a curtain pulled to the right; a plain fade when motion is reduced. */
const heroWipe: Variants = {
  hidden: { clipPath: 'inset(0 100% 0 0)' },
  show: { clipPath: 'inset(0 0% 0 0)', transition: { duration: 0.75, ease: EASE_OUT, delayChildren: 0.45 } },
}

/** Google asks for the photo's author (with their profile link) and a link to the place on Google Maps; "Google Maps" is not translated. */
function GoogleCredit({ placeId }: { placeId: string }) {
  const { tr } = useTr()
  const photo = useGooglePhoto(placeId)
  if (!photo.data) return null
  const link = 'underline-offset-2 hover:underline'
  return (
    <motion.p variants={fade} className="-mt-3 text-[0.7rem] leading-snug text-ink/50">
      {tr('Ảnh', 'Photo')}:{' '}
      {photo.data.authors.map((a, i) => (
        <span key={a.name}>
          {i > 0 && ', '}
          {a.uri ? <a href={a.uri} target="_blank" rel="noreferrer" className={link}>{a.name}</a> : a.name}
        </span>
      ))}
      {photo.data.authors.length > 0 && ' · '}
      {photo.data.mapsUri ? <a href={photo.data.mapsUri} target="_blank" rel="noreferrer" className={link}>Google Maps</a> : 'Google Maps'}
    </motion.p>
  )
}
import { CategoryIcon } from '../icons'
import { CategoryGlyph, CategoryName } from '../ui/primitives'
import { Sheet } from '../ui/Sheet'
import { tripTitle } from '../../domain/tripText'
import { tagLabel } from '../../domain/tags'
import { addDays, formatDate } from '../../domain/time'

/**
 * Venue details and "add to trip". Shared by Discover, the editor and the live view. A `spare` sheet (the assistant's, for pages
 * without one) is not counted as the page's own.
 */
export function PoiSheet({ spare = false }: { spare?: boolean }) {
  const { tr, place, language, locale, price } = useTr()
  const { reduced } = useMotionPrefs()
  const vi = language === 'vi'
  const user = useAuthStore((state) => state.user)!
  const id = useUiStore((state) => state.poiSheet)
  const openPoi = useUiStore((state) => state.openPoi)
  const mountPageSheet = useUiStore((state) => state.mountPageSheet)
  useEffect(() => (spare ? undefined : mountPageSheet()), [spare, mountPageSheet])
  const poi = id ? poiById[id] : null
  const media = poi ? placeMedia(poi) : null
  const trips = useTrips()
  const profile = useProfile().data ?? readProfile(user.id, user.name)
  const saveProfile = useSaveProfile()
  const saveTrip = useSaveTrip()
  const [tripId, setTripId] = useState<string>('')
  // A pick holds for one opening of the sheet only, so the next place opens on the trip on screen again
  const [pickedFor, setPickedFor] = useState(id)
  if (pickedFor !== id) {
    setPickedFor(id)
    setTripId('')
  }
  // On a trip's own page (editor or live view) that trip is picked first, so the add and its duplicate check run on the trip on screen
  const tripOnScreen = useParams().id

  const candidates = (trips.data ?? []).filter((trip) => poi && trip.city === poi.city && trip.status !== 'completed')
  const selectedTrip = candidates.find((trip) => trip.id === tripId) ?? candidates.find((trip) => trip.id === tripOnScreen) ?? candidates[0]
  const saved = !!poi && profile.saved.includes(poi.id)
  const openSetChooser = useUiStore((state) => state.openSetChooser)
  // Sets belong to travelers (the sets pages are theirs only) and stop while the admin has the module off
  const canSave = useModuleEnabled('sets') && user.role === 'traveler'
  const [reporting, setReporting] = useState(false)
  // Re-read after a report is sent, so the "already reported" state shows at once
  const reported = !!poi && !reporting && !!myReport(poi.id, user.id)

  useEffect(() => {
    if (id) track({ type: 'poi_opened', poiId: id })
  }, [id])

  const toggleSaved = () => {
    if (!poi) return
    const next: Profile = { ...profile, saved: saved ? profile.saved.filter((p) => p !== poi.id) : [...profile.saved, poi.id] }
    saveProfile.mutate(next)
    if (!saved) cheer()
    toast('info', saved ? tr('Đã bỏ khỏi danh sách yêu thích', 'Removed from favourites') : tr('Đã lưu vào yêu thích', 'Saved to favourites'))
  }

  const addToTrip = (dayIndex: number) => {
    if (!poi || !selectedTrip) return
    const result = addStop(selectedTrip, dayIndex, poi.id)
    if (!result.ok) {
      toast('warning', tr('Chưa thêm được', 'Could not add it'), result.violations.map((violation) => violationText(violation, vi)).join(' · '))
      return
    }
    saveTrip.mutate(result.trip)
    track({ type: 'trip_edited', city: poi.city, detail: 'add-from-sheet' })
    const shift = shiftNote(selectedTrip, result.trip, dayIndex)
    toast('success', tr('Đã thêm vào lịch trình', 'Added to itinerary'), `${place.name(poi.name)} → ${tr('Ngày', 'Day')} ${dayIndex + 1}${shift ? tr(...shift) : ''}`)
    openPoi(null)
  }

  return (
    <Sheet open={!!poi} onClose={() => openPoi(null)} title={place.name(poi?.name ?? '')} description={poi ? place.area(poi.area) : undefined}>
      {poi && (
        <motion.div key={poi.id} className="space-y-6" variants={body} initial="hidden" animate="show">
          <motion.div variants={reduced ? fade : heroWipe} className="relative -mx-1 overflow-hidden border border-forest/20">
            <div className="relative aspect-[5/2] w-full overflow-hidden">
              <PlaceImage poi={poi} />
            </div>
            <motion.span variants={popItem} className="absolute bottom-2 left-2 grid size-12 place-items-center rounded-full border border-forest/25 bg-paper/90 text-forest shadow-sm">
              <CategoryIcon cat={poi.cat} size={34} />
            </motion.span>
          </motion.div>
          {media?.kind === 'google' && <GoogleCredit placeId={media.placeId} />}
          {media && 'credit' in media && media.credit && (
            <motion.p variants={fade} className="-mt-3 text-[0.7rem] leading-snug text-ink/50">
              {media.credit.street ? (
                <>
                  {media.credit.street.near
                    ? tr('Ảnh phố quanh quán, có thể chưa thấy đúng mặt tiền', 'Street nearby, the frontage may not be in frame')
                    : tr('Ảnh đường phố tại vị trí này', 'Street-level photo at this spot')}: @{media.credit.street.user} ({media.credit.street.year}) ·{' '}
                  <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noreferrer" className="underline-offset-2 hover:underline">CC BY-SA 4.0</a> ·{' '}
                  <a href={media.credit.page} target="_blank" rel="noreferrer" className="underline-offset-2 hover:underline">Mapillary</a>
                </>
              ) : media.credit.site ? (
                <>
                  {tr('Ảnh từ website của quán', 'Photo from the place’s own website')}:{' '}
                  <a href={media.credit.page} target="_blank" rel="noreferrer" className="underline-offset-2 hover:underline">{media.credit.site}</a>
                </>
              ) : media.credit.google ? (
                <>
                  {tr('Ảnh', 'Photo')}: {media.credit.author && `${media.credit.author} · `}
                  <a href={media.credit.page} target="_blank" rel="noreferrer" className="underline-offset-2 hover:underline">Google Maps</a>
                </>
              ) : (
                <>
                  {tr('Ảnh', 'Photo')}: {media.credit.author} ·{' '}
                  <a href={media.credit.licenseUrl || media.credit.page} target="_blank" rel="noreferrer" className="underline-offset-2 hover:underline">{media.credit.license}</a> ·{' '}
                  <a href={media.credit.page} target="_blank" rel="noreferrer" className="underline-offset-2 hover:underline">Wikimedia Commons</a>
                </>
              )}
            </motion.p>
          )}
          <motion.div variants={block} className="flex items-center gap-3">
            <CategoryGlyph cat={poi.cat} size={44} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-ink">
                <CategoryName cat={poi.cat} />
              </p>
              {poi.address && <p className="mt-0.5 text-xs text-ink/60">{place.address(poi.address)}</p>}
            </div>
            <motion.button type="button" onClick={toggleSaved} whileTap={{ scale: 0.88 }} className={`grid size-11 place-items-center rounded-full border transition-colors ${saved ? 'border-pomegranate bg-pomegranate/10 text-pomegranate' : 'border-forest/20 text-ink/50 hover:text-pomegranate'}`} aria-pressed={saved} aria-label={saved ? tr('Bỏ yêu thích', 'Remove favourite') : tr('Yêu thích', 'Favourite')}>
              <motion.span animate={saved ? { scale: [1, 1.35, 1] } : { scale: 1 }} transition={{ duration: 0.35 }}>
                <Heart size={20} fill={saved ? 'currentColor' : 'none'} />
              </motion.span>
            </motion.button>
          </motion.div>

          <motion.p variants={block} className="text-[1.05rem] leading-relaxed text-ink/80">{place.blurb(poi)}</motion.p>

          <motion.div variants={block} className="flex flex-wrap gap-2">
            {canSave && (
              <button type="button" className="btn-ghost btn-sm" onClick={() => {
                  openPoi(null)
                  openSetChooser([poi.id])
                }}>
                <FolderPlus size={15} aria-hidden="true" /> {tr('Lưu vào bộ sưu tập', 'Save to a set')}
              </button>
            )}
            <button type="button" className="btn-ghost btn-sm" onClick={() => setReporting(true)} disabled={reported} title={reported ? tr('Bạn đã báo nơi này, đang chờ kiểm tra', 'You reported this place; it is waiting for review') : undefined}>
              <Flag size={15} aria-hidden="true" /> {reported ? tr('Đã báo, chờ kiểm tra', 'Reported, under review') : tr('Báo thông tin sai', 'Report a problem')}
            </button>
          </motion.div>

          <motion.dl variants={block} className="grid grid-cols-2 gap-3 text-sm">
            <motion.div variants={tile} className="panel flex items-start gap-2.5 p-3">
              <Clock size={16} className="mt-0.5 text-lapis" aria-hidden="true" />
              <div>
                <dt className="text-[0.7rem] text-ink/50">{tr('Giờ mở cửa', 'Opening hours')}</dt>
                <dd className="tabular font-semibold">{poi.hours ? place.hours(poi.hours) : tr('Chưa rõ', 'Unknown')}</dd>
                {poi.flags.some((flag) => flag === 'hours_maybe_closed' || flag === 'hours_low_confidence' || flag === 'hours_unknown' || flag === 'hours_contradicted') && (
                  <dd className="mt-0.5 text-[0.7rem] text-sun-ink">{tr('Giờ mở cửa chưa chắc, gọi hỏi trước cho yên tâm.', 'Opening hours are not certain, worth a quick call first.')}</dd>
                )}
              </div>
            </motion.div>
            <motion.div variants={tile} className="panel flex items-start gap-2.5 p-3">
              <Wallet size={16} className="mt-0.5 text-lapis" aria-hidden="true" />
              <div>
                <dt className="text-[0.7rem] text-ink/50">{tr('Chi phí', 'Cost')}</dt>
                <dd className="tabular font-semibold">
                  {price(poi)}
                </dd>
              </div>
            </motion.div>
            <motion.div variants={tile} className="panel flex items-start gap-2.5 p-3">
              <Clock size={16} className="mt-0.5 text-lapis" aria-hidden="true" />
              <div>
                <dt className="text-[0.7rem] text-ink/50">{tr('Thời gian nên dành', 'Suggested time')}</dt>
                <dd className="tabular font-semibold">{poi.visit} {tr('phút', 'min')}</dd>
              </div>
            </motion.div>
            <motion.div variants={tile} className="panel flex items-start gap-2.5 p-3">
              <MapPin size={16} className="mt-0.5 text-lapis" aria-hidden="true" />
              <div>
                <dt className="text-[0.7rem] text-ink/50">{tr('Không gian', 'Setting')}</dt>
                <dd className="font-semibold">{poi.indoor ? tr('Trong nhà', 'Indoor') : tr('Ngoài trời', 'Outdoor')}</dd>
              </div>
            </motion.div>
          </motion.dl>

          <motion.div variants={block} className="flex flex-wrap gap-1.5" aria-label={tr('Dịch vụ và đặc điểm', 'Services and features')}>
            {poi.tags.map((tag) => (
              <motion.span key={tag} variants={popItem} className="inline-flex items-center gap-1 rounded-full bg-lapis/8 px-2.5 py-1 text-[0.72rem] font-semibold text-lapis">
                <Tag size={11} aria-hidden="true" /> {tagLabel(tag, language)}
              </motion.span>
            ))}
          </motion.div>

          <motion.div variants={block} className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm">
            {poi.website && (
              <a href={poi.website} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 font-semibold text-lapis hover:underline">
                <ExternalLink size={15} aria-hidden="true" /> {tr('Trang web của quán', 'Official website')}
              </a>
            )}
            <a href={poi.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 font-semibold text-lapis hover:underline">
              <MapPin size={15} aria-hidden="true" /> {tr('Xem trên Google Maps', 'View on Google Maps')}
            </a>
            {poi.phone && (
              <a href={`tel:${poi.phone}`} className="tabular font-semibold text-ink/70 hover:underline">
                {poi.phone}
              </a>
            )}
          </motion.div>

          <motion.section variants={block} className="panel p-4" aria-labelledby="add-title">
            <h3 id="add-title" className="text-sm font-bold text-ink">
              {tr('Thêm vào lịch trình', 'Add to an itinerary')}
            </h3>
            {candidates.length === 0 ? (
              <p className="mt-1.5 text-sm text-ink/60">{tr('Chưa có chuyến nào để thêm vào. Tạo một chuyến trước nha.', 'No trip to add it to yet. Make one first.')}</p>
            ) : (
              <>
                <label className="mt-2 block text-xs font-semibold text-ink/60" htmlFor="trip-pick">
                  {tr('Chuyến đi', 'Trip')}
                </label>
                <select id="trip-pick" value={selectedTrip?.id} onChange={(event) => setTripId(event.target.value)} className="mt-1 h-11 w-full rounded-lg border border-forest/20 bg-white px-3 text-sm outline-none focus:border-lapis">
                  {candidates.map((trip) => (
                    <option key={trip.id} value={trip.id}>
                      {`${tripTitle(trip, language, trips.data)} · ${formatDate(trip.startDate, locale, { day: 'numeric', month: 'short' })}${trip.days.length > 1 ? ` – ${formatDate(addDays(trip.startDate, trip.days.length - 1), locale, { day: 'numeric', month: 'short' })}` : ''}`}
                    </option>
                  ))}
                </select>
                <div className="mt-3 flex flex-wrap gap-2">
                  {selectedTrip?.days.map((day) => (
                    <button key={day.index} type="button" className="btn-ghost btn-sm" onClick={() => addToTrip(day.index)}>
                      <Plus size={14} aria-hidden="true" /> {tr('Ngày', 'Day')} {day.index + 1}
                    </button>
                  ))}
                </div>
              </>
            )}
          </motion.section>
        </motion.div>
      )}
      {poi && <ReportSheet poiId={poi.id} name={place.name(poi.name)} userId={user.id} open={reporting} onClose={() => setReporting(false)} />}
    </Sheet>
  )
}
