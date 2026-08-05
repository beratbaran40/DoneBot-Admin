/** Mirrors com.todoapp.backend.common.BaseResponse. Every endpoint answers in this envelope. */
export interface BaseResponse<T> {
  code: number
  message: string
  data: T | null
  errorCode: string | null
}

export interface AdminMe {
  id: number
  email: string
  displayName: string
  role: string
  serverTime: string
  zone: string
}

export interface UsersBlock {
  total: number
  newToday: number
  new7d: number
  new30d: number
  suspended: number
  verified: number
  byProvider: Record<string, number>
}

export interface EngagementBlock {
  dau: number
  wau: number
  mau: number
  dauOverMau: number | null
  d1: number | null
  d7: number | null
  d30: number | null
  neverActive: number
}

export interface TasksBlock {
  total: number
  personal: number
  group: number
  createdToday: number
  created7d: number
  /** Null until tasks.completed_at has data — "unknown" and "zero" must not render the same. */
  completedToday: number | null
  completionRate7d: number | null
  routineCompletions7d: number
  recurring: number
  withPhotos: number
  byCategory: Record<string, number>
}

export interface GroupsBlock {
  total: number
  active7d: number
  avgMembers: number
  pendingInvites: number
}

export interface ChatBlock {
  requestsToday: number
  requests7d: number
  uniqueUsers7d: number
  errorRate7d: number | null
  refusalRate7d: number | null
  promptTokens7d: number
  responseTokens7d: number
  avgServerMs7d: number | null
}

export interface ModerationBlock {
  openChatReports: number
  openContentReports: number
  oldestOpenAgeHours: number | null
}

export interface AdminOverview {
  generatedAt: string
  zone: string
  cacheAgeSeconds: number
  users: UsersBlock
  engagement: EngagementBlock
  tasks: TasksBlock
  groups: GroupsBlock
  chat: ChatBlock
  moderation: ModerationBlock
}

export interface SeriesPoint {
  date: string
  value: number
}

export interface AdminTimeSeries {
  from: string
  to: string
  zone: string
  series: Record<string, SeriesPoint[]>
}

export interface AdminUserListItem {
  id: number
  email: string
  displayName: string
  role: string
  status: string
  providers: string[]
  emailVerified: boolean
  createdAt: string
  lastActiveAt: string | null
  taskCount: number
  groupCount: number
}

export interface AdminUserPage {
  items: AdminUserListItem[]
  page: number
  size: number
  total: number
}

export interface AdminUserCounts {
  tasksTotal: number
  tasksPersonal: number
  tasksGroup: number
  tasksCompleted: number
  tasksSecret: number
  routineCompletions: number
  photos: number
  notificationsUnread: number
}

export interface AdminUserGroup {
  groupId: number
  name: string
  role: string
  isOwner: boolean
  memberCount: number
  joinedAt: string | null
}

export interface AdminUserDevice {
  id: number
  deviceName: string | null
  deviceId: string | null
  tokenSuffix: string
  createdAt: string | null
  updatedAt: string | null
}

export interface AdminUserChatUsage {
  requests: number
  refusals: number
  errors: number
  promptTokens: number
  responseTokens: number
}

export interface AdminUserDetail {
  id: number
  email: string
  displayName: string
  role: string
  status: string
  suspendedAt: string | null
  suspendedReason: string | null
  emailVerified: boolean
  providers: string[]
  avatarUrl: string | null
  createdAt: string
  lastActiveAt: string | null
  activeDaysLast30: number
  activitySparkline: number[]
  counts: AdminUserCounts
  groups: AdminUserGroup[]
  devices: AdminUserDevice[]
  chatUsage30d: AdminUserChatUsage
  reportsFiled: number
  reportsAgainst: number
  sessions: { activeRefreshTokens: number; lastRefreshAt: string | null }
}

export interface AdminReportItem {
  id: number
  type: 'chat' | 'content'
  status: string
  createdAt: string
  ageHours: number
  reason: string | null
  reporterUserId: number
  reporterEmail: string | null
  messageContent: string | null
  groupId: number | null
  targetType: string | null
  targetUserId: number | null
  hasViewablePhoto: boolean
  resolution: string | null
  resolutionNote: string | null
  resolvedAt: string | null
}

export interface AdminReportPage {
  items: AdminReportItem[]
  page: number
  size: number
  total: number
}

export interface AdminOpsHealth {
  uptimeSeconds: number
  dbUp: boolean
  dbLatencyMs: number
  serverTime: string
  zone: string
  recentErrorCount: number
  serverErrors24h: number | null
  flags: Record<string, string>
}

export interface AdminChatUsage {
  zone: string
  days: { date: string; requests: number }[]
  requests: number
  refusals: number
  errors: number
  promptTokens: number
  responseTokens: number
  uniqueUsers: number
  globalDailyUsed: number
  globalDailyLimit: number
}

export interface AdminOpsConfig {
  vertexConfigured: boolean
  mailConfigured: boolean
  firebaseConfigured: boolean
  googleOAuthConfigured: boolean
  flags: Record<string, string>
}

export interface RecentError {
  at: string
  level: string
  logger: string
  message: string
  requestId: string | null
  exception: string | null
}

export interface AuditEntry {
  id: number
  actorUserId: number
  actorEmail: string
  action: string
  targetType: string | null
  targetId: string | null
  detail: string | null
  requestId: string | null
  ip: string | null
  createdAt: string
}

export interface AuthResponse {
  accessToken: string
  refreshToken: string
  expiresIn: number
  user: { id: number; email: string; displayName: string }
}
