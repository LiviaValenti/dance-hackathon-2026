// All dance content: styles, Levels, Level-check moves and Choreographies with their Parts and Tempo.
// Replace the placeholder clips with the team's own References by changing `video`, `tempo`, `start`,
// `end` and the Part times below; videos go in public/content/.
import type { Content, Reference } from './types'

/** love119 sample (2 s, HEVC) from new-chapter. Stand-in until the team films its own References. */
const placeholder = (start = 0, end = 2): Reference => ({
  video: '/content/love119-reference.mov',
  tempo: 120,
  start,
  end,
  placeholder: true,
})

const twoParts = [
  { id: 'p1', title: 'Opening', start: 0, end: 1 },
  { id: 'p2', title: 'Finish', start: 1, end: 2 },
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

  levelCheck: [
    { level: 'beginner', title: 'Step touch with arms', reference: placeholder() },
    { level: 'intermediate', title: 'Body roll into hit', reference: placeholder() },
    { level: 'advanced', title: 'Wave and turn', reference: placeholder() },
  ],

  choreographies: [
    { id: 'first-groove', title: 'First Groove', style: 'kpop', level: 'beginner', ease: 1, reference: placeholder(), parts: twoParts, strains: [] },
    { id: 'small-steps', title: 'Small Steps', style: 'kpop', level: 'beginner', ease: 2, reference: placeholder(), parts: twoParts, strains: ['knees'] },
    { id: 'easy-wave', title: 'Easy Wave', style: 'kpop', level: 'intermediate', ease: 1, reference: placeholder(), parts: twoParts, strains: ['shoulders'] },
    { id: 'love119', title: 'Love 119', style: 'kpop', level: 'intermediate', ease: 2, reference: placeholder(), parts: twoParts, strains: ['knees'] },
    { id: 'night-lights', title: 'Night Lights', style: 'kpop', level: 'advanced', ease: 1, reference: placeholder(), parts: twoParts, strains: ['back'] },
    { id: 'full-out', title: 'Full Out', style: 'kpop', level: 'advanced', ease: 2, reference: placeholder(), parts: twoParts, strains: ['knees', 'ankles'] },
    {
      id: 'nordlys-week',
      title: 'Northern Steps',
      style: 'kpop',
      level: 'intermediate',
      ease: 2,
      reference: placeholder(),
      parts: twoParts,
      strains: [],
      studio: { name: 'Studio Nordlys', label: 'This week’s Choreography' },
    },
  ],
}
