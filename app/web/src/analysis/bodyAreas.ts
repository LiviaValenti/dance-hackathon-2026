import type { JointName } from './angles'
import type { Comparison } from './score'
import { text } from '../text'

export type AreaScore = { label: string; score: number }

const AREAS: Array<{ label: string; joints: JointName[] }> = [
  { label: text.bodyAreas.arms, joints: ['leftElbow', 'rightElbow', 'leftShoulder', 'rightShoulder'] },
  { label: text.bodyAreas.hips, joints: ['leftHip', 'rightHip'] },
  { label: text.bodyAreas.legs, joints: ['leftKnee', 'rightKnee'] },
]

export function bodyAreaScores(c: Pick<Comparison, 'perJoint'>): AreaScore[] {
  return AREAS.map(({ label, joints }) => ({
    label,
    score: Math.round(joints.reduce((sum, j) => sum + c.perJoint[j], 0) / joints.length),
  }))
}
