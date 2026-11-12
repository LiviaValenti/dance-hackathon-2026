import { JOINT_NAMES, type JointName } from './angles'
import type { Comparison } from './score'
import type { PoseSequence } from '../pose/types'

export type Fault = {
  joint: JointName
  /** 'smaller' = brukerens vinkel er mindre enn referansens. */
  direction: 'smaller' | 'larger'
  firstStep: number
  lastStep: number
  /** Sekunder i referansen. */
  start: number
  end: number
  /** Gjennomsnittlig absolutt avvik i grader. */
  meanDelta: number
  severity: number
}

export type FaultOptions = { thresholdDeg?: number; minSeconds?: number; maxFaults?: number }

export function detectFaults(c: Comparison, ref: PoseSequence, opts: FaultOptions = {}): Fault[] {
  const threshold = opts.thresholdDeg ?? 25
  const minSteps = Math.max(1, Math.round((opts.minSeconds ?? 0.3) * ref.fps))
  const tOf = (step: number) => ref.frames[c.steps[step].refFrame].t
  const faults: Fault[] = []

  for (const joint of JOINT_NAMES) {
    let runStart = -1
    let sign = 0
    let sum = 0
    const close = (endExclusive: number) => {
      const length = endExclusive - runStart
      if (runStart >= 0 && length >= minSteps) {
        const start = tOf(runStart)
        const end = tOf(endExclusive - 1) + 1 / ref.fps
        const meanDelta = sum / length
        faults.push({
          joint,
          direction: sign < 0 ? 'smaller' : 'larger',
          firstStep: runStart,
          lastStep: endExclusive - 1,
          start,
          end,
          meanDelta,
          severity: meanDelta * (end - start),
        })
      }
      runStart = -1
      sign = 0
      sum = 0
    }
    c.steps.forEach((s, i) => {
      const d = s.deltas[joint]
      const sgn = Math.abs(d) > threshold ? Math.sign(d) : 0
      if (sgn !== sign) {
        close(i)
        if (sgn !== 0) { runStart = i; sign = sgn }
      }
      if (sgn !== 0) sum += Math.abs(d)
    })
    close(c.steps.length)
  }

  return faults.sort((a, b) => b.severity - a.severity).slice(0, opts.maxFaults ?? 3)
}

export function topStrengths(c: Comparison, n = 3, minScore = 80): JointName[] {
  return JOINT_NAMES.filter((j) => c.perJoint[j] >= minScore)
    .sort((a, b) => c.perJoint[b] - c.perJoint[a])
    .slice(0, n)
}
