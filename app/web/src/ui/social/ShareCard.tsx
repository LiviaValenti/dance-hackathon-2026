import { useEffect, useRef, useState } from 'react'
import { Mascot } from '../../mascot/Mascot'
import { mascot } from '../../mascot/settings'
import { renderShareCard } from '../../social/shareCard'
import type { shareCardLines } from '../../social/social'
import { text } from '../../text'

type Props = { lines: ReturnType<typeof shareCardLines> }

/** A shareable progress card: preview, then the phone's share sheet (or a download where sharing isn't supported). */
export function ShareCard({ lines }: Props) {
  const mascotBox = useRef<HTMLDivElement>(null)
  const [card, setCard] = useState<{ blob: Blob; url: string } | null>(null)

  useEffect(() => {
    const svg = mascotBox.current?.querySelector('svg')
    if (!svg) return
    let url = ''
    let cancelled = false
    renderShareCard(lines, text.share.footer(mascot.name), svg)
      .then((blob) => {
        if (cancelled) return
        url = URL.createObjectURL(blob)
        setCard({ blob, url })
      })
      .catch(() => {})
    return () => { cancelled = true; if (url) URL.revokeObjectURL(url) }
    // Redraw only when the words change, not on every new lines object.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lines.headline, lines.detail, lines.effort])

  async function share() {
    if (!card) return
    const file = new File([card.blob], text.share.fileName, { type: 'image/png' })
    const message = `${lines.headline} ${lines.detail}`
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], text: message }).catch(() => {})
      return
    }
    const a = document.createElement('a')
    a.href = card.url
    a.download = text.share.fileName
    a.click()
  }

  return (
    <div className="card share-card">
      <div ref={mascotBox} className="offscreen" aria-hidden="true"><Mascot size={120} mood="idle" /></div>
      {card && <img src={card.url} alt={text.share.alt} className="share-preview" />}
      <div className="stack">
        <button className="primary small-button" disabled={!card} onClick={() => void share()}>{text.share.button}</button>
        <span className="muted small">{text.share.hint}</span>
      </div>
    </div>
  )
}
