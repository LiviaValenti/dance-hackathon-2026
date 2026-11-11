import { describe, expect, it } from 'vitest'
import { historyKey, loadHistory, progressNote, saveAttempt, type KeyValueStore } from './history'

function memoryStore(): KeyValueStore {
  const m = new Map<string, string>()
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => { m.set(k, v) } }
}

const brokenStore: KeyValueStore = {
  getItem: () => { throw new Error('blocked') },
  setItem: () => { throw new Error('blocked') },
}

const key = historyKey({ name: 'heels.mp4', size: 1234 }, { start: 0, end: 8.04 })

describe('history', () => {
  it('nøkkelen skiller på fil og utsnitt', () => {
    expect(key).toBe('insured-gains:history:heels.mp4:1234:0.0-8.0')
  })

  it('lagrer og leser forsøk i rekkefølge', () => {
    const store = memoryStore()
    saveAttempt(store, key, { at: '1', overall: 60 })
    const h = saveAttempt(store, key, { at: '2', overall: 66 })
    expect(h.map((a) => a.overall)).toEqual([60, 66])
    expect(loadHistory(store, key)).toEqual(h)
  })

  it('fungerer uten lagring', () => {
    expect(loadHistory(null, key)).toEqual([])
    expect(saveAttempt(brokenStore, key, { at: '1', overall: 50 })).toEqual([{ at: '1', overall: 50 }])
  })
})

describe('progressNote', () => {
  it('beskriver endringen fra forrige forsøk', () => {
    expect(progressNote([{ at: '1', overall: 70 }])).toBeNull()
    expect(progressNote([{ at: '1', overall: 70 }, { at: '2', overall: 76 }])!.text).toBe('+6 fra forrige forsøk')
    expect(progressNote([{ at: '1', overall: 76 }, { at: '2', overall: 70 }])!.delta).toBe(-6)
  })
})
