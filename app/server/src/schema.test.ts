import { describe, expect, it } from 'vitest'
import { FeedbackRequestSchema } from './schema.ts'
import { systemPrompt, toUserMessage } from './feedback.ts'

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

describe('Plan and voice', () => {
  const withPlan = {
    ...valid,
    voice: { name: 'Taktvekteren', tone: 'Warm and playful.' },
    plan: { decision: 'slower' as const, nextStep: 'Once more at 75% speed.', weakestAreas: ['Arms'], ghostDelta: 4 },
  }
  it('accepts the Plan decision and the voice', () => {
    expect(FeedbackRequestSchema.safeParse(withPlan).success).toBe(true)
  })
  it('rejects a decision the rules cannot make', () => {
    expect(FeedbackRequestSchema.safeParse({ ...withPlan, plan: { ...withPlan.plan, decision: 'diagnose' } }).success).toBe(false)
  })
  it('puts the voice in the system prompt and the Plan in the message', () => {
    expect(systemPrompt(withPlan.voice)).toContain('You speak as Taktvekteren')
    expect(systemPrompt()).not.toContain('You speak as')
    expect(toUserMessage(withPlan)).toContain('Once more at 75% speed.')
    expect(toUserMessage(withPlan)).not.toContain('Warm and playful')
  })
})
