import { useEffect, useState } from 'react'
import { Onboarding } from './ui/onboarding/Onboarding'
import { OwnVideoFlow } from './ui/own/OwnVideoFlow'
import { Mascot } from './mascot/Mascot'
import { TopBar } from './ui/TopBar'
import { clearAll, load, save } from './store/db'
import type { Profile } from './profile/profile'
import { text } from './text'

type Screen = 'loading' | 'onboarding' | 'home' | 'own'

export default function App() {
  const [screen, setScreen] = useState<Screen>('loading')
  const [profile, setProfile] = useState<Profile | null>(null)

  useEffect(() => {
    void load<Profile>('profile').then((p) => {
      setProfile(p ?? null)
      setScreen(p ? 'home' : 'onboarding')
    })
  }, [])

  async function finishOnboarding(p: Profile) {
    await save('profile', p)
    setProfile(p)
    setScreen('home')
  }

  async function startOver() {
    await clearAll()
    setProfile(null)
    setScreen('onboarding')
  }

  return (
    <main className="app">
      {screen === 'loading' && <div className="loading"><Mascot size={88} /></div>}
      {screen === 'onboarding' && <Onboarding onDone={finishOnboarding} />}
      {screen === 'own' && <OwnVideoFlow onExit={() => setScreen('home')} />}
      {screen === 'home' && profile && (
        <section className="screen">
          <TopBar title={text.home.title(profile.name)} />
          <Mascot size={96} />
          <div className="screen-footer">
            <button className="secondary" onClick={() => setScreen('own')}>{text.home.ownVideo}</button>
            <button className="link-button" onClick={startOver}>{text.home.startOver}</button>
          </div>
        </section>
      )}
    </main>
  )
}
