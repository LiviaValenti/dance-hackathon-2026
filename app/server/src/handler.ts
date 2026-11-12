import Anthropic from '@anthropic-ai/sdk'
import { FeedbackRequestSchema } from './schema.ts'
import { generateFeedback } from './feedback.ts'

export const MAX_BODY_BYTES = 64 * 1024

let client: Anthropic | undefined

/** POST /api/feedback, shared by the local server (index.ts) and the Vercel function (../../api/feedback.ts). */
export async function handleFeedback(raw: string): Promise<{ status: number; body: unknown }> {
  if (raw.length > MAX_BODY_BYTES) return { status: 413, body: { error: 'too_large' } }
  let body: unknown
  try {
    body = JSON.parse(raw)
  } catch {
    return { status: 400, body: { error: 'invalid_json' } }
  }
  const parsed = FeedbackRequestSchema.safeParse(body)
  if (!parsed.success) return { status: 400, body: { error: 'invalid_request' } }
  try {
    client ??= new Anthropic()
    return { status: 200, body: await generateFeedback(client, parsed.data) }
  } catch (e) {
    console.error('Feedback failed:', e)
    return { status: 502, body: { error: 'feedback_failed' } }
  }
}
