import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './auth/AuthContext'
import { LoginScreen } from './auth/LoginScreen'
import { LocaleProvider, useT } from './i18n'
import { Layout } from './components/Layout'
import { Overview } from './screens/Overview'
import { Users } from './screens/Users'
import { UserDetail } from './screens/UserDetail'
import { Moderation } from './screens/Moderation'
import { Ops } from './screens/Ops'
import { Audit } from './screens/Audit'
import { ApiError } from './api/client'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // No refetch on focus. Every tab switch would otherwise fire a round of queries and wake a
      // serverless database compute; the panel refreshes when asked, or on the opt-in interval.
      refetchOnWindowFocus: false,
      staleTime: 60_000,
      retry: (failureCount, error) => {
        // Retrying a 401 or 403 cannot help: the client layer already tried a token refresh, and a 403
        // means this account may not use the panel at all.
        if (error instanceof ApiError && (error.isUnauthenticated || error.isForbidden)) return false
        return failureCount < 2
      },
    },
  },
})

function Gate() {
  const { status } = useAuth()
  const { t } = useT()

  if (status === 'checking') return <div className="center">{t('loading')}</div>
  if (status !== 'authorised') return <LoginScreen />

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Overview />} />
        <Route path="users" element={<Users />} />
        <Route path="users/:id" element={<UserDetail />} />
        <Route path="moderation" element={<Moderation />} />
        <Route path="ops" element={<Ops />} />
        <Route path="audit" element={<Audit />} />
      </Route>
    </Routes>
  )
}

export function App() {
  return (
    <LocaleProvider>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AuthProvider>
            <Gate />
          </AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </LocaleProvider>
  )
}
