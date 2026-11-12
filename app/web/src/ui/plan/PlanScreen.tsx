import { Mascot } from '../../mascot/Mascot'
import { TopBar } from '../TopBar'
import { CheckIcon } from '../icons'
import { Confetti } from '../Confetti'
import { formatTime } from '../../formatTime'
import { content } from '../../content/content'
import { practiceItems, type PlanState } from '../../plan/plan'
import { itemTitle } from './itemTitle'
import { ClassSpace } from '../studio/ClassSpace'
import type { Choreography, LevelId } from '../../content/types'
import type { Profile } from '../../profile/profile'
import { text } from '../../text'

type Props = {
  profile: Profile
  level: LevelId
  plan: PlanState
  choreography: Choreography
  mirror: boolean
  onMirror: (mirror: boolean) => void
  onPractise: () => void
  onRestart: () => void
  onOwnVideo: () => void
  onStartOver: () => void
  /** Practice rounds on a studio Choreography, for the class challenge. */
  classRounds: number
  onTeacherPreview: () => void
}

const t = text.plan

export function PlanScreen({ profile, level, plan, choreography, mirror, ...props }: Props) {
  const items = practiceItems(choreography)
  const current = items[Math.min(plan.item, items.length - 1)]
  const levelName = content.levels.find((l) => l.id === level)?.name ?? level
  const style = content.styles.find((s) => s.id === choreography.style)?.name

  return (
    <section className="screen">
      {plan.done && <Confetti />}
      <TopBar title={text.home.title(profile.name)} subtitle={t.subtitle(levelName, profile.minutes)} />

      <div className="mascot-greeting">
        <Mascot size={88} mood={plan.done ? 'cheer' : 'idle'} tempo={choreography.reference.tempo} />
        <p className="bubble">
          {plan.done ? t.doneBubble(choreography.title) : t.bubble(itemTitle(current, plan.item), plan.speed !== 1)}
        </p>
      </div>

      <div className="card stack">
        {choreography.studio && <span className="badge">{choreography.studio.name} · {choreography.studio.label}</span>}
        <div className="row">
          <h2 className="choreo-title">{choreography.title}</h2>
          <span className="muted small">{t.tempo(choreography.reference.tempo)}</span>
        </div>
        {style && <span className="muted small">{style} · {levelName}</span>}
        <ol className="plan-items">
          {items.map((item, i) => {
            const status = plan.done || i < plan.item ? 'done' : i === plan.item ? 'current' : 'pending'
            return (
              <li key={item.id} className={status} aria-current={status === 'current' ? 'step' : undefined}>
                <span className="step-dot">{status === 'done' && <CheckIcon />}</span>
                <span className="plan-item-text">
                  <span>{itemTitle(item, i)}</span>
                  <span className="muted small">{formatTime(item.start)}–{formatTime(item.end)}</span>
                </span>
                {status === 'current' && plan.speed !== 1 && <span className="badge">{t.speed(plan.speed)}</span>}
              </li>
            )
          })}
        </ol>
      </div>

      {choreography.studio && <ClassSpace studio={choreography.studio} mine={props.classRounds} onTeacherPreview={props.onTeacherPreview} />}

      <label className="toggle-row">
        <span>
          <strong>{text.prepareStep.mirror}</strong>
          <span className="muted small">{text.prepareStep.mirrorHint}</span>
        </span>
        <input type="checkbox" checked={mirror} onChange={(e) => props.onMirror(e.target.checked)} />
      </label>

      <div className="screen-footer">
        {plan.done
          ? <button className="primary" onClick={props.onRestart}>{t.again}</button>
          : <button className="primary" onClick={props.onPractise}>{t.practise(itemTitle(current, plan.item))}</button>}
        <button className="secondary" onClick={props.onOwnVideo}>{text.home.ownVideo}</button>
        <button className="link-button" onClick={props.onStartOver}>{text.home.startOver}</button>
      </div>
    </section>
  )
}
