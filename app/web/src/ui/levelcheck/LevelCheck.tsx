import { useState } from 'react'
import { Mascot } from '../../mascot/Mascot'
import { TopBar } from '../TopBar'
import { Recorder } from '../Recorder'
import { AnalyzingStep, type Stage } from '../steps/AnalyzingStep'
import { Confetti } from '../Confetti'
import { content } from '../../content/content'
import { levelCheckRule, LEVELS, type LevelOutcome, type StatedLevel } from '../../levelcheck/rule'
import { referencePoses } from '../../practice/referencePoses'
import { analyseAttempt } from '../../practice/analyse'
import type { LevelId } from '../../content/types'
import type { PoseSequence } from '../../pose/types'
import { text } from '../../text'

export type LevelResult = { level: LevelId; stated: StatedLevel; score: number | null; change: LevelOutcome['change'] }

type Phase =
  | { name: 'choose' }
  | { name: 'preparing'; stated: LevelId; progress: number }
  | { name: 'record'; stated: LevelId; ref: PoseSequence }
  | { name: 'analysing'; stated: LevelId; stage: Stage }
  | { name: 'result'; result: LevelResult }

const t = text.levelCheck
const levelName = (id: LevelId) => content.levels.find((l) => l.id === id)!.name
const MIRROR = true

export function LevelCheck({ onDone }: { onDone: (result: LevelResult) => void }) {
  const [phase, setPhase] = useState<Phase>({ name: 'choose' })
  const [error, setError] = useState<string | null>(null)

  async function choose(stated: StatedLevel) {
    setError(null)
    if (stated === 'unknown') {
      setPhase({ name: 'result', result: { ...levelCheckRule('unknown'), stated, score: null } })
      return
    }
    const move = content.levelCheck.find((m) => m.level === stated)!
    setPhase({ name: 'preparing', stated, progress: 0 })
    try {
      const ref = await referencePoses(move.reference, (progress) => setPhase({ name: 'preparing', stated, progress }))
      setPhase({ name: 'record', stated, ref })
    } catch (e) {
      setError(text.errors.reference((e as Error).message))
      setPhase({ name: 'choose' })
    }
  }

  async function analyse(stated: LevelId, ref: PoseSequence, file: File) {
    setPhase({ name: 'analysing', stated, stage: { name: 'poses', fraction: 0 } })
    try {
      const analysis = await analyseAttempt(file, ref, {
        mirror: MIRROR, onProgress: (fraction) => setPhase({ name: 'analysing', stated, stage: { name: 'poses', fraction } }),
      })
      if (!analysis) {
        setError(text.errors.noBody)
        setPhase({ name: 'choose' })
        return
      }
      const score = analysis.comparison.overall
      setPhase({ name: 'result', result: { ...levelCheckRule(stated, score), stated, score } })
    } catch (e) {
      setError(text.errors.analysis((e as Error).message))
      setPhase({ name: 'choose' })
    }
  }

  if (phase.name === 'record') {
    const move = content.levelCheck.find((m) => m.level === phase.stated)!
    const { reference: r } = move
    return (
      <Recorder
        subtitle={t.recordSubtitle(move.title)} reference={phase.ref} tempo={r.tempo} mirrorRef={MIRROR}
        player={{ src: r.video, start: r.start, end: r.end, rate: 1 }} maxSeconds={r.end - r.start + 2}
        onDone={(file) => void analyse(phase.stated, phase.ref, file)} onCancel={() => setPhase({ name: 'choose' })}
      />
    )
  }
  if (phase.name === 'analysing') return <AnalyzingStep stage={phase.stage} coach={false} />

  if (phase.name === 'result') {
    const { result } = phase
    return (
      <section className="screen">
        {result.change === 'up' && <Confetti />}
        <TopBar title={t.resultTitle} />
        <div className="mascot-greeting">
          <Mascot size={96} mood={result.change === 'up' ? 'cheer' : 'idle'} />
          <p className="bubble" aria-live="polite">
            <strong>{t.outcome[result.change](levelName(result.level))}</strong>
            {result.score !== null && t.scoreLine(result.score)}
          </p>
        </div>
        <div className="stack">
          <h3 className="label">{t.override}</h3>
          <div className="chips">
            {LEVELS.map((id) => (
              <button
                key={id} aria-pressed={result.level === id}
                className={result.level === id ? 'chip-button selected' : 'chip-button'}
                onClick={() => setPhase({ name: 'result', result: { ...result, level: id } })}
              >
                {levelName(id)}
              </button>
            ))}
          </div>
        </div>
        <div className="screen-footer">
          <button className="primary" onClick={() => onDone(result)}>{t.continue}</button>
        </div>
      </section>
    )
  }

  return (
    <section className="screen">
      <TopBar title={t.title} subtitle={t.subtitle} />
      <div className="mascot-greeting">
        <Mascot size={88} />
        <p className="bubble">{t.ask}</p>
      </div>
      {phase.name === 'preparing' ? (
        <div className="card" aria-live="polite">
          <div className="row"><span>{t.preparing}</span><strong>{text.common.percent(phase.progress)}</strong></div>
          <span className="bar"><span style={{ width: `${phase.progress * 100}%` }} /></span>
        </div>
      ) : (
        <div className="choice-list">
          {content.levels.map((l) => (
            <button key={l.id} className="chip-button level-choice" onClick={() => void choose(l.id)}>
              <strong>{l.name}</strong>
              <span className="muted small">{l.description}</span>
            </button>
          ))}
          <button className="chip-button" onClick={() => void choose('unknown')}>{t.dontKnow}</button>
        </div>
      )}
      {error && <p role="alert" className="error">{error}</p>}
      <p className="muted small">{t.privacy}</p>
    </section>
  )
}
