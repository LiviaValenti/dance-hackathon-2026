import { TopBar } from '../TopBar'
import { LockIcon } from '../icons'
import type { Studio } from '../../content/types'
import { text } from '../../text'

const t = text.teacherView

/** A preview of the studio side (a next step): the class together, with consent, never one Dancer's Scores. */
export function TeacherPreview({ studio, onBack }: { studio: Studio; onBack: () => void }) {
  const v = studio.teacherView
  return (
    <section className="screen">
      <TopBar title={t.title} subtitle={t.subtitle(studio.name)} onBack={onBack} />
      <span className="badge">{t.example}</span>
      <p>{t.intro}</p>
      <div className="card stack">
        <span className="muted small">{studio.className} · {studio.label}</span>
        <strong className="teacher-stat">{t.practised(v.practisedTwice, v.classSize)}</strong>
        <span className="bar bar-thick"><span style={{ width: `${(v.practisedTwice / v.classSize) * 100}%` }} /></span>
      </div>
      <div className="card stack">
        <span className="label">{t.hardest}</span>
        <strong>{t.hardestDetail(v.hardest.part, v.hardest.span, v.hardest.area)}</strong>
        <span className="label">{t.strongest}</span>
        <strong>{v.strongest}</strong>
      </div>
      <div className="card decision">
        <strong>{t.suggestion}</strong>
      </div>
      <div className="card note">
        <LockIcon />
        <span>{t.privacy}</span>
      </div>
    </section>
  )
}
