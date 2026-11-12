import { useRef } from 'react'
import { TopBar } from '../TopBar'
import { TrimControl, type Trim } from '../TrimControl'
import { text } from '../../text'
import { Mascot } from '../../mascot/Mascot'

type Props = {
  url: string | null
  duration: number | null
  trim: Trim | null
  accepted: boolean
  onFile: (file: File | null) => void
  onTrim: (trim: Trim) => void
  onAccepted: (accepted: boolean) => void
  onNext: () => void
  onBack: () => void
}

export function ReferenceStep({ url, duration, trim, accepted, onFile, onTrim, onAccepted, onNext, onBack }: Props) {
  const preview = useRef<HTMLVideoElement>(null)
  const fileInput = (
    <input
      type="file" accept="video/*" className="visually-hidden"
      onChange={(e) => onFile(e.target.files?.[0] ?? null)}
    />
  )

  function changeTrim(next: Trim) {
    if (preview.current && trim) preview.current.currentTime = next.start !== trim.start ? next.start : next.end
    onTrim(next)
  }

  return (
    <section className="screen">
      <TopBar title={text.referenceStep.title} subtitle={text.referenceStep.subtitle} onBack={onBack} />

      {!url && (
        <div className="mascot-greeting">
          <Mascot size={96} />
          <p className="bubble"><strong>{text.mascot.hello}</strong>{text.mascot.intro}</p>
        </div>
      )}

      {url ? (
        <>
          <video ref={preview} src={url} className="preview" muted playsInline controls preload="metadata" />
          {duration !== null && trim && (
            <div className="card">
              <h3>{text.common.selectedRange}</h3>
              <TrimControl duration={duration} value={trim} onChange={changeTrim} />
              <p className="muted small">{text.referenceStep.trimHint}</p>
            </div>
          )}
          <label className="link-button">{text.referenceStep.changeVideo}{fileInput}</label>
        </>
      ) : (
        <label className="dropzone">
          <svg aria-hidden="true" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
          <strong>{text.referenceStep.choose}</strong>
          <span className="muted small">{text.referenceStep.chooseHint}</span>
          {fileInput}
        </label>
      )}

      <div className="screen-footer">
        <label className="consent">
          <input type="checkbox" checked={accepted} onChange={(e) => onAccepted(e.target.checked)} />
          {text.referenceStep.consent}
        </label>
        <button className="primary" disabled={!trim || !accepted} onClick={onNext}>{text.referenceStep.next}</button>
      </div>
    </section>
  )
}
