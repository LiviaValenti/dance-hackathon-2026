import { useEffect, useRef } from 'react'
import { JOINTS, type JointAngles, type JointName } from '../analysis/angles'
import { WARN_DIFF_DEG } from '../analysis/score'
import type { Point } from '../pose/types'

const BONES: Array<[number, number]> = [
  [11, 12], [11, 13], [13, 15], [12, 14], [14, 16],
  [11, 23], [12, 24], [23, 24], [23, 25], [25, 27], [24, 26], [26, 28],
]

type Props = {
  points: Point[] | null
  width: number
  height: number
  diffs?: JointAngles
  label: string
  displayHeight?: number
}

export function SkeletonCanvas({ points, width, height, diffs, label, displayHeight = 360 }: Props) {
  const ref = useRef<HTMLCanvasElement>(null)
  const displayWidth = Math.round((displayHeight * width) / height)

  useEffect(() => {
    const ctx = ref.current?.getContext('2d')
    if (!ctx) return
    const s = displayHeight / height
    ctx.clearRect(0, 0, displayWidth, displayHeight)
    if (!points) return

    ctx.lineCap = 'round'
    ctx.lineWidth = 4
    ctx.strokeStyle = '#E8EAEE'
    for (const [a, b] of BONES) {
      ctx.beginPath()
      ctx.moveTo(points[a].x * s, points[a].y * s)
      ctx.lineTo(points[b].x * s, points[b].y * s)
      ctx.stroke()
    }
    ctx.beginPath()
    ctx.arc(points[0].x * s, points[0].y * s, 10, 0, Math.PI * 2)
    ctx.stroke()

    for (const name of Object.keys(JOINTS) as JointName[]) {
      const p = points[JOINTS[name][1]]
      const warn = diffs && diffs[name] > WARN_DIFF_DEG
      ctx.fillStyle = warn ? '#FF8A3D' : '#7FB2FF'
      ctx.beginPath()
      ctx.arc(p.x * s, p.y * s, warn ? 8 : 5, 0, Math.PI * 2)
      ctx.fill()
    }
  }, [points, diffs, width, height, displayHeight, displayWidth])

  return (
    <figure className="skeleton">
      <canvas ref={ref} width={displayWidth} height={displayHeight} role="img" aria-label={`Skjelett: ${label}`} />
      <figcaption>{label}</figcaption>
    </figure>
  )
}
