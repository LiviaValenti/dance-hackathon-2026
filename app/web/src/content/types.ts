import type { Profile } from '../profile/profile'

export type LevelId = 'beginner' | 'intermediate' | 'advanced'

/** Body areas a Dancer can report aches in. Choreographies list the ones they strain. */
export type Ache = 'knees' | 'hips' | 'back' | 'shoulders' | 'wrists' | 'ankles'

export type Style = { id: string; name: string }

export type Level = { id: LevelId; name: string; description: string }

/** A recording to learn from. start/end trim the video file; Tempo is the music's beats per minute. */
export type Reference = {
  video: string
  tempo: number
  start: number
  end: number
  /** Precomputed poses of the whole video (npm run poses); without them the video is analysed in the browser. */
  poses?: string
  /** For a clip with several dancers: roughly where the one to follow is at `start` (normalised 0–1). */
  dancer?: { x: number; y: number }
}

/** start/end are seconds in the Reference's video file, inside its start/end. */
export type Part = { id: string; title: string; start: number; end: number }

/**
 * A studio's class space, bundled with the app like its Choreography (ADR 0003). The class numbers are example
 * data for the demo: there is no backend, so other Dancers' practice cannot be counted yet.
 */
export type Studio = {
  name: string
  label: string
  className: string
  nextClass: string
  teacherNote: string
  /** A class challenge everyone wins by taking part: practice rounds together before the next class. */
  challenge: { goal: number; doneByOthers: number }
  /** What the teacher would see, for the class as a whole (preview of a next step). */
  teacherView: {
    classSize: number
    practisedTwice: number
    hardest: { part: string; span: string; area: string }
    strongest: string
  }
}

export type Choreography = {
  id: string
  title: string
  style: string
  level: LevelId
  /** Lower is easier, compared only within the same Level. */
  ease: number
  reference: Reference
  parts: Part[]
  strains: Ache[]
  /** Set for a studio's bundled Choreography (ADR 0003). */
  studio?: Studio
}

/** The move a Dancer dances in the Level check for the Level they state. */
export type LevelCheckMove = { level: LevelId; title: string; reference: Reference }

/**
 * A pre-recorded Attempt for live demos: its precomputed poses and where each practice item (Part id or
 * 'whole') lies in it, found by aligning it with the Choreography's Reference.
 */
export type DemoAttempt = { video: string; poses: string; trims: Record<string, { start: number; end: number }> }

/** The Dancer of the pitch demo. With it, the app starts with a short welcome instead of the full onboarding. */
export type DemoProfile = Profile

export type Content = {
  styles: Style[]
  levels: Level[]
  aches: Array<{ id: Ache; name: string }>
  levelCheck: LevelCheckMove[]
  choreographies: Choreography[]
  demoAttempt?: DemoAttempt
  demoProfile?: DemoProfile
}
