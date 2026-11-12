export type FeedbackRequest = {
  overall: number
  segments: Array<{ index: number; score: number }>
  strengths: string[]
  faults: Array<{ id: string; title: string; start: number; end: number; degrees: number }>
}

export type FeedbackTip = { id: string; tip: string; drill: string }

export type Feedback = { headline: string; summary: string; tips: FeedbackTip[] }
