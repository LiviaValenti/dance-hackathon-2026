import { FilesetResolver, PoseLandmarker, type NormalizedLandmark } from '@mediapipe/tasks-vision'
import { createPersonSelector, poseCenter, type Spot } from './person'
import { cropWindow, uncrop } from './crop'
import type { Point, PoseFrame, PoseSequence } from './types'

// The version must match the installed @mediapipe/tasks-vision.
const WASM_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.2.2/wasm'
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/1/pose_landmarker_full.task'

const MAX_PEOPLE = 4

export async function createLandmarker(): Promise<PoseLandmarker> {
  const fileset = await FilesetResolver.forVisionTasks(WASM_URL)
  return PoseLandmarker.createFromOptions(fileset, {
    baseOptions: { modelAssetPath: MODEL_URL, delegate: 'GPU' },
    runningMode: 'VIDEO',
    // Several people may be in view; createPersonSelector picks and follows one of them.
    numPoses: MAX_PEOPLE,
  })
}

/** The people visible at time t, as normalised poses with their centres, sorted left to right. */
export async function detectPeople(video: HTMLVideoElement, t: number): Promise<Array<{ center: Spot; pose: Point[] }>> {
  await waitForData(video)
  video.pause()
  await seek(video, t)
  const landmarker = await createLandmarker()
  try {
    const result = landmarker.detectForVideo(video, Math.round(t * 1000) + 1)
    return result.landmarks
      .map((lm) => lm.map((p) => ({ x: p.x, y: p.y, visibility: p.visibility ?? 0 })))
      .flatMap((pose) => { const center = poseCenter(pose); return center ? [{ center, pose }] : [] })
      .sort((a, b) => a.center.x - b.center.x)
  } finally {
    landmarker.close()
  }
}

const toPoints = (landmarks: NormalizedLandmark[][]): Point[][] =>
  landmarks.map((lm) => lm.map((p) => ({ x: p.x, y: p.y, visibility: p.visibility ?? 0 })))

/** Picks the followed person from a detection result (or normalised poses) and scales them to pixels. */
export function pickPerson(
  selector: ReturnType<typeof createPersonSelector>, landmarks: NormalizedLandmark[][] | Point[][], width: number, height: number,
): Point[] | null {
  const pose = selector.pick(toPoints(landmarks as NormalizedLandmark[][]))
  return pose ? pose.map((p) => ({ x: p.x * width, y: p.y * height, visibility: p.visibility })) : null
}

function waitForData(video: HTMLVideoElement): Promise<void> {
  if (video.readyState >= 2) return Promise.resolve()
  return new Promise((resolve) => video.addEventListener('loadeddata', () => resolve(), { once: true }))
}

function seek(video: HTMLVideoElement, t: number): Promise<void> {
  if (Math.abs(video.currentTime - t) < 1e-3) return Promise.resolve()
  return new Promise((resolve) => {
    video.addEventListener('seeked', () => resolve(), { once: true })
    video.currentTime = t
  })
}

/** Steps through the video at a fixed frame rate and finds the followed person's pose per frame. */
export async function extractPoses(
  video: HTMLVideoElement,
  opts: { fps?: number; start?: number; end?: number; follow?: Spot; onProgress?: (fraction: number) => void } = {},
): Promise<PoseSequence> {
  const fps = opts.fps ?? 15
  await waitForData(video)
  video.pause()
  const start = Math.max(0, opts.start ?? 0)
  const end = Math.min(opts.end ?? video.duration, video.duration)
  const total = Math.max(1, Math.floor((end - start) * fps))
  const landmarker = await createLandmarker()
  const selector = createPersonSelector(undefined, undefined, opts.follow)
  const frames: PoseFrame[] = []
  const { videoWidth: W, videoHeight: H } = video
  // With a chosen dancer, detect in a strip that follows them (see crop.ts).
  const strip = opts.follow ? document.createElement('canvas') : null
  let cx = opts.follow?.x ?? 0.5
  try {
    for (let k = 0; k < total; k++) {
      const t = start + k / fps
      await seek(video, t)
      // A new landmarker per video, so timestamps always increase.
      const ts = Math.round(t * 1000) + 1
      let poses: Point[][]
      if (strip) {
        const { x0, w } = cropWindow(cx, W)
        strip.width = w
        strip.height = H
        strip.getContext('2d')!.drawImage(video, x0, 0, w, H, 0, 0, w, H)
        poses = uncrop(toPoints(landmarker.detectForVideo(strip, ts).landmarks), x0, w, W)
      } else {
        poses = toPoints(landmarker.detectForVideo(video, ts).landmarks)
      }
      const points = pickPerson(selector, poses, W, H)
      const center = points && poseCenter(points.map((p) => ({ ...p, x: p.x / W, y: p.y / H })))
      if (center) cx = center.x
      frames.push({ t, points })
      opts.onProgress?.((k + 1) / total)
    }
  } finally {
    landmarker.close()
  }
  return { fps, width: video.videoWidth, height: video.videoHeight, frames }
}
