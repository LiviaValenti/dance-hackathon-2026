import type { Comparison } from '../analysis/score'
import type { Segment } from '../analysis/segments'
import type { Feedback } from '../feedback/types'

type Props = {
  comparison: Comparison
  segments: Segment[]
  strengths: string[]
  feedback: Feedback | null
  source: 'ai' | 'fallback' | null
  onShowFeedback: () => void
  onRetry: () => void
}

const R = 80
const CIRCUMFERENCE = 2 * Math.PI * R

export function ResultView({ comparison, segments, strengths, feedback, source, onShowFeedback, onRetry }: Props) {
  return (
    <section className="result">
      <div className="ring">
        <svg width="190" height="190" viewBox="0 0 190 190" role="img" aria-label={`Score ${comparison.overall} av 100`}>
          <circle cx="95" cy="95" r={R} fill="none" stroke="var(--border)" strokeWidth="14" />
          <circle
            cx="95" cy="95" r={R} fill="none" stroke="var(--accent)" strokeWidth="14" strokeLinecap="round"
            strokeDasharray={`${(comparison.overall / 100) * CIRCUMFERENCE} ${CIRCUMFERENCE}`}
            transform="rotate(-90 95 95)"
          />
        </svg>
        <div className="ring-label">
          <span className="ring-value">{comparison.overall}</span>
          <span className="muted">av 100</span>
        </div>
      </div>

      {feedback ? (
        <div className="headline">
          <h2>{feedback.headline}</h2>
          <p>{feedback.summary}</p>
          {source === 'fallback' && <p className="muted small">Standardtekst, AI-coachen er ikke tilgjengelig nå.</p>}
        </div>
      ) : (
        <p className="muted headline" aria-live="polite">Coachen skriver tilbakemelding …</p>
      )}

      <div className="card">
        <h3>Deler</h3>
        <ul className="segments">
          {segments.map((s) => (
            <li key={s.index}>
              <span>Del {s.index + 1}</span>
              <span className="bar">
                <span style={{ width: `${s.score}%`, background: s.score < 70 ? 'var(--warn)' : 'var(--accent)' }} />
              </span>
              <strong>{s.score}</strong>
            </li>
          ))}
        </ul>
      </div>

      {strengths.length > 0 && (
        <div>
          <h3 className="label">Dette sitter</h3>
          <div className="chips">
            {strengths.map((s) => <span key={s} className="chip">{s}</span>)}
          </div>
        </div>
      )}

      <div className="actions">
        <button className="primary" onClick={onShowFeedback}>Se hva du kan forbedre</button>
        <button className="secondary" onClick={onRetry}>Prøv igjen</button>
      </div>
    </section>
  )
}
