import { z } from 'zod'

export const FeedbackRequestSchema = z.object({
  overall: z.number().min(0).max(100),
  segments: z.array(z.object({ index: z.number().int().min(0), score: z.number().min(0).max(100) })).max(50),
  strengths: z.array(z.string().max(60)).max(8),
  faults: z
    .array(
      z.object({
        id: z.string().max(10),
        title: z.string().max(120),
        start: z.number().min(0),
        end: z.number().min(0),
        degrees: z.number().min(0).max(180),
      }),
    )
    .max(5),
  /** Who the Coach speaks as: the Mascot's name and tone (web/src/mascot/settings.ts). */
  voice: z.object({ name: z.string().max(40), tone: z.string().max(400) }).optional(),
  /** The Plan's next step, already decided by fixed rules (ADR 0004). The Coach explains it, never changes it. */
  plan: z
    .object({
      decision: z.enum(['next', 'combine', 'done', 'full-speed', 'repeat', 'slower', 'easier']),
      nextStep: z.string().max(200),
      weakestAreas: z.array(z.string().max(30)).max(3),
      ghostDelta: z.number().min(-100).max(100).nullable(),
    })
    .optional(),
})

export type FeedbackRequest = z.infer<typeof FeedbackRequestSchema>

export const FeedbackSchema = z.object({
  headline: z.string(),
  summary: z.string(),
  tips: z.array(z.object({ id: z.string(), tip: z.string(), drill: z.string() })),
})

export type Feedback = z.infer<typeof FeedbackSchema>
