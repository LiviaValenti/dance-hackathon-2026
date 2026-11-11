import { TopBar } from '../TopBar'
import { TrimControl, type Trim } from '../TrimControl'

type Props = {
  url: string | null
  duration: number | null
  trim: Trim | null
  onTrim: (trim: Trim) => void
  onAnalyze: () => void
  onBack: () => void
}

export function AttemptStep({ url, duration, trim, onTrim, onAnalyze, onBack }: Props) {
  return (
    <section className="screen">
      <TopBar title="Ditt forsøk" subtitle="Steg 3 av 3 · Klipp forsøket" onBack={onBack} />
      {url && <video src={url} className="preview" muted playsInline controls preload="metadata" />}
      {duration !== null && trim && (
        <div className="card">
          <h3>Valgt utsnitt</h3>
          <TrimControl duration={duration} value={trim} onChange={onTrim} />
          <p className="muted small">Start der du begynner å danse, så blir sammenligningen mest presis.</p>
        </div>
      )}
      <div className="screen-footer">
        <button className="primary" disabled={!trim} onClick={onAnalyze}>Analyser</button>
      </div>
    </section>
  )
}
