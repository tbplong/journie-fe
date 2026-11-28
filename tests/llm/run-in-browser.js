// Dán vào Console của trình duyệt khi `npm run dev` đang chạy (mở bất kỳ trang nào của app) và BE đang chạy.
// Với từng ca trong tests/llm/prompts.json, chạy đúng luồng của màn hình "Lên một chuyến đi":
//   phần chọn sẵn (ngày đi, số ngày, ngân sách) + phần kể thêm  →  analyzeRequest (POST /chat, Gemini thật, bỏ qua khi không kể thêm)
//   →  generateItinerary (POST /retrieval của BE rồi lập lịch)  →  với ca chỉnh sửa: adjustItinerary (POST /chat, POST /retrieval).
// Mỗi bước gọi BE thật; số lần gọi /chat và /retrieval được đếm từ request thật. Gemini gói miễn phí giới hạn số lần gọi mỗi phút,
// nên giữa hai lần gọi /chat có nghỉ, và gặp giới hạn hoặc lỗi tạm thời của Gemini (503) thì chờ rồi thử lại.
// Chạy xong: bảng trong console và window.__journie (kết quả), tiến độ ở window.__journieProgress.
;(async () => {
  window.__journie = undefined
  window.__journieProgress = 'đang nạp'
  const { cases: all } = await fetch('/tests/llm/prompts.json').then((r) => r.json())
  // Chạy lại vài ca: đặt window.__journieOnly = ['3.4', '9.4'] trước khi dán
  const cases = window.__journieOnly ? all.filter((c) => window.__journieOnly.includes(c.id)) : all
  const { analyzeRequest, generateItinerary, adjustItinerary } = await import('/src/api/planner.ts')
  const { readProfile } = await import('/src/api/profile.ts')
  const { pois, poiById } = await import('/src/domain/pois.ts')
  const { loadCatalog } = await import('/src/api/catalog.ts')
  const { tripCost } = await import('/src/domain/solver.ts')
  if (pois.length === 0) await loadCatalog()
  const profile = readProfile('u-traveler', 'Lữ Khách')

  const fold = (t) => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd')
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
  const check = (name, ok, got) => ({ name, ok, got })
  const has = (list, wanted) => wanted.every((w) => list.includes(w))
  const nameHas = (names, wanted) => wanted.every((w) => names.some((n) => fold(n).includes(fold(w))))
  const nameNone = (names, wanted) => !wanted.some((w) => names.some((n) => fold(n).includes(fold(w))))

  // Đếm request thật gửi tới BE
  const counts = { chat: 0, retrieval: 0 }
  const realFetch = window.fetch
  window.fetch = (input, init) => {
    const url = String(typeof input === 'string' ? input : input.url)
    if (url.includes('/chat')) counts.chat += 1
    if (url.includes('/retrieval')) counts.retrieval += 1
    return realFetch(input, init)
  }
  let lastChat = 0
  const PACE_MS = 4500
  async function live(step) {
    for (let attempt = 0; ; attempt += 1) {
      const wait = lastChat + PACE_MS - Date.now()
      if (wait > 0) await sleep(wait)
      lastChat = Date.now()
      try {
        return await step()
      } catch (error) {
        if (attempt < 4 && ['llm-rate-limited', 'llm-upstream-error', 'timeout'].includes(error.code)) await sleep(((error.retryAfter ?? 20) + 2) * 1000)
        else throw error
      }
    }
  }

  const stopsOf = (trip) => trip.days.flatMap((d, i) => d.stops.map((s) => ({ day: i + 1, id: s.poiId, name: poiById[s.poiId].name, cat: poiById[s.poiId].cat, start: s.start, end: s.end })))
  const planFor = (report) => ({
    days: report.trip.days.length,
    stops: stopsOf(report.trip),
    cost: tripCost(report.trip.days),
    budget: report.trip.budget,
    considered: report.considered,
    excluded: report.excluded,
    notFound: report.notFound,
    warnings: report.warnings,
  })

  function evaluate(expect, ctx) {
    const { intent, plan, trip, params, calls } = ctx
    const out = []
    const names = plan ? plan.stops.map((s) => s.name) : []
    const cats = plan ? plan.stops.map((s) => s.cat) : []
    const interests = Object.keys(intent.interests)
    if ('llmCalls' in expect) out.push(check('llmCalls', calls.chat === expect.llmCalls, calls.chat))
    if ('city' in expect) out.push(check('city', (intent.city ?? null) === expect.city, intent.city ?? null))
    if ('unsupported' in expect) out.push(check('unsupported', Boolean(intent.unsupportedDestination) === expect.unsupported, intent.unsupportedDestination ?? null))
    if ('planBlocked' in expect) out.push(check('planBlocked', !plan === expect.planBlocked, plan ? 'đã lập lịch' : 'không lập'))
    if ('days' in expect) out.push(check('days', (plan ? plan.days : intent.days) === expect.days, plan ? plan.days : intent.days))
    if ('budget' in expect) out.push(check('budget', intent.budget === expect.budget, intent.budget ?? null))
    if ('startDate' in expect) out.push(check('startDate', intent.startDate === expect.startDate, intent.startDate ?? null))
    if (expect.interestsHas) out.push(check('interestsHas', has(interests, expect.interestsHas), interests))
    if (expect.interestsNot) out.push(check('interestsNot', !expect.interestsNot.some((c) => interests.includes(c)), interests))
    if (expect.avoidTagsHas) out.push(check('avoidTagsHas', has(intent.avoidTags, expect.avoidTagsHas), intent.avoidTags))
    if (expect.chipsInclude) out.push(check('chipsInclude', expect.chipsInclude.every((s) => intent.chips.some((c) => c.vi.includes(s))), intent.chips.map((c) => c.vi)))
    if (expect.noExtraChips) {
      const extra = intent.chips.filter((c) => !['city', 'days', 'budget'].includes(c.field))
      out.push(check('noExtraChips', extra.length === 0, extra.map((c) => c.vi)))
    }
    if (expect.conflictsHas) out.push(check('conflictsHas', has(intent.conflicts ?? [], expect.conflictsHas), intent.conflicts ?? []))
    if ('needsClarification' in expect) out.push(check('needsClarification', Boolean(intent.needsClarification) === expect.needsClarification, Boolean(intent.needsClarification)))
    if ('dayStart' in expect) out.push(check('dayStart', intent.dayStart === expect.dayStart, intent.dayStart ?? null))
    if ('dayEnd' in expect) out.push(check('dayEnd', intent.dayEnd === expect.dayEnd, intent.dayEnd ?? null))
    if (expect.paceIs) out.push(check('paceIs', params.pace === expect.paceIs, params.pace))
    if (expect.transportIs) out.push(check('transportIs', params.transport === expect.transportIs, params.transport))
    if (expect.planExists) out.push(check('planExists', Boolean(plan) && plan.stops.length > 0, plan ? plan.stops.length : 0))
    if ('stopsMin' in expect) out.push(check('stopsMin', Boolean(plan) && plan.stops.length >= expect.stopsMin, plan ? plan.stops.length : 0))
    if (expect.costWithinBudget) out.push(check('costWithinBudget', Boolean(plan) && plan.cost <= plan.budget, plan ? `${plan.cost} / ${plan.budget}` : null))
    if (expect.planHasCategory) out.push(check('planHasCategory', has(cats, expect.planHasCategory), cats))
    if (expect.planNoCategory) out.push(check('planNoCategory', !expect.planNoCategory.some((c) => cats.includes(c)), cats))
    if (expect.planHasName) out.push(check('planHasName', nameHas(names, expect.planHasName), names))
    if (expect.planNoName) out.push(check('planNoName', nameNone(names, expect.planNoName), names))
    if (expect.mustNames) out.push(check('mustNames', nameHas(names, expect.mustNames), names))
    if (expect.notFoundNames) out.push(check('notFoundNames', plan && expect.notFoundNames.every((n) => plan.notFound.some((x) => fold(x).includes(fold(n)))), plan ? plan.notFound : null))
    if ('stopsPerDayMin' in expect && plan) {
      const perDay = Array.from({ length: plan.days }, (_, i) => plan.stops.filter((s) => s.day === i + 1).length)
      out.push(check('stopsPerDayMin', Math.min(...perDay) >= expect.stopsPerDayMin, perDay))
    }
    if ('stopsPerDayMax' in expect && plan) {
      const perDay = [...new Set(plan.stops.map((s) => s.day))].map((d) => plan.stops.filter((s) => s.day === d).length)
      out.push(check('stopsPerDayMax', Math.max(...perDay) <= expect.stopsPerDayMax, perDay))
    }
    if (expect.stopsWithinHours && plan) out.push(check('stopsWithinHours', plan.stops.every((s) => s.start >= trip.dayStart && s.end <= trip.dayEnd), `${trip.dayStart}–${trip.dayEnd}`))
    return out
  }

  function evaluateEdit(expect, ctx) {
    const { before, after, next, error, calls } = ctx
    const out = []
    if ('llmCalls' in expect) out.push(check('llmCalls', calls.chat === expect.llmCalls, calls.chat))
    if (expect.budgetOrAsk) {
      // Gemini does not always read the same sentence the same way: Di must either apply the new budget or ask again, never keep the old one without a word
      const applied = !error && next.budget === expect.budgetOrAsk.budget
      const asked = error?.code === expect.budgetOrAsk.errorCode
      out.push(check('budgetOrAsk', applied || asked, error ? error.code : next.budget))
      if (applied && expect.costWithinBudget) out.push(check('costWithinBudget', tripCost(next.days) <= next.budget, `${tripCost(next.days)} / ${next.budget}`))
      return out
    }
    if (expect.errorCode) {
      out.push(check('errorCode', error?.code === expect.errorCode, error?.code ?? 'không lỗi'))
      return out
    }
    if (error) return [check('không lỗi', false, `${error.code}: ${error.message}`)]
    const afterNames = after.map((s) => s.name)
    const afterCats = after.map((s) => s.cat)
    if (expect.noName) out.push(check('noName', nameNone(afterNames, expect.noName), afterNames))
    if (expect.hasName) out.push(check('hasName', nameHas(afterNames, expect.hasName), afterNames))
    if (expect.noCategory) out.push(check('noCategory', !expect.noCategory.some((c) => afterCats.includes(c)), afterCats))
    if (expect.hasCategory) out.push(check('hasCategory', has(afterCats, expect.hasCategory), afterCats))
    if (expect.removedNameHas) {
      const removed = before.filter((s) => !after.some((a) => a.id === s.id)).map((s) => s.name)
      out.push(check('removedNameHas', nameHas(removed, expect.removedNameHas), removed))
    }
    if ('keptShareMin' in expect) {
      // Quán không bị câu sửa đụng tới (không thuộc loại bị bỏ) thì nên còn lại phần lớn
      const untouched = before.filter((s) => !(expect.noName ?? []).some((w) => fold(s.name).includes(fold(w))) && !(expect.noCategory ?? []).includes(s.cat))
      const kept = untouched.filter((s) => after.some((a) => a.id === s.id)).length
      const share = untouched.length ? kept / untouched.length : 1
      out.push(check('keptShareMin', share >= expect.keptShareMin, `${kept}/${untouched.length}`))
    }
    if ('tripBudget' in expect) out.push(check('tripBudget', next.budget === expect.tripBudget, next.budget))
    if (expect.tripTransport) out.push(check('tripTransport', next.transport === expect.tripTransport, next.transport))
    if (expect.costWithinBudget) out.push(check('costWithinBudget', tripCost(next.days) <= next.budget, `${tripCost(next.days)} / ${next.budget}`))
    return out
  }

  const results = []
  let index = 0
  for (const c of cases) {
    index += 1
    window.__journieProgress = `${index}/${cases.length} ${c.id}`
    const form = { startDate: c.form.startDate, days: c.form.days, budget: c.form.budget }
    const row = { id: c.id, level: c.level, title: c.title, form: c.form, text: c.text }
    const before = { ...counts }
    try {
      const intent = c.text.trim() ? await live(() => analyzeRequest(c.text, form)) : await analyzeRequest(c.text, form)
      const params = { city: intent.city ?? 'sai-gon', ...form, pace: intent.pace ?? profile.pace, transport: intent.transport ?? profile.transport }
      let report = null
      let trip = null
      let plan = null
      if (!intent.unsupportedDestination) {
        report = await generateItinerary({ text: [`Sài Gòn ${form.days} ngày`, c.text.trim()].filter(Boolean).join('. '), userId: 'u-test', lang: 'vi', profile, overrides: params }, intent)
        trip = report.trip
        plan = planFor(report)
      }
      const calls = { chat: counts.chat - before.chat, retrieval: counts.retrieval - before.retrieval }
      row.calls = calls
      row.review = {
        chips: intent.chips.map((x) => `${x.kind}:${x.vi}`), city: intent.city ?? null, unsupported: intent.unsupportedDestination ?? null, days: intent.days ?? null,
        budget: intent.budget ?? null, startDate: intent.startDate ?? null, dayStart: intent.dayStart ?? null, dayEnd: intent.dayEnd ?? null, pace: params.pace, transport: params.transport,
        interests: Object.keys(intent.interests), avoidTags: intent.avoidTags, conflicts: intent.conflicts ?? [], needsClarification: Boolean(intent.needsClarification),
        extraction: intent.extraction ? { interests: intent.extraction.interests, avoid: intent.extraction.avoid, must_visit: intent.extraction.must_visit, other: [...intent.extraction.hard_constraints, ...intent.extraction.soft_constraints].filter((a) => a.field === 'other').map((a) => `${a.operator}:${a.value}`) } : null,
      }
      row.plan = plan
      row.checks = evaluate(c.expect, { intent, plan, trip, params, calls })

      if (c.edit && trip) {
        const editBefore = { ...counts }
        const beforeStops = stopsOf(trip)
        let next = null
        let error = null
        try {
          next = await live(() => adjustItinerary(trip, c.edit.text, profile))
        } catch (e) {
          error = e
        }
        const editCalls = { chat: counts.chat - editBefore.chat, retrieval: counts.retrieval - editBefore.retrieval }
        const afterStops = next ? stopsOf(next) : []
        row.edit = { text: c.edit.text, calls: editCalls, before: beforeStops.map((s) => s.name), after: afterStops.map((s) => s.name), budget: next?.budget ?? null, transport: next?.transport ?? null, error: error ? `${error.code}: ${error.message}` : null }
        row.editChecks = evaluateEdit(c.edit.expect, { before: beforeStops, after: afterStops, next, error, calls: editCalls })
      }
      row.pass = [...row.checks, ...(row.editChecks ?? [])].every((x) => x.ok)
    } catch (error) {
      row.error = `${error.code ?? 'error'}: ${error.message}`
      row.pass = false
    }
    results.push(row)
  }
  window.fetch = realFetch
  window.__journie = results
  window.__journieProgress = 'xong'
  console.table(results.map((r) => ({ id: r.id, kết_quả: r.error ? `LỖI ${r.error}` : r.pass ? 'ĐẠT' : 'LỆCH', ca: r.title })))
  // Nếu có bộ thu cục bộ ở cổng 8765 (một HTTP server nhận POST và ghi file), gửi kết quả sang đó; không có thì bỏ qua.
  try {
    await realFetch('http://127.0.0.1:8765/', { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify({ totals: counts, cases: results }) })
  } catch {
    /* không có bộ thu */
  }
})()
