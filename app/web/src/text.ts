// All text shown in the app. Edit wording here, not in the screens.
import type { JointName } from './analysis/angles'
import { mascot } from './mascot/settings'

type Side = 'left' | 'right'
type BodyPart = 'elbow' | 'shoulder' | 'hip' | 'knee'

const pct = (fraction: number) => `${Math.round(fraction * 100)}%`

export const text = {
  common: {
    next: 'Next',
    back: 'Back',
    close: 'Close',
    play: 'Play',
    pause: 'Pause',
    part: (n: number) => `Part ${n}`,
    whole: 'Whole',
    reference: 'Reference',
    you: 'You',
    selectedRange: 'Selected range',
    percent: pct,
  },

  mascot: {
    hello: `Hi, I’m ${mascot.name}!`,
    intro: ` The ${mascot.meaning}. Pick a dance and I’ll keep the beat while you learn it.`,
  },

  onboarding: {
    title: 'Getting to know you',
    progress: (n: number, total: number) => `Question ${n} of ${total}`,
    questions: {
      name: () => ` I’ll keep the beat while you learn. What should I call you?`,
      style: (name: string) => `Nice to meet you, ${name}! Which style do you want to dance?`,
      goal: () => 'What would you like to get out of it?',
      time: () => 'How long can you practise each time?',
      aches: () => 'Anything that aches or needs a gentle touch? I’ll pick moves that go easy on it.',
      studio: () => 'Last one: do you dance at a studio?',
    },
    nameLabel: 'Your name',
    goals: {
      choreography: 'Learn a whole Choreography',
      technique: 'Sharpen my technique',
      fun: 'Move more and have fun',
    },
    minutes: (m: number) => `${m} min`,
    noAches: 'Nothing',
    achesNote: 'This only steers which moves I pick. It is not medical advice.',
    studioYes: 'Yes, I take classes',
    studioNo: 'No, I dance on my own',
    finish: 'Let’s dance',
  },

  levelCheck: {
    title: 'Level check',
    subtitle: 'One move, about a minute',
    ask: 'What Level do you think you are? Then dance one move at that Level and I’ll check it with you.',
    dontKnow: 'I don’t know yet',
    preparing: 'Getting the move ready',
    recordSubtitle: (move: string) => `Level check · ${move}`,
    resultTitle: 'Your Level',
    outcome: {
      up: (level: string) => `You’re ready for ${level}!`,
      confirmed: (level: string) => `${level} it is.`,
      down: (level: string) => `Let’s build up from ${level}.`,
      start: (level: string) => `We’ll start at ${level} and find your feet together.`,
    },
    scoreLine: (score: number) => ` You scored ${score} on the move. It’s an estimate, not a grade.`,
    override: 'Doesn’t feel right? Choose your Level',
    continue: 'See my Plan',
    privacy: 'The camera video is analysed on your phone and never leaves it.',
  },

  plan: {
    subtitle: (level: string, minutes: number) => `${level} · ${minutes} min sessions`,
    bubble: (item: string, slowed: boolean) =>
      slowed ? `Next up: ${item}, slowed down to find the feel. Speed comes back by itself.` : `Next up: ${item}. I’ll keep the beat!`,
    doneBubble: (choreography: string) => `You danced all of ${choreography}! That’s the whole thing. Proud of you.`,
    partTitle: (n: number, title: string) => `Part ${n}: ${title}`,
    whole: 'Whole Choreography',
    tempo: (tempo: number) => `Tempo ${tempo}`,
    speed: (speed: number) => `${Math.round(speed * 100)}% speed`,
    practise: (item: string) => `Practise ${item}`,
    again: 'Dance it again',
  },

  practice: {
    recordSubtitle: (item: string, speed: number) => (speed === 1 ? item : `${item} · ${Math.round(speed * 100)}% speed`),
    nextStep: 'Next step in your Plan',
    goNext: 'Go to the next step',
    backToPlan: 'Back to my Plan',
    decisions: {
      next: () => 'On to the next Part!',
      combine: () => 'All Parts done. Now dance them together as one.',
      done: () => 'You’ve finished the whole Choreography!',
      'full-speed': () => 'Same Part again, now at full speed.',
      repeat: () => 'Once more: same Part, same speed.',
      slower: () => 'Once more at 75% speed, to find the feel.',
      easier: (title: string) => `Let’s switch to ${title}, an easier Choreography at your Level.`,
    } satisfies Record<string, (title: string) => string>,
  },

  home: {
    title: (name: string) => `Hi, ${name}`,
    ownVideo: 'Practise with your own video',
    startOver: 'Start over',
  },

  sides: { left: 'left', right: 'right' } satisfies Record<Side, string>,

  joints: {
    leftElbow: 'Left elbow', rightElbow: 'Right elbow',
    leftShoulder: 'Left shoulder', rightShoulder: 'Right shoulder',
    leftHip: 'Left hip', rightHip: 'Right hip',
    leftKnee: 'Left knee', rightKnee: 'Right knee',
  } satisfies Record<JointName, string>,

  bodyAreas: { arms: 'Arms', hips: 'Hips', legs: 'Legs' },

  // The angle is measured at the joint: elbow (shoulder–elbow–wrist), shoulder (hip–shoulder–elbow),
  // hip (shoulder–hip–knee), knee (hip–knee–ankle). Smaller angle = more bent / closer to the body.
  faultTips: {
    elbow: { smaller: 'Straighten your {side} arm more', larger: 'Bend your {side} elbow more' },
    shoulder: { smaller: 'Raise your {side} arm higher', larger: 'Lower your {side} arm a little' },
    hip: { smaller: 'Open up your {side} hip more', larger: 'Bend more at your {side} hip' },
    knee: { smaller: 'Straighten your {side} knee more', larger: 'Bend your {side} knee more' },
  } satisfies Record<BodyPart, Record<'smaller' | 'larger', string>>,

  quality: {
    referenceLabel: 'Reference',
    attemptLabel: 'Your Attempt',
    gapWarning: (label: string, span: string) =>
      `${label}: the whole body is not visible ${span}, so the Score is less precise there.`,
    lowRatioWarning: (label: string, ratio: number) =>
      `${label}: the whole body is only visible in ${pct(ratio)} of the video.`,
  },

  progress: {
    up: (delta: number) => `+${delta} from your last Attempt`,
    same: 'Same Score as your last Attempt',
    down: (delta: number) => `${delta} from your last Attempt. Completely normal while learning, try again!`,
  },

  fallbackFeedback: {
    headlineHigh: 'Strong! You are nearly there',
    headlineMid: 'Good progress, you are on your way',
    headlineLow: 'Nice start, now we build on it',
    strength: (best: string) => `${best} is looking good.`,
    noStrength: 'You have got the main movements.',
    nextStep: (fault: string) => `Next step: ${fault.toLowerCase()}.`,
    noFault: 'Keep practising to polish the details.',
    tip: (fault: string, span: string) => `${fault} at ${span}. Watch the Reference in slow motion and feel it in your body.`,
    drill: (span: string) => `Practise ${span} at 0.75× speed, 3 times, before trying at full speed.`,
  },

  errors: {
    reference: (message: string) => `Could not analyse the Reference: ${message}`,
    generic: 'Something went wrong. Choose the Reference again.',
    noBody: 'No full body found in the Attempt. Make sure your whole body is visible.',
    analysis: (message: string) => `The analysis failed: ${message}`,
    camera: 'Could not access the camera. Check the permission in your browser.',
  },

  referenceStep: {
    title: 'New Reference',
    subtitle: 'Step 1 of 3 · Choose and trim the dance',
    trimHint: 'Drag start and end to remove the intro and ending.',
    changeVideo: 'Change video',
    choose: 'Choose a dance video',
    chooseHint: 'A single move or a whole Choreography. The whole body should be visible.',
    consent: 'I only use the video for my own practice. It never leaves my device.',
    next: 'Next',
  },

  prepareStep: {
    title: 'Ready to practise',
    subtitle: 'Step 2 of 3 · Check and choose a Part',
    analysing: 'Analysing the Reference',
    quality: 'Reference quality',
    visibleRatio: (ratio: number) => `Whole body visible in ${pct(ratio)} of the video`,
    gap: (span: string) => `The body is not fully visible ${span}.`,
    gapHint: 'The Score is less precise there.',
    choosePart: 'What do you want to practise?',
    whole: (duration: string) => `Whole (${duration})`,
    part: (n: number, span: string) => `Part ${n} · ${span}`,
    uncertainQuality: 'uncertain picture quality',
    name: 'Name',
    mirror: 'Mirror the Reference',
    mirrorHint: 'Like dancing in front of a mirror',
    record: 'Record with camera',
    upload: 'Upload an Attempt instead',
  },

  attemptStep: {
    title: 'Your Attempt',
    trimSubtitle: 'Trim to where you dance',
    trimHint: 'Start where you begin dancing, so the comparison is as precise as possible.',
    analyse: 'Analyse',
  },

  recorder: {
    title: 'Record your Attempt',
    subtitle: (part: string) => `Step 3 of 3 · ${part}`,
    stepBack: 'Step back, your whole body needs to be in view',
    fullyVisible: 'Whole body visible',
    outline: 'Outline',
    reference: 'Reference video',
    recording: 'Recording',
    matchOutline: 'Match the outline',
    notVisible: 'Can’t quite see you',
    start: 'Start recording',
    stop: 'Stop',
    upload: 'Upload a video instead',
    fileName: 'recording',
  },

  analysing: {
    title: 'Analysing your Attempt',
    subtitle: 'Takes about as long as the video',
    steps: [
      'Finding your poses',
      'Syncing with the Reference',
      'Comparing 8 joints, frame by frame',
      'Writing personal feedback',
    ],
    privacy: 'The video is analysed on your device. Only a short summary of the result is sent to the Coach.',
  },

  result: {
    title: 'Result',
    heading: (name: string, part: string, attempt: number) => `${name} · ${part} · Attempt ${attempt}`,
    scoreLabel: (score: number) => `Score ${score} out of 100`,
    outOf: 'out of 100',
    fallbackNote: 'Built-in text, the Coach is not available right now.',
    strengths: 'What’s working',
    perPart: 'Score per Part',
    progress: 'Progress',
    quality: 'Picture quality',
    showFeedback: 'See what you can improve',
    retry: 'Try again',
  },

  progressChart: {
    label: (scores: number[]) => `Score per Attempt: ${scores.join(', ')}`,
    point: (n: number, score: number) => `Attempt ${n}: ${score}`,
    caption: 'Score per Attempt, latest on the right',
  },

  feedback: {
    title: 'Your personal feedback',
    timeline: 'Timeline',
    timelineScores: 'Score per half second',
    window: (span: string, score: number) => `${span}: Score ${score}`,
    weakMoments: 'Weak moments',
    noFaults: 'No clear deviations. Great work!',
    biggestGain: 'Biggest gain',
    drill: (drill: string) => `Drill: ${drill}`,
    practise: 'Practise this',
    showInTimeline: 'Show in timeline',
    strongPart: (n: number) => `Part ${n}:`,
    strongPartText: ' almost identical to the Reference. Keep it up!',
  },

  skeleton: { label: (name: string) => `Skeleton: ${name}` },

  trim: { start: 'Start', end: 'End' },
}
