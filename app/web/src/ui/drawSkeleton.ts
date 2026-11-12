import { JOINTS, type JointAngles, type JointName } from '../analysis/angles'
import { WARN_DIFF_DEG } from '../analysis/score'
import type { Point } from '../pose/types'

const BONES: Array<[number, number]> = [
  [11, 12], [11, 13], [13, 15], [12, 14], [14, 16],
  [11, 23], [12, 24], [23, 24], [23, 25], [25, 27], [24, 26], [26, 28],
]

export type SkeletonStyle = {
  bone: string
  joint: string
  warn: string
  /** Drawn under each bone so it stands out on video; omit for a plain background. */
  outline?: string
  /** Line width and joint radius in canvas pixels. */
  line: number
  radius: number
}

// Theme colours (see index.css): ink, cobalt and coral on cream; white, mint and coral on video.
export const PLAIN_STYLE: SkeletonStyle = { bone: '#1B1F3B', joint: '#2347D9', warn: '#FF6B5B', line: 4, radius: 5 }
export const VIDEO_STYLE: Omit<SkeletonStyle, 'line' | 'radius'> = { bone: '#FFFFFF', joint: '#3DD6A3', warn: '#FF6B5B', outline: 'rgba(27, 31, 59, 0.55)' }

/** Draws a pose scaled by `scale`; joints deviating more than WARN_DIFF_DEG are larger and coral. */
export function drawSkeleton(ctx: CanvasRenderingContext2D, points: Point[], scale: number, style: SkeletonStyle, diffs?: JointAngles) {
  const at = (i: number) => [points[i].x * scale, points[i].y * scale] as const
  ctx.lineCap = 'round'
  const strokes: Array<[string, number]> = style.outline ? [[style.outline, style.line * 2], [style.bone, style.line]] : [[style.bone, style.line]]
  for (const [color, width] of strokes) {
    ctx.strokeStyle = color
    ctx.lineWidth = width
    for (const [a, b] of BONES) {
      ctx.beginPath()
      ctx.moveTo(...at(a))
      ctx.lineTo(...at(b))
      ctx.stroke()
    }
    ctx.beginPath()
    ctx.arc(...at(0), style.radius * 2, 0, Math.PI * 2)
    ctx.stroke()
  }
  for (const name of Object.keys(JOINTS) as JointName[]) {
    const warn = !!diffs && diffs[name] > WARN_DIFF_DEG
    const [x, y] = at(JOINTS[name][1])
    if (warn) {
      ctx.fillStyle = 'rgba(255, 107, 91, 0.35)'
      ctx.beginPath()
      ctx.arc(x, y, style.radius * 3.2, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.fillStyle = warn ? style.warn : style.joint
    ctx.beginPath()
    ctx.arc(x, y, warn ? style.radius * 1.6 : style.radius, 0, Math.PI * 2)
    ctx.fill()
  }
}
