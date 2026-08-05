import { useT } from '../i18n'
import { ApiError } from '../api/client'

export function LoadingState() {
  const { t } = useT()
  return <p className="subtle">{t('loading')}</p>
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const { t } = useT()
  // Surfaces the backend's message and, when present, the X-Request-Id-style code — so a problem seen
  // here can be matched to a line in the server log rather than described from memory.
  const detail = error instanceof ApiError ? `${error.status} · ${error.message}` : String(error)
  return (
    <div className="card stack">
      <strong>{t('errorTitle')}</strong>
      <span className="subtle mono">{detail}</span>
      {onRetry && (
        <button className="btn" onClick={onRetry}>
          {t('retry')}
        </button>
      )}
    </div>
  )
}

export function EmptyState({ message }: { message: string }) {
  return <p className="subtle">{message}</p>
}
