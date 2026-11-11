import { useRef, useState } from 'react'
import { VideoPicker } from './ui/VideoPicker'
import { TrimControl, type Trim } from './ui/TrimControl'
import { ResultView } from './ui/ResultView'
import { FeedbackView } from './ui/FeedbackView'
import { extractPoses } from './pose/extractPoses'
import { compare, type Comparison } from './analysis/score'
import { segmentScores, type Segment } from './analysis/segments'
import { detectFaults, type Fault } from './analysis/faults'
import { buildRequest } from './feedback/buildRequest'
import { getFeedback } from './feedback/api'
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

type View = 'setup' | 'result' | 'feedback'

export default function App() {
  const refVideo = useRef<HTMLVideoElement>(null)
  const userVideo = useRef<HTMLVideoElement>(null)
  const [refTrim, setRefTrim] = useState<{ duration: number; trim: Trim } | null>(null)
  const [userTrim, setUserTrim] = useState<{ duration: number; trim: Trim } | null>(null)
  const [mirrorRef, setMirrorRef] = useState(true)
  const [progress, setProgress] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [view, setView] = useState<View>('setup')
  const [analysis, setAnalysis] = useState<Analysis | null>(null)
  const [feedback, setFeedback] = useState<Feedback | null>(null)
  const [source, setSource] = useState<'ai' | 'fallback' | null>(null)

  async function analyze() {
    if (!refVideo.current || !userVideo.current) return
    setError(null)
    try {
      const ref = await extractPoses(refVideo.current, {
        start: refTrim?.trim.start, end: refTrim?.trim.end,
        onProgress: (f) => setProgress(`Referanse: ${Math.round(f * 100)} %`),
      })
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

  const onDuration = (set: typeof setRefTrim) => (duration: number) =>
    set({ duration, trim: { start: 0, end: duration } })

  return (
    <main className="page">
      <section className="setup" hidden={view !== 'setup'}>
        <h1>Lær en ny dans</h1>
        <div className="pickers">
          <div>
            <VideoPicker
              label="Referansevideo" videoRef={refVideo}
              onChange={(has) => { if (!has) setRefTrim(null) }} onDuration={onDuration(setRefTrim)}
            />
            {refTrim && (
              <TrimControl duration={refTrim.duration} value={refTrim.trim} onChange={(trim) => setRefTrim({ ...refTrim, trim })} />
            )}
          </div>
          <div>
            <VideoPicker
              label="Ditt forsøk" videoRef={userVideo}
              onChange={(has) => { if (!has) setUserTrim(null) }} onDuration={onDuration(setUserTrim)}
            />
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

      {analysis && view === 'result' && (
        <ResultView
          comparison={analysis.comparison} segments={analysis.segments} strengths={analysis.strengths}
          feedback={feedback} source={source}
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
