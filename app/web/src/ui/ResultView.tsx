import type { ReactNode } from 'react'
import { TopBar } from './TopBar'
import { bodyAreaScores, type AreaScore } from '../analysis/bodyAreas'
import { progressNote, type Attempt } from '../progress/history'
import type { Comparison } from '../analysis/score'
import type { Segment } from '../analysis/segments'
import type { Feedback } from '../feedback/types'
import { text } from '../text'
import { Mascot } from '../mascot/Mascot'
import { Confetti } from './Confetti'

type Props = {
  title: string
  comparison: Comparison
  segments: Segment[]
  strengths: string[]
  feedback: Feedback
  source: 'ai' | 'fallback'
  history: Attempt[]
  warnings: string[]
  /** Shown under the headline, e.g. the Plan's decision. */
  extra?: ReactNode
  /** Label for the retry button, e.g. what the Plan does next. */
  retryLabel?: string
  celebrate?: boolean
  /** Body-area Scores of the Dancer's previous Attempt at the same Part: their Ghost. */
  ghost?: AreaScore[] | null
  onShowFeedback: () => void
  onRetry: () => void
  onClose: () => void
}

const R = 80
const CIRCUMFERENCE = 2 * Math.PI * R
const WEAK_SCORE = 70

function ScoreBars({ items, ghost }: { items: Array<{ label: string; score: number }>; ghost?: AreaScore[] | null }) {
  return (
    <ul className="score-bars">
      {items.map((item) => (
        <li key={item.label}>
          <div className="row">
            <span>{item.label}</span>
            <span className="score-cell">
              {ghost && <GhostDelta delta={item.score - (ghost.find((g) => g.label === item.label)?.score ?? item.score)} />}
              <strong>{item.score}</strong>
            </span>
          </div>
          <span className="bar">
            <span style={{ width: `${item.score}%`, background: item.score < WEAK_SCORE ? 'var(--coral)' : 'var(--accent)' }} />
          </span>
        </li>
      ))}
    </ul>
  )
}

function GhostDelta({ delta }: { delta: number }) {
  const cls = delta > 0 ? 'ghost-delta up' : delta < 0 ? 'ghost-delta down' : 'ghost-delta'
  return <span className={cls} aria-label={text.result.ghostDelta(delta)}>{delta > 0 ? `+${delta}` : delta === 0 ? '±0' : delta}</span>
}

export function ResultView(props: Props) {
  const { comparison, segments, strengths, feedback, source, history, warnings } = props
  const note = progressNote(history)

  return (
    <section className="screen">
      {(props.celebrate ?? true) && <Confetti />}
      <TopBar title={text.result.title} subtitle={props.title} onBack={props.onClose} icon="close" />
      <Mascot mood="cheer" size={72} className="result-mascot" />

      <div className="ring">
        <svg width="190" height="190" viewBox="0 0 190 190" role="img" aria-label={text.result.scoreLabel(comparison.overall)}>
          <circle cx="95" cy="95" r={R} fill="none" stroke="var(--border)" strokeWidth="14" />
          <circle
            cx="95" cy="95" r={R} fill="none" stroke="var(--accent)" strokeWidth="14" strokeLinecap="round"
            strokeDasharray={`${(comparison.overall / 100) * CIRCUMFERENCE} ${CIRCUMFERENCE}`}
            transform="rotate(-90 95 95)"
          />
        </svg>
        <div className="ring-label">
          <span className="ring-value">{comparison.overall}</span>
          <span className="muted">{text.result.outOf}</span>
        </div>
      </div>
      {note && <span className={note.delta > 0 ? 'pill pill-up' : 'pill'}>{note.text}</span>}

      <div className="headline">
        <h2>{feedback.headline}</h2>
        <p>{feedback.summary}</p>
        {source === 'fallback' && <p className="muted small">{text.result.fallbackNote}</p>}
      </div>
      {props.extra}

      <div className="card">
        {props.ghost && <p className="muted small ghost-note">{text.result.ghostNote}</p>}
        <ScoreBars items={bodyAreaScores(comparison)} ghost={props.ghost} />
      </div>

      {strengths.length > 0 && (
        <div className="stack">
          <h3 className="label">{text.result.strengths}</h3>
          <div className="chips">
            {strengths.map((s) => <span key={s} className="chip">{s}</span>)}
          </div>
        </div>
      )}

      {segments.length > 1 && (
        <div className="card">
          <h3>{text.result.perPart}</h3>
          <ScoreBars items={segments.map((s) => ({ label: text.common.part(s.index + 1), score: s.score }))} />
        </div>
      )}

      {warnings.length > 0 && (
        <div className="card warnings">
          <h3>{text.result.quality}</h3>
          <ul>{warnings.map((w) => <li key={w}>{w}</li>)}</ul>
        </div>
      )}

      <div className="screen-footer">
        <button className="primary" onClick={props.onShowFeedback}>{text.result.showFeedback}</button>
        <button className="secondary" onClick={props.onRetry}>{props.retryLabel ?? text.result.retry}</button>
      </div>
    </section>
  )
}
