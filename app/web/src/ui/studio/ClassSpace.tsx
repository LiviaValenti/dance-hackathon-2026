import { classProgress } from '../../social/social'
import type { Studio } from '../../content/types'
import { text } from '../../text'

const t = text.classSpace

type Props = { studio: Studio; mine: number; onTeacherPreview?: () => void }

/** The studio's class space: next class, the teacher's note and a class challenge everyone wins by joining. */
export function ClassSpace({ studio, mine, onTeacherPreview }: Props) {
  const progress = classProgress(studio.challenge, mine)
  const others = Math.min(progress.goal, studio.challenge.doneByOthers)
  return (
    <div className="card stack class-space">
      <div className="row">
        <h3 className="class-title">{t.title}</h3>
        <span className="badge">{studio.name}</span>
      </div>
      <span className="muted small">{studio.className} · {t.next(studio.nextClass)}</span>
      <blockquote className="teacher-note">
        <span className="label">{t.teacherSays}</span>
        <p>{studio.teacherNote}</p>
      </blockquote>
      <div className="stack challenge">
        <div className="row">
          <strong className="small">{t.challengeTitle(progress.goal)}</strong>
          <strong className="challenge-count">{t.challengeCount(progress.done, progress.goal)}</strong>
        </div>
        <span className="bar bar-thick challenge-bar" role="progressbar" aria-valuenow={progress.done} aria-valuemin={0} aria-valuemax={progress.goal}>
          <span style={{ width: `${(others / progress.goal) * 100}%` }} />
          <span className="mine" style={{ width: `${((progress.done - others) / progress.goal) * 100}%` }} />
        </span>
        <span className="small">{progress.reached ? t.reached : t.yours(progress.mine)}</span>
      </div>
      {onTeacherPreview && <button className="link-button" onClick={onTeacherPreview}>{t.teacherLink}</button>}
      <span className="muted small">{t.example}</span>
    </div>
  )
}
