import { describe, expect, it } from 'vitest'
import { faultTitle } from './faultText'

describe('faultTitle', () => {
  it('builds a concrete tip from joint and direction', () => {
    expect(faultTitle({ joint: 'leftShoulder', direction: 'smaller' })).toBe('Raise your left arm higher')
    expect(faultTitle({ joint: 'rightKnee', direction: 'larger' })).toBe('Bend your right knee more')
    expect(faultTitle({ joint: 'rightElbow', direction: 'smaller' })).toBe('Straighten your right arm more')
  })
})
