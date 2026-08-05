import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { ApiError, api, clearTokens, hasSession, resumeSession, setTokens } from '../api/client'
import type { AdminMe, AuthResponse } from '../api/types'

type Status = 'checking' | 'anonymous' | 'authorised' | 'forbidden'

interface AuthState {
  status: Status
  admin: AdminMe | null
  signInWithPassword: (email: string, password: string) => Promise<void>
  signInWithGoogle: (idToken: string) => Promise<void>
  signOut: () => void
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>('checking')
  const [admin, setAdmin] = useState<AdminMe | null>(null)

  /**
   * Signing in is two steps, and the second one is the point.
   *
   * `/auth/login` and `/auth/google` are the ordinary user endpoints — succeeding there only proves the
   * credentials are valid, not that this account may use the panel. `/admin/me` is what answers that,
   * and a 403 from it is terminal: there is nothing to retry, so the UI says so plainly instead of
   * bouncing the operator back to a login form that would keep "working".
   */
  const confirmAdmin = useCallback(async () => {
    try {
      setAdmin(await api<AdminMe>('/admin/me'))
      setStatus('authorised')
    } catch (error) {
      setAdmin(null)
      setStatus(error instanceof ApiError && error.isForbidden ? 'forbidden' : 'anonymous')
      if (!(error instanceof ApiError && error.isForbidden)) clearTokens()
    }
  }, [])

  useEffect(() => {
    if (!hasSession()) {
      setStatus('anonymous')
      return
    }
    // Only the refresh token survives a reload, so trade it for an access token before asking who we are.
    resumeSession()
      .then(confirmAdmin)
      .catch(() => {
        clearTokens()
        setStatus('anonymous')
      })
  }, [confirmAdmin])

  const signInWithPassword = useCallback(
    async (email: string, password: string) => {
      const auth = await api<AuthResponse>('/auth/login', { method: 'POST', body: { email, password } })
      setTokens(auth.accessToken, auth.refreshToken)
      await confirmAdmin()
    },
    [confirmAdmin],
  )

  const signInWithGoogle = useCallback(
    async (idToken: string) => {
      const auth = await api<AuthResponse>('/auth/google', { method: 'POST', body: { token: idToken } })
      setTokens(auth.accessToken, auth.refreshToken)
      await confirmAdmin()
    },
    [confirmAdmin],
  )

  const signOut = useCallback(() => {
    clearTokens()
    setAdmin(null)
    setStatus('anonymous')
  }, [])

  const value = useMemo(
    () => ({ status, admin, signInWithPassword, signInWithGoogle, signOut }),
    [status, admin, signInWithPassword, signInWithGoogle, signOut],
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider')
  return context
}
