import { useState, type ReactNode } from 'react'
import { Mascot } from '../../mascot/Mascot'
import { TopBar } from '../TopBar'
import { content } from '../../content/content'
import { GOALS, SESSION_MINUTES, type Goal, type Profile } from '../../profile/profile'
import type { Ache } from '../../content/types'
import { text } from '../../text'

const QUESTIONS = ['name', 'style', 'goal', 'time', 'aches', 'studio'] as const
type Question = (typeof QUESTIONS)[number]

const t = text.onboarding

type Draft = Omit<Profile, 'style' | 'goal' | 'studio'> & { style?: string; goal?: Goal; studio?: boolean }

function Choice({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button className={selected ? 'chip-button selected' : 'chip-button'} aria-pressed={selected} onClick={onClick}>
      {children}
    </button>
  )
}

export function Onboarding({ onDone }: { onDone: (profile: Profile) => void }) {
  const [index, setIndex] = useState(0)
  const [draft, setDraft] = useState<Draft>({ name: '', minutes: 20, aches: [] })
  const question: Question = QUESTIONS[index]
  const update = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }))

  const answered: Record<Question, boolean> = {
    name: draft.name.trim().length > 0,
    style: !!draft.style,
    goal: !!draft.goal,
    time: draft.minutes > 0,
    aches: true,
    studio: draft.studio !== undefined,
  }

  function next() {
    if (index < QUESTIONS.length - 1) return setIndex(index + 1)
    onDone({ ...draft, name: draft.name.trim(), style: draft.style!, goal: draft.goal!, studio: draft.studio! })
  }

  function toggleAche(id: Ache) {
    update({ aches: draft.aches.includes(id) ? draft.aches.filter((a) => a !== id) : [...draft.aches, id] })
  }

  return (
    <section className="screen">
      <TopBar
        title={t.title} subtitle={t.progress(index + 1, QUESTIONS.length)}
        onBack={index > 0 ? () => setIndex(index - 1) : undefined}
      />
      <span className="bar" aria-hidden="true"><span style={{ width: `${((index + 1) / QUESTIONS.length) * 100}%` }} /></span>

      <div className="mascot-greeting">
        <Mascot size={88} />
        <p className="bubble" aria-live="polite">
          {index === 0 && <strong>{text.mascot.hello}</strong>}
          {t.questions[question](draft.name.trim())}
        </p>
      </div>

      {question === 'name' && (
        <input
          className="text-input" aria-label={t.nameLabel} autoComplete="given-name" autoFocus value={draft.name}
          onChange={(e) => update({ name: e.target.value })}
          onKeyDown={(e) => { if (e.key === 'Enter' && answered.name) next() }}
        />
      )}
      {question === 'style' && (
        <div className="chips">
          {content.styles.map((s) => (
            <Choice key={s.id} selected={draft.style === s.id} onClick={() => update({ style: s.id })}>{s.name}</Choice>
          ))}
        </div>
      )}
      {question === 'goal' && (
        <div className="choice-list">
          {GOALS.map((g) => (
            <Choice key={g} selected={draft.goal === g} onClick={() => update({ goal: g })}>{t.goals[g]}</Choice>
          ))}
        </div>
      )}
      {question === 'time' && (
        <div className="chips">
          {SESSION_MINUTES.map((m) => (
            <Choice key={m} selected={draft.minutes === m} onClick={() => update({ minutes: m })}>{t.minutes(m)}</Choice>
          ))}
        </div>
      )}
      {question === 'aches' && (
        <div className="stack">
          <div className="chips">
            <Choice selected={draft.aches.length === 0} onClick={() => update({ aches: [] })}>{t.noAches}</Choice>
            {content.aches.map((a) => (
              <Choice key={a.id} selected={draft.aches.includes(a.id)} onClick={() => toggleAche(a.id)}>{a.name}</Choice>
            ))}
          </div>
          <p className="muted small">{t.achesNote}</p>
        </div>
      )}
      {question === 'studio' && (
        <div className="choice-list">
          <Choice selected={draft.studio === true} onClick={() => update({ studio: true })}>{t.studioYes}</Choice>
          <Choice selected={draft.studio === false} onClick={() => update({ studio: false })}>{t.studioNo}</Choice>
        </div>
      )}

      <div className="screen-footer">
        <button className="primary" disabled={!answered[question]} onClick={next}>
          {index === QUESTIONS.length - 1 ? t.finish : text.common.next}
        </button>
      </div>
    </section>
  )
}
