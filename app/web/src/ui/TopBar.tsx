import { text } from '../text'

type Props = {
  title: string
  subtitle?: string
  onBack?: () => void
  icon?: 'back' | 'close'
}

export function TopBar({ title, subtitle, onBack, icon = 'back' }: Props) {
  return (
    <header className="topbar">
      {onBack && (
        <button className="icon-button" onClick={onBack} aria-label={icon === 'close' ? text.common.close : text.common.back}>
          <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            {icon === 'close' ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M15 6l-6 6 6 6" />}
          </svg>
        </button>
      )}
      <div className="topbar-text">
        <h1>{title}</h1>
        {subtitle && <span className="muted small">{subtitle}</span>}
      </div>
    </header>
  )
}
