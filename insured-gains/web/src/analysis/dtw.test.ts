import { describe, expect, it } from 'vitest'
import { dtw } from './dtw'

const abs = (x: number, y: number) => Math.abs(x - y)

describe('dtw', () => {
  it('gir diagonal sti og kost 0 for like sekvenser', () => {
    const r = dtw([1, 2, 3], [1, 2, 3], abs)
    expect(r.cost).toBe(0)
    expect(r.path).toEqual([[0, 0], [1, 1], [2, 2]])
  })

  it('kobler en saktere versjon til riktig sted', () => {
    const r = dtw([0, 1, 2, 3], [0, 0, 1, 1, 2, 2, 3, 3], abs)
    expect(r.cost).toBe(0)
    expect(r.path[0]).toEqual([0, 0])
    expect(r.path[r.path.length - 1]).toEqual([3, 7])
    for (const [i, j] of r.path) expect([0, 0, 1, 1, 2, 2, 3, 3][j]).toBe([0, 1, 2, 3][i])
  })

  it('gir uendelig kost for tom sekvens', () => {
    expect(dtw([], [1], abs).cost).toBe(Infinity)
  })
})
