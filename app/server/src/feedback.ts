import Anthropic from '@anthropic-ai/sdk'
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'
import { FeedbackSchema, type Feedback, type FeedbackRequest } from './schema.ts'

export const SYSTEM_PROMPT = `You are the dance Coach in an app where the Dancer compares their own Attempt with a Reference video.
You get the analysis as JSON: overall Score (0–100), Score per Part (about 4 seconds each), strengths (joints that matched well)
and faults (id, short description, time range in seconds and deviation in degrees).

Write the feedback in English with a growth mindset: honest, warm and concrete. Progress comes from practice.
- headline: one short, encouraging sentence, at most 8 words, that fits the level.
- summary: 2–3 sentences. Start with what is working, then name the most important next step.
- tips: exactly one item per fault, with the same id as the fault.
  tip: one concrete sentence about what the body should do, ideally with an image ("imagine your fingertips reaching for the ceiling").
  drill: one short drill the Dancer can do now, with a speed or number of repetitions.
Do not write degrees. Do not give medical advice or diagnoses. Do not invent faults that are not in the analysis.`

export function toUserMessage(req: FeedbackRequest): string {
  return `Analysis of the Attempt:\n${JSON.stringify(req, null, 2)}`
}

export async function generateFeedback(client: Anthropic, req: FeedbackRequest): Promise<Feedback> {
  const response = await client.beta.messages.parse({
    model: 'claude-opus-5-5',
    max_tokens: 16000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    system: SYSTEM_PROMPT,
    output_config: { effort: 'low', format: zodOutputFormat(FeedbackSchema) },
    messages: [{ role: 'user', content: toUserMessage(req) }],
  })
  if (response.stop_reason === 'refusal' || !response.parsed_output) {
    throw new Error(`No feedback (stop_reason: ${response.stop_reason})`)
  }
  return response.parsed_output
}
