import { formatSpan } from '../formatTime'
import type { Feedback, FeedbackRequest } from './types'

function headlineFor(score: number): string {
  if (score >= 85) return 'Sterkt! Du er nesten i mål'
  if (score >= 65) return 'God fremgang, du er på vei'
  return 'Fin start, nå bygger vi videre'
}

export function fallbackFeedback(req: FeedbackRequest): Feedback {
  const best = req.strengths[0]
  const first = req.faults[0]
  const summary = [
    best ? `${best} sitter godt.` : 'Du har fått med deg hovedbevegelsene.',
    first ? `Neste steg: ${first.title.toLowerCase()}.` : 'Fortsett å øve for å finpusse detaljene.',
  ].join(' ')
  const tips = req.faults.map((f) => {
    const span = formatSpan(f.start, f.end)
    return {
      id: f.id,
      tip: `${f.title} i ${span}. Se på referansen i sakte film og kjenn etter i kroppen.`,
      drill: `Øv på ${span} i 0.75× tempo, 3 ganger, før du prøver i full fart.`,
    }
  })
  return { headline: headlineFor(req.overall), summary, tips }
}
