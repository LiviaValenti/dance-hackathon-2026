import { describe, expect, it } from 'vitest'
import { formatTime } from './formatTime'

describe('formatTime', () => {
  it('formatterer sekunder som m:ss', () => {
    expect(formatTime(4.2)).toBe('0:04')
    expect(formatTime(65)).toBe('1:05')
    expect(formatTime(-1)).toBe('0:00')
  })
})
