import { useRef, useState } from 'react'
import { VideoPicker } from './ui/VideoPicker'
import { TrimControl, type Trim } from './ui/TrimControl'
import { ResultView } from './ui/ResultView'
import { FeedbackView } from './ui/FeedbackView'
import { Recorder } from './ui/Recorder'
import { extractPoses } from './pose/extractPoses'
import { compare, type Comparison } from './analysis/score'
import { segmentScores, type Segment } from './analysis/segments'
import { detectFaults, type Fault } from './analysis/faults'
import { checkQuality, qualityWarnings } from './analysis/quality'
import { buildRequest } from './feedback/buildRequest'
import { getFeedback } from './feedback/api'
import { browserStorage, historyKey, saveAttempt, type Attempt } from './progress/history'
import type { Feedback } from './feedback/types'
import type { PoseSequence } from './pose/types'

type Analysis = {
  ref: PoseSequence
  user: PoseSequence
  comparison: Comparison
  segments: Segment[]
  faults: Fault[]
  strengths: string[]
}

type View = 'setup' | 'record' | 'result' | 'feedback'
type TrimState = { duration: number; trim: Trim }

export default function App() {
  const refVideo = useRef<HTMLVideoElement>(null)
  const userVideo = useRef<HTMLVideoElement>(null)
  const refCache = useRef<{ key: string; seq: PoseSequence } | null>(null)
  const [refFile, setRefFile] = useState<File | null>(null)
  const [userFile, setUserFile] = useState<File | null>(null)
  const [refTrim, setRefTrim] = useState<TrimState | null>(null)
  const [userTrim, setUserTrim] = useState<TrimState | null>(null)
  const [mirrorRef, setMirrorRef] = useState(true)
  const [progress, setProgress] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [view, setView] = useState<View>('setup')
  const [recordReference, setRecordReference] = useState<PoseSequence | null>(null)
  const [analysis, setAnalysis] = useState<Analysis | null>(null)
  const [feedback, setFeedback] = useState<Feedback | null>(null)
  const [source, setSource] = useState<'ai' | 'fallback' | null>(null)
  const [history, setHistory] = useState<Attempt[]>([])
  const [warnings, setWarnings] = useState<string[]>([])

  async function referencePoses(): Promise<PoseSequence> {
    if (!refVideo.current || !refFile || !refTrim) throw new Error('Velg en referansevideo først.')
    const key = historyKey(refFile, refTrim.trim)
    if (refCache.current?.key === key) return refCache.current.seq
    const seq = await extractPoses(refVideo.current, {
      start: refTrim.trim.start, end: refTrim.trim.end,
      onProgress: (f) => setProgress(`Referanse: ${Math.round(f * 100)} %`),
    })
    refCache.current = { key, seq }
    return seq
  }

  async function openRecorder() {
    setError(null)
    try {
      setRecordReference(await referencePoses())
      setView('record')
    } catch (e) {
      setError(`Kunne ikke klargjøre referansen: ${(e as Error).message}`)
    } finally {
      setProgress(null)
    }
  }

  async function analyze() {
    if (!userVideo.current || !refFile || !refTrim) return
    setError(null)
    try {
      const ref = await referencePoses()
      const user = await extractPoses(userVideo.current, {
        start: userTrim?.trim.start, end: userTrim?.trim.end,
        onProgress: (f) => setProgress(`Ditt forsøk: ${Math.round(f * 100)} %`),
      })
      const comparison = compare(ref, user, { mirrorRef })
      if (!comparison) {
        setError('Fant ingen hel kropp i en av videoene. Sørg for at hele kroppen er synlig.')
        return
      }
      const segments = segmentScores(comparison, ref)
      const faults = detectFaults(comparison, ref)
      const request = buildRequest(comparison, segments, faults)
      setAnalysis({ ref, user, comparison, segments, faults, strengths: request.strengths })
      setWarnings([
        ...qualityWarnings('Referansen', checkQuality(ref)),
        ...qualityWarnings('Ditt forsøk', checkQuality(user)),
      ])
      setHistory(saveAttempt(browserStorage(), historyKey(refFile, refTrim.trim), {
        at: new Date().toISOString(),
        overall: comparison.overall,
      }))
      setFeedback(null)
      setSource(null)
      setView('result')
      const result = await getFeedback(request)
      setFeedback(result.feedback)
      setSource(result.source)
    } catch (e) {
      setError(`Analysen feilet: ${(e as Error).message}`)
    } finally {
      setProgress(null)
    }
  }

  const onDuration = (set: (t: TrimState) => void) => (duration: number) =>
    set({ duration, trim: { start: 0, end: duration } })

  return (
    <main className="page">
      <section className="setup" hidden={view !== 'setup'}>
        <h1>Lær en ny dans</h1>
        <div className="pickers">
          <div>
            <VideoPicker
              label="Referansevideo" videoRef={refVideo} file={refFile}
              onFile={(f) => { setRefFile(f); if (!f) setRefTrim(null) }} onDuration={onDuration(setRefTrim)}
            />
            {refTrim && (
              <TrimControl duration={refTrim.duration} value={refTrim.trim} onChange={(trim) => setRefTrim({ ...refTrim, trim })} />
            )}
          </div>
          <div>
            <VideoPicker
              label="Ditt forsøk" videoRef={userVideo} file={userFile}
              onFile={(f) => { setUserFile(f); if (!f) setUserTrim(null) }} onDuration={onDuration(setUserTrim)}
            >
              <button className="secondary" disabled={!refTrim || !!progress} onClick={openRecorder}>
                Ta opp med kamera
              </button>
            </VideoPicker>
            {userTrim && (
              <TrimControl duration={userTrim.duration} value={userTrim.trim} onChange={(trim) => setUserTrim({ ...userTrim, trim })} />
            )}
          </div>
        </div>

        <label className="check">
          <input type="checkbox" checked={mirrorRef} onChange={(e) => setMirrorRef(e.target.checked)} />
          Speilvend referansen (du danser vendt mot kamera, som foran et speil)
        </label>

        <button className="primary" disabled={!refTrim || !userTrim || !!progress} onClick={analyze}>
          {progress ?? 'Analyser'}
        </button>
        {error && <p role="alert" className="error">{error}</p>}
      </section>

      {view === 'record' && recordReference && refTrim && (
        <Recorder
          reference={recordReference} mirrorRef={mirrorRef}
          maxSeconds={refTrim.trim.end - refTrim.trim.start + 1}
          onDone={(file) => { setUserFile(file); setView('setup') }}
          onCancel={() => setView('setup')}
        />
      )}
      {analysis && view === 'result' && (
        <ResultView
          comparison={analysis.comparison} segments={analysis.segments} strengths={analysis.strengths}
          feedback={feedback} source={source} history={history} warnings={warnings}
          onShowFeedback={() => setView('feedback')} onRetry={() => setView('setup')}
        />
      )}
      {analysis && view === 'feedback' && (
        <FeedbackView
          reference={analysis.ref} user={analysis.user} comparison={analysis.comparison}
          faults={analysis.faults} feedback={feedback} onBack={() => setView('result')}
        />
      )}
    </main>
  )
}
