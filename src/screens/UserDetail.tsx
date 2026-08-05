import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../api/client'
import type { AdminUserDetail as UserDetailData } from '../api/types'
import { useT } from '../i18n'
import { Section, Stat } from '../components/Stat'
import { ErrorState, LoadingState } from '../components/States'

const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeZone: 'UTC' })

function Sparkline({ days }: { days: number[] }) {
  // 30 squares, one per day. A tiny calendar heat strip reads faster than a line for a binary series,
  // and it degrades gracefully to nothing meaningful being lost on a narrow screen.
  return (
    <div style={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
      {days.map((active, index) => (
        <span
          key={index}
          title={`${30 - index}d`}
          style={{
            width: 10,
            height: 16,
            borderRadius: 2,
            background: active ? 'var(--series-1)' : 'var(--grid)',
          }}
        />
      ))}
    </div>
  )
}

export function UserDetail() {
  const { t } = useT()
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [reason, setReason] = useState('')
  const [confirmEmail, setConfirmEmail] = useState('')
  const [actionError, setActionError] = useState<string | null>(null)

  const query = useQuery({
    queryKey: ['user', id],
    queryFn: () => api<UserDetailData>(`/admin/users/${id}`),
    enabled: Boolean(id),
  })

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['user', id] })
    void queryClient.invalidateQueries({ queryKey: ['users'] })
  }

  const act = useMutation({
    mutationFn: (path: string) => api<void>(`/admin/users/${id}/${path}`, { method: 'POST', body: { reason } }),
    onSuccess: invalidate,
    onError: (error) => setActionError(String(error)),
  })

  const remove = useMutation({
    mutationFn: () => api<void>(`/admin/users/${id}`, { method: 'DELETE', body: { confirmEmail } }),
    onSuccess: () => {
      invalidate()
      navigate('/users')
    },
    onError: (error) => setActionError(String(error)),
  })

  if (query.isLoading) return <LoadingState />
  if (query.error) return <ErrorState error={query.error} onRetry={() => void query.refetch()} />
  const user = query.data
  if (!user) return <LoadingState />

  const suspended = user.status === 'SUSPENDED'
  const confirmMatches = confirmEmail.trim().toLowerCase() === user.email.toLowerCase()

  return (
    <>
      <h1>{user.displayName}</h1>
      <p className="subtle">{user.email}</p>
      {/* Stated on the screen, not just in the code: this page is metadata, by design. */}
      <p className="subtle">{t('accountMetadataOnly')}</p>

      {suspended && (
        <div className="banner banner--bad" style={{ marginTop: 'var(--space-4)' }}>
          {t('statusSuspended')}
          {user.suspendedReason ? ` — ${user.suspendedReason}` : ''}
        </div>
      )}

      <Section title={t('userDetail')}>
        <div className="grid">
          <Stat label={t('joined')} value={dateFormat.format(new Date(user.createdAt))} />
          <Stat
            label={t('lastActive')}
            value={user.lastActiveAt ? dateFormat.format(new Date(user.lastActiveAt)) : t('never')}
          />
          <Stat label={t('activeDays30')} value={user.activeDaysLast30} />
          <Stat label={t('activeSessions')} value={user.sessions.activeRefreshTokens} />
          <Stat label={t('colProvider')} value={user.providers.join(', ') || '—'} />
          <Stat label={t('reportsFiled')} value={user.reportsFiled} />
          <Stat
            label={t('reportsAgainst')}
            value={user.reportsAgainst}
            tone={user.reportsAgainst > 0 ? 'warn' : 'default'}
          />
        </div>
        <div className="card" style={{ marginTop: 'var(--space-3)' }}>
          <p className="stat__label">{t('activeDays30')}</p>
          <Sparkline days={user.activitySparkline} />
        </div>
      </Section>

      <Section title={t('sectionTasks')}>
        <div className="grid">
          <Stat label={t('tasksPersonal')} value={user.counts.tasksPersonal} />
          <Stat label={t('tasksGroup')} value={user.counts.tasksGroup} />
          <Stat label={t('tasksCompleted')} value={user.counts.tasksCompleted} />
          <Stat label={t('tasksSecret')} value={user.counts.tasksSecret} />
          <Stat label={t('routineCompletions')} value={user.counts.routineCompletions} />
          <Stat label={t('photos')} value={user.counts.photos} />
          <Stat label={t('unreadNotifications')} value={user.counts.notificationsUnread} />
        </div>
      </Section>

      <Section title={t('chatUsage30d')}>
        <div className="grid">
          {/* These are thirty-day figures and counts, not seven-day rates — the section heading carries
              the window, so the labels must not contradict it. */}
          <Stat label={t('chatRequestsPlain')} value={user.chatUsage30d.requests} />
          <Stat
            label={t('chatErrorsPlain')}
            value={user.chatUsage30d.errors}
            tone={user.chatUsage30d.errors > 0 ? 'warn' : 'default'}
          />
          <Stat label={t('chatRefusalsPlain')} value={user.chatUsage30d.refusals} />
          <Stat label={t('promptTokensPlain')} value={user.chatUsage30d.promptTokens} />
          <Stat label={t('responseTokensPlain')} value={user.chatUsage30d.responseTokens} />
        </div>
      </Section>

      <Section title={t('memberships')}>
        {user.groups.length === 0 ? (
          <p className="subtle">{t('none')}</p>
        ) : (
          <div className="card table-wrap">
            <table>
              <tbody>
                {user.groups.map((group) => (
                  <tr key={group.groupId}>
                    <td>{group.name}</td>
                    <td className="subtle">{group.role}</td>
                    <td>{group.isOwner && <span className="badge badge--muted">{t('owner')}</span>}</td>
                    <td className="subtle">{group.memberCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <Section title={t('devices')}>
        {user.devices.length === 0 ? (
          <p className="subtle">{t('none')}</p>
        ) : (
          <div className="card table-wrap">
            <table>
              <tbody>
                {user.devices.map((device) => (
                  <tr key={device.id}>
                    <td>{device.deviceName ?? '—'}</td>
                    {/* Suffix only — a full FCM token is a capability to push to that device. */}
                    <td className="mono subtle">…{device.tokenSuffix}</td>
                    <td className="subtle">
                      {device.updatedAt ? dateFormat.format(new Date(device.updatedAt)) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <Section title={t('actionSuspend')}>
        <div className="card stack">
          <p className="subtle" style={{ margin: 0 }}>
            {t('suspendExplain')}
          </p>
          {!suspended && (
            <input
              className="input"
              placeholder={t('suspendReason')}
              aria-label={t('suspendReason')}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
            />
          )}
          <div className="row">
            {suspended ? (
              <button className="btn" onClick={() => act.mutate('unsuspend')} disabled={act.isPending}>
                {t('actionUnsuspend')}
              </button>
            ) : (
              <button
                className="btn btn--danger"
                onClick={() => act.mutate('suspend')}
                disabled={act.isPending}
              >
                {t('actionSuspend')}
              </button>
            )}
            <button className="btn" onClick={() => act.mutate('revoke-sessions')} disabled={act.isPending}>
              {t('actionRevokeSessions')}
            </button>
          </div>
        </div>
      </Section>

      <Section title={t('actionDelete')}>
        <div className="card stack">
          <p className="subtle" style={{ margin: 0 }}>
            {t('deleteExplain')}
          </p>
          <label className="subtle" htmlFor="confirm-email">
            {t('deleteConfirmLabel')}
          </label>
          <input
            id="confirm-email"
            className="input"
            value={confirmEmail}
            onChange={(event) => setConfirmEmail(event.target.value)}
            autoComplete="off"
          />
          {/* The button stays disabled until the typed email matches. The server checks this too — the
              client guard exists to stop the mistake, the server guard to stop the bug. */}
          <button
            className="btn btn--danger"
            disabled={!confirmMatches || remove.isPending}
            onClick={() => remove.mutate()}
          >
            {t('actionDelete')}
          </button>
          {confirmEmail && !confirmMatches && <span className="subtle">{t('deleteMismatch')}</span>}
        </div>
      </Section>

      {actionError && <div className="banner banner--bad">{actionError}</div>}
    </>
  )
}
