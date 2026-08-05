import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'
import type { AdminChatUsage, AdminOpsConfig, AdminOpsHealth, RecentError } from '../api/types'
import { useT } from '../i18n'
import { Section, Stat } from '../components/Stat'
import { ErrorState, LoadingState } from '../components/States'
import type { TKey } from '../i18n/en'

const BOOLEAN_SWITCHES: { key: string; label: TKey }[] = [
  { key: 'chat_enabled', label: 'chatEnabled' },
  { key: 'registration_enabled', label: 'registrationEnabled' },
  { key: 'push_enabled', label: 'pushEnabled' },
]

/**
 * Installs, crash-free rate and store ratings deliberately live elsewhere. This panel's claim is that
 * its numbers are current; those three are not available in real time from anywhere, so linking out is
 * more honest than importing a two-day-old copy and putting it beside live figures.
 */
const EXTERNAL: { label: TKey; href: string }[] = [
  { label: 'linkPlayConsole', href: 'https://play.google.com/console' },
  { label: 'linkCrashlytics', href: 'https://console.firebase.google.com/project/candroidapitodos/crashlytics' },
  { label: 'linkNeon', href: 'https://console.neon.tech' },
  { label: 'linkGcpBilling', href: 'https://console.cloud.google.com/billing' },
  { label: 'linkRender', href: 'https://dashboard.render.com' },
]

const timeFormat = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'short',
  timeStyle: 'medium',
  timeZone: 'UTC',
})

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86_400)
  const hours = Math.floor((seconds % 86_400) / 3_600)
  const minutes = Math.floor((seconds % 3_600) / 60)
  if (days > 0) return `${days}d ${hours}h`
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}

