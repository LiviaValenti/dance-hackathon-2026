import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import type { PoseLandmarker } from '@mediapipe/tasks-vision'
import { createLandmarker, pickPerson } from '../pose/extractPoses'
import { createPersonSelector } from '../pose/person'
import { frameAngles, mirrorAngles } from '../analysis/angles'
import { poseMatch } from '../analysis/score'
import { SkeletonCanvas } from './SkeletonCanvas'
import { TopBar } from './TopBar'
import { AlertIcon, CheckIcon } from './icons'
import type { PoseSequence } from '../pose/types'
import { text } from '../text'
import { Mascot } from '../mascot/Mascot'
import { beatSeconds } from '../mascot/settings'
import { click } from '../practice/metronome'

type Props = {
  subtitle: string
  reference: PoseSequence
  /** Beats per minute the Mascot, count-in and beat pulse follow (already adjusted for speed). */
  tempo: number
  /** The Reference video to dance along with, played from start to end at the given rate. */
  player?: { src: string; start: number; end: number; rate: number }
  mirrorRef: boolean
  maxSeconds: number
  onDone: (file: File) => void
  /** Offers uploading a recorded video instead of recording live (also the fallback without a camera). */
  onUpload?: (file: File) => void
  /** Offers the bundled demo Attempt (live demos), skipping recording and trimming. */
  onDemo?: () => void
  onCancel: () => void
}

type Phase = 'starting' | 'ready' | 'countdown' | 'recording' | 'error'

const MIME_TYPES = ['video/webm;codecs=vp9', 'video/webm', 'video/mp4']
const MATCH_INTERVAL_MS = 200
const COUNT_IN = 4

