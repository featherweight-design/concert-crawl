import { ApiError } from '@/lib/api'

// True when a failed request is an authentication problem the user can act on
// by re-signing-in: a 401 from the API, or the submissions hook's pre-flight
// "Not authenticated" throw when no Clerk token is available. Lets the history
// page surface actionable auth copy instead of the generic load error.
export function isAuthError(error: unknown): boolean {
  if (error instanceof ApiError) return error.status === 401
  return error instanceof Error && error.message === 'Not authenticated'
}
