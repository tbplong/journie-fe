import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { animate, type AnimationPlaybackControls } from 'motion/react'
import { categories } from '../../domain/categories'
import { poiById } from '../../domain/pois'
import { useMotionPrefs } from '../../hooks/useMotionPrefs'
import { useTr } from '../../hooks/useTr'
import type { Poi, Stop } from '../../domain/types'

type Props = {
  stops: Stop[]
  activeUid?: string | null
  onSelect?: (uid: string) => void
  /** Live traveler position, drawn as a pulsing dot. */
  me?: { lat: number; lng: number } | null
  className?: string
  /** Extra points (e.g. search results) drawn as small markers. */
  extras?: { id: string; lat: number; lng: number; label: string; color?: string }[]
  onExtraClick?: (id: string) => void
  fitKey?: string
  /** Where the map opens when it has nothing to show, such as the city centre. */
  center?: { lat: number; lng: number }
  /** How sure the live position is, in metres; drawn as a faint circle around the dot. */
  meAccuracy?: number
  /** Changing this number pans the map to the live position ("follow me"). */
  recenterKey?: number
  /** The route before a proposed change, drawn as a grey dashed line under the new one so the two can be compared. */
  ghost?: Stop[]
}

const OSRM = 'https://router.project-osrm.org/route/v1/driving'

const OSM_ATTRIBUTION = '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
/** The public OpenStreetMap tile server is sometimes unreachable (blocked networks, usage limits); OpenStreetMap France draws the same data. */
const FALLBACK_TILES = 'https://{s}.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png'
const FALLBACK_AFTER = 3

