const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001'
// Server-side only — undefined in the browser bundle (not NEXT_PUBLIC_).
// Sent as x-service-key so the API can allow Next.js SSR calls without a user token.
const SERVICE_KEY = process.env['INTERNAL_API_SECRET']

export class ApiError extends Error {
  // `code` carries the API's optional discriminator (e.g.
  // 'precondition_failed' on 409s from the admin contests resolve/defer
  // routes). Callers that want to brand-narrow the failure use this
  // instead of substring-matching `message`. Optional so legacy throw
  // sites that don't pass it stay valid.
  constructor(
    public readonly status: number,
    message: string,
    public readonly code?: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

async function request<T>(
  path: string,
  token: string | null,
  options: RequestInit = {},
): Promise<T> {
  const authHeaders: Record<string, string> = token
    ? { Authorization: `Bearer ${token}` }
    : {}
  const serviceHeaders: Record<string, string> = SERVICE_KEY
    ? { 'x-service-key': SERVICE_KEY }
    : {}

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders,
      ...serviceHeaders,
      ...options.headers,
    },
  })

  // 204 No Content — no body to parse; return undefined as T. The admin
  // mark-available endpoint uses this status; callers that care receive
  // `undefined`, callers that don't (the common case) ignore it.
  if (res.status === 204) {
    return undefined as T
  }

  // Guard against non-JSON responses (e.g. plain-text 500 from the server)
  const contentType = res.headers.get('content-type') ?? ''
  if (!contentType.includes('application/json')) {
    throw new ApiError(res.status, `Request failed with status ${res.status}`)
  }

  const body = (await res.json()) as {
    success: boolean
    data?: T
    error?: string
    // Optional discriminator used by routes that want clients to brand-
    // narrow specific failure modes (admin contests resolve/defer return
    // code: 'precondition_failed' on 409). Threaded through ApiError.code.
    code?: string
  }

  if (!res.ok || !body.success) {
    throw new ApiError(
      res.status,
      body.error ?? `Request failed with status ${res.status}`,
      body.code,
    )
  }

  return body.data as T
}

export const apiClient = {
  get: <T>(path: string, token: string) => request<T>(path, token),

  post: <T>(path: string, token: string, data: unknown) =>
    request<T>(path, token, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  patch: <T>(path: string, token: string, data: unknown) =>
    request<T>(path, token, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  put: <T>(path: string, token: string, data?: unknown) =>
    request<T>(
      path,
      token,
      data !== undefined
        ? { method: 'PUT', body: JSON.stringify(data) }
        : { method: 'PUT' },
    ),

  delete: <T>(path: string, token: string) =>
    request<T>(path, token, { method: 'DELETE' }),
}

// publicApiClient — for unauthenticated public endpoints (events, venues)
export const publicApiClient = {
  get: <T>(path: string) => request<T>(path, null),
}
