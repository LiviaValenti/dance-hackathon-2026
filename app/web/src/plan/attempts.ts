import { load, save } from '../store/db'
import type { AreaScore } from '../analysis/bodyAreas'

/** What is kept of an Attempt (no video, ADR 0001/0003). The previous one is the Dancer's Ghost. */
export type AttemptRecord = { at: string; overall: number; areas: AreaScore[]; speed: number }

const MAX_ATTEMPTS = 50
const key = (choreographyId: string, itemId: string) => `attempts:${choreographyId}:${itemId}`

export async function loadAttempts(choreographyId: string, itemId: string): Promise<AttemptRecord[]> {
  return (await load<AttemptRecord[]>(key(choreographyId, itemId))) ?? []
}

export async function addAttempt(choreographyId: string, itemId: string, attempt: AttemptRecord): Promise<AttemptRecord[]> {
  const next = [...(await loadAttempts(choreographyId, itemId)), attempt].slice(-MAX_ATTEMPTS)
  await save(key(choreographyId, itemId), next)
  return next
}

/** Practice rounds on a Choreography's items, optionally since a date. */
export async function countRounds(choreographyId: string, itemIds: string[], since?: Date): Promise<number> {
  const all = await Promise.all(itemIds.map((id) => loadAttempts(choreographyId, id)))
  return all.flat().filter((a) => !since || new Date(a.at) >= since).length
}
