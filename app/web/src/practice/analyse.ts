import { extractPoses } from '../pose/extractPoses'
import { compare, type Comparison } from '../analysis/score'
import { segmentScores, type Segment } from '../analysis/segments'
import { timelineScores } from '../analysis/timeline'
import { detectFaults, topStrengths, type Fault } from '../analysis/faults'
import { checkQuality, qualityWarnings } from '../analysis/quality'
import { bodyAreaScores, type AreaScore } from '../analysis/bodyAreas'
import { loadVideo } from './video'
import { sliceSequence } from '../analysis/parts'
import type { PoseSequence } from '../pose/types'
import { text } from '../text'

export type AttemptAnalysis = {
  ref: PoseSequence
  user: PoseSequence
  comparison: Comparison
  areas: AreaScore[]
  segments: Segment[]
  timeline: Segment[]
  faults: Fault[]
  strengths: string[]
  warnings: string[]
}

/**
 * Analyses a recorded Attempt against a Reference's poses, all on the device. Null when no body was found.
 * With precomputed poses (the demo Attempt) the video is not analysed again.
 */
export async function analyseAttempt(
  file: File, ref: PoseSequence, opts: { mirror: boolean; trim?: { start: number; end: number }; poses?: PoseSequence; onProgress?: (fraction: number) => void },
): Promise<AttemptAnalysis | null> {
  let user: PoseSequence
  if (opts.poses) {
    user = opts.trim ? sliceSequence(opts.poses, opts.trim.start, opts.trim.end) : opts.poses
    opts.onProgress?.(1)
  } else {
    user = await extractUserPoses(file, opts.trim, opts.onProgress)
  }
  const comparison = compare(ref, user, { mirrorRef: opts.mirror })
  if (!comparison) return null
  return {
    ref, user, comparison,
    areas: bodyAreaScores(comparison),
    segments: segmentScores(comparison, ref),
    timeline: timelineScores(comparison, ref),
    faults: detectFaults(comparison, ref),
    strengths: topStrengths(comparison).map((j) => text.joints[j]),
    warnings: [
      ...qualityWarnings(text.quality.referenceLabel, checkQuality(ref)),
      ...qualityWarnings(text.quality.attemptLabel, checkQuality(user)),
    ],
  }
}

async function extractUserPoses(file: File, trim: { start: number; end: number } | undefined, onProgress?: (fraction: number) => void) {
  const url = URL.createObjectURL(file)
  try {
    const { video, dispose } = await loadVideo(url)
    try {
      return await extractPoses(video, { ...trim, onProgress })
    } finally {
      dispose()
    }
  } finally {
    URL.revokeObjectURL(url)
  }
}
