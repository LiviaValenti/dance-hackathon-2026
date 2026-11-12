import { Mascot } from '../../mascot/Mascot'
import { TopBar } from '../TopBar'
import { formatTime } from '../../formatTime'
import { ClassSpace } from './ClassSpace'
import type { Choreography } from '../../content/types'
import { text } from '../../text'

const t = text.studio

/** The studio branch: a Studio dancer gets their studio's bundled Choreography (ADR 0003), no Level check. */
export function StudioIntro({ choreography, onStart }: { choreography: Choreography; onStart: () => void }) {
  const studio = choreography.studio!
  const length = choreography.reference.end - choreography.reference.start
  return (
    <section className="screen">
      <TopBar title={t.title(studio.name)} />
      <div className="mascot-greeting">
        <Mascot size={88} mood="dance" tempo={choreography.reference.tempo} />
        <p className="bubble">{t.bubble(studio.name)}</p>
      </div>
      <div className="card stack studio-card">
        <span className="badge">{studio.label}</span>
        <h2 className="choreo-title">{choreography.title}</h2>
        <span className="muted small">{t.details(choreography.parts.length, formatTime(length), choreography.reference.tempo)}</span>
      </div>
      <ClassSpace studio={studio} mine={0} />
      <p className="muted small">{t.note}</p>
      <div className="screen-footer">
        <button className="primary" onClick={onStart}>{t.start}</button>
      </div>
    </section>
  )
}
