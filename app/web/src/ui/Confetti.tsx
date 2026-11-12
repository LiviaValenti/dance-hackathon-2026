import { useState, type CSSProperties } from 'react'

const COLORS = ['#2347D9', '#FFC93C', '#FF6B5B', '#3DD6A3']
const PIECES = 40

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/** A one-off burst of confetti. Renders nothing when the Dancer prefers reduced motion. */
export function Confetti() {
  const [pieces] = useState(() =>
    prefersReducedMotion()
      ? []
      : Array.from({ length: PIECES }, (_, i) => ({
          left: Math.random() * 100,
          delay: Math.random() * 0.4,
          duration: 1.8 + Math.random() * 1.2,
          drift: (Math.random() - 0.5) * 120,
          spin: 360 + Math.random() * 540,
          color: COLORS[i % COLORS.length],
          round: i % 3 === 0,
        })),
  )
  if (pieces.length === 0) return null
  return (
    <div className="confetti" aria-hidden="true">
      {pieces.map((p, i) => (
        <span
          key={i}
          className={p.round ? 'round' : undefined}
          style={{
            left: `${p.left}%`, background: p.color,
            animationDelay: `${p.delay}s`, animationDuration: `${p.duration}s`,
            '--drift': `${p.drift}px`, '--spin': `${p.spin}deg`,
          } as CSSProperties}
        />
      ))}
    </div>
  )
}
