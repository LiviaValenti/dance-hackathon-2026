import { useEffect, useState } from 'react'
import { Onboarding } from './ui/onboarding/Onboarding'
import { OwnVideoFlow } from './ui/own/OwnVideoFlow'
import { LevelCheck, type LevelResult } from './ui/levelcheck/LevelCheck'
import { PlanScreen } from './ui/plan/PlanScreen'
import { PracticeFlow } from './ui/practice/PracticeFlow'
import { StudioIntro } from './ui/studio/StudioIntro'
import { TeacherPreview } from './ui/studio/TeacherPreview'
import { countRounds } from './plan/attempts'
import { Mascot } from './mascot/Mascot'
import { clearAll, load, save } from './store/db'
import { content } from './content/content'
import { chooseChoreography, practiceItems, startPlan, type PlanState } from './plan/plan'
import type { LevelId } from './content/types'
import type { Profile } from './profile/profile'

const studioChoreography = content.choreographies.find((c) => c.studio)!

type Screen = 'loading' | 'onboarding' | 'studio' | 'levelcheck' | 'plan' | 'practice' | 'own' | 'teacher'

/** The Plan's first Choreography for a Level (any style or Level as a last resort, so the app never dead-ends). */
function firstPlan(profile: Profile, level: LevelId): PlanState {
  const choreography = chooseChoreography(content.choreographies, level, profile)
    ?? content.choreographies.find((c) => !c.studio)!
  return startPlan(choreography.id)
}

export default function App() {
  const [screen, setScreen] = useState<Screen>('loading')
  const [profile, setProfile] = useState<Profile | null>(null)
  const [level, setLevel] = useState<LevelResult | null>(null)
  const [plan, setPlan] = useState<PlanState | null>(null)
  const [mirror, setMirror] = useState(true)
  const [classRounds, setClassRounds] = useState(0)

  useEffect(() => {
    void Promise.all([load<Profile>('profile'), load<LevelResult>('level'), load<PlanState>('plan'), load<boolean>('mirror')])
      .then(([p, l, pl, m]) => {
        setProfile(p ?? null)
        setLevel(l ?? null)
        setPlan(pl ?? null)
        if (m !== undefined) setMirror(m)
        setScreen(!p ? 'onboarding' : l && pl ? 'plan' : p.studio ? 'studio' : 'levelcheck')
      })
  }, [])

  async function updatePlan(next: PlanState) {
    await save('plan', next)
    setPlan(next)
  }

  async function finishOnboarding(p: Profile) {
    await save('profile', p)
    setProfile(p)
    setScreen(p.studio ? 'studio' : 'levelcheck')
  }

  /** Studio branch: the studio's Choreography sets the Level; no Level check. */
  async function startStudio() {
    const result: LevelResult = { level: studioChoreography.level, stated: 'unknown', score: null, change: 'studio' }
    await save('level', result)
    setLevel(result)
    await updatePlan(startPlan(studioChoreography.id))
    setScreen('plan')
  }

  async function finishLevelCheck(result: LevelResult) {
    await save('level', result)
    setLevel(result)
    await updatePlan(firstPlan(profile!, result.level))
    setScreen('plan')
  }

  async function startOver() {
    await clearAll()
    setProfile(null)
    setLevel(null)
    setPlan(null)
    setScreen('onboarding')
  }

  const choreography = plan && content.choreographies.find((c) => c.id === plan.choreographyId)

  // The Dancer's own rounds on a studio Choreography count towards the class challenge.
  useEffect(() => {
    if (screen !== 'plan' || !choreography?.studio) return
    let cancelled = false
    void countRounds(choreography.id, practiceItems(choreography).map((i) => i.id)).then((n) => { if (!cancelled) setClassRounds(n) })
    return () => { cancelled = true }
  }, [screen, choreography])

  return (
    <main className="app">
      {screen === 'loading' && <div className="loading"><Mascot size={88} /></div>}
      {screen === 'onboarding' && <Onboarding onDone={finishOnboarding} />}
      {screen === 'studio' && <StudioIntro choreography={studioChoreography} onStart={() => void startStudio()} />}
      {screen === 'levelcheck' && <LevelCheck onDone={finishLevelCheck} />}
      {screen === 'teacher' && choreography?.studio && <TeacherPreview studio={choreography.studio} onBack={() => setScreen('plan')} />}
      {screen === 'own' && <OwnVideoFlow onExit={() => setScreen('plan')} />}
      {screen === 'plan' && profile && level && plan && choreography && (
        <PlanScreen
          profile={profile} level={level.level} plan={plan} choreography={choreography} mirror={mirror}
          onMirror={(m) => { setMirror(m); void save('mirror', m) }}
          onPractise={() => setScreen('practice')}
          onRestart={() => void updatePlan(startPlan(choreography.id))}
          onOwnVideo={() => setScreen('own')}
          onStartOver={() => void startOver()}
          classRounds={classRounds} onTeacherPreview={() => setScreen('teacher')}
        />
      )}
      {screen === 'practice' && profile && plan && choreography && (
        <PracticeFlow
          profile={profile} plan={plan} choreography={choreography} mirror={mirror}
          onPlan={updatePlan} onExit={() => setScreen('plan')}
        />
      )}
    </main>
  )
}
