import { describe, expect, it } from 'vitest'
import { FeedbackRequestSchema } from './schema.ts'
import { toUserMessage } from './feedback.ts'

const valid = {
  overall: 78,
  segments: [{ index: 1, score: 84 }],
  strengths: ['Left knee'],
  faults: [{ id: 'f1', title: 'Raise your right arm higher', start: 4, end: 5.2, degrees: 38 }],
}

describe('FeedbackRequestSchema', () => {
  it('accepts a valid summary', () => {
    expect(FeedbackRequestSchema.safeParse(valid).success).toBe(true)
  })
  it('rejects a Score outside 0–100 and too many faults', () => {
    expect(FeedbackRequestSchema.safeParse({ ...valid, overall: 140 }).success).toBe(false)
    expect(FeedbackRequestSchema.safeParse({ ...valid, faults: Array(6).fill(valid.faults[0]) }).success).toBe(false)
  })
})

describe('toUserMessage', () => {
  it('includes the faults in the message to the model', () => {
    expect(toUserMessage(valid)).toContain('Raise your right arm higher')
  })
})
