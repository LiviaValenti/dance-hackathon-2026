import { useEffect, useState } from 'react'
import { Recorder } from '../Recorder'
import { ResultView } from '../ResultView'
import { FeedbackView } from '../FeedbackView'
import { TopBar } from '../TopBar'
import { AnalyzingStep, type Stage } from '../steps/AnalyzingStep'
import { itemTitle } from '../plan/itemTitle'
import { TrimUpload } from './TrimUpload'
import type { Trim } from '../TrimControl'
import { content } from '../../content/content'
import { planRule, practiceItems, type Decision, type PlanState } from '../../plan/plan'
import { addAttempt, loadAttempts, type AttemptRecord } from '../../plan/attempts'
import { referencePoses } from '../../practice/referencePoses'
import { analyseAttempt, type AttemptAnalysis } from '../../practice/analyse'
import { sliceSequence } from '../../analysis/parts'
import { rangeScores } from '../../analysis/segments'
import { buildRequest } from '../../feedback/buildRequest'
import { getFeedback } from '../../feedback/api'
import type { Feedback } from '../../feedback/types'
import type { Choreography } from '../../content/types'
import type { Profile } from '../../profile/profile'
import type { PoseSequence } from '../../pose/types'
import { text } from '../../text'
import { mascot } from '../../mascot/settings'

type Props = {
  profile: Profile
  plan: PlanState
  choreography: Choreography
  mirror: boolean
  /** Saves the Plan's next state; the flow keeps going with it. */
  onPlan: (next: PlanState) => Promise<void>
  onExit: () => void
}

type Outcome = {
  analysis: AttemptAnalysis
  decision: Decision
  feedback: Feedback
  source: 'ai' | 'fallback'
  history: AttemptRecord[]
  ghost: AttemptRecord | null
  title: string
  next: PlanState
}

type Phase =
  | { name: 'preparing'; progress: number }
  | { name: 'record'; ref: PoseSequence }
  | { name: 'trim'; ref: PoseSequence; file: File }
  | { name: 'analysing'; stage: Stage }
  | { name: 'result'; outcome: Outcome }
  | { name: 'feedback'; outcome: Outcome }
  | { name: 'error'; message: string }

