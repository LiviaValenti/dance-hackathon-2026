import type { JointName } from './angles'
import type { Fault } from './faults'
import { text } from '../text'

type BodyPart = keyof typeof text.faultTips

function bodyPart(joint: JointName): BodyPart {
  return joint.replace(/^(left|right)/, '').toLowerCase() as BodyPart
}

export function faultTitle(f: Pick<Fault, 'joint' | 'direction'>): string {
  const side = f.joint.startsWith('left') ? text.sides.left : text.sides.right
  return text.faultTips[bodyPart(f.joint)][f.direction].replace('{side}', side)
}
