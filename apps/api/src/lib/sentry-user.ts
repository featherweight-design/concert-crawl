import * as Sentry from '@sentry/hono/node'

// Attach the Clerk user to the current request's Sentry scope. Without this,
// every event arrives with a null user id, so an authenticated request can't be
// traced back to an account — the gap that made attributing a scanner's traffic
// guesswork. The isolation scope (forked per incoming request by the Node HTTP
// integration) is used rather than the global scope so concurrent requests can't
// overwrite each other's user.
export function setSentryUser(userId: string): void {
  Sentry.getIsolationScope().setUser({ id: userId })
}
