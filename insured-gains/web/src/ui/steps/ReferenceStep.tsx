import { useRef } from 'react'
import { TopBar } from '../TopBar'
import { TrimControl, type Trim } from '../TrimControl'

type Props = {
  url: string | null
  duration: number | null
  trim: Trim | null
  accepted: boolean
  onFile: (file: File | null) => void
  onTrim: (trim: Trim) => void
  onAccepted: (accepted: boolean) => void
  onNext: () => void
}

export function ReferenceStep({ url, duration, trim, accepted, onFile, onTrim, onAccepted, onNext }: Props) {
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
      <TopBar title="Ny referanse" subtitle="Steg 1 av 3 · Velg og klipp dansen" />

      {url ? (
        <>
          <video ref={preview} src={url} className="preview" muted playsInline controls preload="metadata" />
          {duration !== null && trim && (
            <div className="card">
              <h3>Valgt utsnitt</h3>
              <TrimControl duration={duration} value={trim} onChange={changeTrim} />
              <p className="muted small">Dra i start og slutt for å fjerne intro og avslutning.</p>
            </div>
          )}
          <label className="link-button">Bytt video{fileInput}</label>
        </>
      ) : (
        <label className="dropzone">
          <svg aria-hidden="true" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
          <strong>Velg en dansevideo</strong>
          <span className="muted small">Et enkelt move eller en hel koreografi. Hele kroppen bør være synlig.</span>
          {fileInput}
        </label>
      )}

      <div className="screen-footer">
        <label className="consent">
          <input type="checkbox" checked={accepted} onChange={(e) => onAccepted(e.target.checked)} />
          Jeg bruker videoen kun til egen trening. Den forlater ikke enheten min.
        </label>
        <button className="primary" disabled={!trim || !accepted} onClick={onNext}>Neste</button>
      </div>
    </section>
  )
}
