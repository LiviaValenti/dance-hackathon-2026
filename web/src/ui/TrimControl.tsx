import { formatTime } from '../formatTime'

export type Trim = { start: number; end: number }

const MIN_LENGTH = 1

type Props = { duration: number; value: Trim; onChange: (t: Trim) => void }

export function TrimControl({ duration, value, onChange }: Props) {
  return (
    <div className="trim">
      <label>
        Start
        <input
          type="range" min={0} max={duration} step={0.1} value={value.start}
          onChange={(e) => onChange({ ...value, start: Math.max(0, Math.min(Number(e.target.value), value.end - MIN_LENGTH)) })}
        />
      </label>
      <label>
        Slutt
        <input
          type="range" min={0} max={duration} step={0.1} value={value.end}
          onChange={(e) => onChange({ ...value, end: Math.min(duration, Math.max(Number(e.target.value), value.start + MIN_LENGTH)) })}
        />
      </label>
      <span className="muted small">
        {formatTime(value.start)} – {formatTime(value.end)} · {Math.round(value.end - value.start)} s
      </span>
    </div>
  )
}
