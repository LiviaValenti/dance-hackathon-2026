import type { Point } from '../pose/types'

/** Standing figure with 33 visible points. Elbow angles in degrees (180 = straight arm). */
export function makePose(opts: { leftElbow?: number; rightElbow?: number } = {}): Point[] {
  const pts: Point[] = Array.from({ length: 33 }, () => ({ x: 100, y: 50, visibility: 1 }))
  const set = (i: number, x: number, y: number) => { pts[i] = { x, y, visibility: 1 } }
  set(11, 120, 100); set(12, 80, 100)   // shoulders
  set(13, 120, 150); set(14, 80, 150)   // elbows
  set(23, 115, 200); set(24, 85, 200)   // hips
  set(25, 115, 260); set(26, 85, 260)   // knees
  set(27, 115, 320); set(28, 85, 320)   // ankles
  const wrist = (elbowIdx: number, angle: number) => {
    const phi = ((180 - angle) * Math.PI) / 180
    const e = pts[elbowIdx]
    return { x: e.x + 50 * Math.sin(phi), y: e.y + 50 * Math.cos(phi), visibility: 1 }
  }
  pts[15] = wrist(13, opts.leftElbow ?? 180)
  pts[16] = wrist(14, opts.rightElbow ?? 180)
  return pts
}
