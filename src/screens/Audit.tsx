import { useState } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { api } from '../api/client'
import type { AuditEntry } from '../api/types'
import { useT } from '../i18n'
import { ErrorState, LoadingState } from '../components/States'

const PAGE_SIZE = 50
const timeFormat = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'short',
  timeStyle: 'short',
  timeZone: 'UTC',
})

/**
 * Append-only record of every administrative write.
 *
 * A surface that can suspend and delete accounts needs to be able to answer "who did this, when, and
 * from where" after the fact — including when the answer is "I did, and I was wrong". The actor's email
 * is stored on the row rather than joined, so the history stays readable even if that admin account is
 * later removed.
 */
export function Audit() {
  const { t } = useT()
  const [page, setPage] = useState(0)

  const query = useQuery({
    queryKey: ['audit', page],
    queryFn: () => api<AuditEntry[]>(`/admin/ops/audit?page=${page}&size=${PAGE_SIZE}`),
    placeholderData: keepPreviousData,
  })

  return (
    <>
      <h1>{t('auditTitle')}</h1>

      {query.isLoading && <LoadingState />}
      {query.error && <ErrorState error={query.error} onRetry={() => void query.refetch()} />}

      {query.data && query.data.length === 0 && <p className="subtle">{t('auditEmpty')}</p>}

      {query.data && query.data.length > 0 && (
        <>
          <div className="card table-wrap" style={{ marginTop: 'var(--space-4)' }}>
            <table>
              <thead>
                <tr>
                  <th>{t('auditWhen')}</th>
                  <th>{t('auditWho')}</th>
                  <th>{t('auditAction')}</th>
                  <th>{t('auditTarget')}</th>
                  <th>{t('auditDetail')}</th>
                </tr>
              </thead>
              <tbody>
                {query.data.map((entry) => (
                  <tr key={entry.id}>
                    <td className="subtle">{timeFormat.format(new Date(entry.createdAt))}</td>
                    <td>{entry.actorEmail}</td>
                    <td className="mono">{entry.action}</td>
                    <td className="subtle">
                      {entry.targetType ? `${entry.targetType} ${entry.targetId ?? ''}` : '—'}
                    </td>
                    <td className="subtle" style={{ whiteSpace: 'normal' }}>
                      {entry.detail ?? ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="row" style={{ marginTop: 'var(--space-3)' }}>
            <button className="btn" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
              {t('previous')}
            </button>
            <span className="subtle">{t('page', { page: page + 1 })}</span>
            <button
              className="btn"
              disabled={query.data.length < PAGE_SIZE}
              onClick={() => setPage((p) => p + 1)}
            >
              {t('next')}
            </button>
          </div>
        </>
      )}
    </>
  )
}
