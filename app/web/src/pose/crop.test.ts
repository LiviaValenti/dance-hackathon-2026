import { describe, expect, it } from 'vitest'
import { cropWindow, uncrop } from './crop'

describe('cropWindow', () => {
  it('centres a half-width strip on the dancer and keeps it inside the frame', () => {
    expect(cropWindow(0.5, 1000)).toEqual({ x0: 250, w: 500 })
    expect(cropWindow(0.1, 1000)).toEqual({ x0: 0, w: 500 })
    expect(cropWindow(0.95, 1000)).toEqual({ x0: 500, w: 500 })
  })
})

describe('uncrop', () => {
  it('maps strip coordinates back to the whole frame', () => {
    const [pose] = uncrop([[{ x: 0.5, y: 0.4, visibility: 1 }]], 500, 500, 1000)
    expect(pose[0]).toEqual({ x: 0.75, y: 0.4, visibility: 1 })
  })
})
