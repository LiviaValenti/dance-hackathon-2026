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
  /** True while the clip is a stand-in for the team's own recording. */
  placeholder?: boolean
}

/** start/end are seconds in the Reference's video file, inside its start/end. */
export type Part = { id: string; title: string; start: number; end: number }

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
  studio?: { name: string; label: string }
}

/** The move a Dancer dances in the Level check for the Level they state. */
export type LevelCheckMove = { level: LevelId; title: string; reference: Reference }

export type Content = {
  styles: Style[]
  levels: Level[]
  aches: Array<{ id: Ache; name: string }>
  levelCheck: LevelCheckMove[]
  choreographies: Choreography[]
}
