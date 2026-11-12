// The Mascot's settings. Swapping the Mascot means editing this file and Mascot.tsx, never the screens.
export const mascot = {
  name: 'Taktvekteren',
  meaning: 'keeper of the beat',
  /** How the Coach speaks when it speaks as the Mascot. */
  tone:
    'Warm, playful and encouraging, like a friendly watchman who keeps the beat for the whole town. ' +
    'Short sentences, simple words, a little beat or lantern imagery now and then. Never stern, never clinical.',
  look: {
    coat: '#2347D9',
    coatShade: '#1A35A8',
    trim: '#FFC93C',
    skin: '#F6C9A8',
    cheek: '#FF6B5B',
    ink: '#1B1F3B',
    staff: '#8A5A2B',
    glow: '#FFC93C',
  },
}

/** Tempo used until a Reference provides its own. */
export const DEFAULT_TEMPO = 100

export const beatSeconds = (tempo: number) => 60 / Math.max(1, tempo)
