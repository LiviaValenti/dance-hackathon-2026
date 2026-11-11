import { TopBar } from '../TopBar'
import { AlertIcon, CheckIcon } from '../icons'
import { formatTime } from '../../formatTime'
import { MIN_VALID_RATIO, type QualityReport } from '../../analysis/quality'
import type { Part } from '../../analysis/parts'

type Props = {
  name: string
  mirror: boolean
  progress: number | null
  error: string | null
  quality: QualityReport | null
  parts: Part[]
  practice: number | null
  onName: (name: string) => void
  onMirror: (mirror: boolean) => void
  onPractice: (part: number | null) => void
  onRecord: () => void
  onUpload: (file: File) => void
  onBack: () => void
}

export function PrepareStep(props: Props) {
  const { name, mirror, progress, error, quality, parts, practice } = props
  const ready = progress === null && quality !== null
  const total = parts.length ? parts[parts.length - 1].end - parts[0].start : 0
  const hasGap = (p: Part) => !!quality?.gaps.some((g) => g.start < p.end && g.end > p.start)

  return (
    <section className="screen">
      <TopBar title="Klar til å øve" subtitle="Steg 2 av 3 · Sjekk og velg del" onBack={props.onBack} />

      {progress !== null && (
        <div className="card" aria-live="polite">
          <div className="row"><span>Analyserer referansen</span><strong>{Math.round(progress * 100)} %</strong></div>
          <span className="bar"><span style={{ width: `${progress * 100}%` }} /></span>
        </div>
      )}
      {error && <p role="alert" className="error">{error}</p>}

      {quality && (
        <div className="card">
          <h3>Kvalitet på referansen</h3>
          <ul className="checklist">
            <li className={quality.validRatio >= MIN_VALID_RATIO ? 'ok' : 'warn'}>
              {quality.validRatio >= MIN_VALID_RATIO ? <CheckIcon /> : <AlertIcon />}
              Hele kroppen synlig i {Math.round(quality.validRatio * 100)} % av videoen
            </li>
            {quality.gaps.map((g) => (
              <li key={g.start} className="warn">
                <AlertIcon />
                <span>Kroppen er ikke helt synlig {formatTime(g.start)}–{formatTime(g.end)}. <span className="muted">Scoren er mindre presis der.</span></span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {parts.length > 0 && (
        <div className="stack">
          <h3 className="label">Hva vil du øve på?</h3>
          <div className="chips">
            <button className={practice === null ? 'chip-button selected' : 'chip-button'} aria-pressed={practice === null} onClick={() => props.onPractice(null)}>
              Hele ({formatTime(total)})
            </button>
            {parts.length > 1 && parts.map((p) => (
              <button
                key={p.index}
                className={practice === p.index ? 'chip-button selected' : 'chip-button'}
                aria-pressed={practice === p.index}
                onClick={() => props.onPractice(p.index)}
              >
                Del {p.index + 1} · {formatTime(p.start)}–{formatTime(p.end)}
                {hasGap(p) && <span className="dot" aria-label="usikker bildekvalitet" />}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="stack">
        <label htmlFor="ref-name" className="label">Navn</label>
        <input id="ref-name" className="text-input" value={name} onChange={(e) => props.onName(e.target.value)} />
      </div>

      <label className="toggle-row">
        <span>
          <strong>Speilvend referansen</strong>
          <span className="muted small">Som å danse foran et speil</span>
        </span>
        <input type="checkbox" checked={mirror} onChange={(e) => props.onMirror(e.target.checked)} />
      </label>

      <div className="screen-footer">
        <button className="primary" disabled={!ready} onClick={props.onRecord}>Ta opp med kamera</button>
        <label className={ready ? 'secondary file-button' : 'secondary file-button disabled'}>
          Last opp et forsøk i stedet
          <input
            type="file" accept="video/*" className="visually-hidden" disabled={!ready}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) props.onUpload(f) }}
          />
        </label>
      </div>
    </section>
  )
}
