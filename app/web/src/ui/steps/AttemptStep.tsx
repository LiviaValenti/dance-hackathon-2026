import { TopBar } from '../TopBar'
import { TrimControl, type Trim } from '../TrimControl'
import { text } from '../../text'

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
      <TopBar title={text.attemptStep.title} subtitle={text.attemptStep.subtitle} onBack={onBack} />
      {url && <video src={url} className="preview" muted playsInline controls preload="metadata" />}
      {duration !== null && trim && (
        <div className="card">
          <h3>{text.common.selectedRange}</h3>
          <TrimControl duration={duration} value={trim} onChange={onTrim} />
          <p className="muted small">{text.attemptStep.trimHint}</p>
        </div>
      )}
      <div className="screen-footer">
        <button className="primary" disabled={!trim} onClick={onAnalyze}>{text.attemptStep.analyse}</button>
      </div>
    </section>
  )
}
