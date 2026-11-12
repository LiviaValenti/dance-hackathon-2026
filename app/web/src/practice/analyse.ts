import { extractPoses } from '../pose/extractPoses'
import { compare, type Comparison } from '../analysis/score'
import { segmentScores, type Segment } from '../analysis/segments'
import { timelineScores } from '../analysis/timeline'
import { detectFaults, topStrengths, type Fault } from '../analysis/faults'
import { checkQuality, qualityWarnings } from '../analysis/quality'
import { bodyAreaScores, type AreaScore } from '../analysis/bodyAreas'
import { loadVideo } from './video'
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

/** Analyses a recorded Attempt against a Reference's poses, all on the device. Null when no body was found. */
export async function analyseAttempt(
  file: File, ref: PoseSequence, opts: { mirror: boolean; onProgress?: (fraction: number) => void },
): Promise<AttemptAnalysis | null> {
  const url = URL.createObjectURL(file)
  try {
    const { video, dispose } = await loadVideo(url)
    let user: PoseSequence
    try {
      user = await extractPoses(video, { onProgress: opts.onProgress })
    } finally {
      dispose()
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
  } finally {
    URL.revokeObjectURL(url)
  }
}
