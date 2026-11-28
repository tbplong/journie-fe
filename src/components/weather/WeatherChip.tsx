import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { LocateFixed, Wand2 } from 'lucide-react'
import { readHereWeather } from '../../hooks/useHereWeather'
import { useTr } from '../../hooks/useTr'
import { PHASE_LABEL, WEATHER_LABEL, useSky, useWeatherStore, type PhaseMode, type Weather, type WeatherMode } from '../../store/weatherStore'
import { SkyIcon } from '../icons'

const WEATHERS: Weather[] = ['clear', 'cloudy', 'rain', 'storm']

/** Shows the current sky and lets anyone pin the time of day and the weather, so the whole app can be seen in any of them. */
export function WeatherChip({ tone = 'light', align = 'left', direction = 'down', compact = false }: { tone?: 'light' | 'dark'; align?: 'left' | 'right'; direction?: 'down' | 'up'; /** Icon and temperature only, for tight headers. */ compact?: boolean }) {
  const { tr, language } = useTr()
  const sky = useSky()
  const phaseMode = useWeatherStore((state) => state.phaseMode)
  const weatherMode = useWeatherStore((state) => state.weatherMode)
  const requestPhase = useWeatherStore((state) => state.requestPhase)
  const effects = useWeatherStore((state) => state.effects)
  const setEffects = useWeatherStore((state) => state.setEffects)
  const setWeatherMode = useWeatherStore((state) => state.setWeatherMode)
  const [open, setOpen] = useState(false)
  const [locating, setLocating] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const i = language === 'vi' ? 0 : 1

  useEffect(() => {
    if (!open) return
    const onDown = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && setOpen(false)
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const pickPhase = (next: PhaseMode) => {
    if (next === phaseMode) return
    setOpen(false)
    requestPhase(next)
  }
  const pickWeather = (next: WeatherMode) => setWeatherMode(next)

  const dark = tone === 'dark'
  const temp = sky.tempC === null ? '–' : `${sky.tempC}°C`
  const weatherText = sky.known ? WEATHER_LABEL[sky.weather][i] : tr('Chưa rõ thời tiết', 'Weather unknown')
  const phaseOptions: { value: PhaseMode; label: string; node: React.ReactNode }[] = [
    { value: 'auto', label: tr('Tự động', 'Auto'), node: <Wand2 size={15} aria-hidden="true" /> },
    { value: 'day', label: tr('Ngày', 'Day'), node: <SkyIcon phase="day" weather="clear" size={22} /> },
    { value: 'night', label: tr('Đêm', 'Night'), node: <SkyIcon phase="night" weather="clear" size={22} /> },
  ]

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label={tr('Bầu trời: ', 'Sky: ') + `${PHASE_LABEL[sky.phase][i]}, ${weatherText}, ${temp}`}
        className={`group inline-flex items-center gap-2 rounded-full border py-1 pl-1.5 pr-3 text-left transition-colors ${dark ? 'border-paper/20 text-paper hover:border-sun' : 'border-forest/20 text-ink hover:border-terracotta'}`}
      >
        <span className={`relative grid size-8 place-items-center overflow-hidden rounded-full ${dark ? 'bg-paper/10' : 'bg-forest/6'}`}>
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span key={sky.key} initial={{ y: sky.night ? 10 : -10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: sky.night ? -10 : 10, opacity: 0 }} transition={{ type: 'spring', stiffness: 260, damping: 30 }} className="block">
              <SkyIcon phase={sky.phase} weather={sky.weather} size={24} />
            </motion.span>
          </AnimatePresence>
        </span>
        <span className="leading-tight">
          <span className="tabular block text-[0.8rem] font-bold">{temp}</span>
          <span className={`${compact ? 'hidden' : 'block'} text-[0.64rem] ${dark ? 'text-paper/60' : 'text-ink/55'}`}>
            {PHASE_LABEL[sky.phase][i]} · {weatherText}
          </span>
        </span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: direction === 'down' ? -8 : 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: direction === 'down' ? -6 : 6, scale: 0.97 }}
            transition={{ duration: 0.18 }}
            className={`sky-pop absolute z-[60] w-[17.5rem] border border-forest/25 bg-paper p-3 text-ink shadow-[0_24px_50px_-20px_rgba(13,40,34,0.6)] ${align === 'right' ? 'right-0' : 'left-0'} ${direction === 'down' ? 'top-full mt-2' : 'bottom-full mb-2'}`}
            role="dialog"
            aria-label={tr('Chọn bầu trời', 'Choose the sky')}
          >
            <p className="pb-1.5 text-[0.7rem] font-semibold text-ink/55">{tr('Thời gian trong ngày', 'Time of day')}</p>
            <div role="radiogroup" aria-label={tr('Thời gian trong ngày', 'Time of day')} className="grid grid-cols-3 gap-1">
              {phaseOptions.map((option) => {
                const active = phaseMode === option.value
                return (
                  <button key={option.value} type="button" role="radio" aria-checked={active} onClick={() => pickPhase(option.value)} className={`flex flex-col items-center gap-0.5 border px-1 py-2 text-[0.68rem] font-semibold transition-colors ${active ? 'border-terracotta bg-terracotta/12 text-terracotta' : 'border-forest/15 text-ink/70 hover:border-forest/40'}`}>
                    <span className="grid h-6 place-items-center">{option.node}</span>
                    {option.label}
                  </button>
                )
              })}
            </div>

            <p className="pb-1.5 pt-3 text-[0.7rem] font-semibold text-ink/55">{tr('Thời tiết', 'Weather')}</p>
            <div role="radiogroup" aria-label={tr('Thời tiết', 'Weather')} className="grid grid-cols-5 gap-1">
              <button type="button" role="radio" aria-checked={weatherMode === 'auto'} onClick={() => pickWeather('auto')} className={`flex flex-col items-center gap-0.5 border px-0.5 py-2 text-[0.62rem] font-semibold transition-colors ${weatherMode === 'auto' ? 'border-terracotta bg-terracotta/12 text-terracotta' : 'border-forest/15 text-ink/70 hover:border-forest/40'}`}>
                <span className="grid h-6 place-items-center">
                  <Wand2 size={15} aria-hidden="true" />
                </span>
                {tr('Tự động', 'Auto')}
              </button>
              {WEATHERS.map((weather) => {
                const active = weatherMode === weather
                return (
                  <button key={weather} type="button" role="radio" aria-checked={active} onClick={() => pickWeather(weather)} className={`flex flex-col items-center gap-0.5 border px-0.5 py-2 text-[0.62rem] font-semibold transition-colors ${active ? 'border-terracotta bg-terracotta/12 text-terracotta' : 'border-forest/15 text-ink/70 hover:border-forest/40'}`}>
                    <SkyIcon phase={sky.phase} weather={weather} size={24} />
                    {WEATHER_LABEL[weather][i]}
                  </button>
                )
              })}
            </div>
            <button type="button" role="switch" aria-checked={effects} onClick={() => setEffects(!effects)} className="mt-3 flex w-full items-center justify-between gap-3 border border-forest/15 px-2.5 py-2 text-left text-[0.72rem] font-semibold text-ink/75 transition-colors hover:border-forest/40">
              <span>
                {tr('Hạt mưa, chớp, đom đóm chuyển động', 'Moving rain, lightning and fireflies')}
                <span className="block text-[0.64rem] font-normal text-ink/50">{tr('Tắt nếu thấy rối mắt', 'Turn off if it distracts you')}</span>
              </span>
              <span className={`relative h-4 w-7 shrink-0 rounded-full transition-colors ${effects ? 'bg-terracotta' : 'bg-ink/25'}`}>
                <span className={`absolute top-0.5 size-3 rounded-full bg-white transition-all ${effects ? 'left-[0.875rem]' : 'left-0.5'}`} />
              </span>
            </button>
            {!sky.known && sky.autoWeather && (
              <button
                type="button"
                disabled={locating}
                onClick={() => {
                  setLocating(true)
                  void readHereWeather().finally(() => setLocating(false))
                }}
                className="mt-3 flex w-full items-center justify-center gap-2 border border-terracotta/50 px-2.5 py-2 text-[0.72rem] font-semibold text-terracotta transition-colors hover:bg-terracotta/10 disabled:opacity-60"
              >
                <LocateFixed size={14} aria-hidden="true" />
                {locating ? tr('Đang lấy vị trí…', 'Finding you…') : tr('Dùng vị trí hiện tại', 'Use my current location')}
              </button>
            )}
            <p className="pt-2.5 text-[0.68rem] leading-snug text-ink/50">
              {sky.known || !sky.autoWeather
                ? tr('Thời tiết tại vị trí của bạn. ', 'Weather where you are. ')
                : tr('Chưa có thời tiết nơi bạn đang ở: hãy cho phép trình duyệt truy cập vị trí. ', 'No weather for where you are yet: allow location access in the browser. ')}
              {tr('Tự động: sau 18:30 là ban đêm, thời tiết theo dữ liệu thật của ', 'Auto: night after 18:30, live weather from ')}
              <a href="https://open-meteo.com/" target="_blank" rel="noreferrer" className="underline">
                Open-Meteo
              </a>
              .
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
