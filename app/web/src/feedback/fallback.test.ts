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

describe('fallbackFeedback with a Plan', () => {
  it('explains the Plan’s next step and the gain on the Ghost', () => {
    const fb = fallbackFeedback({
      overall: 55, segments: [], strengths: [], faults: [],
      plan: { decision: 'slower', nextStep: 'Once more at 75% speed.', weakestAreas: ['Arms'], ghostDelta: 6 },
    })
    expect(fb.summary).toContain('6 up on your Ghost. Once more at 75% speed.')
  })
})
