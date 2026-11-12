import { describe, expect, it } from 'vitest'
import { dtw } from './dtw'

const abs = (x: number, y: number) => Math.abs(x - y)

describe('dtw', () => {
  it('gives a diagonal path and cost 0 for equal sequences', () => {
    const r = dtw([1, 2, 3], [1, 2, 3], abs)
    expect(r.cost).toBe(0)
    expect(r.path).toEqual([[0, 0], [1, 1], [2, 2]])
  })

  it('aligns a slower version to the right place', () => {
    const r = dtw([0, 1, 2, 3], [0, 0, 1, 1, 2, 2, 3, 3], abs)
    expect(r.cost).toBe(0)
    expect(r.path[0]).toEqual([0, 0])
    expect(r.path[r.path.length - 1]).toEqual([3, 7])
    for (const [i, j] of r.path) expect([0, 0, 1, 1, 2, 2, 3, 3][j]).toBe([0, 1, 2, 3][i])
  })

  it('gives infinite cost for an empty sequence', () => {
    expect(dtw([], [1], abs).cost).toBe(Infinity)
  })
})
