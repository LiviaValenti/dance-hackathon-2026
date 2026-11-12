import { formatSpan } from '../formatTime'
import type { Feedback, FeedbackRequest } from './types'
import { text } from '../text'

const t = text.fallbackFeedback

function headlineFor(score: number): string {
  if (score >= 85) return t.headlineHigh
  if (score >= 65) return t.headlineMid
  return t.headlineLow
}

export function fallbackFeedback(req: FeedbackRequest): Feedback {
  const best = req.strengths[0]
  const first = req.faults[0]
  const summary = [
    best ? t.strength(best) : t.noStrength,
    req.plan ? t.planStep(req.plan.nextStep, req.plan.ghostDelta) : first ? t.nextStep(first.title) : t.noFault,
  ].join(' ')
  const tips = req.faults.map((f) => {
    const span = formatSpan(f.start, f.end)
    return {
      id: f.id,
      tip: t.tip(f.title, span),
      drill: t.drill(span),
    }
  })
  return { headline: headlineFor(req.overall), summary, tips }
}
