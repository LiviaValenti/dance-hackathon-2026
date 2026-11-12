import type { Point } from '../pose/types'

/** The angle is measured at the middle point. Indices are MediaPipe Pose landmarks. */
export const JOINTS = {
  leftElbow: [11, 13, 15],
  rightElbow: [12, 14, 16],
  leftShoulder: [23, 11, 13],
  rightShoulder: [24, 12, 14],
  leftHip: [11, 23, 25],
  rightHip: [12, 24, 26],
  leftKnee: [23, 25, 27],
  rightKnee: [24, 26, 28],
} as const

export type JointName = keyof typeof JOINTS
export const JOINT_NAMES = Object.keys(JOINTS) as JointName[]
export type JointAngles = Record<JointName, number>

const MIN_VISIBILITY = 0.5

export function angleAt(a: Point, b: Point, c: Point): number {
  const v1x = a.x - b.x, v1y = a.y - b.y
  const v2x = c.x - b.x, v2y = c.y - b.y
  const len = Math.hypot(v1x, v1y) * Math.hypot(v2x, v2y)
  if (len === 0) return 0
  const cos = Math.min(1, Math.max(-1, (v1x * v2x + v1y * v2y) / len))
  return (Math.acos(cos) * 180) / Math.PI
}

export function frameAngles(points: Point[]): JointAngles | null {
  const out = {} as JointAngles
  for (const name of JOINT_NAMES) {
    const [ia, ib, ic] = JOINTS[name]
    const a = points[ia], b = points[ib], c = points[ic]
    if (!a || !b || !c || Math.min(a.visibility, b.visibility, c.visibility) < MIN_VISIBILITY) return null
    out[name] = angleAt(a, b, c)
  }
  return out
}

const MIRROR: Record<JointName, JointName> = {
  leftElbow: 'rightElbow', rightElbow: 'leftElbow',
  leftShoulder: 'rightShoulder', rightShoulder: 'leftShoulder',
  leftHip: 'rightHip', rightHip: 'leftHip',
  leftKnee: 'rightKnee', rightKnee: 'leftKnee',
}

export function mirrorAngles(a: JointAngles): JointAngles {
  const out = {} as JointAngles
  for (const n of JOINT_NAMES) out[n] = a[MIRROR[n]]
  return out
}
