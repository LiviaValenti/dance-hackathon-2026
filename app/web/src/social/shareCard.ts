import type { shareCardLines } from './social'

const W = 1080
const H = 1350
const DISPLAY = '"Fredoka Variable", "Inter Variable", system-ui, sans-serif'
const BODY = '"Inter Variable", system-ui, sans-serif'

function svgImage(svg: SVGSVGElement, size: number): Promise<HTMLImageElement> {
  const clone = svg.cloneNode(true) as SVGSVGElement
  clone.setAttribute('width', String(size))
  clone.setAttribute('height', String(size * 1.25))
  const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(new XMLSerializer().serializeToString(clone))}`
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = url
  })
}

function wrap(ctx: CanvasRenderingContext2D, line: string, maxWidth: number): string[] {
  const out: string[] = []
  let current = ''
  for (const word of line.split(' ')) {
    const next = current ? `${current} ${word}` : word
    if (ctx.measureText(next).width > maxWidth && current) { out.push(current); current = word }
    else current = next
  }
  if (current) out.push(current)
  return out
}

/** Draws the share card (theme colours, the Mascot, effort only) as a PNG. */
export async function renderShareCard(lines: ReturnType<typeof shareCardLines>, footer: string, mascot: SVGSVGElement): Promise<Blob> {
  await Promise.all([document.fonts.load(`600 72px ${DISPLAY}`), document.fonts.load(`400 40px ${BODY}`)]).catch(() => {})
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!

  ctx.fillStyle = '#FFF8EE'
  ctx.fillRect(0, 0, W, H)
  ctx.fillStyle = '#FFC93C'
  ctx.globalAlpha = 0.35
  ctx.beginPath()
  ctx.arc(W / 2, 360, 300, 0, Math.PI * 2)
  ctx.fill()
  ctx.globalAlpha = 1
  const img = await svgImage(mascot, 360)
  ctx.drawImage(img, W / 2 - 180, 110, 360, 450)

  ctx.textAlign = 'center'
  ctx.fillStyle = '#1B1F3B'
  ctx.font = `600 76px ${DISPLAY}`
  let y = 700
  for (const l of wrap(ctx, lines.headline, W - 160)) { ctx.fillText(l, W / 2, y); y += 88 }
  ctx.font = `400 44px ${BODY}`
  ctx.fillStyle = '#3A3F5C'
  for (const l of wrap(ctx, lines.detail, W - 160)) { y += 10; ctx.fillText(l, W / 2, y); y += 54 }

  ctx.font = `600 46px ${DISPLAY}`
  const pill = ctx.measureText(lines.effort).width + 96
  y += 50
  ctx.fillStyle = '#FFC93C'
  ctx.beginPath()
  ctx.roundRect(W / 2 - pill / 2, y, pill, 96, 48)
  ctx.fill()
  ctx.fillStyle = '#1B1F3B'
  ctx.fillText(lines.effort, W / 2, y + 64)

  ctx.font = `500 34px ${BODY}`
  ctx.fillStyle = '#2347D9'
  ctx.fillText(footer, W / 2, H - 80)

  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('No image'))), 'image/png'))
}
