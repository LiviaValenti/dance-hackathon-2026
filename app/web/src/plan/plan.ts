import type { Choreography, LevelId } from '../content/types'
import type { Profile } from '../profile/profile'

export const NEXT_FROM = 80
export const REPEAT_FROM = 60
export const SLOW_SPEED = 0.75
export const EASIER_AFTER_LOW = 3

/**
 * Where the Dancer is in their Plan. item indexes the Choreography's Parts; item === parts.length means
 * the whole Choreography (the Parts combined).
 */
export type PlanState = {
  choreographyId: string
  item: number
  speed: 1 | typeof SLOW_SPEED
  /** Scores below 60 in a row. */
  lowStreak: number
  done: boolean
}

export type Decision =
  | { kind: 'next' }
  | { kind: 'combine' }
  | { kind: 'done' }
  | { kind: 'full-speed' }
  | { kind: 'repeat' }
  | { kind: 'slower' }
  | { kind: 'easier'; choreographyId: string }

/** The Dancer picks an item to practise (e.g. the whole Choreography straight away); the rules continue from there. */
export const chooseItem = (state: PlanState, item: number): PlanState => ({ ...state, item, speed: 1, lowStreak: 0, done: false })

export const startPlan = (choreographyId: string): PlanState => ({ choreographyId, item: 0, speed: 1, lowStreak: 0, done: false })

const strainCount = (c: Choreography, profile: Profile) => c.strains.filter((s) => profile.aches.includes(s)).length

/**
 * A Choreography at the Level that fits the Dancer: their style first, then the fewest moves that strain
 * an aching area, then the hardest. Studio Choreographies are only given through the studio branch.
 */
export function chooseChoreography(
  all: Choreography[], level: LevelId, profile: Profile, opts: { easierThan?: number } = {},
): Choreography | null {
  const candidates = all.filter((c) => !c.studio && c.level === level && (opts.easierThan === undefined || c.ease < opts.easierThan))
  const rank = (c: Choreography) => [c.style === profile.style ? 0 : 1, strainCount(c, profile), -c.ease]
  const sorted = candidates.sort((a, b) => {
    const [ra, rb] = [rank(a), rank(b)]
    return ra[0] - rb[0] || ra[1] - rb[1] || ra[2] - rb[2]
  })
  return sorted[0] ?? null
}

/**
 * The Plan rule (docs/plan.md, ADR 0004): fixed rules on the Score decide the next step; the Coach only
 * explains it. 80+ → next Part (after the last Part: the whole Choreography; after the whole: done);
 * 60–79 → repeat; below 60 → repeat at 75% speed; below 60 three times in a row → an easier Choreography
 * at the same Level. Passing at 75% speed first repeats the same item at full speed.
 */
export function planRule(
  state: PlanState, score: number, ctx: { choreographies: Choreography[]; profile: Profile },
): { decision: Decision; next: PlanState } {
  const current = ctx.choreographies.find((c) => c.id === state.choreographyId)!
  if (score >= NEXT_FROM) {
    const next = { ...state, lowStreak: 0 }
    if (state.speed !== 1) return { decision: { kind: 'full-speed' }, next: { ...next, speed: 1 } }
    const whole = current.parts.length
    if (state.item >= whole || whole === 1) return { decision: { kind: 'done' }, next: { ...next, done: true } }
    if (state.item === whole - 1) return { decision: { kind: 'combine' }, next: { ...next, item: whole } }
    return { decision: { kind: 'next' }, next: { ...next, item: state.item + 1 } }
  }
  if (score >= REPEAT_FROM) return { decision: { kind: 'repeat' }, next: { ...state, lowStreak: 0 } }

  const lowStreak = state.lowStreak + 1
  if (lowStreak >= EASIER_AFTER_LOW) {
    const easier = chooseChoreography(ctx.choreographies, current.level, ctx.profile, { easierThan: current.ease })
    if (easier) return { decision: { kind: 'easier', choreographyId: easier.id }, next: startPlan(easier.id) }
  }
  return { decision: { kind: 'slower' }, next: { ...state, speed: SLOW_SPEED, lowStreak } }
}

/** Something to practise: one Part, or the whole Choreography (the Parts combined). */
export type PracticeItem = { id: string; start: number; end: number; part: Choreography['parts'][number] | null }

export function practiceItems(c: Choreography): PracticeItem[] {
  return [
    ...c.parts.map((p) => ({ id: p.id, start: p.start, end: p.end, part: p })),
    ...(c.parts.length > 1 ? [{ id: 'whole', start: c.reference.start, end: c.reference.end, part: null }] : []),
  ]
}