/** Leaflet puts a divIcon's `html` and a string tooltip in as markup; trip data (a shared link's uids, place names) goes in as text. */
const escapeHtml = (value: string | number) => String(value).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`)

/** Cache road geometry per leg so panning around or re-rendering never refetches. */
const geometryCache = new Map<string, [number, number][]>()

async function roadGeometry(coords: { lat: number; lng: number }[], signal: AbortSignal): Promise<[number, number][] | null> {
  const key = coords.map((c) => `${c.lng.toFixed(4)},${c.lat.toFixed(4)}`).join(';')
  const cached = geometryCache.get(key)
  if (cached) return cached
  try {
    const response = await fetch(`${OSRM}/${key}?overview=simplified&geometries=geojson`, { signal })
    if (!response.ok) return null
    const json = (await response.json()) as { routes?: { geometry: { coordinates: [number, number][] } }[] }
    const line = json.routes?.[0]?.geometry.coordinates.map(([lng, lat]) => [lat, lng] as [number, number])
    if (line) geometryCache.set(key, line)
    return line ?? null
  } catch {
    return null
  }
}

/**
 * Leaflet map of a day's route. Stops are numbered pins coloured by category; the line between them
 * is the OSRM road geometry when the public demo server answers, otherwise a straight hop, so the
 * map is always legible offline.
 */
export function RouteMap({ stops, activeUid, onSelect, me, className = '', extras, onExtraClick, fitKey, center, meAccuracy, recenterKey, ghost }: Props) {
  const { tr } = useTr()
  const { reduced } = useMotionPrefs()
  const host = useRef<HTMLDivElement>(null)
  const map = useRef<L.Map | null>(null)
  const layer = useRef<L.LayerGroup | null>(null)
  const meMarker = useRef<L.Marker | null>(null)
  const meCircle = useRef<L.Circle | null>(null)
  const ghostLine = useRef<L.Polyline | null>(null)
  const markers = useRef(new Map<string, L.Marker>())
  const onSelectRef = useRef(onSelect)
  const onExtraRef = useRef(onExtraClick)
  const reducedRef = useRef(reduced)
  /** Stops whose pins are already on the map; only new stops drop in, so reordering does not replay every pin. */
  const dropped = useRef(new Set<string>())

  useEffect(() => {
    onSelectRef.current = onSelect
    onExtraRef.current = onExtraClick
    reducedRef.current = reduced
  })

  useEffect(() => {
    if (!host.current || map.current) return
    const instance = L.map(host.current, { zoomControl: false, scrollWheelZoom: true, attributionControl: true }).setView([16.05, 108.2], 5)
    const base = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: OSM_ATTRIBUTION }).addTo(instance)
    // A few failed tiles mean the server cannot be reached: switch to the fallback so the map is never left blank.
    let failed = 0
    base.on('tileerror', () => {
      failed += 1
      if (failed !== FALLBACK_AFTER) return
      instance.removeLayer(base)
      L.tileLayer(FALLBACK_TILES, { maxZoom: 19, subdomains: 'abc', attribution: `${OSM_ATTRIBUTION}, <a href="https://www.openstreetmap.fr">OpenStreetMap France</a>` }).addTo(instance)
    })
    L.control.zoom({ position: 'bottomright' }).addTo(instance)
    instance.attributionControl.setPrefix(false)
    layer.current = L.layerGroup().addTo(instance)
    map.current = instance
    return () => {
      instance.remove()
      map.current = null
    }
  }, [])

  // Draw pins and the route whenever the stops change.
  const stopKey = stops.map((stop) => stop.uid).join('|')
  useEffect(() => {
    const instance = map.current
    const group = layer.current
    if (!instance || !group) return
    group.clearLayers()
    markers.current.clear()

    // A place this browser has not loaded has no position: it gets no pin, and the line skips it
    const placed = stops.flatMap((stop, index) => {
      const poi = poiById[stop.poiId] as Poi | undefined
      return poi ? [{ stop, index, poi }] : []
    })
    const points = placed.map(({ poi }) => poi)
    const latlngs = points.map((poi) => [poi.lat, poi.lng] as [number, number])

    const straight = L.polyline(latlngs, { color: '#173f35', weight: 3, opacity: 0.6, dashArray: '2 9', lineCap: 'round', className: 'route-line' }).addTo(group)

    const drops: AnimationPlaybackControls[] = []
    const seen = dropped.current
    dropped.current = new Set()
    let current = true
    let entering = 0
    // Pins keep the stop's number in the day, so they match the timeline even when one is skipped
    placed.forEach(({ stop, index, poi }) => {
      const icon = L.divIcon({
        className: '',
        // The outer div only carries the drop-in animation, so the pin's own CSS transform stays untouched.
        html: `<div style="transform-origin:50% 100%"><div class="map-pin" data-uid="${escapeHtml(stop.uid)}" style="background:${escapeHtml(categories[poi.cat].color)}"><span>${escapeHtml(index + 1)}</span></div></div>`,
        iconSize: [30, 30],
        iconAnchor: [15, 30],
      })
      const marker = L.marker([poi.lat, poi.lng], { icon, title: poi.name, keyboard: true }).addTo(group)
      marker.on('click', () => onSelectRef.current?.(stop.uid))
      markers.current.set(stop.uid, marker)

      const holder = marker.getElement()?.firstElementChild
      if (!(holder instanceof HTMLElement) || reducedRef.current || seen.has(stop.uid)) {
        dropped.current.add(stop.uid)
        return
      }
      const drop = animate(holder, { y: [-26, 0], scale: [0.4, 1], opacity: [0, 1] }, { duration: 0.55, delay: 0.25 + Math.min(entering++, 8) * 0.07, ease: [0.34, 1.56, 0.64, 1] })
      // A drop cut short by a redraw counts as not shown, so the redrawn pin drops again.
      drop.then(() => current && dropped.current.add(stop.uid))
      drops.push(drop)
    })

    extras?.forEach((extra) => {
      const dot = L.circleMarker([extra.lat, extra.lng], { radius: 7, color: '#fff', weight: 2, fillColor: extra.color ?? '#d96745', fillOpacity: 1 }).addTo(group)
      dot.bindTooltip(escapeHtml(extra.label), { direction: 'top', offset: [0, -6] })
      dot.on('click', () => onExtraRef.current?.(extra.id))
    })

    const all = [...latlngs, ...(extras ?? []).map((e) => [e.lat, e.lng] as [number, number])]
    if (all.length) instance.fitBounds(L.latLngBounds(all), { padding: [48, 48], maxZoom: 15, animate: true, duration: 0.8 })
    else if (center) instance.setView([center.lat, center.lng], 12, { animate: true })

    const controller = new AbortController()
    if (points.length > 1) {
      roadGeometry(points, controller.signal).then((line) => {
        if (!line || controller.signal.aborted || !group.hasLayer(straight)) return
        straight.setLatLngs(line)
        straight.setStyle({ opacity: 0.8, weight: 4 })
      })
    }
    return () => {
      current = false
      controller.abort()
      drops.forEach((drop) => drop.stop())
    }
    // stopKey summarises the stops; extras are compared by value below
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stopKey, JSON.stringify(extras), fitKey, center?.lat, center?.lng])

  // Highlight the active pin.
  useEffect(() => {
    markers.current.forEach((marker, uid) => {
      marker.getElement()?.querySelector('.map-pin')?.setAttribute('data-active', String(uid === activeUid))
    })
    if (activeUid) {
      const marker = markers.current.get(activeUid)
      if (marker && map.current) map.current.panTo(marker.getLatLng(), { animate: true, duration: 0.6 })
    }
  }, [activeUid, stopKey])

  // The route before a proposed change.
  const ghostKey = ghost?.map((stop) => stop.uid).join('|') ?? ''
  useEffect(() => {
    const instance = map.current
    if (!instance) return
    ghostLine.current?.remove()
    ghostLine.current = null
    const points = (ghost ?? []).map((stop) => poiById[stop.poiId] as Poi | undefined).filter((poi): poi is Poi => !!poi)
    if (points.length > 1) ghostLine.current = L.polyline(points.map((poi) => [poi.lat, poi.lng] as [number, number]), { color: '#8a8a8a', weight: 3, opacity: 0.7, dashArray: '6 8', interactive: false }).addTo(instance)
    // the key summarises the stops
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ghostKey])

  // Accuracy ring around the live position.
  useEffect(() => {
    const instance = map.current
    if (!instance) return
    if (!me || !meAccuracy) {
      meCircle.current?.remove()
      meCircle.current = null
      return
    }
    if (!meCircle.current) meCircle.current = L.circle([me.lat, me.lng], { radius: meAccuracy, color: '#4fb8a4', weight: 1, fillOpacity: 0.12, interactive: false }).addTo(instance)
    else meCircle.current.setLatLng([me.lat, me.lng]).setRadius(meAccuracy)
  }, [me, meAccuracy])

  // "Follow me": pan to the live position when asked.
  useEffect(() => {
    if (recenterKey && me && map.current) map.current.setView([me.lat, me.lng], Math.max(map.current.getZoom(), 15), { animate: true })
    // only a new key pans; following every GPS update would fight the traveler's own panning
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recenterKey])

  // Live position.
  useEffect(() => {
    const instance = map.current
    if (!instance) return
    if (!me) {
      meMarker.current?.remove()
      meMarker.current = null
      return
    }
    if (!meMarker.current) {
      meMarker.current = L.marker([me.lat, me.lng], {
        icon: L.divIcon({ className: '', html: '<div class="me-dot"></div>', iconSize: [18, 18], iconAnchor: [9, 9] }),
        zIndexOffset: 1000,
        interactive: false,
      }).addTo(instance)
    } else {
      meMarker.current.setLatLng([me.lat, me.lng])
    }
  }, [me])

  // Leaflet's own zoom buttons are English; keep them in the page language.
  useEffect(() => {
    const root = host.current
    if (!root) return
    for (const [selector, label] of [['.leaflet-control-zoom-in', tr('Phóng to', 'Zoom in')], ['.leaflet-control-zoom-out', tr('Thu nhỏ', 'Zoom out')]] as const) {
      const button = root.querySelector(selector)
      button?.setAttribute('title', label)
      button?.setAttribute('aria-label', label)
    }
  }, [tr])

  return <div ref={host} className={`journie-map ${className}`} role="application" aria-label={tr('Bản đồ lịch trình', 'Itinerary map')} />
}
