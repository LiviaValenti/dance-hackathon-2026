import { useEffect, useMemo, useRef, useState } from 'react'
import { ReferenceStep } from '../steps/ReferenceStep'
import { PrepareStep } from '../steps/PrepareStep'
import { AttemptStep } from '../steps/AttemptStep'
import { AnalyzingStep, type Stage } from '../steps/AnalyzingStep'
import { Recorder } from '../Recorder'
import { ResultView } from '../ResultView'
import { FeedbackView } from '../FeedbackView'
import { reportDuration } from '../videoDuration'
import type { Trim } from '../TrimControl'
import { useObjectUrl } from '../../useObjectUrl'
import { detectPeople, extractPoses } from '../../pose/extractPoses'
import { DancerPicker } from '../DancerPicker'
import type { Spot } from '../../pose/person'
import { compare, type Comparison } from '../../analysis/score'
import { segmentScores, type Segment } from '../../analysis/segments'
import { timelineScores } from '../../analysis/timeline'
import { detectFaults, type Fault } from '../../analysis/faults'
import { checkQuality, qualityWarnings } from '../../analysis/quality'
import { sliceSequence, splitParts } from '../../analysis/parts'
import { buildRequest } from '../../feedback/buildRequest'
import { getFeedback } from '../../feedback/api'
import { browserStorage, historyKey, saveAttempt, type Attempt } from '../../progress/history'
import type { Feedback } from '../../feedback/types'
import type { PoseSequence } from '../../pose/types'
import { text } from '../../text'
import { DEFAULT_TEMPO } from '../../mascot/settings'

type Step = 'reference' | 'pick' | 'prepare' | 'attempt' | 'record' | 'analyzing' | 'result' | 'feedback'
type TrimState = { duration: number; trim: Trim }

type Result = {
  title: string
  ref: PoseSequence
  user: PoseSequence
  comparison: Comparison
  segments: Segment[]
  timeline: Segment[]
  faults: Fault[]
  strengths: string[]
  feedback: Feedback
  source: 'ai' | 'fallback'
  history: Attempt[]
  warnings: string[]
}

const baseName = (file: File) => file.name.replace(/\.[^.]+$/, '')

