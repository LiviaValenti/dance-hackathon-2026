import { FilesetResolver, PoseLandmarker, type NormalizedLandmark } from '@mediapipe/tasks-vision'
import { createPersonSelector } from './person'
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

/** Picks the followed person from a detection result and scales them to pixels. */
export function pickPerson(
  selector: ReturnType<typeof createPersonSelector>, landmarks: NormalizedLandmark[][], width: number, height: number,
): Point[] | null {
  const poses = landmarks.map((lm) => lm.map((p) => ({ x: p.x, y: p.y, visibility: p.visibility ?? 0 })))
  const pose = selector.pick(poses)
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
  opts: { fps?: number; start?: number; end?: number; onProgress?: (fraction: number) => void } = {},
): Promise<PoseSequence> {
  const fps = opts.fps ?? 15
  await waitForData(video)
  video.pause()
  const start = Math.max(0, opts.start ?? 0)
  const end = Math.min(opts.end ?? video.duration, video.duration)
  const total = Math.max(1, Math.floor((end - start) * fps))
  const landmarker = await createLandmarker()
  const selector = createPersonSelector()
  const frames: PoseFrame[] = []
  try {
    for (let k = 0; k < total; k++) {
      const t = start + k / fps
      await seek(video, t)
      // A new landmarker per video, so timestamps always increase.
      const result = landmarker.detectForVideo(video, Math.round(t * 1000) + 1)
      frames.push({ t, points: pickPerson(selector, result.landmarks, video.videoWidth, video.videoHeight) })
      opts.onProgress?.((k + 1) / total)
    }
  } finally {
    landmarker.close()
  }
  return { fps, width: video.videoWidth, height: video.videoHeight, frames }
}
