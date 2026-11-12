import { describe, expect, it } from 'vitest'
import { formatSpan, formatTime } from './formatTime'

describe('formatTime', () => {
  it('formats seconds as m:ss', () => {
    expect(formatTime(4.2)).toBe('0:04')
    expect(formatTime(65)).toBe('1:05')
    expect(formatTime(-1)).toBe('0:00')
  })
})

describe('formatSpan', () => {
  it('uses m:ss for ranges over several seconds', () => {
    expect(formatSpan(4, 5.2)).toBe('0:04–0:05')
  })
  it('uses tenths when the range is within the same second', () => {
    expect(formatSpan(0.3, 0.8)).toBe('0.3–0.8 s')
  })
})
