import { useEffect, useState } from 'react'
import { SkeletonCanvas } from './SkeletonCanvas'
import { VideoSkeleton } from './VideoSkeleton'
import { formatSpan, formatTime } from '../formatTime'
import { faultTitle } from '../analysis/faultText'
import { faultId } from '../feedback/buildRequest'
import type { Fault } from '../analysis/faults'
import { WARN_DIFF_DEG, type Comparison } from '../analysis/score'
import type { Segment } from '../analysis/segments'
import { weakMoments } from '../analysis/timeline'
import type { Feedback } from '../feedback/types'
import type { PoseSequence } from '../pose/types'
import { text } from '../text'

type Props = {
  reference: PoseSequence
  user: PoseSequence
  comparison: Comparison
  segments: Segment[]
  timeline: Segment[]
  faults: Fault[]
  feedback: Feedback
  /** The Reference and Attempt videos, to draw the skeletons on. Without them only the skeletons are shown. */
  videos?: { reference: string; user: string; mirrored: boolean }
  onPractice: (fault: Fault) => void
}

const STRONG_SEGMENT = 85

// Coloured by the worst joint: a single joint far off is what the Dancer should look at.
const windowColor = (w: Segment) => (w.worstDiff > 40 ? 'var(--coral)' : w.worstDiff > WARN_DIFF_DEG ? 'var(--lantern)' : 'var(--mint)')

/** Where to improve: skeletons (on the real videos when given), the timeline of weak moments and the fault cards. */
export function FeedbackView({ reference, user, comparison, segments, timeline, faults, feedback, videos, onPractice }: Props) {
  const [step, setStep] = useState(faults[0]?.firstStep ?? 0)
  const [playing, setPlaying] = useState(false)
  const last = comparison.steps.length - 1

  useEffect(() => {
    if (!playing) return
    const id = setInterval(() => {
      setStep((s) => {
        if (s >= last) { setPlaying(false); return s }
        return s + 1
      })
    }, 1000 / user.fps)
    return () => clearInterval(id)
  }, [playing, last, user.fps])

  const current = comparison.steps[step]
  const moments = weakMoments(timeline)
  const currentWindow = timeline.findLast((w) => w.firstStep <= step)
  const jump = (to: number) => { setPlaying(false); setStep(to) }
  const best = segments.length > 1 ? segments.reduce((a, b) => (b.score > a.score ? b : a)) : null

  return (
    <div className="stack improve">
      <h2 className="section-title">{text.feedback.title}</h2>
      <div className="card stack">
        <div className="skeleton-pair">
          {videos ? (
            <>
              <VideoSkeleton
                src={videos.reference} t={reference.frames[current.refFrame].t} mirrored={videos.mirrored}
                label={text.common.reference} points={reference.frames[current.refFrame].points} width={reference.width} height={reference.height}
              />
              <VideoSkeleton
                src={videos.user} t={user.frames[current.userFrame].t} mirrored={videos.mirrored}
                label={text.common.you} points={user.frames[current.userFrame].points} width={user.width} height={user.height}
                diffs={current.diffs}
              />
            </>
          ) : (<>
          <SkeletonCanvas
            label={text.common.reference} displayHeight={220}
            points={reference.frames[current.refFrame].points} width={reference.width} height={reference.height}
          />
          <SkeletonCanvas
            label={text.common.you} displayHeight={220}
            points={user.frames[current.userFrame].points} width={user.width} height={user.height}
            diffs={current.diffs}
          />
          </>)}
        </div>
        <div className="scrubber">
          <button className="icon-button" onClick={() => setPlaying((p) => !p)} aria-label={playing ? text.common.pause : text.common.play}>
            <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              {playing ? <path d="M7 5h4v14H7zM13 5h4v14h-4z" /> : <polygon points="7 4 20 12 7 20" />}
            </svg>
          </button>
          <div className="track">
            <input
              type="range" min={0} max={last} value={step} aria-label={text.feedback.timeline}
              onChange={(e) => setStep(Number(e.target.value))}
            />
            {faults.map((f, i) => (
              <span key={i} className="marker" aria-hidden="true" style={{ left: `${(f.firstStep / Math.max(1, last)) * 100}%` }} />
            ))}
          </div>
          <span className="muted small">{formatTime(reference.frames[current.refFrame].t)}</span>
        </div>
        {timeline.length > 1 && (
          <div className="timeline" role="group" aria-label={text.feedback.timelineScores}>
            {timeline.map((w) => (
              <button
                key={w.index}
                className={w === currentWindow ? 'tl-bar current' : 'tl-bar'}
                style={{ height: `${Math.max(12, w.score)}%`, background: windowColor(w) }}
                aria-label={text.feedback.window(formatSpan(w.start, w.end), w.score)}
                onClick={() => jump(w.firstStep)}
              />
            ))}
          </div>
        )}
        {moments.length > 0 && (
          <div className="stack">
            <h3 className="label">{text.feedback.weakMoments}</h3>
            <div className="chips">
              {moments.map((m) => (
                <button key={m.index} className="chip-button" onClick={() => jump(m.firstStep)}>
                  <span className="dot" />{formatSpan(m.start, m.end)} · {text.joints[m.worstJoint]}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {faults.length === 0 && (
        <div className="card positive"><span className="dot dot-ok" />{text.feedback.noFaults}</div>
      )}
      <ul className="faults">
        {faults.map((f, i) => {
          const tip = feedback.tips.find((t) => t.id === faultId(i))
          return (
            <li key={i} className="card fault">
              <div className="row">
                <span className="fault-time">{formatSpan(f.start, f.end)}</span>
                {i === 0 && faults.length > 1 && <span className="muted small">{text.feedback.biggestGain}</span>}
              </div>
              <strong className="fault-title">{faultTitle(f)}</strong>
              {tip && <p>{tip.tip}</p>}
              {tip && <p className="muted">{text.feedback.drill(tip.drill)}</p>}
              <div className="button-row">
                <button className="primary small-button" onClick={() => onPractice(f)}>{text.feedback.practise}</button>
                <button className="secondary small-button" onClick={() => jump(f.firstStep)}>
                  {text.feedback.showInTimeline}
                </button>
              </div>
            </li>
          )
        })}
      </ul>

      {best && best.score >= STRONG_SEGMENT && (
        <div className="card positive">
          <span className="dot dot-ok" />
          <span><strong>{text.feedback.strongPart(best.index + 1)}</strong>{text.feedback.strongPartText}</span>
        </div>
      )}
    </div>
  )
}
