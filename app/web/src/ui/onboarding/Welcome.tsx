import { Mascot } from '../../mascot/Mascot'
import { content } from '../../content/content'
import type { Profile } from '../../profile/profile'
import { text } from '../../text'

const t = text.welcome

type Props = { profile: Profile; onStart: () => void; onFullOnboarding: () => void }

/** The demo's short start: Taktvekteren greets a preset Dancer and goes straight to the Level check. */
export function Welcome({ profile, onStart, onFullOnboarding }: Props) {
  const style = content.styles.find((s) => s.id === profile.style)?.name ?? profile.style
  const aches = profile.aches.map((a) => content.aches.find((x) => x.id === a)?.name ?? a)
  return (
    <section className="screen welcome">
      <Mascot size={150} mood="dance" />
      <div className="headline">
        <h1 className="welcome-title">{t.title(profile.name)}</h1>
        <p>{t.intro}</p>
      </div>
      <div className="chips welcome-chips">
        <span className="chip">{style}</span>
        <span className="chip">{text.onboarding.goals[profile.goal]}</span>
        <span className="chip">{text.onboarding.minutes(profile.minutes)}</span>
        {aches.map((a) => <span key={a} className="chip">{t.gentle(a)}</span>)}
      </div>
      <p className="muted small welcome-next">{t.next}</p>
      <div className="screen-footer">
        <button className="primary" onClick={onStart}>{t.start}</button>
        <button className="link-button" onClick={onFullOnboarding}>{t.full}</button>
      </div>
    </section>
  )
}
