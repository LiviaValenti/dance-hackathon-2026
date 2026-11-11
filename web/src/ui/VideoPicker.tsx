import { useEffect, useState, type ReactNode, type RefObject } from 'react'

type Props = {
  label: string
  file: File | null
  onFile: (file: File | null) => void
  videoRef: RefObject<HTMLVideoElement | null>
  onDuration?: (seconds: number) => void
  children?: ReactNode
}

/** MediaRecorder-WebM har ukjent varighet til videoen er spolt til slutten. */
function reportDuration(video: HTMLVideoElement, onDuration?: (seconds: number) => void) {
  if (!onDuration) return
  if (Number.isFinite(video.duration)) {
    onDuration(video.duration)
    return
  }
  const onChange = () => {
    if (!Number.isFinite(video.duration)) return
    video.removeEventListener('durationchange', onChange)
    video.currentTime = 0
    onDuration(video.duration)
  }
  video.addEventListener('durationchange', onChange)
  video.currentTime = 1e101
}

export function VideoPicker({ label, file, onFile, videoRef, onDuration, children }: Props) {
  const [source, setSource] = useState<{ file: File; url: string } | null>(null)
  const url = source && source.file === file ? source.url : null

  useEffect(() => {
    if (!file) return
    const objectUrl = URL.createObjectURL(file)
    // Object-URL-en er en ekstern ressurs som må lages og frigjøres i samme effekt (StrictMode kjører den to ganger).
    // oxlint-disable-next-line react/set-state-in-effect
    setSource({ file, url: objectUrl })
    return () => URL.revokeObjectURL(objectUrl)
  }, [file])

  return (
    <div className="picker">
      <label className="picker-label">
        {label}
        <input type="file" accept="video/*" onChange={(e) => onFile(e.target.files?.[0] ?? null)} />
      </label>
      {children}
      {url && (
        <video
          ref={videoRef} src={url} muted playsInline controls preload="auto" className="picker-video"
          onLoadedMetadata={(e) => reportDuration(e.currentTarget, onDuration)}
        />
      )}
    </div>
  )
}
