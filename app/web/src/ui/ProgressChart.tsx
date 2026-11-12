import type { Attempt } from '../progress/history'
import { text } from '../text'

const W = 300
const H = 120
const PAD = 12

export function ProgressChart({ history }: { history: Attempt[] }) {
  const x = (i: number) => PAD + (i * (W - 2 * PAD)) / Math.max(1, history.length - 1)
  const y = (v: number) => H - PAD - (v / 100) * (H - 2 * PAD)
  const lastIndex = history.length - 1
  return (
    <figure className="chart">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={text.progressChart.label(history.map((a) => a.overall))}>
        {[25, 50, 75].map((v) => (
          <line key={v} x1={PAD} x2={W - PAD} y1={y(v)} y2={y(v)} stroke="var(--border)" strokeWidth="1" />
        ))}
        <polyline
          points={history.map((a, i) => `${x(i)},${y(a.overall)}`).join(' ')}
          fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"
        />
        {history.map((a, i) => (
          <circle
            key={i} cx={x(i)} cy={y(a.overall)} r={i === lastIndex ? 5 : 4}
            fill={i === lastIndex ? 'var(--accent)' : 'var(--surface)'} stroke="var(--accent)" strokeWidth="2"
          >
            <title>{text.progressChart.point(i + 1, a.overall)}</title>
          </circle>
        ))}
      </svg>
      <figcaption className="muted small">{text.progressChart.caption}</figcaption>
    </figure>
  )
}
