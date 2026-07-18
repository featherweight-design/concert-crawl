import { ApiError, apiClient, publicApiClient } from '@/lib/api'

type GetToken = () => Promise<string | null>

// Fetch a public read anonymously first so the service worker can cache the
// response for offline browsing when the route is truly public. When the API is
// gated behind REQUIRE_BETA_AUTH (apps/api/src/routes/events.ts) the anonymous
// request 401s; fall back to an authenticated request so the UI keeps working.
// The fallback response carries an Authorization header, so the SW won't cache
// it — acceptable, since beta-gated data isn't public anyway.
export async function fetchPublicRead<T>(
  path: string,
  getToken: GetToken,
): Promise<T> {
  try {
    return await publicApiClient.get<T>(path)
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) {
      const token = await getToken()
      if (token) return apiClient.get<T>(path, token)
    }
    throw err
  }
}
