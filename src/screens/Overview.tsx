import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'
import type { AdminOverview, AdminTimeSeries } from '../api/types'
import { useT } from '../i18n'
import { Section, Stat } from '../components/Stat'
import { TrendChart } from '../components/TrendChart'
import { RefreshBar } from '../components/RefreshBar'
import { ErrorState, LoadingState } from '../components/States'
import type { TKey } from '../i18n/en'

const AUTO_REFRESH_MS = 60_000

const SERIES: { key: string; label: TKey; slot: 1 | 2 | 3 | 4 | 5 }[] = [
  { key: 'newUsers', label: 'seriesNewUsers', slot: 1 },
  { key: 'activeUsers', label: 'seriesActiveUsers', slot: 2 },
  { key: 'tasksCreated', label: 'seriesTasksCreated', slot: 3 },
  { key: 'tasksCompleted', label: 'seriesTasksCompleted', slot: 4 },
  { key: 'chatRequests', label: 'seriesChatRequests', slot: 5 },
]

export function Overview() {
  const { t } = useT()
  const [autoRefresh, setAutoRefresh] = useState(false)

  const overview = useQuery({
    queryKey: ['overview'],
    queryFn: () => api<AdminOverview>('/admin/metrics/overview'),
    refetchInterval: autoRefresh ? AUTO_REFRESH_MS : false,
  })

  const series = useQuery({
    queryKey: ['timeseries'],
    queryFn: () => api<AdminTimeSeries>('/admin/metrics/timeseries'),
    refetchInterval: autoRefresh ? AUTO_REFRESH_MS : false,
  })

  const refresh = () => {
    void overview.refetch()
    void series.refetch()
  }

  if (overview.isLoading) return <LoadingState />
  if (overview.error) return <ErrorState error={overview.error} onRetry={refresh} />
  const data = overview.data
  if (!data) return <LoadingState />

  const moderationBacklog = data.moderation.openChatReports + data.moderation.openContentReports

  return (
    <>
      <RefreshBar
        title={t('navOverview')}
        generatedAt={data.generatedAt}
        cacheAgeSeconds={data.cacheAgeSeconds}
        isFetching={overview.isFetching || series.isFetching}
        onRefresh={refresh}
        autoRefresh={autoRefresh}
        onAutoRefreshChange={setAutoRefresh}
      />

      <Section title={t('sectionEngagement')}>
        <div className="grid">
          <Stat label={t('dau')} value={data.engagement.dau} />
          <Stat label={t('wau')} value={data.engagement.wau} />
          <Stat label={t('mau')} value={data.engagement.mau} />
          <Stat label={t('stickiness')} value={data.engagement.dauOverMau} format="percent" />
          <Stat
            label={t('retentionD1')}
            value={data.engagement.d1}
            format="percent"
            hint={t('rollingRetentionHint')}
          />
          <Stat label={t('retentionD7')} value={data.engagement.d7} format="percent" />
          <Stat label={t('retentionD30')} value={data.engagement.d30} format="percent" />
          <Stat label={t('neverActive')} value={data.engagement.neverActive} />
        </div>
      </Section>

      <Section title={t('chartTrends')}>
        {series.isLoading && <LoadingState />}
        {series.error && <ErrorState error={series.error} onRetry={() => void series.refetch()} />}
        {series.data && (
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
            {SERIES.map((definition) => (
              <TrendChart
                key={definition.key}
                title={t(definition.label)}
                points={series.data.series[definition.key] ?? []}
                slot={definition.slot}
              />
            ))}
          </div>
        )}
      </Section>

      <Section title={t('sectionUsers')}>
        <div className="grid">
          <Stat label={t('totalUsers')} value={data.users.total} />
          <Stat label={t('newToday')} value={data.users.newToday} />
          <Stat label={t('new7d')} value={data.users.new7d} />
          <Stat label={t('new30d')} value={data.users.new30d} />
          <Stat
            label={t('suspended')}
            value={data.users.suspended}
            tone={data.users.suspended > 0 ? 'warn' : 'default'}
          />
          <Stat label={t('verified')} value={data.users.verified} />
        </div>
      </Section>

      <Section title={t('sectionTasks')}>
        <div className="grid">
          <Stat label={t('totalTasks')} value={data.tasks.total} />
          <Stat label={t('tasksCreatedToday')} value={data.tasks.createdToday} />
          {/* Null until the completion timestamp has data — deliberately not rendered as a zero. */}
          <Stat label={t('tasksCompletedToday')} value={data.tasks.completedToday} />
          <Stat label={t('completionRate')} value={data.tasks.completionRate7d} format="percent" />
          <Stat label={t('routineCompletions')} value={data.tasks.routineCompletions7d} />
          <Stat label={t('recurringTasks')} value={data.tasks.recurring} />
          <Stat label={t('tasksWithPhotos')} value={data.tasks.withPhotos} />
          <Stat label={t('personalVsGroup')} value={`${data.tasks.personal} / ${data.tasks.group}`} />
        </div>
      </Section>

      <Section title={t('sectionChat')}>
        <div className="grid">
          <Stat label={t('chatRequestsToday')} value={data.chat.requestsToday} />
          <Stat label={t('chatRequests7d')} value={data.chat.requests7d} />
          <Stat label={t('chatUsers7d')} value={data.chat.uniqueUsers7d} />
          <Stat
            label={t('chatErrorRate')}
            value={data.chat.errorRate7d}
            format="percent"
            tone={(data.chat.errorRate7d ?? 0) > 0.05 ? 'bad' : 'good'}
          />
          <Stat label={t('chatRefusalRate')} value={data.chat.refusalRate7d} format="percent" />
          <Stat label={t('promptTokens')} value={data.chat.promptTokens7d} />
          <Stat label={t('responseTokens')} value={data.chat.responseTokens7d} />
          <Stat label={t('avgLatency')} value={data.chat.avgServerMs7d} format="duration" />
        </div>
      </Section>

      <Section title={t('sectionGroups')}>
        <div className="grid">
          <Stat label={t('totalGroups')} value={data.groups.total} />
          <Stat label={t('activeGroups')} value={data.groups.active7d} />
          <Stat label={t('avgMembers')} value={Number(data.groups.avgMembers.toFixed(1))} />
          <Stat label={t('pendingInvites')} value={data.groups.pendingInvites} />
        </div>
      </Section>

      <Section title={t('sectionModeration')}>
        <div className="grid">
          <Stat
            label={t('openChatReports')}
            value={data.moderation.openChatReports}
            tone={data.moderation.openChatReports > 0 ? 'warn' : 'good'}
          />
          <Stat
            label={t('openContentReports')}
            value={data.moderation.openContentReports}
            tone={data.moderation.openContentReports > 0 ? 'warn' : 'good'}
          />
          <Stat
            label={t('oldestOpen')}
            value={
              data.moderation.oldestOpenAgeHours === null
                ? t('none')
                : t('hoursOld', { hours: data.moderation.oldestOpenAgeHours })
            }
            // Age matters more than count for policy: a single report left for days is the problem.
            tone={moderationBacklog > 0 && (data.moderation.oldestOpenAgeHours ?? 0) > 48 ? 'bad' : 'default'}
          />
        </div>
      </Section>
    </>
  )
}
