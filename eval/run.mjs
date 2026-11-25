// Usage:  node eval/run.mjs [extraction|itinerary|all] [--reuse] [--limit N]
//   --reuse   score the saved /chat answers again instead of calling the model (no quota used)
//   --limit N only the first N queries (for a quick check)
// The backend must be running (default http://127.0.0.1:8000, override with EVAL_API).
import { build } from 'vite'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, '..')
const args = process.argv.slice(2)
const mode = ['extraction', 'itinerary', 'all'].includes(args[0]) ? args[0] : 'all'
const reuse = args.includes('--reuse')
const limitAt = args.indexOf('--limit')
const limit = limitAt >= 0 ? Number(args[limitAt + 1]) : Infinity

await build({
  root,
  configFile: false,
  logLevel: 'warn',
  define: { 'import.meta.env.VITE_API_URL': JSON.stringify(process.env.EVAL_API ?? 'http://127.0.0.1:8000') },
  ssr: { noExternal: true },
  build: { ssr: join(here, 'core.ts'), outDir: join(here, '.build'), emptyOutDir: true, target: 'node24', rollupOptions: { output: { entryFileNames: 'core.mjs', format: 'esm' } } },
})
// The app's HTTP client expects a browser: give it `window` for timers
globalThis.window = globalThis
const core = await import(pathToFileURL(join(here, '.build', 'core.mjs')).href)

const queries = readFileSync(join(here, 'queries.jsonl'), 'utf8')
  .split('\n')
  .filter(Boolean)
  .map((line) => JSON.parse(line))
  .slice(0, limit)
const out = join(here, 'results')
mkdirSync(out, { recursive: true })
const log = (line) => console.log(line)
const save = (name, value) => writeFileSync(join(out, name), JSON.stringify(value, null, 2) + '\n')
const stamp = new Date().toISOString()

let extraction
if (mode !== 'itinerary') {
  const rawFile = join(out, 'extraction.raw.json')
  let raws
  if (reuse && existsSync(rawFile)) raws = JSON.parse(readFileSync(rawFile, 'utf8'))
  else {
    raws = await core.collect(queries, log)
    save('extraction.raw.json', raws)
  }
  const model = raws.find((raw) => raw.response)?.response.meta
  extraction = { generatedAt: stamp, model: model?.model, promptVersion: model?.prompt_version, ...core.scoreExtraction(queries, raws) }
  save('extraction.json', extraction)
}

let itinerary
if (mode !== 'extraction') {
  const rows = await core.runItinerary(queries, log)
  save('itinerary.rows.json', rows)
  itinerary = { generatedAt: stamp, ...core.scoreItinerary(rows) }
  save('itinerary.json', itinerary)
}

const pct = (x) => (x === null || x === undefined ? 'n/a' : `${(x * 100).toFixed(1)}%`)
const lines = [`# Journie evaluation (${stamp})`, '']
if (extraction) {
  const s = extraction
  lines.push(
    '## A. Constraint extraction (POST /chat)',
    '',
    `Model \`${s.model}\`, prompt \`${s.promptVersion}\`. ${s.answered}/${s.queries} queries answered; ${s.failed.length} failed after retries. Latency mean ${s.latencyMs.mean} ms, p50 ${s.latencyMs.p50} ms, p95 ${s.latencyMs.p95} ms; ${s.callsPerQuery} calls per query.`,
    '',
    '| Field | Queries | Precision | Recall | F1 | Exact match |',
    '|---|---|---|---|---|---|',
    ...[['Interests (model fields)', s.interests], ['Exclusions (model fields)', s.avoid], ['Must-visit names (model fields)', s.mustVisit], ['Exclusions (as the app shows them)', s.asTheAppReadsIt.avoid], ['Must-visit names (as the app shows them)', s.asTheAppReadsIt.mustVisit]].map(([name, r]) => `| ${name} | ${r.queries} | ${pct(r.precision)} | ${pct(r.recall)} | ${pct(r.f1)} | ${pct(r.exactMatch)} |`),
    '',
    '| Scalar | Stated in text (accuracy) | Not stated (correctly empty) |',
    '|---|---|---|',
    ...[['Days', s.days], ['Budget (VND)', s.budget]].map(([name, r]) => `| ${name} | ${r.stated.correct}/${r.stated.n} (${pct(r.stated.accuracy)}) | ${r.absent.correct}/${r.absent.n} (${pct(r.absent.accuracy)}) |`),
    '',
    `Disagreements with the labels: ${s.misses.length} (listed in \`extraction.json\`, field \`misses\`). Labels were written by one annotator and have not been independently checked.`,
    '',
  )
}
if (itinerary) {
  const s = itinerary
  const row = (name, f) => `| ${name} | ${f(s.planner)} | ${f(s.baseline)} |`
  lines.push(
    '## B. Itinerary hard constraints (retrieval + planner vs. retrieval order only)',
    '',
    `${s.scenarios - s.failed.length}/${s.scenarios} scenarios ran. Planner time mean ${s.plannerMs.mean} ms, p95 ${s.plannerMs.p95} ms. Both systems are laid out and checked with the same clock and travel model.`,
    '',
    '| Measure | Journie planner | Backend order, no planner |',
    '|---|---|---|',
    row('All hard constraints kept', (x) => `${x.allHardConstraintsKept.count}/${x.scenarios} (${pct(x.allHardConstraintsKept.rate)}, 95% CI ${pct(x.allHardConstraintsKept.ci95[0])}–${pct(x.allHardConstraintsKept.ci95[1])})`),
    row('Scenarios with a stop open-hours violation', (x) => pct(x.scenariosWith.closedAtVisit)),
    row('Scenarios running past the day end', (x) => pct(x.scenariosWith.pastDayEnd)),
    row('Scenarios with a place closed that weekday', (x) => pct(x.scenariosWith.closedThatWeekday)),
    row('Scenarios over budget', (x) => pct(x.scenariosWith.overBudget)),
    row('Scenarios with an excluded place', (x) => pct(x.scenariosWith.avoidedPlace)),
    row('Scenarios with more than 3 meals in a day', (x) => pct(x.scenariosWith.moreThanMaxMealsADay)),
    row('Scenarios with a repeated place', (x) => pct(x.scenariosWith.duplicatePlace)),
    row('Must-visit coverage', (x) => `${pct(x.mustVisitCoverage)} (${x.mustVisitScenarios} scenarios)`),
    row('Share of stops matching a requested interest', (x) => `${pct(x.interestHitRate)} (${x.interestScenarios} scenarios)`),
    row('Stops per scenario', (x) => String(x.stopsPerScenario)),
    row('Day fullness (stops / cap)', (x) => pct(x.fullness)),
    row('Travel minutes per stop', (x) => String(x.travelMinPerStop)),
    row('Waiting minutes per stop', (x) => String(x.waitMinPerStop)),
    row('Spend as share of budget', (x) => pct(x.spendOfBudget)),
    '',
    `Paired: planner only kept all constraints in ${s.pairedHardConstraints.plannerOnly}, baseline only in ${s.pairedHardConstraints.baselineOnly}, both in ${s.pairedHardConstraints.both}, neither in ${s.pairedHardConstraints.neither}.`,
    '',
  )
}
writeFileSync(join(out, 'summary.md'), lines.join('\n'))
console.log(`\nSaved to ${out}`)
