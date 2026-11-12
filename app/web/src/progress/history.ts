import { text } from '../text'

export type Attempt = { at: string; overall: number }
export type KeyValueStore = Pick<Storage, 'getItem' | 'setItem'>

const PREFIX = 'dance:history:'
const MAX_ATTEMPTS = 50

export function historyKey(file: { name: string; size: number }, trim: { start: number; end: number }): string {
  return `${PREFIX}${file.name}:${file.size}:${trim.start.toFixed(1)}-${trim.end.toFixed(1)}`
}

export function loadHistory(store: KeyValueStore | null, key: string): Attempt[] {
  try {
    const raw = store?.getItem(key)
    const parsed: unknown = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? (parsed as Attempt[]) : []
  } catch {
    return []
  }
}

export function saveAttempt(store: KeyValueStore | null, key: string, attempt: Attempt): Attempt[] {
  const next = [...loadHistory(store, key), attempt].slice(-MAX_ATTEMPTS)
  try {
    store?.setItem(key, JSON.stringify(next))
  } catch {
    // Storage is blocked (private mode etc.); the history then only lasts for this session.
  }
  return next
}

export function progressNote(history: Attempt[]): { delta: number; text: string } | null {
  if (history.length < 2) return null
  const delta = history[history.length - 1].overall - history[history.length - 2].overall
  if (delta > 0) return { delta, text: text.progress.up(delta) }
  if (delta === 0) return { delta, text: text.progress.same }
  return { delta, text: text.progress.down(delta) }
}

export function browserStorage(): KeyValueStore | null {
  try {
    return window.localStorage
  } catch {
    return null
  }
}
