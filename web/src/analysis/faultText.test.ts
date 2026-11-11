import { describe, expect, it } from 'vitest'
import { faultTitle } from './faultText'

describe('faultTitle', () => {
  it('lager konkret tips ut fra ledd og retning', () => {
    expect(faultTitle({ joint: 'leftShoulder', direction: 'smaller' })).toBe('Løft venstre arm høyere')
    expect(faultTitle({ joint: 'rightKnee', direction: 'larger' })).toBe('Bøy høyre kne mer')
    expect(faultTitle({ joint: 'rightElbow', direction: 'smaller' })).toBe('Strekk høyre arm mer')
  })
})
