import type { PracticeItem } from '../../plan/plan'
import { text } from '../../text'

export const itemTitle = (item: PracticeItem, index: number) =>
  item.part ? text.plan.partTitle(index + 1, item.part.title) : text.plan.whole
