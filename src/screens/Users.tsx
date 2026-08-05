import { useState } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import type { AdminUserPage } from '../api/types'
import { useT } from '../i18n'
import { ErrorState, LoadingState } from '../components/States'
import type { TKey } from '../i18n/en'

const PAGE_SIZE = 25

const SORTS: { value: string; label: TKey }[] = [
  { value: 'CREATED_DESC', label: 'sortNewest' },
  { value: 'CREATED_ASC', label: 'sortOldest' },
  { value: 'LAST_ACTIVE_DESC', label: 'sortLastActive' },
  { value: 'EMAIL_ASC', label: 'sortEmail' },
]

const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeZone: 'UTC' })

function formatDate(value: string | null, fallback: string) {
  return value ? dateFormat.format(new Date(value)) : fallback
}

export function Users() {
  const { t } = useT()
  const [search, setSearch] = useState('')
  const [applied, setApplied] = useState('')
  const [status, setStatus] = useState('')
  const [sort, setSort] = useState('CREATED_DESC')
  const [page, setPage] = useState(0)

  const params = new URLSearchParams({ sort, page: String(page), size: String(PAGE_SIZE) })
  if (applied) params.set('q', applied)
  if (status) params.set('status', status)

  const query = useQuery({
    queryKey: ['users', applied, status, sort, page],
    queryFn: () => api<AdminUserPage>(`/admin/users?${params.toString()}`),
    // Keeps the table on screen while the next page loads, instead of flashing an empty state.
    placeholderData: keepPreviousData,
  })

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    setPage(0)
    setApplied(search.trim())
  }

  return (
    <>
      <h1>{t('usersTitle')}</h1>

      <form className="row" onSubmit={submit} style={{ margin: 'var(--space-4) 0' }}>
        <input
          className="input"
          style={{ maxWidth: 280 }}
          placeholder={t('searchUsers')}
          aria-label={t('searchUsers')}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <select
          className="input"
          style={{ maxWidth: 160 }}
          aria-label={t('colStatus')}
          value={status}
          onChange={(event) => {
            setPage(0)
            setStatus(event.target.value)
          }}
        >
          <option value="">{t('filterAll')}</option>
          <option value="ACTIVE">{t('statusActive')}</option>
          <option value="SUSPENDED">{t('statusSuspended')}</option>
        </select>
        <select
          className="input"
          style={{ maxWidth: 190 }}
          aria-label={t('search')}
          value={sort}
          onChange={(event) => {
            setPage(0)
            setSort(event.target.value)
          }}
        >
          {SORTS.map((option) => (
            <option key={option.value} value={option.value}>
              {t(option.label)}
            </option>
          ))}
        </select>
        <button className="btn btn--primary" type="submit">
          {t('search')}
        </button>
      </form>

      {query.isLoading && <LoadingState />}
      {query.error && <ErrorState error={query.error} onRetry={() => void query.refetch()} />}

      {query.data && (
        <>
          <div className="card table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{t('colEmail')}</th>
                  <th>{t('colName')}</th>
                  <th>{t('colStatus')}</th>
                  <th>{t('colProvider')}</th>
                  <th>{t('colCreated')}</th>
                  <th>{t('colLastActive')}</th>
                  <th>{t('colTasks')}</th>
                  <th>{t('colGroups')}</th>
                </tr>
              </thead>
              <tbody>
                {query.data.items.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <Link to={`/users/${user.id}`}>{user.email}</Link>
                    </td>
                    <td>{user.displayName}</td>
                    <td>
                      <span className={`badge ${user.status === 'ACTIVE' ? 'badge--ok' : 'badge--bad'}`}>
                        {user.status === 'ACTIVE' ? t('statusActive') : t('statusSuspended')}
                      </span>
                    </td>
                    <td className="subtle">{user.providers.join(', ')}</td>
                    <td className="subtle">{formatDate(user.createdAt, '—')}</td>
                    <td className="subtle">{formatDate(user.lastActiveAt, t('never'))}</td>
                    <td>{user.taskCount}</td>
                    <td>{user.groupCount}</td>
                  </tr>
                ))}
                {query.data.items.length === 0 && (
                  <tr>
                    <td colSpan={8} className="subtle">
                      {t('noResults')}
                    </td>
                  </tr>
                )}
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
              disabled={(page + 1) * PAGE_SIZE >= query.data.total}
              onClick={() => setPage((p) => p + 1)}
            >
              {t('next')}
            </button>
            <div className="spacer" />
            <span className="subtle">{query.data.total}</span>
          </div>
        </>
      )}
    </>
  )
}
