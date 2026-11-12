import { extractPoses } from '../pose/extractPoses'
import { loadVideo } from './video'
import type { PoseSequence } from '../pose/types'
import type { Reference } from '../content/types'

const cache = new Map<string, Promise<PoseSequence>>()

/** Poses of a bundled Reference between its start and end, extracted once per session. */
export function referencePoses(ref: Reference, onProgress?: (fraction: number) => void): Promise<PoseSequence> {
  const key = `${ref.video}:${ref.start}-${ref.end}:${ref.dancer ? `${ref.dancer.x},${ref.dancer.y}` : ''}`
  let poses = cache.get(key)
  if (!poses) {
    poses = (async () => {
      const { video, dispose } = await loadVideo(ref.video)
      try {
        return await extractPoses(video, { start: ref.start, end: ref.end, follow: ref.dancer, onProgress })
      } finally {
        dispose()
      }
    })()
    poses.catch(() => cache.delete(key))
    cache.set(key, poses)
  } else {
    onProgress?.(1)
  }
  return poses
}
