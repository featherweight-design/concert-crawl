import type {
  UserProfileResponse,
  UserSubmissionItem,
  HandleAvailabilityResponse,
} from '@concert-crawl/types'
import type { ThemeName } from '@/theme/themes'
import { apiClient } from './api'

export async function fetchMe(
  token: string,
  // ISO timestamp for the browser-session marker (spec Decision 9). The
  // API only uses it to narrow the past-due banner predicate (per-session
  // dismissal); the trial-ended takeover and day-13 banner ignore it.
  sessionStartedAt?: string,
): Promise<UserProfileResponse> {
  const query = sessionStartedAt
    ? `?sessionStartedAt=${encodeURIComponent(sessionStartedAt)}`
    : ''
  return apiClient.get<UserProfileResponse>(`/v1/users/me${query}`, token)
}

export async function patchMe(
  token: string,
  updates: {
    handle?: string | null
    city?: string | null
    avatarColor?: 'signal' | 'accent' | 'success' | 'warning' | null
    theme?: ThemeName
  },
): Promise<void> {
  await apiClient.patch<void>('/v1/users/me', token, updates)
}

export async function fetchMySubmissions(
  token: string,
): Promise<UserSubmissionItem[]> {
  return apiClient.get<UserSubmissionItem[]>('/v1/users/me/submissions', token)
}

export async function checkHandleAvailability(
  token: string,
  handle: string,
): Promise<HandleAvailabilityResponse> {
  const encodedHandle = encodeURIComponent(handle)
  return apiClient.get<HandleAvailabilityResponse>(
    `/v1/users/handle-availability?handle=${encodedHandle}`,
    token,
  )
}

export async function deleteAccount(token: string): Promise<void> {
  await apiClient.delete<void>('/v1/users/me', token)
}
