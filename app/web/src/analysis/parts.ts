import type { PoseSequence } from '../pose/types'

export type Part = { index: number; start: number; end: number }

const PART_SECONDS = 4
const MIN_LAST_PART_SECONDS = 2

/** Splits a time range into Parts to practise. A short last Part is merged into the previous one. */
export function splitParts(start: number, end: number, seconds = PART_SECONDS): Part[] {
  const parts: Part[] = []
  for (let s = start; s < end - 1e-9; s += seconds) {
    parts.push({ index: parts.length, start: s, end: Math.min(s + seconds, end) })
  }
  const last = parts[parts.length - 1]
  if (parts.length > 1 && last.end - last.start < MIN_LAST_PART_SECONDS) {
    parts.pop()
    parts[parts.length - 1].end = end
  }
  return parts
}

export function sliceSequence(seq: PoseSequence, start: number, end: number): PoseSequence {
  return { ...seq, frames: seq.frames.filter((f) => f.t >= start - 1e-9 && f.t < end - 1e-9) }
}
