import { TopBar } from './TopBar'
import { ProgressChart } from './ProgressChart'
import { bodyAreaScores } from '../analysis/bodyAreas'
import { progressNote, type Attempt } from '../progress/history'
import type { Comparison } from '../analysis/score'
import type { Segment } from '../analysis/segments'
import type { Feedback } from '../feedback/types'
import { text } from '../text'

type Props = {
  title: string
  comparison: Comparison
  segments: Segment[]
  strengths: string[]
  feedback: Feedback
  source: 'ai' | 'fallback'
  history: Attempt[]
  warnings: string[]
  onShowFeedback: () => void
  onRetry: () => void
  onClose: () => void
}

const R = 80
const CIRCUMFERENCE = 2 * Math.PI * R
const WEAK_SCORE = 70

function ScoreBars({ items }: { items: Array<{ label: string; score: number }> }) {
  return (
    <ul className="score-bars">
      {items.map((item) => (
        <li key={item.label}>
          <div className="row"><span>{item.label}</span><strong>{item.score}</strong></div>
          <span className="bar">
            <span style={{ width: `${item.score}%`, background: item.score < WEAK_SCORE ? 'var(--warn)' : 'var(--accent)' }} />
          </span>
        </li>
      ))}
    </ul>
  )
}

export function ResultView(props: Props) {
  const { comparison, segments, strengths, feedback, source, history, warnings } = props
  const note = progressNote(history)

  return (
    <section className="screen">
      <TopBar title={text.result.title} subtitle={props.title} onBack={props.onClose} icon="close" />

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

      <div className="card">
        <ScoreBars items={bodyAreaScores(comparison)} />
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

      {history.length >= 2 && (
        <div className="card">
          <h3>{text.result.progress}</h3>
          <ProgressChart history={history} />
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
        <button className="secondary" onClick={props.onRetry}>{text.result.retry}</button>
      </div>
    </section>
  )
}
