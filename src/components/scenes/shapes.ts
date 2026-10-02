/** Karst-style limestone towers: [centerX, height, halfWidth] */
export type Peak = readonly [number, number, number]

export function karstPath(width: number, base: number, bottom: number, peaks: readonly Peak[]) {
  let d = `M0 ${bottom} L0 ${base}`

  for (const [cx, height, half] of peaks) {
    const left = cx - half
    const right = cx + half
    const top = base - height

    d += ` L${left} ${base}`
    d += ` C${left + half * 0.1} ${base - height * 0.5}, ${cx - half * 0.55} ${top + height * 0.05}, ${cx} ${top}`
    d += ` C${cx + half * 0.55} ${top + height * 0.05}, ${right - half * 0.1} ${base - height * 0.5}, ${right} ${base}`
  }

  return `${d} L${width} ${base} L${width} ${bottom} Z`
}

/** A seamless horizontal sine wave. `width` must be a whole number of wavelengths. */
export function wavePath(width: number, height: number, amplitude: number, wavelength: number) {
  const baseline = amplitude + 4
  let d = `M0 ${baseline}`

  for (let x = 0; x < width; x += wavelength) {
    d += ` Q${x + wavelength / 4} ${baseline - amplitude * 2} ${x + wavelength / 2} ${baseline}`
    d += ` T${x + wavelength} ${baseline}`
  }

  return `${d} V${height} H0 Z`
}

/** A rolling ridge line used for terraced hillsides. */
export function ridgePath(
  width: number,
  baseline: number,
  bottom: number,
  amplitude: number,
  phase: number,
  frequency: number,
) {
  const steps = 24
  let d = `M0 ${bottom} L0 ${baseline + Math.sin(phase) * amplitude}`

  for (let i = 1; i <= steps; i++) {
    const x = (width / steps) * i
    const y =
      baseline +
      Math.sin(phase + (i / steps) * Math.PI * 2 * frequency) * amplitude +
      Math.sin(phase * 1.7 + (i / steps) * Math.PI * 2 * frequency * 2.3) * amplitude * 0.35
    d += ` L${x.toFixed(1)} ${y.toFixed(1)}`
  }

  return `${d} L${width} ${bottom} Z`
}
