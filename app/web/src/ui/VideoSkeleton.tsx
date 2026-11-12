import { useEffect, useRef, type RefObject } from 'react'
import type { JointAngles } from '../analysis/angles'
import type { Point } from '../pose/types'
import { drawSkeleton, VIDEO_STYLE } from './drawSkeleton'
import { text } from '../text'

type Props = {
  src: string
  /** Seconds in the video to show. */
  t: number
  points: Point[] | null
  /** Video size in pixels; the poses are in these coordinates. */
  width: number
  height: number
  diffs?: JointAngles
  label: string
  mirrored?: boolean
  /** While the parent plays the video itself, it is not seeked to t. */
  playing?: boolean
  videoRef?: RefObject<HTMLVideoElement | null>
}

/** A video frame with the pose drawn on top, so the Dancer sees where to improve on the real body. */
export function VideoSkeleton({ src, t, points, width, height, diffs, label, mirrored, playing, videoRef }: Props) {
  const own = useRef<HTMLVideoElement>(null)
  const video = videoRef ?? own
  const canvas = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const v = video.current
    if (!v || playing) return
    const seek = () => { if (Math.abs(v.currentTime - t) > 0.02) v.currentTime = t }
    if (v.readyState >= 1) seek()
    else v.addEventListener('loadedmetadata', seek, { once: true })
  }, [t, playing, video])

  useEffect(() => {
    const ctx = canvas.current?.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, width, height)
    const unit = Math.max(width, height) / 160
    if (points) drawSkeleton(ctx, points, 1, { ...VIDEO_STYLE, line: unit, radius: unit * 1.3 }, diffs)
  }, [points, diffs, width, height])

  return (
    <figure className="video-skeleton">
      <div className={mirrored ? 'video-skeleton-frame mirrored' : 'video-skeleton-frame'} style={{ aspectRatio: `${width} / ${height}` }}>
        <video ref={video} src={src} muted playsInline preload="auto" aria-hidden="true" />
        <canvas ref={canvas} width={width} height={height} role="img" aria-label={text.skeleton.label(label)} />
      </div>
      <figcaption className="pane-label">{label}</figcaption>
    </figure>
  )
}
