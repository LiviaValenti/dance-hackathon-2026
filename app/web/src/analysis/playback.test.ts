import { describe, expect, it } from 'vitest'
import { stepAtTime, syncRate } from './playback'

describe('stepAtTime', () => {
  const times = [0, 0.1, 0.1, 0.2, 0.4]
  it('finds the last step at or before the time', () => {
    expect(stepAtTime(times, 0)).toBe(0)
    expect(stepAtTime(times, 0.15)).toBe(2)
    expect(stepAtTime(times, 0.39)).toBe(3)
    expect(stepAtTime(times, 9)).toBe(4)
    expect(stepAtTime(times, -1)).toBe(0)
  })
})

describe('syncRate', () => {
  it('nudges the speed for small drift and seeks for large drift', () => {
    expect(syncRate(1, 1)).toEqual({ seek: false, rate: 1 })
    expect(syncRate(1, 1.1).rate).toBeGreaterThan(1)
    expect(syncRate(1.1, 1).rate).toBeLessThan(1)
    expect(syncRate(1, 2)).toEqual({ seek: true, rate: 1 })
  })
})
