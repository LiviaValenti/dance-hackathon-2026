import { describe, expect, it } from 'vitest'
import { createPersonSelector, poseCenter } from './person'
import type { Point } from './types'

function person(x: number, y = 0.55, visibility = 1): Point[] {
  const points: Point[] = Array.from({ length: 33 }, () => ({ x, y, visibility }))
  points[23] = { x: x + 0.02, y, visibility }
  points[24] = { x: x - 0.02, y, visibility }
  return points
}

describe('person selection', () => {
  it('returns nothing when no one is visible', () => {
    const selector = createPersonSelector()
    expect(selector.pick([])).toBeNull()
    expect(selector.pick([person(0.5, 0.5, 0.1)])).toBeNull()
    expect(poseCenter(person(0.5, 0.5, 0.1))).toBeNull()
  })

  it('picks the person nearest the middle', () => {
    const middle = person(0.52)
    expect(createPersonSelector().pick([person(0.15), middle, person(0.85)])).toBe(middle)
  })

  it('keeps following the same person when someone else gets closer to the middle', () => {
    const selector = createPersonSelector()
    const first = person(0.4)
    expect(selector.pick([first, person(0.8)])).toBe(first)
    const moved = person(0.5)
    expect(selector.pick([moved, person(0.6)])).toBe(moved)
    const next = person(0.58)
    expect(selector.pick([person(0.5, 0.55), next, person(0.9)])).not.toBe(next)
  })

  it('does not jump to someone else when the followed person disappears', () => {
    const selector = createPersonSelector(0.3, 3)
    selector.pick([person(0.3)])
    expect(selector.pick([person(0.85)])).toBeNull()
    expect(selector.pick([person(0.85)])).toBeNull()
    expect(selector.pick([person(0.85)])).toBeNull()
    const other = person(0.85)
    expect(selector.pick([other])).toBe(other)
  })

  it('can be reset', () => {
    const selector = createPersonSelector()
    selector.pick([person(0.2)])
    selector.reset()
    const middle = person(0.5)
    expect(selector.pick([person(0.9), middle])).toBe(middle)
  })

  it('starts from a chosen dancer instead of the middle', () => {
    const left = person(0.2)
    expect(createPersonSelector(0.2, 5, { x: 0.2, y: 0.55 }).pick([person(0.5), left, person(0.8)])).toBe(left)
  })

  it('looks for the chosen dancer where they were picked after losing them', () => {
    const selector = createPersonSelector(0.2, 2, { x: 0.2, y: 0.55 })
    selector.pick([person(0.2)])
    expect(selector.pick([person(0.6)])).toBeNull()
    expect(selector.pick([person(0.6)])).toBeNull()
    const back = person(0.22)
    expect(selector.pick([person(0.5), back])).toBe(back)
  })
})
