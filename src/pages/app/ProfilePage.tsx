import { useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router'
import { AnimatePresence, motion, type Variants } from 'motion/react'
import { Bell, Heart, Save, X } from 'lucide-react'
import { readProfile, type Profile } from '../../api/profile'
import { useProfile, useSaveProfile } from '../../api/queries'
import { CategoryIcon } from '../../components/icons'
import { PageHeader } from '../../components/PageHeader'
import { EASE_OUT, popItem, slideItem } from '../../components/motion/variants'
import { PoiSheet } from '../../components/place/PoiSheet'
import { CategoryGlyph, Segmented, Switch } from '../../components/ui/primitives'
import { categories, categoryIds, dietaryTags } from '../../domain/categories'
import { extractIntent } from '../../domain/nlp'
import { poiById } from '../../domain/pois'
import type { CategoryId } from '../../domain/types'
import { useTr } from '../../hooks/useTr'
import { useAuthStore } from '../../store/authStore'
import { toast } from '../../store/toastStore'
import { useUiStore } from '../../store/uiStore'

const PICKED = 0.7

const pickedFrom = (interests: Profile['interests']) => categoryIds.filter((cat) => (interests[cat] ?? 0) >= PICKED)

/** Child delays that stop growing after the eighth child, so long lists never keep anyone waiting. */
const cascade = (gap: number, start: number) => (i: number) => start + Math.min(i, 8) * gap

const page: Variants = { hidden: {}, show: { transition: { delayChildren: cascade(0.08, 0.08) } } }
const panel: Variants = {
  hidden: { opacity: 0, y: 28, scale: 0.97 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.6, ease: EASE_OUT, delayChildren: cascade(0.045, 0.16) } },
}
const tagIn: Variants = {
  hidden: { opacity: 0, y: 8, scale: 0.85 },
  show: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 420, damping: 26 } },
}
const tagExit = { opacity: 0, scale: 0.7, transition: { duration: 0.15 } }

/** `.chip` also transitions transform in CSS, which would trail behind motion's per-frame updates. */
const CHIP_COLORS = { transition: 'background-color 260ms ease, color 260ms ease, border-color 260ms ease' }

