import { extractPoses } from '../pose/extractPoses'
import { loadVideo } from './video'
import type { PoseSequence } from '../pose/types'
import type { Reference } from '../content/types'
import { loadPoseFile } from '../pose/poseFile'
import { sliceSequence } from '../analysis/parts'

type Entry = { poses: Promise<PoseSequence>; progress: number; listeners: Set<(fraction: number) => void> }

const cache = new Map<string, Entry>()

/**
 * Poses of a bundled Reference between start and end, extracted once per session. Everyone waiting on the
 * same extraction gets its real progress (StrictMode and repeat visits share one extraction).
 */
export function referencePoses(ref: Reference, onProgress?: (fraction: number) => void): Promise<PoseSequence> {
  const key = `${ref.video}:${ref.start}-${ref.end}:${ref.dancer ? `${ref.dancer.x},${ref.dancer.y}` : ''}`
  let entry = cache.get(key)
  if (!entry) {
    const created: Entry = { progress: 0, listeners: new Set(), poses: Promise.resolve(null as never) }
    created.poses = (async () => {
      if (ref.poses && !ref.dancer) {
        const all = await loadPoseFile(ref.poses)
        created.progress = 1
        created.listeners.forEach((l) => l(1))
        return sliceSequence(all, ref.start, ref.end)
      }
      const { video, dispose } = await loadVideo(ref.video)
      try {
        return await extractPoses(video, {
          start: ref.start, end: ref.end, follow: ref.dancer,
          onProgress: (fraction) => { created.progress = fraction; created.listeners.forEach((l) => l(fraction)) },
        })
      } finally {
        dispose()
      }
    })()
    created.poses.then(() => created.listeners.clear(), () => { cache.delete(key); created.listeners.clear() })
    cache.set(key, created)
    entry = created
  }
  if (onProgress) {
    entry.listeners.add(onProgress)
    onProgress(entry.progress)
  }
  return entry.poses
}