export function PracticeFlow({ profile, plan, choreography, mirror, onPlan, onExit }: Props) {
  const [phase, setPhase] = useState<Phase>({ name: 'preparing', progress: 0 })
  /** Each round practises the Plan's current item; a new round starts after the Dancer chooses to go on. */
  const [round, setRound] = useState(0)
  const items = practiceItems(choreography)
  const item = items[Math.min(plan.item, items.length - 1)]
  const title = itemTitle(item, plan.item)
  const { reference } = choreography

  // Loads the Reference poses for the Plan's current item at the start of each round. Not on Plan changes:
  // the Plan moves on while the result is still on screen.
  useEffect(() => {
    let cancelled = false
    referencePoses(reference, (progress) => { if (!cancelled) setPhase({ name: 'preparing', progress }) })
      .then((seq) => { if (!cancelled) setPhase({ name: 'record', ref: sliceSequence(seq, item.start, item.end) }) })
      .catch((e: Error) => { if (!cancelled) setPhase({ name: 'error', message: text.errors.reference(e.message) }) })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round])

  async function analyse(ref: PoseSequence, file: File, trim?: Trim) {
    setPhase({ name: 'analysing', stage: { name: 'poses', fraction: 0 } })
    try {
      const analysis = await analyseAttempt(file, ref, {
        mirror, trim, onProgress: (fraction) => setPhase({ name: 'analysing', stage: { name: 'poses', fraction } }),
      })
      if (!analysis) return setPhase({ name: 'error', message: text.errors.noBody })
      if (!item.part) analysis.segments = rangeScores(analysis.comparison, ref, choreography.parts)
      setPhase({ name: 'analysing', stage: { name: 'compare' } })

      const score = analysis.comparison.overall
      const { decision, next } = planRule(plan, score, { choreographies: content.choreographies, profile })
      const previous = await loadAttempts(choreography.id, item.id)
      const history = await addAttempt(choreography.id, item.id, {
        at: new Date().toISOString(), overall: score, areas: analysis.areas, speed: plan.speed,
      })

      setPhase({ name: 'analysing', stage: { name: 'feedback' } })
      const ghost = previous[previous.length - 1] ?? null
      const request = {
        ...buildRequest(analysis.comparison, analysis.segments, analysis.faults),
        voice: { name: mascot.name, tone: mascot.tone },
        plan: {
          decision: decision.kind,
          nextStep: decisionText(decision),
          weakestAreas: [...analysis.areas].sort((a, b) => a.score - b.score).filter((a) => a.score < 80).slice(0, 2).map((a) => a.label),
          ghostDelta: ghost ? score - ghost.overall : null,
        },
      }
      const { feedback, source } = await getFeedback(request)
      await onPlan(next)
      setPhase({
        name: 'result',
        outcome: {
          analysis, decision, feedback, source, history, next,
          ghost,
          title: text.result.heading(choreography.title, title, history.length),
        },
      })
    } catch (e) {
      setPhase({ name: 'error', message: text.errors.analysis((e as Error).message) })
    }
  }

  if (phase.name === 'preparing' || phase.name === 'error') {
    return (
      <section className="screen">
        <TopBar title={title} subtitle={choreography.title} onBack={onExit} />
        {phase.name === 'preparing' ? (
          <div className="card" aria-live="polite">
            <div className="row"><span>{text.levelCheck.preparing}</span><strong>{text.common.percent(phase.progress)}</strong></div>
            <span className="bar"><span style={{ width: `${phase.progress * 100}%` }} /></span>
          </div>
        ) : (
          <>
            <p role="alert" className="error">{phase.message}</p>
            <div className="screen-footer"><button className="primary" onClick={onExit}>{text.practice.backToPlan}</button></div>
          </>
        )}
      </section>
    )
  }

  if (phase.name === 'record') {
    return (
      <Recorder
        subtitle={text.practice.recordSubtitle(title, plan.speed)} reference={phase.ref}
        tempo={reference.tempo * plan.speed} mirrorRef={mirror}
        player={{ src: reference.video, start: item.start, end: item.end, rate: plan.speed }}
        maxSeconds={(item.end - item.start) / plan.speed + 2}
        onDone={(file) => void analyse(phase.ref, file)} onCancel={onExit}
        onUpload={(file) => setPhase({ name: 'trim', ref: phase.ref, file })}
      />
    )
  }
  if (phase.name === 'trim') {
    return (
      <TrimUpload
        file={phase.file} onAnalyse={(trim) => void analyse(phase.ref, phase.file, trim)}
        onBack={() => setPhase({ name: 'record', ref: phase.ref })}
      />
    )
  }

  if (phase.name === 'analysing') return <AnalyzingStep stage={phase.stage} />

  const { outcome } = phase
  const { analysis } = outcome
  if (phase.name === 'feedback') {
    return (
      <FeedbackView
        reference={analysis.ref} user={analysis.user} comparison={analysis.comparison} segments={analysis.segments}
        timeline={analysis.timeline} faults={analysis.faults} feedback={outcome.feedback}
        onPractice={() => setRound((r) => r + 1)} onBack={() => setPhase({ name: 'result', outcome })}
      />
    )
  }

  const advancing = ['next', 'combine', 'done', 'full-speed'].includes(outcome.decision.kind)
  return (
    <ResultView
      title={outcome.title} comparison={analysis.comparison} segments={analysis.segments} strengths={analysis.strengths}
      feedback={outcome.feedback} source={outcome.source} history={outcome.history} warnings={analysis.warnings}
      celebrate={advancing} ghost={outcome.ghost?.areas ?? null}
      extra={<DecisionCard decision={outcome.decision} />}
      retryLabel={outcome.decision.kind === 'done' ? text.practice.backToPlan : advancing || outcome.decision.kind === 'easier' ? text.practice.goNext : text.result.retry}
      onShowFeedback={() => setPhase({ name: 'feedback', outcome })}
      onRetry={outcome.decision.kind === 'done' ? onExit : () => setRound((r) => r + 1)}
      onClose={onExit}
    />
  )
}

function decisionText(decision: Decision): string {
  const easier = decision.kind === 'easier' ? content.choreographies.find((c) => c.id === decision.choreographyId)?.title ?? '' : ''
  return text.practice.decisions[decision.kind](easier)
}

function DecisionCard({ decision }: { decision: Decision }) {
  return (
    <div className={`card decision decision-${decision.kind}`}>
      <span className="label">{text.practice.nextStep}</span>
      <strong>{decisionText(decision)}</strong>
    </div>
  )
}
