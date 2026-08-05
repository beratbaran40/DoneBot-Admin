import type { BaseResponse } from './types'

export const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080').replace(/\/$/, '')

/** Distinguishes "your session expired" from "you may not do this" — the panel reacts differently. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly errorCode: string | null = null,
  ) {
    super(message)
  }

  get isUnauthenticated() {
    return this.status === 401
  }

  get isForbidden() {
    return this.status === 403
  }
}

/**
 * Token handling.
 *
 * The access token lives in memory only: a variable in this module, gone when the tab closes. The
 * refresh token has to survive a reload to be useful, so it sits in localStorage — a deliberate,
 * bounded trade. The exposure that creates is script injection, which is why the deployed page ships a
 * CSP with no inline scripts and no third-party origins beyond Google's sign-in, and why this panel
 * renders no user-supplied HTML anywhere.
 */
const REFRESH_KEY = 'donebot-admin.refresh'

let accessToken: string | null = null
let refreshInFlight: Promise<string> | null = null

export function setTokens(access: string, refresh: string) {
  accessToken = access
  localStorage.setItem(REFRESH_KEY, refresh)
}

export function clearTokens() {
  accessToken = null
  localStorage.removeItem(REFRESH_KEY)
}

export function hasSession() {
  return localStorage.getItem(REFRESH_KEY) !== null
}

async function parse<T>(response: Response): Promise<T> {
  const text = await response.text()
  let body: BaseResponse<T> | null = null
  if (text) {
    try {
      body = JSON.parse(text) as BaseResponse<T>
    } catch {
      body = null
    }
  }
  if (!response.ok) {
    throw new ApiError(response.status, body?.message ?? response.statusText, body?.errorCode ?? null)
  }
  if (body === null) {
    throw new ApiError(response.status, 'Malformed response')
  }
  return body.data as T
}

/**
 * Exchanges the refresh token for a new pair.
 *
 * Deduplicated through a single in-flight promise: an overview screen fires several queries at once,
 * and if the access token has expired they would otherwise all attempt a refresh. Since the backend
 * *rotates* refresh tokens — the old one is revoked the moment it is used — the second concurrent
 * attempt would present an already-revoked token and log the operator out mid-session.
 */
async function refreshSession(): Promise<string> {
  if (refreshInFlight) return refreshInFlight
  const stored = localStorage.getItem(REFRESH_KEY)
  if (!stored) throw new ApiError(401, 'No session')

  refreshInFlight = (async () => {
    const response = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: stored }),
    })
    const data = await parse<{ accessToken: string; refreshToken: string }>(response)
    setTokens(data.accessToken, data.refreshToken)
    return data.accessToken
  })()

  try {
    return await refreshInFlight
  } finally {
    refreshInFlight = null
  }
}

interface RequestOptions {
  method?: string
  body?: unknown
  /** Set once by the retry path so a failed refresh cannot loop. */
  retried?: boolean
}

export async function api<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {}
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`
  if (options.body !== undefined) headers['Content-Type'] = 'application/json'

  const response = await fetch(`${API_BASE}${path}`, {
    method: options.method ?? 'GET',
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  })

  if (response.status === 401 && !options.retried) {
    await refreshSession()
    return api<T>(path, { ...options, retried: true })
  }
  return parse<T>(response)
}

/** Raw fetch for binary payloads (the moderation photo viewer), with the same auth handling. */
export async function apiBlob(path: string, retried = false): Promise<Blob> {
  const headers: Record<string, string> = {}
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`
  const response = await fetch(`${API_BASE}${path}`, { headers })
  if (response.status === 401 && !retried) {
    await refreshSession()
    return apiBlob(path, true)
  }
  if (!response.ok) throw new ApiError(response.status, response.statusText)
  return response.blob()
}

/** Restores a usable access token on page load, when only the refresh token survived. */
export async function resumeSession(): Promise<void> {
  if (!hasSession()) throw new ApiError(401, 'No session')
  await refreshSession()
}
