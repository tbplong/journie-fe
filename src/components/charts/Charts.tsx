import { useId, useState } from 'react'
import { useTr } from '../../hooks/useTr'
import { SERIES_COLORS } from './palette'

type Series = { key: string; label: string; color: string }
type Point = { date: string } & Record<string, number | string>

/** A plain table of the same numbers, for screen readers and for reading exact values. */
function DataTable({ caption, columns, rows }: { caption: string; columns: string[]; rows: (string | number)[][] }) {
  const { tr } = useTr()
  return (
    <details className="mt-2 text-xs">
      <summary className="cursor-pointer font-semibold text-lapis">{tr('Xem dạng bảng', 'Show as a table')}</summary>
      <div className="mt-2 max-h-60 overflow-auto">
        <table className="w-full text-left">
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column} scope="col" className="border-b border-forest/15 px-2 py-1 font-semibold">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={index}>
                {row.map((cell, i) => (
                  <td key={i} className="tabular border-b border-forest/8 px-2 py-1">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  )
}

function Legend({ series }: { series: Series[] }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink/70">
      {series.map((s) => (
        <li key={s.key} className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2 w-4 rounded-full" style={{ background: s.color }} aria-hidden="true" />
          {s.label}
        </li>
      ))}
    </ul>
  )
}

const W = 600
const H = 220
const PAD = { l: 34, r: 12, t: 12, b: 26 }

/** Counts per day as lines, with a hover readout and a table fallback. */
export function LineChart({ title, series, points }: { title: string; series: Series[]; points: Point[] }) {
  const { tr, locale } = useTr()
  const clip = useId()
  const [hover, setHover] = useState<number | null>(null)
  if (!points.length) return <p className="py-10 text-center text-sm text-ink/50">{tr('Chưa có dữ liệu trong khoảng này.', 'No data in this range.')}</p>
  const max = Math.max(1, ...points.flatMap((p) => series.map((s) => Number(p[s.key]) || 0)))
  const x = (i: number) => PAD.l + (points.length === 1 ? (W - PAD.l - PAD.r) / 2 : (i / (points.length - 1)) * (W - PAD.l - PAD.r))
  const y = (v: number) => PAD.t + (1 - v / max) * (H - PAD.t - PAD.b)
  const ticks = [0, Math.round(max / 2), max]
  const label = (date: string) => new Date(`${date}T00:00:00`).toLocaleDateString(locale, { day: 'numeric', month: 'short' })
  const labelAt = [...new Set([0, Math.floor((points.length - 1) / 2), points.length - 1])]
  return (
    <figure>
      <figcaption className="sr-only">{title}</figcaption>
      <Legend series={series} />
      <div className="relative mt-2">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={title}>
          <defs>
            <clipPath id={clip}>
              <rect x={PAD.l} y={0} width={W - PAD.l - PAD.r} height={H} />
            </clipPath>
          </defs>
          {ticks.map((tick) => (
            <g key={tick}>
              <line x1={PAD.l} x2={W - PAD.r} y1={y(tick)} y2={y(tick)} stroke="currentColor" className="text-forest/12" />
              <text x={PAD.l - 6} y={y(tick) + 4} textAnchor="end" className="fill-ink/45 text-[10px]">
                {tick}
              </text>
            </g>
          ))}
          {labelAt.map((i) => (
            <text key={i} x={x(i)} y={H - 6} textAnchor="middle" className="fill-ink/45 text-[10px]">
              {label(points[i].date)}
            </text>
          ))}
          <g clipPath={`url(#${clip})`}>
            {series.map((s) => (
              <polyline key={s.key} fill="none" stroke={s.color} strokeWidth={2.4} strokeLinejoin="round" strokeLinecap="round" points={points.map((p, i) => `${x(i)},${y(Number(p[s.key]) || 0)}`).join(' ')} />
            ))}
            {/* A day or a few days make no visible line, so each value also gets a dot */}
            {points.length <= 31 && series.map((s) => points.map((p, i) => <circle key={`${s.key}-${i}`} cx={x(i)} cy={y(Number(p[s.key]) || 0)} r={3} fill={s.color} />))}
          </g>
          {hover !== null && (
            <g>
              <line x1={x(hover)} x2={x(hover)} y1={PAD.t} y2={H - PAD.b} stroke="currentColor" className="text-ink/30" strokeDasharray="3 4" />
              {series.map((s) => (
                <circle key={s.key} cx={x(hover)} cy={y(Number(points[hover][s.key]) || 0)} r={4} fill={s.color} stroke="#fff" strokeWidth={1.5} />
              ))}
            </g>
          )}
          <rect
            x={PAD.l}
            y={0}
            width={W - PAD.l - PAD.r}
            height={H}
            fill="transparent"
            onPointerMove={(event) => {
              const box = event.currentTarget.getBoundingClientRect()
              const ratio = (event.clientX - box.left) / box.width
              setHover(Math.max(0, Math.min(points.length - 1, Math.round(ratio * (points.length - 1)))))
            }}
            onPointerLeave={() => setHover(null)}
          />
        </svg>
        {hover !== null && (
          <div className="pointer-events-none absolute top-1 rounded-md bg-night/90 px-2.5 py-1.5 text-[0.7rem] text-paper shadow" style={{ left: `${(x(hover) / W) * 100}%`, transform: `translateX(${hover > points.length / 2 ? '-105%' : '5%'})` }}>
            <p className="font-semibold">{label(points[hover].date)}</p>
            {series.map((s) => (
              <p key={s.key} className="tabular">
                <span className="mr-1 inline-block size-2 rounded-full" style={{ background: s.color }} />
                {s.label}: {points[hover][s.key]}
              </p>
            ))}
          </div>
        )}
      </div>
      <DataTable caption={title} columns={[tr('Ngày', 'Date'), ...series.map((s) => s.label)]} rows={points.map((p) => [p.date, ...series.map((s) => Number(p[s.key]) || 0)])} />
    </figure>
  )
}

/** Ranked horizontal bars; each value is written next to its bar, so no axis is needed. */
export function BarList({ title, items, color = SERIES_COLORS[0] }: { title: string; items: { label: string; value: number; color?: string }[]; color?: string }) {
  const { tr } = useTr()
  if (!items.length) return <p className="py-8 text-center text-sm text-ink/50">{tr('Chưa có dữ liệu.', 'No data yet.')}</p>
  const max = Math.max(1, ...items.map((item) => item.value))
  return (
    <figure>
      <figcaption className="sr-only">{title}</figcaption>
      <ol className="space-y-2">
        {items.map((item) => (
          <li key={item.label} className="text-sm">
            <div className="flex items-baseline justify-between gap-3">
              <span className="min-w-0 truncate text-ink/80">{item.label}</span>
              <span className="tabular shrink-0 font-semibold text-ink">{item.value}</span>
            </div>
            <div className="mt-1 h-2 rounded-full bg-forest/8" aria-hidden="true">
              <div className="h-full rounded-full" style={{ width: `${(item.value / max) * 100}%`, background: item.color ?? color }} />
            </div>
          </li>
        ))}
      </ol>
    </figure>
  )
}

/** Shares of a whole as a ring, with the total in the middle and every part labelled in the legend. */
export function Donut({ title, items }: { title: string; items: { label: string; value: number; color: string }[] }) {
  const { tr } = useTr()
  const total = items.reduce((sum, item) => sum + item.value, 0)
  if (!total) return <p className="py-8 text-center text-sm text-ink/50">{tr('Chưa có dữ liệu.', 'No data yet.')}</p>
  const r = 52
  const c = 2 * Math.PI * r
  // Where each part starts along the ring: the lengths of the parts before it
  const starts = items.map((_, index) => items.slice(0, index).reduce((sum, item) => sum + (item.value / total) * c, 0))
  return (
    <figure className="flex flex-wrap items-center gap-5">
      <svg viewBox="0 0 140 140" className="size-36 shrink-0 -rotate-90" role="img" aria-label={title}>
        <circle cx="70" cy="70" r={r} fill="none" stroke="currentColor" strokeWidth="18" className="text-forest/8" />
        {items.map((item, index) => {
          const length = (item.value / total) * c
          return <circle key={item.label} cx="70" cy="70" r={r} fill="none" stroke={item.color} strokeWidth="18" strokeDasharray={`${Math.max(0, length - 2)} ${c}`} strokeDashoffset={-starts[index]} />
        })}
        <text x="70" y="76" textAnchor="middle" transform="rotate(90 70 70)" className="fill-forest text-[20px] font-bold">
          {total}
        </text>
      </svg>
      <figcaption className="sr-only">{title}</figcaption>
      <ul className="min-w-0 flex-1 space-y-1 text-sm">
        {items.map((item) => (
          <li key={item.label} className="flex items-center gap-2">
            <span className="inline-block size-2.5 shrink-0 rounded-full" style={{ background: item.color }} aria-hidden="true" />
            <span className="min-w-0 flex-1 truncate text-ink/75">{item.label}</span>
            <span className="tabular font-semibold">{item.value}</span>
            <span className="tabular w-10 text-right text-xs text-ink/50">{Math.round((item.value / total) * 100)}%</span>
          </li>
        ))}
      </ul>
    </figure>
  )
}

/** One number with its name. */
export function Kpi({ label, value, hint }: { label: string; value: number | string; hint?: string }) {
  return (
    <div className="panel p-4">
      <p className="text-xs font-semibold text-ink/55">{label}</p>
      <p className="h-display tabular mt-1 text-3xl text-forest">{value}</p>
      {hint && <p className="mt-0.5 text-[0.7rem] text-ink/45">{hint}</p>}
    </div>
  )
}
