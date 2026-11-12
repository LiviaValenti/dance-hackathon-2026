import type { Studio } from '../content/types'
import { text } from '../text'

/** What a share card says. Effort and joy only, never the Score (use-case-2-research/konsept.md). */
export function shareCardLines(o: { name: string; choreography: string; item: string; done: boolean; roundsThisWeek: number }) {
  const t = text.share
  return {
    headline: o.done ? t.headlineDone(o.name, o.choreography) : t.headline(o.name, o.item),
    detail: o.done ? t.detailDone : t.detail(o.choreography),
    effort: t.effort(o.roundsThisWeek),
  }
}

/** Monday 00:00 of the week `now` is in. */
export function startOfWeek(now: Date): Date {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  return d
}

/** The class challenge with the Dancer's own rounds added to the bundled example count. */
export function classProgress(challenge: Studio['challenge'], mine: number) {
  const done = Math.min(challenge.goal, challenge.doneByOthers + mine)
  return { done, goal: challenge.goal, mine, reached: done >= challenge.goal }
}
