import { useEffect, useState } from 'react'
import { Onboarding } from './ui/onboarding/Onboarding'
import { OwnVideoFlow } from './ui/own/OwnVideoFlow'
import { LevelCheck, type LevelResult } from './ui/levelcheck/LevelCheck'
import { PlanScreen } from './ui/plan/PlanScreen'
import { PracticeFlow } from './ui/practice/PracticeFlow'
import { Mascot } from './mascot/Mascot'
import { clearAll, load, save } from './store/db'
import { content } from './content/content'
import { chooseChoreography, startPlan, type PlanState } from './plan/plan'
import type { LevelId } from './content/types'
import type { Profile } from './profile/profile'

type Screen = 'loading' | 'onboarding' | 'levelcheck' | 'plan' | 'practice' | 'own'

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

  useEffect(() => {
    void Promise.all([load<Profile>('profile'), load<LevelResult>('level'), load<PlanState>('plan'), load<boolean>('mirror')])
      .then(([p, l, pl, m]) => {
        setProfile(p ?? null)
        setLevel(l ?? null)
        setPlan(pl ?? null)
        if (m !== undefined) setMirror(m)
        setScreen(!p ? 'onboarding' : !l || !pl ? 'levelcheck' : 'plan')
      })
  }, [])

  async function updatePlan(next: PlanState) {
    await save('plan', next)
    setPlan(next)
  }

  async function finishOnboarding(p: Profile) {
    await save('profile', p)
    setProfile(p)
    setScreen('levelcheck')
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

  return (
    <main className="app">
      {screen === 'loading' && <div className="loading"><Mascot size={88} /></div>}
      {screen === 'onboarding' && <Onboarding onDone={finishOnboarding} />}
      {screen === 'levelcheck' && <LevelCheck onDone={finishLevelCheck} />}
      {screen === 'own' && <OwnVideoFlow onExit={() => setScreen('plan')} />}
      {screen === 'plan' && profile && level && plan && choreography && (
        <PlanScreen
          profile={profile} level={level.level} plan={plan} choreography={choreography} mirror={mirror}
          onMirror={(m) => { setMirror(m); void save('mirror', m) }}
          onPractise={() => setScreen('practice')}
          onRestart={() => void updatePlan(startPlan(choreography.id))}
          onOwnVideo={() => setScreen('own')}
          onStartOver={() => void startOver()}
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
