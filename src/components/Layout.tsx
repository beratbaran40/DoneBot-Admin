import { NavLink, Outlet } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useT } from '../i18n'
import { useAuth } from '../auth/AuthContext'
import { LocaleSwitch } from './LocaleSwitch'
import type { TKey } from '../i18n/en'

const TABS: { to: string; key: TKey }[] = [
  { to: '/', key: 'navOverview' },
  { to: '/users', key: 'navUsers' },
  { to: '/moderation', key: 'navModeration' },
  { to: '/ops', key: 'navOps' },
  { to: '/audit', key: 'navAudit' },
]

/**
 * Same navigation, two shapes: a bottom tab bar on a phone and a sidebar from 900px up. The panel is
 * meant to be usable from a phone browser — the whole point of it being a web app rather than a screen
 * inside the Android app — so the mobile layout is the default and the desktop one is the enhancement.
 */
export function Layout() {
  const { t } = useT()
  const { admin, signOut } = useAuth()
  const [offline, setOffline] = useState(!navigator.onLine)

  useEffect(() => {
    const goOnline = () => setOffline(false)
    const goOffline = () => setOffline(true)
    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)
    return () => {
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
    }
  }, [])

  return (
    <div className="shell">
      <nav className="nav">
        <div className="nav__brand">{t('appName')}</div>
        {TABS.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.to === '/'}
            className={({ isActive }) => `nav__item${isActive ? ' nav__item--active' : ''}`}
          >
            {t(tab.key)}
          </NavLink>
        ))}
      </nav>

      <main className="shell__main">
        {/* A stale dashboard that does not say it is stale is worse than no dashboard. */}
        {offline && <div className="banner banner--warn">{t('offline')}</div>}

        <div className="row" style={{ marginBottom: 'var(--space-4)' }}>
          <span className="subtle">{admin?.email}</span>
          <div className="spacer" />
          <LocaleSwitch />
          <button className="btn" onClick={signOut} style={{ padding: '4px 12px', fontSize: 12 }}>
            {t('signOut')}
          </button>
        </div>

        <Outlet />
      </main>
    </div>
  )
}
