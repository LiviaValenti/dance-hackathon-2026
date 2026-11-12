import { describe, expect, it } from 'vitest'
import { levelCheckRule } from './rule'

describe('levelCheckRule', () => {
  it('moves up one Level at 85 or more', () => {
    expect(levelCheckRule('beginner', 85)).toEqual({ level: 'intermediate', change: 'up' })
    expect(levelCheckRule('intermediate', 97)).toEqual({ level: 'advanced', change: 'up' })
  })

  it('confirms the stated Level from 50 to 84', () => {
    expect(levelCheckRule('intermediate', 50)).toEqual({ level: 'intermediate', change: 'confirmed' })
    expect(levelCheckRule('intermediate', 84)).toEqual({ level: 'intermediate', change: 'confirmed' })
  })

  it('moves down one Level below 50', () => {
    expect(levelCheckRule('advanced', 49)).toEqual({ level: 'intermediate', change: 'down' })
    expect(levelCheckRule('intermediate', 10)).toEqual({ level: 'beginner', change: 'down' })
  })

  it('stays within the Levels at the top and bottom', () => {
    expect(levelCheckRule('advanced', 95)).toEqual({ level: 'advanced', change: 'confirmed' })
    expect(levelCheckRule('beginner', 20)).toEqual({ level: 'beginner', change: 'confirmed' })
  })

  it('starts at Beginner when the Dancer does not know', () => {
    expect(levelCheckRule('unknown')).toEqual({ level: 'beginner', change: 'start' })
  })
})
