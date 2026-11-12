import Anthropic from '@anthropic-ai/sdk'
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'
import { FeedbackSchema, type Feedback, type FeedbackRequest } from './schema.ts'

export const SYSTEM_PROMPT = `Du er dansecoach i en app der brukeren sammenligner sitt eget forsøk med en referansevideo.
Du får analysen som JSON: total score (0–100), score per del (ca. 4 sekunder hver), styrker (ledd som matchet godt)
og feil (id, kort beskrivelse, tidsrom i sekunder og avvik i grader).

Skriv tilbakemelding på norsk bokmål med growth mindset: ærlig, varm og konkret. Fremgang kommer av øving.
- headline: én kort, oppmuntrende setning, maks 8 ord, som passer nivået.
- summary: 2–3 setninger. Start med det som sitter, nevn så det viktigste neste steget.
- tips: nøyaktig ett element per feil, med samme id som feilen.
  tip: én konkret setning om hva kroppen skal gjøre, gjerne med et bilde («tenk at fingertuppene strekker seg mot taket»).
  drill: én kort øvelse brukeren kan gjøre nå, med tempo eller antall repetisjoner.
Ikke skriv gradtall. Ikke gi medisinske råd eller diagnoser. Ikke finn på feil som ikke står i analysen.`

export function toUserMessage(req: FeedbackRequest): string {
  return `Analyse av forsøket:\n${JSON.stringify(req, null, 2)}`
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
    throw new Error(`Ingen tilbakemelding (stop_reason: ${response.stop_reason})`)
  }
  return response.parsed_output
}
