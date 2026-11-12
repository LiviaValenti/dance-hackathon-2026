import type { PoseSequence } from './types'

/**
 * Precomputed poses of a whole video (scripts/precompute-poses.mjs): frame k is at k / fps seconds, each
 * frame is 33 × [x, y, visibility] flattened, or null when no person was found.
 */
export type PoseFile = { fps: number; width: number; height: number; frames: Array<number[] | null> }

const round = (n: number, digits: number) => Math.round(n * 10 ** digits) / 10 ** digits

export function encodePoses(seq: PoseSequence): PoseFile {
  return {
    fps: seq.fps, width: seq.width, height: seq.height,
    frames: seq.frames.map((f) => f.points?.flatMap((p) => [round(p.x, 1), round(p.y, 1), round(p.visibility, 2)]) ?? null),
  }
}

export function decodePoses(file: PoseFile): PoseSequence {
  return {
    fps: file.fps, width: file.width, height: file.height,
    frames: file.frames.map((f, k) => ({
      t: k / file.fps,
      points: f && Array.from({ length: f.length / 3 }, (_, i) => ({ x: f[3 * i], y: f[3 * i + 1], visibility: f[3 * i + 2] })),
    })),
  }
}

const cache = new Map<string, Promise<PoseSequence>>()

export function loadPoseFile(url: string): Promise<PoseSequence> {
  let poses = cache.get(url)
  if (!poses) {
    poses = fetch(url).then((r) => {
      if (!r.ok) throw new Error(`Could not load ${url}`)
      return r.json() as Promise<PoseFile>
    }).then(decodePoses)
    poses.catch(() => cache.delete(url))
    cache.set(url, poses)
  }
  return poses
}
