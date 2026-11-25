import { useEffect, useState } from 'react'
import type { DiAction } from '../../lib/diActions'
import { useSky } from '../../store/weatherStore'
import type { MascotMood } from './mascot-context'

export type DiMoment = {
  mood: MascotMood
  line: { vi: string; en: string }
  cta?: { vi: string; en: string; action: DiAction }
}

const FOOD = { vi: 'Xem quán ăn', en: 'Find food', action: 'food' } as const
const INDOOR = { vi: 'Xem nơi trong nhà', en: 'Indoor places', action: 'indoor' } as const

type Meal = 'breakfast' | 'lunch' | 'dinner' | null

function mealAt(minutes: number): Meal {
  if (minutes >= 5 * 60 + 30 && minutes < 9 * 60) return 'breakfast'
  if (minutes >= 11 * 60 + 30 && minutes < 13 * 60 + 15) return 'lunch'
  if (minutes >= 17 * 60 + 30 && minutes < 19 * 60 + 30) return 'dinner'
  return null
}

const HUNGRY: Record<Exclude<Meal, null>, { vi: string; en: string }> = {
  breakfast: { vi: 'Sáng rồi, làm tô phở cho tỉnh người nha?', en: 'Morning. Pho to wake you up?' },
  lunch: { vi: 'Trưa rồi, đói chưa? Đi ăn thôi.', en: 'Lunchtime. Hungry yet?' },
  dinner: { vi: 'Ăn tối xong ra chợ đêm dạo luôn nha?', en: 'Dinner first, then the night market?' },
}

/**
 * What the big Journie on the dashboard is doing right now, picked from the sky and the clock rather than from the
 * pointer: it holds an umbrella and worries in storms, pats its tummy at mealtimes, fans itself in the midday sun,
 * dozes off late at night. It is deliberately not the corner Journie's mood, which follows what you are clicking.
 */
export function useDiMoment(): DiMoment {
  const sky = useSky()
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000)
    return () => window.clearInterval(timer)
  }, [])

  const minutes = now.getHours() * 60 + now.getMinutes()
  const meal = mealAt(minutes)
  const late = minutes >= 23 * 60 || minutes < 5 * 60

  if (sky.weather === 'storm') return { mood: 'error', line: { vi: 'Có dông kìa. Ở trong nhà đi, mai trời đẹp lại.', en: 'Thunderstorm. Stay in, it will clear up tomorrow.' }, cta: INDOOR }
  if (sky.weather === 'rain') {
    if (meal) return { mood: 'hungry', line: { vi: 'Mưa mà ăn đồ nóng là hết sảy.', en: 'Rain plus hot food, best combo.' }, cta: FOOD }
    return { mood: 'idle', line: { vi: 'Mưa rồi, ghé bảo tàng hay quán cà phê trú chút.', en: 'Raining. A museum or café makes good shelter.' }, cta: INDOOR }
  }
  if (meal) return { mood: 'hungry', line: HUNGRY[meal], cta: FOOD }
  if (late) return { mood: 'sleepy', line: { vi: 'Khuya rồi đó, đi ngủ đi, mai tính tiếp.', en: 'It is late. Sleep now, plan tomorrow.' } }
  if (sky.night) return { mood: 'watching', line: { vi: 'Tối nay rảnh thì lên lịch ngày mai luôn nè.', en: 'Free tonight? Plan tomorrow.' } }
  if (sky.weather === 'clear' && minutes >= 11 * 60 && minutes < 16 * 60) return { mood: 'hot', line: { vi: 'Nắng gắt đó. Mang nước, đội nón vô.', en: 'Scorching. Water and a hat, please.' } }
  if (sky.weather === 'cloudy') return { mood: 'wave', line: { vi: 'Trời mát, hợp đi dạo phố cổ.', en: 'Cool and cloudy, good for the old town.' } }
  return { mood: 'wave', line: { vi: 'Hôm nay đi đâu đây?', en: 'Where to today?' } }
}
