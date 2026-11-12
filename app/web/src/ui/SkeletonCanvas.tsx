import { useEffect, useRef } from 'react'
import type { JointAngles } from '../analysis/angles'
import type { Point } from '../pose/types'
import { drawSkeleton, PLAIN_STYLE } from './drawSkeleton'
import { text } from '../text'

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
    if (points) drawSkeleton(ctx, points, s, PLAIN_STYLE, diffs)
  }, [points, diffs, width, height, displayHeight, displayWidth])

  return (
    <figure className="skeleton">
      <canvas ref={ref} width={displayWidth} height={displayHeight} role="img" aria-label={text.skeleton.label(label)} />
      <figcaption>{label}</figcaption>
    </figure>
  )
}
