// All dance content: styles, Levels, Level-check moves and Choreographies with their Parts and Tempo.
// Replace the test clips with the team's final References by changing `video`, `tempo`, `start`,
// `end` and the Part times below; videos go in public/content/.
import type { Content, Reference } from './types'

/**
 * The team's own test clip (IMG_8816, 12.8 s, portrait). The whole body is visible from about 0.2 s.
 * Tempo is an estimate from the audio (could be double, ~146); replace it with the song's real tempo.
 */
const levelCheckClip: Reference = {
  video: '/content/my-reference.mov',
  tempo: 73,
  start: 0.2,
  end: 12.7,
}

/**
 * The team's course clip (IMG_8821, 14.2 s, portrait), used for every Choreography until each has its own.
 * The dancing starts at about 2.4 s; the Parts are about 4 s each. Tempo: same estimate as the Level-check clip.
 */
const courseClip: Reference = {
  video: '/content/course.mov',
  tempo: 73,
  start: 2.4,
  end: 14.2,
}

const courseParts = [
  { id: 'p1', title: 'Opening', start: 2.4, end: 6.4 },
  { id: 'p2', title: 'Middle', start: 6.4, end: 10.4 },
  { id: 'p3', title: 'Finish', start: 10.4, end: 14.2 },
]

export const content: Content = {
  styles: [
    { id: 'street', name: 'Street / hip hop' },
    { id: 'kpop', name: 'K-pop' },
    { id: 'jazz', name: 'Jazz / heels' },
  ],

  levels: [
    { id: 'beginner', name: 'Beginner', description: 'New to dancing or to this style.' },
    { id: 'intermediate', name: 'Intermediate', description: 'You know the basics and can follow a short routine.' },
    { id: 'advanced', name: 'Advanced', description: 'You pick up Choreography quickly and want detail.' },
  ],

  aches: [
    { id: 'knees', name: 'Knees' },
    { id: 'hips', name: 'Hips' },
    { id: 'back', name: 'Back' },
    { id: 'shoulders', name: 'Shoulders' },
    { id: 'wrists', name: 'Wrists' },
    { id: 'ankles', name: 'Ankles' },
  ],

  // The same test clip for every Level until the team films one move per Level.
  levelCheck: [
    { level: 'beginner', title: 'Level check move', reference: levelCheckClip },
    { level: 'intermediate', title: 'Level check move', reference: levelCheckClip },
    { level: 'advanced', title: 'Level check move', reference: levelCheckClip },
  ],

  choreographies: [
    { id: 'first-groove', title: 'First Groove', style: 'kpop', level: 'beginner', ease: 1, reference: courseClip, parts: courseParts, strains: [] },
    { id: 'small-steps', title: 'Small Steps', style: 'kpop', level: 'beginner', ease: 2, reference: courseClip, parts: courseParts, strains: ['knees'] },
    { id: 'easy-wave', title: 'Easy Wave', style: 'kpop', level: 'intermediate', ease: 1, reference: courseClip, parts: courseParts, strains: ['shoulders'] },
    { id: 'love119', title: 'Love 119', style: 'kpop', level: 'intermediate', ease: 2, reference: courseClip, parts: courseParts, strains: ['knees'] },
    { id: 'night-lights', title: 'Night Lights', style: 'kpop', level: 'advanced', ease: 1, reference: courseClip, parts: courseParts, strains: ['back'] },
    { id: 'full-out', title: 'Full Out', style: 'kpop', level: 'advanced', ease: 2, reference: courseClip, parts: courseParts, strains: ['knees', 'ankles'] },
    {
      id: 'nordlys-week',
      title: 'Northern Steps',
      style: 'kpop',
      level: 'intermediate',
      ease: 2,
      reference: courseClip,
      parts: courseParts,
      strains: [],
      studio: { name: 'Studio Nordlys', label: 'This week’s Choreography' },
    },
  ],
}
