import { describe, expect, it } from 'vitest'
import { content } from './content'

const levelIds = content.levels.map((l) => l.id)
const styleIds = content.styles.map((s) => s.id)
const acheIds = content.aches.map((a) => a.id)
const references = [...content.levelCheck.map((m) => m.reference), ...content.choreographies.map((c) => c.reference)]

describe('content', () => {
  it('has one Level-check move per Level', () => {
    expect(content.levelCheck.map((m) => m.level).sort()).toEqual([...levelIds].sort())
  })

  it('has at least one non-studio Choreography per Level', () => {
    for (const level of levelIds) {
      expect(content.choreographies.some((c) => c.level === level && !c.studio)).toBe(true)
    }
  })

  it('has exactly one studio Choreography', () => {
    expect(content.choreographies.filter((c) => c.studio)).toHaveLength(1)
  })

  it('uses unique Choreography ids and known styles, Levels and aches', () => {
    const ids = content.choreographies.map((c) => c.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const c of content.choreographies) {
      expect(styleIds).toContain(c.style)
      expect(levelIds).toContain(c.level)
      for (const a of c.strains) expect(acheIds).toContain(a)
    }
  })

  it('gives every Reference a Tempo and a valid range', () => {
    for (const r of references) {
      expect(r.tempo).toBeGreaterThan(0)
      expect(r.end).toBeGreaterThan(r.start)
      expect(r.video).toMatch(/^\/content\//)
    }
  })

  it('keeps Parts in order, inside the Reference and without overlap', () => {
    for (const c of content.choreographies) {
      expect(c.parts.length).toBeGreaterThan(0)
      expect(new Set(c.parts.map((p) => p.id)).size).toBe(c.parts.length)
      let previousEnd = c.reference.start
      for (const p of c.parts) {
        expect(p.start).toBeGreaterThanOrEqual(previousEnd - 1e-9)
        expect(p.end).toBeGreaterThan(p.start)
        expect(p.end).toBeLessThanOrEqual(c.reference.end + 1e-9)
        previousEnd = p.end
      }
    }
  })
})
