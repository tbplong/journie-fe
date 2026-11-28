import { useEffect, useRef, useState } from 'react'

export type Fix = { lat: number; lng: number; accuracy: number; at: number }
export type LocationProblem = 'unsupported' | 'insecure' | 'denied' | 'unavailable' | 'timeout'
export type PermissionState = 'granted' | 'denied' | 'prompt' | 'unknown'

/** Readings worse than this are too vague to tell which stop the traveler is at. */
export const USABLE_ACCURACY_M = 150
const THROTTLE_MS = 3000

const problemOf = (error: GeolocationPositionError): LocationProblem => (error.code === error.PERMISSION_DENIED ? 'denied' : error.code === error.TIMEOUT ? 'timeout' : 'unavailable')

/** The browser's location permission, kept current while the page is open (UC 3.2). */
export function useLocationPermission(): PermissionState {
  const [state, setState] = useState<PermissionState>('unknown')
  useEffect(() => {
    let status: PermissionStatus | null = null
    const read = () => status && setState(status.state as PermissionState)
    navigator.permissions
      ?.query({ name: 'geolocation' })
      .then((result) => {
        status = result
        read()
        result.addEventListener('change', read)
      })
      .catch(() => undefined)
    return () => status?.removeEventListener('change', read)
  }, [])
  return state
}

/** Why location cannot be used at all on this page, before asking. */
export function locationBlocker(): LocationProblem | null {
  if (typeof navigator === 'undefined' || !('geolocation' in navigator)) return 'unsupported'
  if (!window.isSecureContext) return 'insecure'
  return null
}

/** Asks once; resolves with the reading or the reason it failed. Triggers the browser's own permission prompt. `precise` false takes a quick network-based reading (enough for the weather). */
export function requestLocation(precise = true): Promise<Fix | LocationProblem> {
  const blocked = locationBlocker()
  if (blocked) return Promise.resolve(blocked)
  return new Promise((resolve) =>
    navigator.geolocation.getCurrentPosition(
      (position) => resolve({ lat: position.coords.latitude, lng: position.coords.longitude, accuracy: position.coords.accuracy, at: position.timestamp }),
      (error) => resolve(problemOf(error)),
      precise ? { enableHighAccuracy: true, timeout: 15_000, maximumAge: 30_000 } : { enableHighAccuracy: false, timeout: 15_000, maximumAge: 10 * 60_000 },
    ),
  )
}

/** Follows the device's position while `active`, at most one update every few seconds; stops watching when inactive or unmounted. */
export function useLivePosition(active: boolean) {
  const [fix, setFix] = useState<Fix | null>(null)
  const [problem, setProblem] = useState<LocationProblem | null>(null)
  const last = useRef(0)

  const blocked = locationBlocker()
  useEffect(() => {
    if (!active || locationBlocker()) return
    const id = navigator.geolocation.watchPosition(
      (position) => {
        const now = Date.now()
        if (now - last.current < THROTTLE_MS) return
        last.current = now
        setProblem(null)
        setFix({ lat: position.coords.latitude, lng: position.coords.longitude, accuracy: position.coords.accuracy, at: position.timestamp })
      },
      (error) => setProblem(problemOf(error)),
      { enableHighAccuracy: true, timeout: 20_000, maximumAge: 10_000 },
    )
    return () => navigator.geolocation.clearWatch(id)
  }, [active])

  return { fix: active ? fix : null, problem: active ? (blocked ?? problem) : null }
}

/** What went wrong with location, in the traveler's words: [Vietnamese, English]. */
export function locationProblemText(problem: LocationProblem): [string, string] {
  switch (problem) {
    case 'unsupported':
      return ['Trình duyệt này không hỗ trợ định vị.', 'This browser cannot share your location.']
    case 'insecure':
      return ['Định vị chỉ chạy trên trang HTTPS.', 'Location only works on an HTTPS page.']
    case 'denied':
      return ['Bạn đã chặn quyền vị trí. Mở cài đặt trang (biểu tượng ổ khoá cạnh địa chỉ) để cho phép lại.', 'Location is blocked. Open the site settings (the lock icon by the address) to allow it again.']
    case 'timeout':
      return ['Chờ vị trí lâu quá. Ra chỗ thoáng hoặc thử lại.', 'Getting your location took too long. Step outside or try again.']
    case 'unavailable':
      return ['Chưa xác định được vị trí. Kiểm tra GPS hoặc mạng.', 'Your position is not available. Check GPS or the network.']
  }
}

