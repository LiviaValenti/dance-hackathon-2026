import { TopBar } from '../TopBar'
import { CheckIcon, LockIcon } from '../icons'
import { text } from '../../text'
import { Mascot } from '../../mascot/Mascot'

export type Stage = { name: 'poses'; fraction: number } | { name: 'compare' } | { name: 'feedback' }


function currentIndex(stage: Stage): number {
  if (stage.name === 'poses') return 0
  if (stage.name === 'compare') return 2
  return 3
}

function overall(stage: Stage): number {
  if (stage.name === 'poses') return stage.fraction * 0.7
  if (stage.name === 'compare') return 0.8
  return 0.9
}

/** coach = false hides the last step, for analyses that get no Coach feedback (the Level check). */
export function AnalyzingStep({ stage, coach = true }: { stage: Stage; coach?: boolean }) {
  const STEPS = coach ? text.analysing.steps : text.analysing.steps.slice(0, -1)
  const current = currentIndex(stage)
  return (
    <section className="screen">
      <TopBar title={text.analysing.title} subtitle={text.analysing.subtitle} />
      <span className="bar bar-thick" role="progressbar" aria-valuenow={Math.round(overall(stage) * 100)} aria-valuemin={0} aria-valuemax={100}>
        <span style={{ width: `${overall(stage) * 100}%` }} />
      </span>
      <Mascot size={88} className="result-mascot" />
      <ol className="steps">
        {STEPS.map((label, i) => (
          <li key={label} className={i < current ? 'done' : i === current ? 'current' : 'pending'}>
            <span className="step-dot">{i < current && <CheckIcon />}</span>
            {label}
            {i === current && stage.name === 'poses' && <span className="muted"> · {text.common.percent(stage.fraction)}</span>}
          </li>
        ))}
      </ol>
      <div className="screen-footer">
        <div className="card note">
          <LockIcon />
          <span>{text.analysing.privacy}</span>
        </div>
      </div>
    </section>
  )
}
