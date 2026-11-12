import type { Point } from './types'

/**
 * Following a chosen dancer in a group: MediaPipe often finds only the most visible person, so each
 * frame is cropped to a vertical strip around the dancer before detection.
 */
export const CROP_FRACTION = 0.5

/** The strip (in pixels) centred on cx (normalised), kept inside the frame. */
export function cropWindow(cx: number, width: number, fraction = CROP_FRACTION): { x0: number; w: number } {
  const w = Math.round(width * fraction)
  const x0 = Math.min(width - w, Math.max(0, Math.round(cx * width - w / 2)))
  return { x0, w }
}

/** Maps poses found in the strip back to normalised coordinates of the whole frame. */
export function uncrop(poses: Point[][], x0: number, w: number, width: number): Point[][] {
  return poses.map((pose) => pose.map((p) => ({ ...p, x: (x0 + p.x * w) / width })))
}
