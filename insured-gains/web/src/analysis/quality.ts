import { frameAngles } from './angles'
import { formatTime } from '../formatTime'
import type { PoseSequence } from '../pose/types'

export type QualityReport = { validRatio: number; gaps: Array<{ start: number; end: number }> }

export const MIN_VALID_RATIO = 0.8
const MIN_GAP_SECONDS = 0.5

export function checkQuality(seq: PoseSequence): QualityReport {
  const valid = seq.frames.map((f) => !!f.points && frameAngles(f.points) !== null)
  const gaps: QualityReport['gaps'] = []
  let gapStart = -1
  const closeGap = (endExclusive: number) => {
    const start = seq.frames[gapStart].t
    const end = seq.frames[endExclusive - 1].t + 1 / seq.fps
    if (end - start >= MIN_GAP_SECONDS - 1e-9) gaps.push({ start, end })
    gapStart = -1
  }
  valid.forEach((ok, i) => {
    if (!ok && gapStart < 0) gapStart = i
    if (ok && gapStart >= 0) closeGap(i)
  })
  if (gapStart >= 0) closeGap(valid.length)
  const validRatio = valid.length ? valid.filter(Boolean).length / valid.length : 0
  return { validRatio, gaps }
}

export function qualityWarnings(label: string, q: QualityReport): string[] {
  const warnings = q.gaps.map(
    (g) => `${label}: hele kroppen er ikke synlig ${formatTime(g.start)}–${formatTime(g.end)}, så scoren er mindre presis der.`,
  )
  if (warnings.length === 0 && q.validRatio < MIN_VALID_RATIO) {
    warnings.push(`${label}: hele kroppen er bare synlig i ${Math.round(q.validRatio * 100)} % av videoen.`)
  }
  return warnings
}
