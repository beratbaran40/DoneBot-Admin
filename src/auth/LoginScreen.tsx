import { useEffect, useRef, useState } from 'react'
import { useAuth } from './AuthContext'
import { useT } from '../i18n'
import { LocaleSwitch } from '../components/LocaleSwitch'

/**
 * The web OAuth client the backend already validates against — the same one the Android app passes as
 * serverClientId.
 *
 * Hard-coded rather than required from the environment, because an OAuth client id is a public
 * identifier by design: it is sent to every browser that loads this page, and it already sits in
 * `google-services.json` in the public DoneBot repository. The security boundary is the Authorized
 * JavaScript origins list in the Google console, not secrecy of this string. Making deployment depend
 * on it bought nothing and cost three silent outages — first the variable was missing, then it was
 * scoped to the wrong environment, then it was pasted truncated.
 *
 * An override is still honoured, but only if it *looks* like a client id. A truncated paste is
 * otherwise accepted happily here and rejected by Google with `invalid_client` — an error that appears
 * only after the user has already picked their account, with nothing in the panel to explain it.
 */
const DEFAULT_GOOGLE_CLIENT_ID = '348288029176-tqsrb8v3rn2pghkhc19rfva89q7q9vis.apps.googleusercontent.com'
const CLIENT_ID_SUFFIX = '.apps.googleusercontent.com'

const configuredClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined
const GOOGLE_CLIENT_ID = configuredClientId?.trim().endsWith(CLIENT_ID_SUFFIX)
  ? configuredClientId.trim()
  : DEFAULT_GOOGLE_CLIENT_ID

const GSI_SRC = 'https://accounts.google.com/gsi/client'

interface GoogleCredentialResponse {
  credential?: string
}

interface GoogleIdentity {
  accounts: {
    id: {
      initialize: (config: { client_id: string; callback: (r: GoogleCredentialResponse) => void }) => void
      renderButton: (parent: HTMLElement, options: Record<string, unknown>) => void
    }
  }
}

declare global {
  interface Window {
    google?: GoogleIdentity
  }
}

function loadGoogleScript(): Promise<void> {
  if (window.google) return Promise.resolve()
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${GSI_SRC}"]`)
    if (existing) {
      existing.addEventListener('load', () => resolve())
      existing.addEventListener('error', () => reject(new Error('gsi')))
      return
    }
    const script = document.createElement('script')
    script.src = GSI_SRC
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('gsi'))
    document.head.appendChild(script)
  })
}

export function LoginScreen() {
  const { t } = useT()
  const { status, signInWithPassword, signInWithGoogle, signOut } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const googleSlot = useRef<HTMLDivElement>(null)

  /**
   * Google is the primary path and needs no backend work at all: the Android app already requests its
   * ID token with the *web* client as serverClientId, and the server validates on audience alone — so a
   * token minted here by that same client verifies identically. The only external step is listing this
   * origin under the client's Authorized JavaScript origins.
   */
  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || !googleSlot.current) return
    let cancelled = false
    loadGoogleScript()
      .then(() => {
        if (cancelled || !window.google || !googleSlot.current) return
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: (response) => {
            if (!response.credential) return
            setBusy(true)
            setError(null)
            signInWithGoogle(response.credential)
              .catch(() => setError(t('signInFailed')))
              .finally(() => setBusy(false))
          },
        })
        window.google.accounts.id.renderButton(googleSlot.current, {
          theme: 'outline',
          size: 'large',
          shape: 'pill',
          text: 'continue_with',
          width: 280,
        })
      })
      .catch(() => setError(t('googleUnavailable')))
    return () => {
      cancelled = true
    }
  }, [signInWithGoogle, t])

  if (status === 'forbidden') {
    return (
      <div className="center">
        <div className="card stack" style={{ maxWidth: 380 }}>
          <h1>{t('notAuthorised')}</h1>
          <p className="subtle">{t('notAuthorisedHint')}</p>
          <button className="btn" onClick={signOut}>
            {t('signOut')}
          </button>
        </div>
      </div>
    )
  }

  const onSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setError(null)
    signInWithPassword(email, password)
      .catch(() => setError(t('signInFailed')))
      .finally(() => setBusy(false))
  }

  return (
    <div className="center">
      <div className="card stack" style={{ maxWidth: 380, width: '100%' }}>
        <div className="row">
          <h1 style={{ margin: 0 }}>{t('appName')}</h1>
          <div className="spacer" />
          <LocaleSwitch />
        </div>

        <div ref={googleSlot} style={{ display: 'grid', justifyItems: 'center' }} />

        <p className="subtle" style={{ margin: 0 }}>
          {t('signInFallbackHint')}
        </p>

        <form className="stack" onSubmit={onSubmit}>
          <input
            className="input"
            type="email"
            autoComplete="username"
            placeholder={t('email')}
            aria-label={t('email')}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            className="input"
            type="password"
            autoComplete="current-password"
            placeholder={t('password')}
            aria-label={t('password')}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button className="btn btn--primary" type="submit" disabled={busy}>
            {busy ? t('loading') : t('signIn')}
          </button>
        </form>

        {error && <div className="banner banner--bad">{error}</div>}
      </div>
    </div>
  )
}
