import { useEffect, useRef } from 'react'
import { TopBar } from './TopBar'
import type { Spot } from '../pose/person'
import { text } from '../text'

type Props = {
  /** The video, already seeked to the frame the people were found in. */
  video: HTMLVideoElement
  people: Array<{ center: Spot }>
  onPick: (center: Spot) => void
  onBack: () => void
}

/**
 * Shows the frame so the Dancer can choose who to learn from: a button on each dancer that was found, and a
 * tap anywhere on the frame for dancers the detector missed (common when dancers overlap).
 */
export function DancerPicker({ video, people, onPick, onBack }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const c = canvas.current
    if (!c) return
    c.width = video.videoWidth
    c.height = video.videoHeight
    c.getContext('2d')?.drawImage(video, 0, 0)
  }, [video])

  return (
    <section className="screen">
      <TopBar title={text.dancerPicker.title} subtitle={people.length > 1 ? text.dancerPicker.subtitle(people.length) : undefined} onBack={onBack} />
      <div className="dancer-frame" style={{ width: `min(100%, calc(60vh * ${video.videoWidth / Math.max(1, video.videoHeight)}))` }}>
        <canvas
          ref={canvas} role="img" aria-label={text.dancerPicker.frame}
          onClick={(e) => {
            const r = e.currentTarget.getBoundingClientRect()
            onPick({ x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height })
          }}
        />
        {people.map((p, i) => (
          <button
            key={i} className="dancer-pin" style={{ left: `${p.center.x * 100}%`, top: `${p.center.y * 100}%` }}
            aria-label={text.dancerPicker.pick(i + 1)} onClick={() => onPick(p.center)}
          >
            {i + 1}
          </button>
        ))}
      </div>
      <p className="muted small">{text.dancerPicker.hint}</p>
    </section>
  )
}
