import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision'
import type { PoseFrame, PoseSequence } from './types'

// Versjonen må matche installert @mediapipe/tasks-vision.
const WASM_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.2.2/wasm'
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/1/pose_landmarker_full.task'

export async function createLandmarker(): Promise<PoseLandmarker> {
  const fileset = await FilesetResolver.forVisionTasks(WASM_URL)
  return PoseLandmarker.createFromOptions(fileset, {
    baseOptions: { modelAssetPath: MODEL_URL, delegate: 'GPU' },
    runningMode: 'VIDEO',
    numPoses: 1,
  })
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

/** Går gjennom videoen med fast bildefrekvens og finner én persons positur per bilde. */
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
  const frames: PoseFrame[] = []
  try {
    for (let k = 0; k < total; k++) {
      const t = start + k / fps
      await seek(video, t)
      // Ny landmarker per video, så tidsstempelet er alltid stigende.
      const result = landmarker.detectForVideo(video, Math.round(t * 1000) + 1)
      const lm = result.landmarks[0]
      frames.push({
        t,
        points: lm
          ? lm.map((p) => ({ x: p.x * video.videoWidth, y: p.y * video.videoHeight, visibility: p.visibility ?? 0 }))
          : null,
      })
      opts.onProgress?.((k + 1) / total)
    }
  } finally {
    landmarker.close()
  }
  return { fps, width: video.videoWidth, height: video.videoHeight, frames }
}
