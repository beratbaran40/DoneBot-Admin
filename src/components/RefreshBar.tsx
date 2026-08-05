import { useT } from '../i18n'

interface RefreshBarProps {
  title: string
  /** ISO instant the data was generated server-side — not when the browser received it. */
  generatedAt?: string
  cacheAgeSeconds?: number
  isFetching: boolean
  onRefresh: () => void
  autoRefresh: boolean
  onAutoRefreshChange: (value: boolean) => void
}

const timeFormat = new Intl.DateTimeFormat(undefined, {
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'UTC',
})

/**
 * Every data screen carries this. It answers the question that motivated the whole panel: *how old is
 * this number?* — using the server's own timestamp, so a stalled request cannot make stale data look
 * fresh.
 *
 * Auto-refresh is off by default and opt-in per session. A dashboard left open on a second monitor
 * polling every few seconds would keep a serverless database awake around the clock, which is a real
 * line on a real bill; a Refresh button costs nothing when nobody is looking.
 */
export function RefreshBar({
  title,
  generatedAt,
  cacheAgeSeconds,
  isFetching,
  onRefresh,
  autoRefresh,
  onAutoRefreshChange,
}: RefreshBarProps) {
  const { t } = useT()
  return (
    <div className="row" style={{ marginBottom: 'var(--space-4)' }}>
      <div>
        <h1>{title}</h1>
        {generatedAt && (
          <span className="subtle">
            {t('updated', { time: timeFormat.format(new Date(generatedAt)) })}
            {cacheAgeSeconds !== undefined && cacheAgeSeconds > 0 && (
              <> · {t('cachedFor', { seconds: cacheAgeSeconds })}</>
            )}
          </span>
        )}
      </div>
      <div className="spacer" />
      <label className="subtle row" style={{ gap: 6, cursor: 'pointer' }}>
        <input
          type="checkbox"
          checked={autoRefresh}
          onChange={(event) => onAutoRefreshChange(event.target.checked)}
        />
        {t('autoRefresh')}
      </label>
      <button className="btn" onClick={onRefresh} disabled={isFetching}>
        {isFetching ? t('loading') : t('refresh')}
      </button>
    </div>
  )
}
