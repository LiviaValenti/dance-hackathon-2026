import { fallbackFeedback } from './fallback'
import type { Feedback, FeedbackRequest } from './types'

export async function getFeedback(req: FeedbackRequest): Promise<{ feedback: Feedback; source: 'ai' | 'fallback' }> {
  try {
    const res = await fetch('/api/feedback', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(req),
      signal: AbortSignal.timeout(30_000),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return { feedback: (await res.json()) as Feedback, source: 'ai' }
  } catch {
    return { feedback: fallbackFeedback(req), source: 'fallback' }
  }
}
