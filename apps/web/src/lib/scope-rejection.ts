import { ApiError } from '@/lib/api';

// Browse's following scope is gated server-side, and the API has three ways
// of declining it:
//
//   401 — the token itself was refused (signed out mid-session)
//   403 — the identity is fine, the plan does not carry the feature
//   404 — the feature flag is off, so the scope does not exist at all
//
// The 404 is the flag contract rather than a missing route: a flagged-off
// feature must not answer 403, because a 403 upsell advertises something
// nobody can buy yet. Treating it as unexpected throws away a page that could
// simply render unfiltered.
export const isScopeRejection = (err: unknown): err is ApiError =>
  err instanceof ApiError &&
  (err.status === 401 || err.status === 403 || err.status === 404);

// Only a refused token is dropped on the retry. Reusing it would earn a second
// 401 and lose the page; on 403 and 404 the identity is still good and the list
// still wants watch state on it.
export const scopeRetryToken = (
  err: ApiError,
  token: string | null,
): string | null => (err.status === 401 ? null : token);
