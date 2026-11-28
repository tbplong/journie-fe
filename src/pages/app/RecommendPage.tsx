import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { useMutation } from '@tanstack/react-query'
import { motion } from 'motion/react'
import { FolderPlus, Loader2, Sparkles, Wand2 } from 'lucide-react'
import { inCity } from '../../api/catalog'
import { apiErrorText } from '../../api/errorText'
import { analyzeRequest } from '../../api/planner'
import { useCatalog } from '../../api/queries'
import { ModuleGate } from '../../components/ModuleGate'
import { EASE_OUT } from '../../components/motion/variants'
import { PageHeader } from '../../components/PageHeader'
import { PoiSheet } from '../../components/place/PoiSheet'
import { RetrievalResults } from '../../components/recommend/RetrievalResults'
import { forRecommendation } from '../../domain/intentFromExtraction'
import type { Intent } from '../../domain/nlp'
import { cities } from '../../domain/pois'
import type { CityId } from '../../domain/types'
import { useTr } from '../../hooks/useTr'
import { useCityStore } from '../../store/cityStore'
import { toast } from '../../store/toastStore'
import { useUiStore } from '../../store/uiStore'

const EXAMPLES: [string, string][] = [
  ['Cà phê yên tĩnh để làm việc', 'Quiet cafés to work from'],
  ['Bảo tàng và di tích lịch sử', 'Museums and historic sites'],
  ['Ăn vặt đường phố, không hải sản', 'Street snacks, no seafood'],
]

/** UC 1.1 "Service recommendation": ask in your own words, get a list of places (not a plan), then save them as a set or plan with them. */
export function RecommendPage() {
  return (
    <ModuleGate id="recommend">
      <Recommend />
    </ModuleGate>
  )
}

function Recommend() {
  const { tr, language } = useTr()
  const navigate = useNavigate()
  const city = useCityStore((state) => state.city)
  const setCity = useCityStore((state) => state.setCity)
  const openSetChooser = useUiStore((state) => state.openSetChooser)
  const cityEmpty = useCatalog(city).data === 0
  const [text, setText] = useState('')
  const [intent, setIntent] = useState<{ intent: Intent; city: CityId; text: string } | null>(null)
  const [selected, setSelected] = useState<string[]>([])

  const analyze = useMutation({
    mutationFn: () => analyzeRequest(text, undefined, {}, city),
    onSuccess: (result) => {
      setSelected([])
      setIntent({ intent: result, city: result.city ?? city, text })
    },
    onError: (error) => toast('danger', tr('Mình chưa đọc được câu này', 'I could not read that'), tr(...apiErrorText(error))),
  })

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (text.trim().length >= 3 && !cityEmpty) analyze.mutate()
  }

  const extraction = intent?.intent.extraction ? inCity(forRecommendation(intent.intent.extraction, intent.text), intent.city) : null

  return (
    <>
      <PageHeader title={tr('Gợi ý địa điểm', 'Place recommendations')} subtitle={tr('Nói bạn muốn gì, Journie gợi ý những nơi hợp nhất. Lưu lại thành bộ sưu tập hoặc lên lịch trình luôn.', 'Say what you are after and Journie suggests the places that fit. Save them as a set or plan a trip with them.')} />
      <motion.form onSubmit={submit} initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: EASE_OUT }} className="panel-night p-5 sm:p-6">
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={tr('Thành phố', 'City')}>
          {cities.map((entry) => (
            <button key={entry.id} type="button" role="radio" aria-checked={city === entry.id} onClick={() => setCity(entry.id)} className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${city === entry.id ? 'border-gold bg-gold text-night' : 'border-paper/25 text-paper/75 hover:border-gold'}`}>
              {language === 'vi' ? entry.name : entry.nameEn}
            </button>
          ))}
        </div>
        <label htmlFor="recommend-text" className="h-display mt-4 block text-xl text-paper">
          {tr('Bạn đang tìm gì?', 'What are you looking for?')}
        </label>
        <textarea id="recommend-text" rows={2} maxLength={300} value={text} onChange={(event) => setText(event.target.value)} placeholder={tr('Ví dụ: quán chay ngon gần chợ Bến Thành', 'e.g. good vegetarian food near Ben Thanh Market')} className="mt-3 w-full resize-none rounded-xl border border-gold/30 bg-night/50 px-4 py-3 text-paper caret-gold outline-none placeholder:text-paper/55 focus:border-gold" />
        <div className="mt-2 flex flex-wrap gap-1.5">
          {EXAMPLES.map(([vi, en]) => (
            <button key={vi} type="button" onClick={() => setText(tr(vi, en))} className="rounded-full border border-paper/20 px-2.5 py-1 text-[0.72rem] text-paper/75 hover:border-gold hover:text-gold">
              {tr(vi, en)}
            </button>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          {cityEmpty ? <p className="text-xs font-semibold text-sun">{tr('Thành phố này chưa có dữ liệu.', 'No places in this city yet.')}</p> : <span />}
          <button type="submit" className="btn-gold" disabled={analyze.isPending || text.trim().length < 3 || cityEmpty}>
            {analyze.isPending ? <Loader2 size={17} className="animate-spin" aria-hidden="true" /> : <Wand2 size={17} aria-hidden="true" />}
            {analyze.isPending ? tr('Đang đọc…', 'Reading…') : tr('Gợi ý cho tôi', 'Recommend')}
          </button>
        </div>
      </motion.form>

      {extraction && (
        <section className="mt-8" aria-label={tr('Kết quả gợi ý', 'Recommendations')}>
          <RetrievalResults
            extraction={extraction}
            selected={selected}
            onSelectedChange={setSelected}
            actions={(picked, all) => (
              <>
                <button type="button" className="btn-ghost btn-sm" disabled={!all.length} onClick={() => openSetChooser(picked.length ? picked : all)}>
                  <FolderPlus size={15} aria-hidden="true" /> {picked.length ? tr('Lưu nơi đã chọn', 'Save picked') : tr('Lưu cả danh sách', 'Save the whole list')}
                </button>
                <button type="button" className="btn-gold btn-sm" disabled={!picked.length} onClick={() => navigate('/app/plan', { state: { poiIds: picked, wish: text.trim() } })}>
                  <Sparkles size={15} aria-hidden="true" /> {tr('Lên lịch với nơi đã chọn', 'Plan with picked places')}
                </button>
              </>
            )}
          />
        </section>
      )}
      <PoiSheet />
    </>
  )
}
