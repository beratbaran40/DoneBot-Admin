import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, apiBlob } from '../api/client'
import type { AdminReportItem, AdminReportPage } from '../api/types'
import { useT } from '../i18n'
import { ErrorState, LoadingState } from '../components/States'
import type { TKey } from '../i18n/en'

type ReportType = 'chat' | 'content'

const RESOLUTIONS: { value: string; label: TKey }[] = [
  { value: 'NO_ACTION', label: 'resolutionNoAction' },
  { value: 'CONTENT_REMOVED', label: 'resolutionContentRemoved' },
  { value: 'USER_SUSPENDED', label: 'resolutionUserSuspended' },
]

const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeZone: 'UTC' })

/**
 * Fetches the reported image through the authenticated client rather than putting it in an `<img src>`.
 *
 * The endpoint needs an Authorization header, so a plain URL would not work anyway — but the more
 * important reason is that the panel never builds a URL out of `target_ref`. That value is written by
 * the reporting client and is not trustworthy; the server resolves it, checks it belongs to the
 * reported group, and hands back bytes.
 */
function ReportedPhoto({ reportId }: { reportId: number }) {
  const { t } = useT()
  const [url, setUrl] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let revoked = false
    let objectUrl: string | null = null
    apiBlob(`/admin/reports/content/${reportId}/photo`)
      .then((blob) => {
        if (revoked) return
        objectUrl = URL.createObjectURL(blob)
        setUrl(objectUrl)
      })
      .catch(() => setFailed(true))
    return () => {
      revoked = true
      // Object URLs pin the decoded image in memory until explicitly released.
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [reportId])

  if (failed) return <p className="subtle">{t('photoUnavailable')}</p>
  if (!url) return <LoadingState />
  return <img src={url} alt="" style={{ maxWidth: '100%', borderRadius: 'var(--radius-card)' }} />
}

function ReportCard({ report, onResolved }: { report: AdminReportItem; onResolved: () => void }) {
  const { t } = useT()
  const [resolution, setResolution] = useState(RESOLUTIONS[0]!.value)
  const [note, setNote] = useState('')
  const [showPhoto, setShowPhoto] = useState(false)

  const resolve = useMutation({
    mutationFn: () =>
      api<void>(`/admin/reports/${report.type}/${report.id}/resolve`, {
        method: 'POST',
        body: { resolution, note },
      }),
    onSuccess: onResolved,
  })

  const open = report.status === 'OPEN'

  return (
    <div className="card stack">
      <div className="row">
        <span className={`badge ${open ? 'badge--warn' : 'badge--muted'}`}>
          {open ? t('filterOpen') : t('filterResolved')}
        </span>
        <span className="subtle">{t('hoursOld', { hours: report.ageHours })}</span>
        <div className="spacer" />
        <span className="subtle">{dateFormat.format(new Date(report.createdAt))}</span>
      </div>

      <div className="subtle">
        {t('reportedBy')}: {report.reporterEmail ?? report.reporterUserId}
        {report.reason ? ` · ${t('reportReason')}: ${report.reason}` : ''}
      </div>

      {/* Chat reports carry the flagged reply itself — the reporter submitted it precisely so it would
          be read. Rendered as text, never as markup. */}
      {report.messageContent && (
        <blockquote
          style={{
            margin: 0,
            padding: 'var(--space-3)',
            background: 'var(--surface)',
            borderRadius: 'var(--radius-card)',
            whiteSpace: 'pre-wrap',
          }}
        >
          {report.messageContent}
        </blockquote>
      )}

      {report.hasViewablePhoto &&
        (showPhoto ? (
          <ReportedPhoto reportId={report.id} />
        ) : (
          <button className="btn" onClick={() => setShowPhoto(true)}>
            {t('viewPhoto')}
          </button>
        ))}

      {open ? (
        <div className="row">
          <select
            className="input"
            style={{ maxWidth: 220 }}
            aria-label={t('resolve')}
            value={resolution}
            onChange={(event) => setResolution(event.target.value)}
          >
            {RESOLUTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {t(option.label)}
              </option>
            ))}
          </select>
          <input
            className="input"
            style={{ maxWidth: 240 }}
            placeholder={t('resolutionNote')}
            aria-label={t('resolutionNote')}
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
          <button className="btn btn--primary" onClick={() => resolve.mutate()} disabled={resolve.isPending}>
            {t('resolve')}
          </button>
        </div>
      ) : (
        <span className="subtle">
          {t('resolvedOn', { date: report.resolvedAt ? dateFormat.format(new Date(report.resolvedAt)) : '—' })}
          {report.resolution ? ` · ${report.resolution}` : ''}
          {report.resolutionNote ? ` · ${report.resolutionNote}` : ''}
        </span>
      )}
    </div>
  )
}

export function Moderation() {
  const { t } = useT()
  const queryClient = useQueryClient()
  const [type, setType] = useState<ReportType>('chat')
  const [status, setStatus] = useState('OPEN')

  const query = useQuery({
    queryKey: ['reports', type, status],
    queryFn: () => api<AdminReportPage>(`/admin/reports?type=${type}&status=${status}&size=50`),
  })

  const refresh = () => void queryClient.invalidateQueries({ queryKey: ['reports'] })

  return (
    <>
      <h1>{t('moderationTitle')}</h1>

      <div className="row" style={{ margin: 'var(--space-4) 0' }}>
        <button
          className={`btn${type === 'chat' ? ' btn--primary' : ''}`}
          onClick={() => setType('chat')}
        >
          {t('tabChatReports')}
        </button>
        <button
          className={`btn${type === 'content' ? ' btn--primary' : ''}`}
          onClick={() => setType('content')}
        >
          {t('tabContentReports')}
        </button>
        <div className="spacer" />
        <select
          className="input"
          style={{ maxWidth: 160 }}
          aria-label={t('colStatus')}
          value={status}
          onChange={(event) => setStatus(event.target.value)}
        >
          <option value="OPEN">{t('filterOpen')}</option>
          <option value="RESOLVED">{t('filterResolved')}</option>
          <option value="DISMISSED">{t('resolutionNoAction')}</option>
        </select>
      </div>

      {query.isLoading && <LoadingState />}
      {query.error && <ErrorState error={query.error} onRetry={() => void query.refetch()} />}
      {query.data && query.data.items.length === 0 && <p className="subtle">{t('queueEmpty')}</p>}

      <div className="stack">
        {query.data?.items.map((report) => (
          <ReportCard key={`${report.type}-${report.id}`} report={report} onResolved={refresh} />
        ))}
      </div>
    </>
  )
}
