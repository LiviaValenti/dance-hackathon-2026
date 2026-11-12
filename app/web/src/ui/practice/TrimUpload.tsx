import { useState } from 'react'
import { AttemptStep } from '../steps/AttemptStep'
import { reportDuration } from '../videoDuration'
import { useObjectUrl } from '../../useObjectUrl'
import type { Trim } from '../TrimControl'

type Props = { file: File; onAnalyse: (trim: Trim) => void; onBack: () => void }

/** Lets the Dancer trim an uploaded Attempt to where the dancing starts and ends before it is analysed. */
export function TrimUpload({ file, onAnalyse, onBack }: Props) {
  const url = useObjectUrl(file)
  const [state, setState] = useState<{ duration: number; trim: Trim } | null>(null)
  return (
    <>
      {url && (
        <video
          src={url} muted playsInline preload="auto" className="offscreen" aria-hidden="true"
          onLoadedMetadata={(e) => reportDuration(e.currentTarget, (d) => setState({ duration: d, trim: { start: 0, end: d } }))}
        />
      )}
      <AttemptStep
        url={url} duration={state?.duration ?? null} trim={state?.trim ?? null}
        onTrim={(trim) => setState((s) => (s ? { ...s, trim } : s))}
        onAnalyze={() => { if (state) onAnalyse(state.trim) }} onBack={onBack}
      />
    </>
  )
}
