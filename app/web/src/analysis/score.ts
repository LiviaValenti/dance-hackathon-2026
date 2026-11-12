import { frameAngles, mirrorAngles, JOINT_NAMES, type JointAngles, type JointName } from './angles'
import { dtw } from './dtw'
import type { PoseSequence } from '../pose/types'

/** diffs = absolute deviation, deltas = Dancer minus Reference (degrees). */
export type AlignedStep = { refFrame: number; userFrame: number; diffs: JointAngles; deltas: JointAngles }
export type Comparison = { overall: number; perJoint: Record<JointName, number>; steps: AlignedStep[] }

/** Mean deviation (degrees) up to which a joint gets full marks. From new-chapter's scoring.py. */
const FULL_SCORE_DIFF_DEG = 10
/** Mean deviation (degrees) from which a joint gets 0. */
const ZERO_SCORE_DIFF_DEG = 55
/** Deviations above this are shown as orange joints. */
export const WARN_DIFF_DEG = 25

/** Score curve: 100 within 10°, a cosine falloff to 0 at 55°. Small wobbles cost nothing; big misses cost a lot. */
export function toScore(meanDiffDeg: number): number {
  if (meanDiffDeg <= FULL_SCORE_DIFF_DEG) return 100
  if (meanDiffDeg >= ZERO_SCORE_DIFF_DEG) return 0
  const t = (meanDiffDeg - FULL_SCORE_DIFF_DEG) / (ZERO_SCORE_DIFF_DEG - FULL_SCORE_DIFF_DEG)
  return Math.round(((Math.cos(t * Math.PI) + 1) / 2) * 100)
}

type ValidFrame = { frame: number; angles: JointAngles }

function validFrames(seq: PoseSequence, mirror: boolean): ValidFrame[] {
  const out: ValidFrame[] = []
  seq.frames.forEach((f, frame) => {
    const angles = f.points && frameAngles(f.points)
    if (angles) out.push({ frame, angles: mirror ? mirrorAngles(angles) : angles })
  })
  return out
}

export function angleDistance(a: JointAngles, b: JointAngles): number {
  let sum = 0
  for (const n of JOINT_NAMES) sum += Math.abs(a[n] - b[n])
  return sum / JOINT_NAMES.length
}

export function compare(ref: PoseSequence, user: PoseSequence, opts: { mirrorRef?: boolean } = {}): Comparison | null {
  const r = validFrames(ref, opts.mirrorRef ?? false)
  const u = validFrames(user, false)
  if (r.length === 0 || u.length === 0) return null

  const { path } = dtw(r, u, (x, y) => angleDistance(x.angles, y.angles))
  const sums = Object.fromEntries(JOINT_NAMES.map((n) => [n, 0])) as JointAngles

  const steps = path.map(([i, j]) => {
    const diffs = {} as JointAngles
    const deltas = {} as JointAngles
    for (const n of JOINT_NAMES) {
      deltas[n] = u[j].angles[n] - r[i].angles[n]
      diffs[n] = Math.abs(deltas[n])
      sums[n] += diffs[n]
    }
    return { refFrame: r[i].frame, userFrame: u[j].frame, diffs, deltas }
  })

  const perJoint = Object.fromEntries(
    JOINT_NAMES.map((n) => [n, toScore(sums[n] / path.length)]),
  ) as Record<JointName, number>
  const overall = Math.round(JOINT_NAMES.reduce((s, n) => s + perJoint[n], 0) / JOINT_NAMES.length)
  return { overall, perJoint, steps }
}

/** 0–100: how well two single poses match. */
export function poseMatch(a: JointAngles, b: JointAngles): number {
  return toScore(angleDistance(a, b))
}
