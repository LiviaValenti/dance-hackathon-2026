import { useEffect, useState } from 'react'
import { SkeletonCanvas } from './SkeletonCanvas'
import { TopBar } from './TopBar'
import { formatSpan, formatTime } from '../formatTime'
import { faultTitle } from '../analysis/faultText'
import { faultId } from '../feedback/buildRequest'
import type { Fault } from '../analysis/faults'
import type { Comparison } from '../analysis/score'
import type { Segment } from '../analysis/segments'
import type { Feedback } from '../feedback/types'
import type { PoseSequence } from '../pose/types'

type Props = {
  reference: PoseSequence
  user: PoseSequence
  comparison: Comparison
  segments: Segment[]
  faults: Fault[]
  feedback: Feedback
  onPractice: (fault: Fault) => void
  onBack: () => void
}

const STRONG_SEGMENT = 85

export function FeedbackView({ reference, user, comparison, segments, faults, feedback, onPractice, onBack }: Props) {
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
  const best = segments.length > 1 ? segments.reduce((a, b) => (b.score > a.score ? b : a)) : null

  return (
    <section className="screen">
      <TopBar title="Din personlige tilbakemelding" onBack={onBack} />

      <div className="card stack">
        <div className="skeleton-pair">
          <SkeletonCanvas
            label="Referanse" displayHeight={220}
            points={reference.frames[current.refFrame].points} width={reference.width} height={reference.height}
          />
          <SkeletonCanvas
            label="Deg" displayHeight={220}
            points={user.frames[current.userFrame].points} width={user.width} height={user.height}
            diffs={current.diffs}
          />
        </div>
        <div className="scrubber">
          <button className="icon-button" onClick={() => setPlaying((p) => !p)} aria-label={playing ? 'Pause' : 'Spill av'}>
            <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              {playing ? <path d="M7 5h4v14H7zM13 5h4v14h-4z" /> : <polygon points="7 4 20 12 7 20" />}
            </svg>
          </button>
          <div className="track">
            <input
              type="range" min={0} max={last} value={step} aria-label="Tidslinje"
              onChange={(e) => setStep(Number(e.target.value))}
            />
            {faults.map((f, i) => (
              <span key={i} className="marker" aria-hidden="true" style={{ left: `${(f.firstStep / Math.max(1, last)) * 100}%` }} />
            ))}
          </div>
          <span className="muted small">{formatTime(reference.frames[current.refFrame].t)}</span>
        </div>
      </div>

      {faults.length === 0 && (
        <div className="card positive"><span className="dot dot-ok" />Ingen tydelige avvik. Sterkt jobbet!</div>
      )}
      <ul className="faults">
        {faults.map((f, i) => {
          const tip = feedback.tips.find((t) => t.id === faultId(i))
          return (
            <li key={i} className="card fault">
              <div className="row">
                <span className="fault-time">{formatSpan(f.start, f.end)}</span>
                {i === 0 && faults.length > 1 && <span className="muted small">Største gevinst</span>}
              </div>
              <strong className="fault-title">{faultTitle(f)}</strong>
              {tip && <p>{tip.tip}</p>}
              {tip && <p className="muted">Øvelse: {tip.drill}</p>}
              <div className="button-row">
                <button className="primary small-button" onClick={() => onPractice(f)}>Øv på dette</button>
                <button className="secondary small-button" onClick={() => { setPlaying(false); setStep(f.firstStep) }}>
                  Vis i tidslinjen
                </button>
              </div>
            </li>
          )
        })}
      </ul>

      {best && best.score >= STRONG_SEGMENT && (
        <div className="card positive">
          <span className="dot dot-ok" />
          <span><strong>Del {best.index + 1}:</strong> nesten helt lik referansen. Fortsett sånn!</span>
        </div>
      )}
    </section>
  )
}