export function Ops() {
  const { t } = useT()
  const queryClient = useQueryClient()
  const [message, setMessage] = useState<string | null>(null)

  const health = useQuery({ queryKey: ['ops-health'], queryFn: () => api<AdminOpsHealth>('/admin/ops/health') })
  const usage = useQuery({ queryKey: ['ops-usage'], queryFn: () => api<AdminChatUsage>('/admin/ops/chat-usage') })
  const config = useQuery({ queryKey: ['ops-config'], queryFn: () => api<AdminOpsConfig>('/admin/ops/config') })
  const errors = useQuery({ queryKey: ['ops-errors'], queryFn: () => api<RecentError[]>('/admin/ops/errors?limit=50') })

  const updateSetting = useMutation({
    mutationFn: ({ key, value }: { key: string; value: string }) =>
      api<Record<string, string>>(`/admin/settings/${key}`, { method: 'PUT', body: { value } }),
    onSuccess: () => {
      setMessage(t('settingSaved'))
      void queryClient.invalidateQueries({ queryKey: ['ops-health'] })
      void queryClient.invalidateQueries({ queryKey: ['ops-config'] })
    },
    onError: () => setMessage(t('settingFailed')),
  })

  if (health.isLoading) return <LoadingState />
  if (health.error) return <ErrorState error={health.error} onRetry={() => void health.refetch()} />
  const status = health.data
  if (!status) return <LoadingState />

  const flags = status.flags

  return (
    <>
      <h1>{t('opsTitle')}</h1>

      <Section title={t('opsTitle')}>
        <div className="grid">
          <Stat label={t('uptime')} value={formatUptime(status.uptimeSeconds)} />
          <Stat
            label={t('database')}
            value={status.dbUp ? 'OK' : 'DOWN'}
            tone={status.dbUp ? 'good' : 'bad'}
          />
          {/* On a serverless database a cold compute resuming shows up here seconds before it shows up
              as a user complaint. */}
          <Stat
            label={t('dbLatency')}
            value={status.dbLatencyMs}
            format="duration"
            tone={status.dbLatencyMs > 1000 ? 'warn' : 'good'}
          />
          <Stat
            label={t('serverErrors')}
            value={status.serverErrors24h}
            tone={(status.serverErrors24h ?? 0) > 0 ? 'warn' : 'good'}
          />
        </div>
      </Section>

      <Section title={t('killSwitches')}>
        <div className="card stack">
          {BOOLEAN_SWITCHES.map((setting) => {
            const enabled = flags[setting.key] === 'true'
            return (
              <div className="row" key={setting.key}>
                <span>{t(setting.label)}</span>
                <div className="spacer" />
                <span className={`badge ${enabled ? 'badge--ok' : 'badge--bad'}`}>
                  {enabled ? 'ON' : 'OFF'}
                </span>
                <button
                  className={enabled ? 'btn btn--danger' : 'btn btn--primary'}
                  disabled={updateSetting.isPending}
                  onClick={() =>
                    updateSetting.mutate({ key: setting.key, value: enabled ? 'false' : 'true' })
                  }
                >
                  {enabled ? 'OFF' : 'ON'}
                </button>
              </div>
            )
          })}

          <div className="row">
            <span>{t('chatDailyCap')}</span>
            <div className="spacer" />
            <input
              className="input"
              style={{ maxWidth: 120 }}
              type="number"
              min={0}
              aria-label={t('chatDailyCap')}
              defaultValue={flags.chat_max_global_daily_requests}
              onBlur={(event) =>
                updateSetting.mutate({
                  key: 'chat_max_global_daily_requests',
                  value: event.target.value,
                })
              }
            />
          </div>

          {usage.data && (
            <span className="subtle">
              {t('chatBudgetUsed', {
                used: usage.data.globalDailyUsed,
                limit: usage.data.globalDailyLimit,
              })}
            </span>
          )}
          {message && <span className="subtle">{message}</span>}
        </div>
      </Section>

      <Section title={t('sectionChat')}>
        {usage.data && (
          <div className="grid">
            <Stat label={t('chatRequests7d')} value={usage.data.requests} />
            <Stat label={t('chatUsers7d')} value={usage.data.uniqueUsers} />
            <Stat
              label={t('chatErrorRate')}
              value={usage.data.requests === 0 ? null : usage.data.errors / usage.data.requests}
              format="percent"
              tone={usage.data.errors > 0 ? 'warn' : 'good'}
            />
            <Stat label={t('promptTokens')} value={usage.data.promptTokens} />
            <Stat label={t('responseTokens')} value={usage.data.responseTokens} />
          </div>
        )}
      </Section>

      <Section title={t('integrations')}>
        {config.data && (
          <div className="card stack">
            {(
              [
                ['vertexConfigured', config.data.vertexConfigured],
                ['mailConfigured', config.data.mailConfigured],
                ['firebaseConfigured', config.data.firebaseConfigured],
                ['googleOAuthConfigured', config.data.googleOAuthConfigured],
              ] as [TKey, boolean][]
            ).map(([label, ok]) => (
              <div className="row" key={label}>
                <span>{t(label)}</span>
                <div className="spacer" />
                <span className={`badge ${ok ? 'badge--ok' : 'badge--warn'}`}>
                  {ok ? t('configured') : t('notConfigured')}
                </span>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title={t('recentErrors')}>
        {errors.data && errors.data.length === 0 && <p className="subtle">{t('none')}</p>}
        {errors.data && errors.data.length > 0 && (
          <div className="card table-wrap">
            <table>
              <tbody>
                {errors.data.map((error, index) => (
                  <tr key={index}>
                    <td className="subtle">{timeFormat.format(new Date(error.at))}</td>
                    <td>
                      <span className={`badge ${error.level === 'ERROR' ? 'badge--bad' : 'badge--warn'}`}>
                        {error.level}
                      </span>
                    </td>
                    <td className="mono">{error.logger}</td>
                    <td style={{ whiteSpace: 'normal' }}>{error.message}</td>
                    {/* Matches the X-Request-Id the server echoed, so this maps to a server log line. */}
                    <td className="mono subtle">{error.requestId ?? ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <Section title={t('externalLinks')}>
        <div className="card stack">
          <p className="subtle" style={{ margin: 0 }}>
            {t('externalHint')}
          </p>
          <div className="row">
            {EXTERNAL.map((link) => (
              <a key={link.href} className="btn" href={link.href} target="_blank" rel="noreferrer noopener">
                {t(link.label)}
              </a>
            ))}
          </div>
        </div>
      </Section>
    </>
  )
}
