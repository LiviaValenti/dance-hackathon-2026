import { useEffect, useRef, useState } from 'react'
import { VideoPicker } from './ui/VideoPicker'
import { SkeletonCanvas } from './ui/SkeletonCanvas'
import { extractPoses } from './pose/extractPoses'
import { compare, type Comparison } from './analysis/score'
import { JOINT_NAMES } from './analysis/angles'
import { JOINT_LABELS } from './analysis/jointLabels'
import type { PoseSequence } from './pose/types'

type Result = { ref: PoseSequence; user: PoseSequence; comparison: Comparison }

export default function App() {
  const refVideo = useRef<HTMLVideoElement>(null)
  const userVideo = useRef<HTMLVideoElement>(null)
  const [hasRef, setHasRef] = useState(false)
  const [hasUser, setHasUser] = useState(false)
  const [mirrorRef, setMirrorRef] = useState(true)
  const [progress, setProgress] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<Result | null>(null)
  const [step, setStep] = useState(0)
  const [playing, setPlaying] = useState(false)

  async function analyze() {
    if (!refVideo.current || !userVideo.current) return
    setError(null)
    setResult(null)
    try {
      setProgress('Finner positurer i referansen …')
      const ref = await extractPoses(refVideo.current, {
        onProgress: (f) => setProgress(`Referanse: ${Math.round(f * 100)} %`),
      })
      const user = await extractPoses(userVideo.current, {
        onProgress: (f) => setProgress(`Ditt forsøk: ${Math.round(f * 100)} %`),
      })
      const comparison = compare(ref, user, { mirrorRef })
      if (!comparison) {
        setError('Fant ingen hel kropp i en av videoene. Sørg for at hele kroppen er synlig.')
      } else {
        setResult({ ref, user, comparison })
        setStep(0)
      }
    } catch (e) {
      setError(`Analysen feilet: ${(e as Error).message}`)
    } finally {
      setProgress(null)
    }
  }

  useEffect(() => {
    if (!playing || !result) return
    const id = setInterval(() => {
      setStep((s) => {
        if (s >= result.comparison.steps.length - 1) { setPlaying(false); return s }
        return s + 1
      })
    }, 1000 / result.user.fps)
    return () => clearInterval(id)
  }, [playing, result])

  const current = result?.comparison.steps[step]

  return (
    <main className="page">
      <h1>Sammenlign med referansen</h1>

      <section className="pickers">
        <VideoPicker label="Referansevideo" videoRef={refVideo} onChange={setHasRef} />
        <VideoPicker label="Ditt forsøk" videoRef={userVideo} onChange={setHasUser} />
      </section>

      <label className="check">
        <input type="checkbox" checked={mirrorRef} onChange={(e) => setMirrorRef(e.target.checked)} />
        Speilvend referansen (du danser vendt mot kamera, som foran et speil)
      </label>

      <button className="primary" disabled={!hasRef || !hasUser || !!progress} onClick={analyze}>
        {progress ?? 'Analyser'}
      </button>
      {error && <p role="alert" className="error">{error}</p>}

      {result && current && (
        <section className="result">
          <div className="score">
            <span className="score-value">{result.comparison.overall}</span>
            <span className="muted">av 100</span>
          </div>

          <div className="skeletons">
            <SkeletonCanvas
              label="Referanse"
              points={result.ref.frames[current.refFrame].points}
              width={result.ref.width}
              height={result.ref.height}
            />
            <SkeletonCanvas
              label="Deg"
              points={result.user.frames[current.userFrame].points}
              width={result.user.width}
              height={result.user.height}
              diffs={current.diffs}
            />
          </div>

          <div className="scrubber">
            <button onClick={() => setPlaying((p) => !p)} aria-label={playing ? 'Pause' : 'Spill av'}>
              {playing ? 'Pause' : 'Spill av'}
            </button>
            <input
              type="range"
              min={0}
              max={result.comparison.steps.length - 1}
              value={step}
              onChange={(e) => setStep(Number(e.target.value))}
              aria-label="Tidslinje"
            />
            <span className="muted">{result.user.frames[current.userFrame].t.toFixed(1)} s</span>
          </div>

          <ul className="joints">
            {[...JOINT_NAMES]
              .sort((a, b) => result.comparison.perJoint[a] - result.comparison.perJoint[b])
              .map((n) => (
                <li key={n}>
                  <span>{JOINT_LABELS[n]}</span>
                  <span className="bar"><span style={{ width: `${result.comparison.perJoint[n]}%` }} /></span>
                  <strong>{result.comparison.perJoint[n]}</strong>
                </li>
              ))}
          </ul>
        </section>
      )}
    </main>
  )
}
