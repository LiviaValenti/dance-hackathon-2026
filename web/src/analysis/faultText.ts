import type { JointName } from './angles'
import type { Fault } from './faults'

type BodyPart = 'elbow' | 'shoulder' | 'hip' | 'knee'

// Vinkelen er målt i leddet: albue (skulder–albue–håndledd), skulder (hofte–skulder–albue),
// hofte (skulder–hofte–kne), kne (hofte–kne–ankel). Mindre vinkel = mer bøyd / nærmere kroppen.
const TIPS: Record<BodyPart, Record<Fault['direction'], string>> = {
  elbow: { smaller: 'Strekk {side} arm mer', larger: 'Bøy {side} albue mer' },
  shoulder: { smaller: 'Løft {side} arm høyere', larger: 'Senk {side} arm litt' },
  hip: { smaller: 'Rett mer opp i {side} hofte', larger: 'Bøy mer i {side} hofte' },
  knee: { smaller: 'Strekk {side} kne mer', larger: 'Bøy {side} kne mer' },
}

function bodyPart(joint: JointName): BodyPart {
  return joint.replace(/^(left|right)/, '').toLowerCase() as BodyPart
}

export function faultTitle(f: Pick<Fault, 'joint' | 'direction'>): string {
  const side = f.joint.startsWith('left') ? 'venstre' : 'høyre'
  return TIPS[bodyPart(f.joint)][f.direction].replace('{side}', side)
}
