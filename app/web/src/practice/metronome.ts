let ctx: AudioContext | null = null

/** A short click, used for the count-in on the beat. Silent if Web Audio is unavailable. */
export function click(accent = false) {
  try {
    ctx ??= new AudioContext()
    void ctx.resume()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.frequency.value = accent ? 1320 : 880
    gain.gain.setValueAtTime(0.25, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08)
    osc.connect(gain).connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + 0.09)
  } catch {
    // No audio: the count-in is still shown on screen.
  }
}
