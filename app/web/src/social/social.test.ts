import { describe, expect, it } from 'vitest'
import { classProgress, shareCardLines, startOfWeek } from './social'

describe('shareCardLines', () => {
  it('shares effort and joy, never the Score', () => {
    const lines = shareCardLines({ name: 'Ingrid', choreography: 'Northern Steps', item: 'Part 1: Opening', done: false, roundsThisWeek: 4 })
    expect(lines.headline).toBe('Ingrid learned Part 1: Opening')
    expect(lines.detail).toBe('of Northern Steps')
    expect(lines.effort).toBe('4 practice rounds this week')
    expect(JSON.stringify(lines)).not.toMatch(/score|\/100|%/i)
  })

  it('celebrates the whole Choreography and uses the singular for one round', () => {
    const lines = shareCardLines({ name: 'Ingrid', choreography: 'Northern Steps', item: 'Whole', done: true, roundsThisWeek: 1 })
    expect(lines.headline).toBe('Ingrid danced all of Northern Steps')
    expect(lines.effort).toBe('1 practice round this week')
  })
})

describe('startOfWeek', () => {
  it('is Monday at midnight', () => {
    const d = startOfWeek(new Date(2026, 10, 12, 15, 30)) // Thursday 12 Nov 2026
    expect([d.getFullYear(), d.getMonth(), d.getDate(), d.getHours()]).toEqual([2026, 10, 9, 0])
    expect(startOfWeek(new Date(2026, 10, 15, 9)).getDate()).toBe(9) // Sunday belongs to the same week
  })
})

describe('classProgress', () => {
  it('adds the Dancer’s rounds to the class and stops at the goal', () => {
    expect(classProgress({ goal: 50, doneByOthers: 38 }, 3)).toEqual({ done: 41, goal: 50, mine: 3, reached: false })
    expect(classProgress({ goal: 50, doneByOthers: 48 }, 5)).toEqual({ done: 50, goal: 50, mine: 5, reached: true })
  })
})
