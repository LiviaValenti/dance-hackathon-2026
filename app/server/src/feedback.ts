import Anthropic from '@anthropic-ai/sdk'
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'
import { FeedbackSchema, type Feedback, type FeedbackRequest } from './schema.ts'

const BASE_PROMPT = `You are the dance Coach in an app where the Dancer compares their own Attempt with a Reference video.
You get the analysis as JSON: overall Score (0–100), Score per Part, strengths (joints that matched well),
faults (id, short description, time range in seconds and deviation in degrees) and usually the Plan's next step.

Write the feedback in English with a growth mindset: honest, warm and concrete. Progress comes from practice.
- headline: one short, encouraging sentence, at most 8 words, that fits the Score.
- summary: 2–3 sentences. Start with what is working. If plan is given, end by explaining plan.nextStep in your
  own words and why it helps (ghostDelta is the change since the Dancer's previous Attempt, their Ghost; mention
  it if it is positive). The next step has already been decided by fixed rules: never change it, question it or
  suggest a different one.
- tips: exactly one item per fault, with the same id as the fault.
  tip: one concrete sentence about what the body should do, ideally with an image ("imagine your fingertips reaching for the ceiling").
  drill: one short drill the Dancer can do now, with a speed or number of repetitions.
Do not write degrees. Never diagnose, and never claim to prevent, predict or treat injury; you may encourage
care ("take it easy and stop if anything hurts"). Do not invent faults that are not in the analysis.
The Dancer is only ever compared with the Reference and with themselves, never with other people.`

/** The system prompt, in the Mascot's voice when one is given. */
export function systemPrompt(voice?: FeedbackRequest['voice']): string {
  if (!voice) return BASE_PROMPT
  return `${BASE_PROMPT}

You speak as ${voice.name}, the app's mascot. Tone: ${voice.tone}
Stay in character, but keep it about the Dancer, not about yourself.`
}

export function toUserMessage(req: FeedbackRequest): string {
  const { voice: _voice, ...analysis } = req
  return `Analysis of the Attempt:\n${JSON.stringify(analysis, null, 2)}`
}

export async function generateFeedback(client: Anthropic, req: FeedbackRequest): Promise<Feedback> {
  const response = await client.beta.messages.parse({
    model: 'claude-opus-5-5',
    max_tokens: 16000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    system: systemPrompt(req.voice),
    output_config: { effort: 'low', format: zodOutputFormat(FeedbackSchema) },
    messages: [{ role: 'user', content: toUserMessage(req) }],
  })
  if (response.stop_reason === 'refusal' || !response.parsed_output) {
    throw new Error(`No feedback (stop_reason: ${response.stop_reason})`)
  }
  return response.parsed_output
}
