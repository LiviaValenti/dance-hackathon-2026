import type { JointName } from './angles'
import type { Comparison } from './score'

export type AreaScore = { label: string; score: number }

const AREAS: Array<{ label: string; joints: JointName[] }> = [
  { label: 'Armer', joints: ['leftElbow', 'rightElbow', 'leftShoulder', 'rightShoulder'] },
  { label: 'Hofter', joints: ['leftHip', 'rightHip'] },
  { label: 'Bein', joints: ['leftKnee', 'rightKnee'] },
]

export function bodyAreaScores(c: Pick<Comparison, 'perJoint'>): AreaScore[] {
  return AREAS.map(({ label, joints }) => ({
    label,
    score: Math.round(joints.reduce((sum, j) => sum + c.perJoint[j], 0) / joints.length),
  }))
}
