export function formatTime(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

const tenths = (seconds: number) => seconds.toFixed(1).replace('.', ',')

/** Tidsrom som «0:04–0:05», eller med tideler («0,3–0,8 s») når begge ligger i samme sekund. */
export function formatSpan(start: number, end: number): string {
  if (Math.floor(start) === Math.floor(end)) return `${tenths(start)}–${tenths(end)} s`
  return `${formatTime(start)}–${formatTime(end)}`
}