/** Practise against any video the Dancer chooses: the original insured-gains flow. */
export function OwnVideoFlow({ onExit }: { onExit: () => void }) {
  const refVideo = useRef<HTMLVideoElement>(null)
  const userVideo = useRef<HTMLVideoElement>(null)
  const pendingAnalysis = useRef(false)
  const [step, setStep] = useState<Step>('reference')
  const [refFile, setRefFile] = useState<File | null>(null)
  const [refTrim, setRefTrim] = useState<TrimState | null>(null)
  const [accepted, setAccepted] = useState(false)
  const [name, setName] = useState('')
  const [mirror, setMirror] = useState(true)
  const [refSeq, setRefSeq] = useState<{ key: string; seq: PoseSequence } | null>(null)
  const [refProgress, setRefProgress] = useState<number | null>(null)
  /** The dancers found when the Reference has several, and which one the Dancer chose (per file and trim). */
  const [people, setPeople] = useState<{ video: HTMLVideoElement; found: Array<{ center: Spot }> } | null>(null)
  const [chosen, setChosen] = useState<{ key: string; follow: Spot } | null>(null)
  const [practice, setPractice] = useState<number | null>(null)
  const [userFile, setUserFile] = useState<File | null>(null)
  const [userTrim, setUserTrim] = useState<TrimState | null>(null)
  const [stage, setStage] = useState<Stage>({ name: 'poses', fraction: 0 })
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<Result | null>(null)

  const refUrl = useObjectUrl(refFile)
  const userUrl = useObjectUrl(userFile)
  const parts = useMemo(() => (refTrim ? splitParts(refTrim.trim.start, refTrim.trim.end) : []), [refTrim])
  const range = practice !== null && parts[practice] ? parts[practice] : (refTrim?.trim ?? null)
  const practiceRef = useMemo(
    () => (refSeq && range ? sliceSequence(refSeq.seq, range.start, range.end) : null),
    [refSeq, range],
  )
  const quality = useMemo(() => (refSeq ? checkQuality(refSeq.seq) : null), [refSeq])
  const partLabel = practice === null ? text.common.whole : text.common.part(practice + 1)

  function chooseReference(file: File | null) {
    setRefFile(file)
    setRefTrim(null)
    setRefSeq(null)
    setPractice(null)
    setChosen(null)
    if (file) setName(baseName(file))
  }

  async function prepareReference(pick?: Spot) {
    if (!refVideo.current || !refFile || !refTrim) return
    const baseKey = historyKey(refFile, refTrim.trim)
    if (pick) setChosen({ key: baseKey, follow: pick })
    const follow = pick ?? (chosen?.key === baseKey ? chosen.follow : undefined)
    const key = follow ? `${baseKey}@${follow.x.toFixed(3)},${follow.y.toFixed(3)}` : baseKey
    setStep('prepare')
    if (refSeq?.key === key) return
    setError(null)
    setRefSeq(null)
    try {
      setRefProgress(0)
      if (!follow && (await openPicker(false))) return
      const seq = await extractPoses(refVideo.current, {
        start: refTrim.trim.start, end: refTrim.trim.end, follow, onProgress: setRefProgress,
      })
      setRefSeq({ key, seq })
    } catch (e) {
      setError(text.errors.reference((e as Error).message))
    } finally {
      setRefProgress(null)
    }
  }

  /** Shows the dancer picker; unless forced, only when several dancers are found. */
  async function openPicker(force: boolean): Promise<boolean> {
    if (!refVideo.current || !refTrim) return false
    const found = await detectPeople(refVideo.current, refTrim.trim.start)
    if (!force && found.length < 2) return false
    setPeople({ video: refVideo.current, found })
    setStep('pick')
    return true
  }

  function chooseAttempt(file: File, next: Step) {
    setUserFile(file)
    setUserTrim(null)
    setStep(next)
  }

  function requestAnalysis() {
    pendingAnalysis.current = true
    setStage({ name: 'poses', fraction: 0 })
    setStep('analyzing')
  }

  async function runAnalysis(trim: Trim) {
    if (!userVideo.current || !practiceRef || !range || !refFile) {
      setError(text.errors.generic)
      setStep('prepare')
      return
    }
    setError(null)
    try {
      setStage({ name: 'poses', fraction: 0 })
      const user = await extractPoses(userVideo.current, {
        start: trim.start, end: trim.end,
        onProgress: (fraction) => setStage({ name: 'poses', fraction }),
      })
      setStage({ name: 'compare' })
      const ref = practiceRef
      const comparison = compare(ref, user, { mirrorRef: mirror })
      if (!comparison) {
        setError(text.errors.noBody)
        setStep('prepare')
        return
      }
      const segments = segmentScores(comparison, ref)
      const faults = detectFaults(comparison, ref)
      const request = buildRequest(comparison, segments, faults)
      const warnings = [
        ...qualityWarnings(text.quality.referenceLabel, checkQuality(ref)),
        ...qualityWarnings(text.quality.attemptLabel, checkQuality(user)),
      ]
      const history = saveAttempt(browserStorage(), historyKey(refFile, range), {
        at: new Date().toISOString(),
        overall: comparison.overall,
      })
      setStage({ name: 'feedback' })
      const { feedback, source } = await getFeedback(request)
      setResult({
        title: text.result.heading(name || text.common.reference, partLabel, history.length),
        ref, user, comparison, segments, timeline: timelineScores(comparison, ref), faults, strengths: request.strengths, feedback, source, history, warnings,
      })
      setStep('result')
    } catch (e) {
      setError(text.errors.analysis((e as Error).message))
      setStep('prepare')
    }
  }

  // Starts the analysis once the Attempt video has a known duration (camera recordings only get it after loading).
  useEffect(() => {
    if (step !== 'analyzing' || !userTrim || !pendingAnalysis.current) return
    pendingAnalysis.current = false
    void runAnalysis(userTrim.trim)
  })

  function practiceFault(fault: Fault) {
    const index = parts.findIndex((p) => fault.start >= p.start && fault.start < p.end)
    if (parts.length > 1 && index >= 0) setPractice(index)
    setStep('record')
  }

  return (
    <>
      {refUrl && (
        <video
          ref={refVideo} src={refUrl} muted playsInline preload="auto" className="offscreen" aria-hidden="true"
          onLoadedMetadata={(e) => reportDuration(e.currentTarget, (d) => setRefTrim({ duration: d, trim: { start: 0, end: d } }))}
        />
      )}
      {userUrl && (
        <video
          ref={userVideo} src={userUrl} muted playsInline preload="auto" className="offscreen" aria-hidden="true"
          onLoadedMetadata={(e) => reportDuration(e.currentTarget, (d) => setUserTrim({ duration: d, trim: { start: 0, end: d } }))}
        />
      )}

      {step === 'reference' && (
        <ReferenceStep
          url={refUrl} duration={refTrim?.duration ?? null} trim={refTrim?.trim ?? null} accepted={accepted}
          onFile={chooseReference}
          onTrim={(trim) => { if (refTrim) { setRefTrim({ ...refTrim, trim }); setPractice(null) } }}
          onAccepted={setAccepted} onNext={() => void prepareReference()} onBack={onExit}
        />
      )}
      {step === 'pick' && people && (
        <DancerPicker
          video={people.video} people={people.found}
          onPick={(center) => void prepareReference(center)} onBack={() => setStep('reference')}
        />
      )}
      {step === 'prepare' && (
        <PrepareStep
          name={name} mirror={mirror} progress={refProgress} error={error} quality={quality}
          parts={parts} practice={practice}
          onName={setName} onMirror={setMirror} onPractice={setPractice}
          onRecord={() => setStep('record')}
          onUpload={(file) => chooseAttempt(file, 'attempt')}
          onBack={() => setStep('reference')}
          onChooseDancer={() => void openPicker(true)}
        />
      )}
      {step === 'attempt' && (
        <AttemptStep
          url={userUrl} duration={userTrim?.duration ?? null} trim={userTrim?.trim ?? null}
          onTrim={(trim) => { if (userTrim) setUserTrim({ ...userTrim, trim }) }}
          onAnalyze={requestAnalysis} onBack={() => setStep('prepare')}
        />
      )}
      {step === 'record' && practiceRef && range && (
        <Recorder
          subtitle={text.recorder.subtitle(partLabel)}
          reference={practiceRef} tempo={DEFAULT_TEMPO} mirrorRef={mirror} maxSeconds={range.end - range.start + 1}
          player={refUrl ? { src: refUrl, start: range.start, end: range.end, rate: 1 } : undefined}
          onDone={(file) => { chooseAttempt(file, 'analyzing'); requestAnalysis() }}
          onCancel={() => setStep('prepare')}
        />
      )}
      {step === 'analyzing' && <AnalyzingStep stage={stage} />}
      {step === 'result' && result && (
        <ResultView
          title={result.title} comparison={result.comparison} segments={result.segments} strengths={result.strengths}
          feedback={result.feedback} source={result.source} history={result.history} warnings={result.warnings}
          onShowFeedback={() => setStep('feedback')} onRetry={() => setStep('record')} onClose={() => setStep('prepare')}
        />
      )}
      {step === 'feedback' && result && (
        <FeedbackView
          reference={result.ref} user={result.user} comparison={result.comparison} segments={result.segments}
          timeline={result.timeline} faults={result.faults} feedback={result.feedback}
          onPractice={practiceFault} onBack={() => setStep('result')}
        />
      )}
    </>
  )
}
