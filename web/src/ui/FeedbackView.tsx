import { useEffect, useState } from 'react'
import { SkeletonCanvas } from './SkeletonCanvas'
import { formatTime } from '../formatTime'
import { faultTitle } from '../analysis/faultText'
import { faultId } from '../feedback/buildRequest'
import type { Fault } from '../analysis/faults'
import type { Comparison } from '../analysis/score'
import type { Feedback } from '../feedback/types'
import type { PoseSequence } from '../pose/types'

type Props = {
  reference: PoseSequence
  user: PoseSequence
  comparison: Comparison
  faults: Fault[]
  feedback: Feedback | null
  onBack: () => void
}

export function FeedbackView({ reference, user, comparison, faults, feedback, onBack }: Props) {
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

  return (
    <section className="result">
      <button className="link" onClick={onBack}>Tilbake til score</button>
      <h2>Din personlige tilbakemelding</h2>

      <div className="skeletons">
        <SkeletonCanvas
          label="Referanse" displayHeight={280}
          points={reference.frames[current.refFrame].points} width={reference.width} height={reference.height}
        />
        <SkeletonCanvas
          label="Deg" displayHeight={280}
          points={user.frames[current.userFrame].points} width={user.width} height={user.height}
          diffs={current.diffs}
        />
      </div>

      <div className="scrubber">
        <button onClick={() => setPlaying((p) => !p)}>{playing ? 'Pause' : 'Spill av'}</button>
        <div className="track">
          <input
            type="range" min={0} max={last} value={step} aria-label="Tidslinje"
            onChange={(e) => setStep(Number(e.target.value))}
          />
          {faults.map((f, i) => (
            <span key={i} className="marker" aria-hidden="true" style={{ left: `${(f.firstStep / Math.max(1, last)) * 100}%` }} />
          ))}
        </div>
        <span className="muted">{formatTime(reference.frames[current.refFrame].t)}</span>
      </div>

      {faults.length === 0 && <p>Ingen tydelige avvik. Sterkt jobbet!</p>}
      <ul className="faults">
        {faults.map((f, i) => {
          const tip = feedback?.tips.find((t) => t.id === faultId(i))
          return (
            <li key={i} className="card fault">
              <span className="fault-time">{formatTime(f.start)}–{formatTime(f.end)}</span>
              <strong>{faultTitle(f)}</strong>
              {tip && <p>{tip.tip}</p>}
              {tip && <p className="muted">Øvelse: {tip.drill}</p>}
              <button className="secondary" onClick={() => { setPlaying(false); setStep(f.firstStep) }}>
                Vis i tidslinjen
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