export function Recorder({ subtitle, reference, tempo, player, mirrorRef, maxSeconds, onDone, onUpload, onDemo, onCancel }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const playerRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const cancelledRef = useRef(false)
  const [phase, setPhase] = useState<Phase>('starting')
  const [count, setCount] = useState(3)
  const [match, setMatch] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const outline = useMemo(() => {
    const frame = reference.frames.find((f) => f.points && frameAngles(f.points))
    if (!frame?.points) return null
    const angles = frameAngles(frame.points)!
    return { points: frame.points, angles: mirrorRef ? mirrorAngles(angles) : angles }
  }, [reference, mirrorRef])

  useEffect(() => {
    let cancelled = false
    // StrictMode runs this effect twice in development; the first cleanup must not cancel the real recording.
    cancelledRef.current = false
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'user' }, audio: false })
      .then(async (stream) => {
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return }
        streamRef.current = stream
        const video = videoRef.current!
        video.srcObject = stream
        await video.play()
        setPhase('ready')
      })
      .catch(() => {
        setError(text.errors.camera)
        setPhase('error')
      })
    return () => {
      cancelled = true
      cancelledRef.current = true
      clearTimeout(timerRef.current)
      if (recorderRef.current?.state === 'recording') recorderRef.current.stop()
      streamRef.current?.getTracks().forEach((t) => t.stop())
    }
  }, [])

  const live = phase === 'ready' || phase === 'countdown'
  useEffect(() => {
    if (!live || !outline) return
    let landmarker: PoseLandmarker | null = null
    let raf = 0
    let stopped = false
    let last = 0
    const selector = createPersonSelector()
    const loop = () => {
      if (stopped) return
      const video = videoRef.current
      const now = performance.now()
      if (landmarker && video && video.readyState >= 2 && now - last > MATCH_INTERVAL_MS) {
        last = now
        const result = landmarker.detectForVideo(video, now)
        const points = pickPerson(selector, result.landmarks, video.videoWidth, video.videoHeight)
        const angles = points ? frameAngles(points) : null
        setMatch(angles ? poseMatch(outline.angles, angles) : null)
      }
      raf = requestAnimationFrame(loop)
    }
    createLandmarker().then((lm) => {
      if (stopped) { lm.close(); return }
      landmarker = lm
      loop()
    })
    return () => {
      stopped = true
      cancelAnimationFrame(raf)
      landmarker?.close()
    }
  }, [live, outline])

  function record() {
    const stream = streamRef.current
    if (!stream) return
    const mimeType = MIME_TYPES.find((t) => MediaRecorder.isTypeSupported(t))
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
    const chunks: Blob[] = []
    recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data) }
    recorder.onstop = () => {
      if (cancelledRef.current) return
      const type = recorder.mimeType || 'video/webm'
      onDone(new File(chunks, `${text.recorder.fileName}.${type.includes('mp4') ? 'mp4' : 'webm'}`, { type }))
    }
    recorderRef.current = recorder
    recorder.start()
    setPhase('recording')
    const p = playerRef.current
    if (p && player) {
      p.currentTime = player.start
      p.muted = false
      void p.play().catch(() => { p.muted = true; void p.play() })
    }
    timerRef.current = setTimeout(() => { if (recorder.state === 'recording') recorder.stop() }, maxSeconds * 1000)
  }

  /** Four-beat count-in on the Tempo, then record. */
  function start() {
    const beatMs = beatSeconds(tempo) * 1000
    setPhase('countdown')
    playerRef.current?.pause()
    if (playerRef.current && player) playerRef.current.currentTime = player.start
    let n = COUNT_IN
    setCount(n)
    click(true)
    const tick = () => {
      n -= 1
      if (n > 0) { setCount(n); click(); timerRef.current = setTimeout(tick, beatMs) }
      else record()
    }
    timerRef.current = setTimeout(tick, beatMs)
  }

  /** Loops the Reference while getting ready; ends the Attempt when the Reference ends. */
  function onPlayerTime() {
    const p = playerRef.current
    if (!p || !player || p.currentTime < player.end) return
    if (phase === 'recording') { p.pause(); stop() }
    else p.currentTime = player.start
  }

  function stop() {
    clearTimeout(timerRef.current)
    playerRef.current?.pause()
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop()
  }

  function cancel() {
    cancelledRef.current = true
    stop()
    onCancel()
  }

  return (
    <section className="screen">
      <TopBar title={text.recorder.title} subtitle={subtitle} onBack={cancel} icon="close" />
      {live && (
        <span className={match === null ? 'status-pill warn' : 'status-pill ok'}>
          {match === null ? <AlertIcon /> : <CheckIcon />}
          {match === null ? text.recorder.stepBack : text.recorder.fullyVisible}
        </span>
      )}
      <div className={player ? 'stage' : 'stage single'} style={{ '--beat': `${beatSeconds(tempo)}s` } as CSSProperties}>
        {player && (
          <figure className="stage-ref">
            <video
              ref={playerRef} src={player.src} muted playsInline autoPlay preload="auto" aria-label={text.recorder.reference}
              className={mirrorRef ? 'mirrored' : undefined}
              onLoadedMetadata={(e) => { e.currentTarget.playbackRate = player.rate; e.currentTarget.currentTime = player.start }}
              onPlay={(e) => { e.currentTarget.playbackRate = player.rate }}
              onTimeUpdate={onPlayerTime}
            />
            <figcaption className="pane-label">{text.recorder.reference}</figcaption>
          </figure>
        )}
        <div className={phase === 'recording' ? 'camera beat-pulse' : 'camera'}>
          <video ref={videoRef} muted playsInline className="camera-video" />
          {outline && (
            <div className={mirrorRef ? 'pose-outline' : 'pose-outline flip'} aria-hidden="true">
              <SkeletonCanvas label={text.recorder.outline} points={outline.points} width={reference.width} height={reference.height} displayHeight={480} />
            </div>
          )}
          <span className="pane-label">{text.recorder.you}</span>
          <Mascot tempo={tempo} mood={phase === 'starting' || phase === 'error' ? 'idle' : 'dance'} size={56} className="camera-mascot" />
          {phase === 'countdown' && <span className="countdown" aria-live="assertive">{count}</span>}
          {phase === 'recording' && <span className="rec-badge">{text.recorder.recording}</span>}
        </div>
      </div>

      {live && (
        <div className="match" aria-live="polite">
          <div className="match-row">
            <span>{text.recorder.matchOutline}</span>
            <strong>{match === null ? text.recorder.notVisible : `${match}%`}</strong>
          </div>
          <span className="bar"><span style={{ width: `${match ?? 0}%` }} /></span>
        </div>
      )}
      {error && <p role="alert" className="error">{error}</p>}

      <div className="screen-footer">
        {phase === 'ready' && <button className="primary" onClick={start}>{text.recorder.start}</button>}
        {phase === 'recording' && <button className="primary" onClick={stop}>{text.recorder.stop}</button>}
        {onDemo && (phase === 'ready' || phase === 'error') && (
          <button className="secondary" onClick={() => { cancelledRef.current = true; onDemo() }}>{text.recorder.demo}</button>
        )}
        {onUpload && (phase === 'ready' || phase === 'error') && (
          <label className="secondary file-button">
            {text.recorder.upload}
            <input
              type="file" accept="video/*" className="visually-hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) { cancelledRef.current = true; onUpload(f) } }}
            />
          </label>
        )}
      </div>
    </section>
  )
}
