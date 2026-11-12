import type { CSSProperties } from 'react'
import { beatSeconds, DEFAULT_TEMPO, mascot } from './settings'

export type Mood = 'idle' | 'dance' | 'cheer'

type Props = {
  /** Beats per minute the Mascot moves to when dancing or cheering. */
  tempo?: number
  mood?: Mood
  size?: number
  className?: string
}

/** Taktvekteren: a watchman with a staff and a lantern. Original artwork, not the Gjensidige logo figure. */
export function Mascot({ tempo = DEFAULT_TEMPO, mood = 'idle', size = 120, className = '' }: Props) {
  const c = mascot.look
  const style = { '--beat': `${beatSeconds(tempo)}s` } as CSSProperties
  return (
    <svg
      className={`mascot mascot-${mood} ${className}`} style={style}
      width={size} height={size * 1.25} viewBox="0 0 120 150" role="img" aria-label={mascot.name}
    >
      <ellipse className="mascot-shadow" cx="60" cy="143" rx="30" ry="4" fill={c.ink} opacity="0.12" />
      <g className="mascot-body">
        <g className="mascot-staff">
          <rect x="92" y="30" width="4" height="110" rx="2" fill={c.staff} />
          <circle cx="94" cy="27" r="5.5" fill={c.trim} stroke={c.ink} strokeWidth="1.5" />
        </g>
        <rect x="46" y="116" width="10" height="24" rx="5" fill={c.ink} />
        <rect x="64" y="116" width="10" height="24" rx="5" fill={c.ink} />
        <path d="M40 68 Q60 60 80 68 L88 122 Q60 130 32 122 Z" fill={c.coat} />
        <path d="M48 66 Q60 74 72 66" fill="none" stroke={c.trim} strokeWidth="4" strokeLinecap="round" />
        {[86, 98, 110].map((y) => <circle key={y} cx="60" cy={y} r="2.5" fill={c.trim} />)}
        <path d="M80 72 L92 92" stroke={c.coat} strokeWidth="9" strokeLinecap="round" />
        <circle cx="93" cy="93" r="5" fill={c.skin} />
        <path d="M40 72 L28 95" stroke={c.coat} strokeWidth="9" strokeLinecap="round" />
        <circle cx="27" cy="96" r="5" fill={c.skin} />
        <circle cx="60" cy="48" r="18" fill={c.skin} />
        <circle cx="49" cy="54" r="3.2" fill={c.cheek} opacity="0.45" />
        <circle cx="71" cy="54" r="3.2" fill={c.cheek} opacity="0.45" />
        <circle className="mascot-eye" cx="53" cy="47" r="2.4" fill={c.ink} />
        <circle className="mascot-eye" cx="67" cy="47" r="2.4" fill={c.ink} />
        <path d="M54 55 Q60 61 66 55" fill="none" stroke={c.ink} strokeWidth="2.2" strokeLinecap="round" />
        <path d="M41 39 Q42 17 60 15 Q78 17 79 39 Z" fill={c.coat} />
        <rect x="37" y="36" width="46" height="7" rx="3.5" fill={c.coatShade} />
        <circle cx="60" cy="28" r="4" fill={c.trim} />
        <circle cx="60" cy="13" r="4.5" fill={c.trim} />
        <g className="mascot-lantern">
          <circle className="mascot-glow" cx="27" cy="114" r="17" fill={c.glow} opacity="0.35" />
          <path d="M21 104 Q27 94 33 104" fill="none" stroke={c.ink} strokeWidth="2" />
          <rect x="17" y="101" width="20" height="4" rx="2" fill={c.ink} />
          <rect x="19" y="104" width="16" height="20" rx="4" fill={c.trim} stroke={c.ink} strokeWidth="2" />
          <ellipse cx="27" cy="114" rx="3" ry="5" fill="#FFFFFF" opacity="0.9" />
          <rect x="18" y="123" width="18" height="3" rx="1.5" fill={c.ink} />
        </g>
      </g>
    </svg>
  )
}
