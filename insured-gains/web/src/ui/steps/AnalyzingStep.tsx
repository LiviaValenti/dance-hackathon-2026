import { TopBar } from '../TopBar'
import { CheckIcon, LockIcon } from '../icons'

export type Stage = { name: 'poses'; fraction: number } | { name: 'compare' } | { name: 'feedback' }

const STEPS = [
  'Finner positurene dine',
  'Synkroniserer med referansen',
  'Sammenligner 8 ledd, bilde for bilde',
  'Skriver personlig tilbakemelding',
]

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

export function AnalyzingStep({ stage }: { stage: Stage }) {
  const current = currentIndex(stage)
  return (
    <section className="screen">
      <TopBar title="Analyserer forsøket ditt" subtitle="Tar omtrent like lang tid som videoen" />
      <span className="bar bar-thick" role="progressbar" aria-valuenow={Math.round(overall(stage) * 100)} aria-valuemin={0} aria-valuemax={100}>
        <span style={{ width: `${overall(stage) * 100}%` }} />
      </span>
      <ol className="steps">
        {STEPS.map((label, i) => (
          <li key={label} className={i < current ? 'done' : i === current ? 'current' : 'pending'}>
            <span className="step-dot">{i < current && <CheckIcon />}</span>
            {label}
            {i === current && stage.name === 'poses' && <span className="muted"> · {Math.round(stage.fraction * 100)} %</span>}
          </li>
        ))}
      </ol>
      <div className="screen-footer">
        <div className="card note">
          <LockIcon />
          <span>Videoen analyseres på enheten din. Bare et kort sammendrag av resultatet sendes til AI-coachen.</span>
        </div>
      </div>
    </section>
  )
}
