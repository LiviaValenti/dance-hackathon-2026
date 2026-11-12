import { describe, expect, it } from 'vitest'
import { FeedbackRequestSchema } from './schema.ts'
import { toUserMessage } from './feedback.ts'

const valid = {
  overall: 78,
  segments: [{ index: 1, score: 84 }],
  strengths: ['Venstre kne'],
  faults: [{ id: 'f1', title: 'Løft høyre arm høyere', start: 4, end: 5.2, degrees: 38 }],
}

describe('FeedbackRequestSchema', () => {
  it('godtar et gyldig sammendrag', () => {
    expect(FeedbackRequestSchema.safeParse(valid).success).toBe(true)
  })
  it('avviser score utenfor 0–100 og for mange feil', () => {
    expect(FeedbackRequestSchema.safeParse({ ...valid, overall: 140 }).success).toBe(false)
    expect(FeedbackRequestSchema.safeParse({ ...valid, faults: Array(6).fill(valid.faults[0]) }).success).toBe(false)
  })
})

describe('toUserMessage', () => {
  it('tar med feilene i meldingen til modellen', () => {
    expect(toUserMessage(valid)).toContain('Løft høyre arm høyere')
  })
})