export function ProfilePage() {
  const { tr, place, language } = useTr()
  const vi = language === 'vi'
  const user = useAuthStore((state) => state.user)!
  const query = useProfile()
  const save = useSaveProfile()
  const openPoi = useUiStore((state) => state.openPoi)

  const stored = query.data ?? readProfile(user.id, user.name)
  const [draft, setDraft] = useState<Profile>(stored)
  const [synced, setSynced] = useState(!!query.data)

  // Adopt the server copy once it arrives, without clobbering edits made while loading.
  if (query.data && !synced) {
    setDraft(query.data)
    setSynced(true)
  }

  const about = draft.about ?? ''
  // What Journie understood from the free text, shown live so nothing is a surprise after saving.
  const heard = useMemo(() => extractIntent(about), [about])
  const picked = pickedFrom(draft.interests)
  const effective = useMemo(() => [...new Set([...picked, ...(Object.keys(heard.interests) as CategoryId[])])], [picked, heard.interests])
  const avoided = useMemo(() => [...new Set([...draft.dietary, ...heard.avoidTags])], [draft.dietary, heard.avoidTags])

  const [avoidText, setAvoidText] = useState('')
  const dirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(stored), [draft, stored])
  const patch = (next: Partial<Profile>) => setDraft((current) => ({ ...current, ...next }))

  /** Foods typed by hand: split on commas, drop blanks and repeats. */
  const addAvoid = (raw: string) => {
    const words = raw.split(/[,;\n]/).map((word) => word.trim().slice(0, 40)).filter(Boolean)
    if (words.length === 0) return
    const have = new Set(draft.dietary.map((word) => word.toLowerCase()))
    const fresh = words.filter((word) => !have.has(word.toLowerCase()) && have.add(word.toLowerCase()))
    if (fresh.length) patch({ dietary: [...draft.dietary, ...fresh].slice(0, 20) })
    setAvoidText('')
  }

  const toggleCat = (cat: CategoryId) => {
    const next = { ...draft.interests }
    if ((next[cat] ?? 0) >= PICKED) delete next[cat]
    else next[cat] = 0.9
    patch({ interests: next })
  }

  const alertsOn = Object.values(draft.alerts).every(Boolean)

  const submit = () => {
    // Words typed in "about" become real weights and avoid-tags, so Journie's plans follow them.
    const interests = { ...draft.interests }
    for (const cat of Object.keys(heard.interests) as CategoryId[]) interests[cat] = Math.max(interests[cat] ?? 0, 0.9)
    const dietary = [...new Set([...draft.dietary, ...heard.avoidTags])]
    save.mutate(
      { ...draft, about: about.trim(), interests, dietary },
      {
        onSuccess: (_data, saved) => {
          setDraft(saved)
          toast('success', tr('Đã lưu hồ sơ', 'Profile saved'))
        },
      },
    )
  }

  return (
    <>
      <PageHeader title={tr('Hồ sơ của bạn', 'Your profile')} />

      <motion.div variants={page} initial="hidden" animate="show" className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_19rem]">
        <div className="space-y-6">
          <motion.section variants={panel} className="panel p-5 sm:p-6" aria-labelledby="taste">
            <h2 id="taste" className="h-display text-xl text-forest">
              {tr('Bạn thích đi kiểu nào?', 'What kind of traveler are you?')}
            </h2>
            <p className="mt-1 text-sm text-ink/60">{tr('Chọn mấy thứ bạn mê.', 'Pick the things you love.')}</p>
            <ul className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              {categoryIds.map((cat) => {
                const on = (draft.interests[cat] ?? 0) >= PICKED
                return (
                  <li key={cat}>
                    <motion.button
                      type="button"
                      aria-pressed={on}
                      onClick={() => toggleCat(cat)}
                      variants={popItem}
                      whileTap={{ scale: 0.94 }}
                      whileHover={{ y: -4, rotate: on ? 0 : -1.5 }}
                      transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                      className={`relative flex w-full flex-col items-center gap-1.5 border px-2 py-3.5 text-[0.8rem] font-semibold transition-colors ${on ? 'border-forest bg-white/70 text-paper' : 'border-forest/20 bg-white/70 text-ink/75 hover:border-terracotta'}`}
                    >
                      <AnimatePresence initial={false}>
                        {on && <motion.span key="fill" className="absolute -inset-px bg-forest" initial={{ opacity: 0, scale: 0.3 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.7, transition: { duration: 0.16 } }} transition={{ duration: 0.38, ease: EASE_OUT }} aria-hidden="true" />}
                      </AnimatePresence>
                      <motion.span animate={{ scale: on ? [1, 1.28, 1] : 1, rotate: on ? [0, -10, 0] : 0 }} transition={{ duration: 0.45 }} className="relative block">
                        <CategoryIcon cat={cat} size={38} />
                      </motion.span>
                      <span className="relative">{tr(categories[cat].vi, categories[cat].en)}</span>
                      {on && (
                        <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 500, damping: 18, delay: 0.12 }} className="absolute right-1.5 top-1.5 size-2 rounded-full bg-sun" aria-hidden="true" />
                      )}
                    </motion.button>
                  </li>
                )
              })}
            </ul>

            <label htmlFor="p-about" className="mt-6 block text-[0.8rem] font-semibold text-ink/75">
              {tr('Hoặc tự viết vài dòng', 'Or write a few lines')}
            </label>
            <textarea
              id="p-about"
              rows={3}
              maxLength={280}
              value={about}
              onChange={(event) => patch({ about: event.target.value })}
              placeholder={tr('Mình thích ăn vặt, ghét chen chúc…', 'I love street food and hate crowds…')}
              className="mt-1.5 w-full resize-none border border-forest/25 bg-white px-3 py-2.5 text-sm leading-relaxed outline-none transition-colors placeholder:text-ink/35 focus:border-terracotta"
            />

            <div className="relative mt-4 flex min-h-8 flex-wrap items-center gap-2" aria-live="polite">
              <span className="text-xs font-semibold text-ink/55">{tr('Ghi nhận:', 'Noted:')}</span>
              <AnimatePresence mode="popLayout" initial={false}>
                {effective.map((cat) => (
                  <motion.span key={cat} layout variants={tagIn} initial="hidden" animate="show" exit={tagExit} className="inline-flex items-center gap-1.5 border border-forest/20 bg-white py-0.5 pl-1 pr-2.5 text-xs font-semibold text-forest">
                    <CategoryIcon cat={cat} size={20} />
                    {tr(categories[cat].vi, categories[cat].en)}
                  </motion.span>
                ))}
                {avoided.map((tag) => {
                  const info = dietaryTags.find((item) => item.id === tag)
                  return (
                    <motion.span key={tag} layout variants={tagIn} initial="hidden" animate="show" exit={tagExit} className="inline-flex items-center gap-1 border border-pomegranate/40 bg-pomegranate/8 px-2.5 py-1 text-xs font-semibold text-pomegranate">
                      {tr('Tránh', 'Avoid')} {info ? (vi ? info.vi : info.en) : tag}
                    </motion.span>
                  )
                })}
              </AnimatePresence>
              {effective.length === 0 && avoided.length === 0 && <span className="text-xs text-ink/45">{tr('chưa có gì', 'nothing yet')}</span>}
            </div>
          </motion.section>

          <motion.section variants={panel} className="panel p-5 sm:p-6" aria-labelledby="style">
            <h2 id="style" className="h-display text-xl text-forest">
              {tr('Nhịp đi', 'Your pace')}
            </h2>
            <div className="mt-4 max-w-md">
              <Segmented label={tr('Nhịp độ chuyến đi', 'Trip pace')} value={draft.pace} onChange={(pace) => patch({ pace })} options={[{ value: 'slow', label: tr('Thong thả', 'Slow') }, { value: 'balanced', label: tr('Vừa phải', 'Balanced') }, { value: 'fast', label: tr('Nhiều điểm', 'Packed') }]} />
            </div>
            <div className="mt-6">
              <label htmlFor="p-avoid" className="mb-1.5 block text-[0.8rem] font-semibold text-ink/75">
                {tr('Món bạn không ăn được', 'Foods you cannot eat')}
              </label>
              <input
                id="p-avoid"
                value={avoidText}
                maxLength={60}
                onChange={(event) => setAvoidText(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ',') {
                    event.preventDefault()
                    addAvoid(avoidText)
                  }
                }}
                onBlur={() => addAvoid(avoidText)}
                placeholder={tr('Gõ rồi bấm Enter: hải sản, đậu phộng…', 'Type, then press Enter: seafood, peanuts…')}
                className="h-11 w-full max-w-md border border-forest/25 bg-white px-3 text-sm outline-none transition-colors placeholder:text-ink/35 focus:border-terracotta"
              />
              {draft.dietary.length > 0 && (
                <ul className="relative mt-2.5 flex flex-wrap gap-2">
                  <AnimatePresence mode="popLayout">
                    {draft.dietary.map((word) => {
                      const known = dietaryTags.find((item) => item.id === word)
                      const label = known ? (vi ? known.vi : known.en) : word
                      return (
                        <motion.li key={word} layout variants={tagIn} initial="hidden" animate="show" exit={tagExit} style={CHIP_COLORS} className="chip !border-pomegranate/50 !text-pomegranate">
                          {label}
                          <motion.button type="button" whileTap={{ scale: 0.8 }} className="-mr-1 ml-1 grid size-5 place-items-center rounded-full hover:bg-pomegranate/10" aria-label={tr(`Bỏ ${label}`, `Remove ${label}`)} onClick={() => patch({ dietary: draft.dietary.filter((item) => item !== word) })}>
                            <X size={12} aria-hidden="true" />
                          </motion.button>
                        </motion.li>
                      )
                    })}
                  </AnimatePresence>
                </ul>
              )}
            </div>
          </motion.section>
        </div>

        <aside className="space-y-6 lg:sticky lg:top-[5.5rem]">
          <motion.section variants={panel} className="panel p-5">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-start gap-2.5">
                <Bell size={18} className="mt-0.5 shrink-0 text-terracotta" aria-hidden="true" />
                <div>
                  <p className="text-sm font-semibold text-ink">{tr('Báo khi cần đổi kế hoạch', 'Tell me when plans must change')}</p>
                  <p className="text-xs leading-snug text-ink/55">{tr('Mưa lớn, kẹt xe, điểm đóng cửa hay trễ giờ.', 'Heavy rain, traffic, closures or running late.')}</p>
                </div>
              </div>
              <motion.div whileTap={{ scale: 0.9 }} transition={{ type: 'spring', stiffness: 500, damping: 20 }} className="flex shrink-0">
                <Switch checked={alertsOn} onChange={(value) => patch({ alerts: { traffic: value, weather: value, closure: value, delay: value } })} label={tr('Báo khi cần đổi kế hoạch', 'Tell me when plans must change')} />
              </motion.div>
            </div>
          </motion.section>

          <motion.section variants={panel} className="panel space-y-3 p-5" aria-label={tr('Cảnh báo và tự điều chỉnh', 'Alerts and automatic changes')}>
            {(
              [
                ['traffic', tr('Kẹt xe', 'Traffic')],
                ['weather', tr('Thời tiết xấu', 'Bad weather')],
                ['closure', tr('Điểm đóng cửa', 'Closures')],
                ['delay', tr('Trễ lịch', 'Running late')],
              ] as const
            ).map(([kind, label]) => (
              <div key={kind} className="flex items-center justify-between gap-4 text-sm">
                <span className="text-ink/75">{label}</span>
                <Switch checked={draft.alerts[kind]} onChange={(value) => patch({ alerts: { ...draft.alerts, [kind]: value } })} label={tr(`Báo khi ${label.toLowerCase()}`, `Alert me about ${label.toLowerCase()}`)} />
              </div>
            ))}
            <div className="flex items-center justify-between gap-4 border-t border-forest/10 pt-3">
              <div>
                <p className="text-sm font-semibold text-ink">{tr('Tự chỉnh thay đổi nhỏ', 'Adjust small changes on my own')}</p>
                <p className="text-xs leading-snug text-ink/55">{tr('Trễ hay kẹt xe dưới 15 phút thì Journie tự dời lịch và báo bạn, có nút hoàn tác.', 'A delay or traffic under 15 minutes is absorbed for you, with a note and an Undo.')}</p>
              </div>
              <Switch checked={draft.autoAdjust !== false} onChange={(value) => patch({ autoAdjust: value })} label={tr('Tự chỉnh thay đổi nhỏ', 'Adjust small changes on my own')} />
            </div>
          </motion.section>

          <motion.section variants={panel} className="panel p-5" aria-labelledby="saved">
            <h2 id="saved" className="h-display flex items-center gap-2 text-lg text-forest">
              <Heart size={17} className="text-terracotta" aria-hidden="true" /> {tr('Nơi bạn đã lưu', 'Saved places')}
              <Link to="/app/sets" className="ml-auto font-sans text-xs font-semibold text-lapis hover:underline">
                {tr('Bộ sưu tập', 'My sets')}
              </Link>
            </h2>
            {draft.saved.length === 0 ? (
              <p className="mt-2 text-sm text-ink/55">{tr('Thả tim ở Khám phá là lưu lại được.', 'Tap the heart in Discover to save a place.')}</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {draft.saved.map((id) => {
                  const poi = poiById[id]
                  if (!poi) return null
                  return (
                    <motion.li key={id} variants={slideItem}>
                      <motion.button type="button" onClick={() => openPoi(id)} whileHover={{ x: 4 }} whileTap={{ scale: 0.98 }} transition={{ type: 'spring', stiffness: 420, damping: 30 }} className="flex w-full items-center gap-3 border border-forest/12 bg-white/70 p-2 text-left transition-colors hover:border-terracotta">
                        <CategoryGlyph cat={poi.cat} size={34} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold">{place.name(poi.name)}</span>
                          <span className="block truncate text-xs text-ink/50">{place.area(poi.area)}</span>
                        </span>
                      </motion.button>
                    </motion.li>
                  )
                })}
              </ul>
            )}
          </motion.section>
        </aside>
      </motion.div>

      {/* In the body so the route transition's transform never becomes the bar's containing block. */}
      {createPortal(
        <motion.div
          initial={false}
          animate={{ y: dirty ? 0 : 120, opacity: dirty ? 1 : 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="pointer-events-none fixed inset-x-0 bottom-20 z-30 flex justify-center px-4 lg:bottom-6 lg:pl-[17.5rem]"
          aria-hidden={!dirty}
        >
          <div className="pointer-events-auto flex items-center gap-3 border border-sun/40 bg-night px-4 py-3 text-paper shadow-[0_24px_50px_-18px_rgba(13,40,34,0.9)]">
            <span className="text-sm font-medium">{tr('Bạn chưa lưu thay đổi', 'You have unsaved changes')}</span>
            <button type="button" className="btn-ghost btn-sm !border-paper/25 !text-paper" tabIndex={dirty ? 0 : -1} onClick={() => setDraft(stored)}>
              {tr('Hoàn lại', 'Revert')}
            </button>
            <button type="button" className="btn-gold btn-sm" tabIndex={dirty ? 0 : -1} onClick={submit} disabled={save.isPending}>
              <Save size={15} aria-hidden="true" /> {tr('Lưu', 'Save')}
            </button>
          </div>
        </motion.div>,
        document.body,
      )}
      <PoiSheet />
    </>
  )
}
