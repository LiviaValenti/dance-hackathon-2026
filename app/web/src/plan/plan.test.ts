import { describe, expect, it } from 'vitest'
import { chooseChoreography, planRule, startPlan, type PlanState } from './plan'
import type { Choreography, Reference } from '../content/types'
import type { Profile } from '../profile/profile'
import { content } from '../content/content'

const studio = content.choreographies.find((c) => c.studio)!.studio

const reference: Reference = { video: '/content/x.mov', tempo: 100, start: 0, end: 9 }
const parts = [
  { id: 'a', title: 'A', start: 0, end: 3 },
  { id: 'b', title: 'B', start: 3, end: 6 },
  { id: 'c', title: 'C', start: 6, end: 9 },
]
const choreo = (id: string, ease: number, extra: Partial<Choreography> = {}): Choreography => ({
  id, title: id, style: 'kpop', level: 'intermediate', ease, reference, parts, strains: [], ...extra,
})
const all = [
  choreo('easy', 1),
  choreo('mid', 2, { strains: ['knees'] }),
  choreo('hard', 3),
  choreo('other-style', 4, { style: 'jazz' }),
  choreo('beginner', 9, { level: 'beginner' }),
  choreo('studio', 9, { studio }),
]
const profile: Profile = { name: 'Ingrid', style: 'kpop', goal: 'choreography', minutes: 20, aches: [], studio: false }
const state = (patch: Partial<PlanState> = {}): PlanState => ({ ...startPlan('hard'), ...patch })

describe('chooseChoreography', () => {
  it('picks the hardest Choreography at the Level in the Dancer’s style, never a studio one', () => {
    expect(chooseChoreography(all, 'intermediate', profile)!.id).toBe('hard')
  })

  it('avoids Choreographies that strain an aching area', () => {
    const aching = { ...profile, aches: ['knees' as const] }
    expect(chooseChoreography(all.filter((c) => c.id !== 'hard'), 'intermediate', aching)!.id).toBe('easy')
  })

  it('falls back to another style when the Dancer’s style has nothing at the Level', () => {
    expect(chooseChoreography(all, 'intermediate', { ...profile, style: 'jazz' })!.id).toBe('other-style')
    expect(chooseChoreography(all, 'advanced', profile)).toBeNull()
  })

  it('can be limited to easier Choreographies', () => {
    expect(chooseChoreography(all, 'intermediate', profile, { easierThan: 3 })!.id).toBe('mid')
    expect(chooseChoreography(all, 'intermediate', profile, { easierThan: 1 })).toBeNull()
  })
})

describe('planRule', () => {
  const run = (s: PlanState, score: number, aches: Profile['aches'] = []) =>
    planRule(s, score, { choreographies: all, profile: { ...profile, aches } })

  it('moves to the next Part at 80 or more', () => {
    expect(run(state({ item: 0 }), 80)).toEqual({ decision: { kind: 'next' }, next: state({ item: 1 }) })
  })

  it('combines the Parts after the last one, and completes the Choreography after the whole', () => {
    expect(run(state({ item: 2 }), 90).decision).toEqual({ kind: 'combine' })
    expect(run(state({ item: 2 }), 90).next.item).toBe(3)
    expect(run(state({ item: 3 }), 90)).toEqual({ decision: { kind: 'done' }, next: state({ item: 3, done: true }) })
  })

  it('goes back to full speed before moving on after passing slowed down', () => {
    expect(run(state({ item: 1, speed: 0.75 }), 85)).toEqual({ decision: { kind: 'full-speed' }, next: state({ item: 1, speed: 1 }) })
  })

  it('repeats from 60 to 79 at the same speed and resets the low streak', () => {
    expect(run(state({ speed: 0.75, lowStreak: 2 }), 70)).toEqual({ decision: { kind: 'repeat' }, next: state({ speed: 0.75 }) })
    expect(run(state(), 60).decision).toEqual({ kind: 'repeat' })
  })

  it('repeats at 75% speed below 60', () => {
    expect(run(state(), 59)).toEqual({ decision: { kind: 'slower' }, next: state({ speed: 0.75, lowStreak: 1 }) })
  })

  it('suggests an easier Choreography at the same Level after three scores below 60 in a row', () => {
    const result = run(state({ speed: 0.75, lowStreak: 2, item: 1 }), 40)
    expect(result).toEqual({ decision: { kind: 'easier', choreographyId: 'mid' }, next: startPlan('mid') })
    expect(run(state({ lowStreak: 2 }), 40, ['knees']).decision).toEqual({ kind: 'easier', choreographyId: 'easy' })
  })

  it('keeps going slowed down when there is nothing easier', () => {
    const s: PlanState = { ...startPlan('easy'), lowStreak: 2, speed: 0.75 }
    expect(run(s, 40)).toEqual({ decision: { kind: 'slower' }, next: { ...s, lowStreak: 3 } })
  })
})
