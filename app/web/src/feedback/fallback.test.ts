import { describe, expect, it } from 'vitest'
import { fallbackFeedback } from './fallback'

describe('fallbackFeedback', () => {
  it('gives one tip per fault with the same id', () => {
    const fb = fallbackFeedback({
      overall: 72,
      segments: [],
      strengths: ['Right knee'],
      faults: [{ id: 'f1', title: 'Raise your right arm higher', start: 4, end: 5, degrees: 30 }],
    })
    expect(fb.headline).toBe('Good progress, you are on your way')
    expect(fb.summary).toContain('Right knee is looking good')
    expect(fb.tips).toHaveLength(1)
    expect(fb.tips[0].id).toBe('f1')
    expect(fb.tips[0].drill).toContain('0:04–0:05')
  })
})
