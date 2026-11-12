import { describe, expect, it } from 'vitest'
import { fallbackFeedback } from './fallback'

describe('fallbackFeedback', () => {
  it('gir ett tips per feil med samme id', () => {
    const fb = fallbackFeedback({
      overall: 72,
      segments: [],
      strengths: ['Høyre kne'],
      faults: [{ id: 'f1', title: 'Løft høyre arm høyere', start: 4, end: 5, degrees: 30 }],
    })
    expect(fb.headline).toBe('God fremgang, du er på vei')
    expect(fb.summary).toContain('Høyre kne sitter godt')
    expect(fb.tips).toHaveLength(1)
    expect(fb.tips[0].id).toBe('f1')
    expect(fb.tips[0].drill).toContain('0:04–0:05')
  })
})
