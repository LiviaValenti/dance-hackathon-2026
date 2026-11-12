import type { LevelId } from '../content/types'

/** Ordered from lowest to highest. */
export const LEVELS: LevelId[] = ['beginner', 'intermediate', 'advanced']

export const LEVEL_UP_FROM = 85
export const LEVEL_CONFIRM_FROM = 50

export type StatedLevel = LevelId | 'unknown'
export type LevelOutcome = { level: LevelId; change: 'up' | 'confirmed' | 'down' | 'start' }

/**
 * The Level check rule (docs/plan.md): the Dancer dances one move at the Level they state.
 * 85 or more → one Level up; 50–84 → confirmed; below 50 → one Level down; "don't know" → Beginner.
 * The Dancer can always override the result.
 */
export function levelCheckRule(stated: StatedLevel, score = 0): LevelOutcome {
  if (stated === 'unknown') return { level: 'beginner', change: 'start' }
  const at = LEVELS.indexOf(stated)
  const step = score >= LEVEL_UP_FROM ? 1 : score >= LEVEL_CONFIRM_FROM ? 0 : -1
  const next = Math.min(LEVELS.length - 1, Math.max(0, at + step))
  if (next === at) return { level: stated, change: 'confirmed' }
  return { level: LEVELS[next], change: next > at ? 'up' : 'down' }
}
