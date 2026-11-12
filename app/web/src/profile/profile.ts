import type { Ache } from '../content/types'

export type Goal = 'choreography' | 'technique' | 'fun'

/** The Dancer's onboarding answers. */
export type Profile = {
  name: string
  style: string
  goal: Goal
  /** Minutes per practice session. */
  minutes: number
  aches: Ache[]
  studio: boolean
}

export const GOALS: Goal[] = ['choreography', 'technique', 'fun']
export const SESSION_MINUTES = [10, 20, 30]
