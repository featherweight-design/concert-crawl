const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001'
// Server-side only — undefined in the browser bundle (not NEXT_PUBLIC_).
// Sent as x-service-key so the API can allow Next.js SSR calls without a user token.
const SERVICE_KEY = process.env['INTERNAL_API_SECRET']

export interface ZodIssue {
  path: (string | number)[]
  message: string
}

export class ApiError extends Error {
  // `code` carries the API's optional discriminator (e.g.
  // 'precondition_failed' on 409s from the admin contests resolve/defer
  // routes). Callers that want to brand-narrow the failure use this
  // instead of substring-matching `message`. Optional so legacy throw
  // sites that don't pass it stay valid.
  //
  // `zodIssues` carries the flattened issue list when a 400 comes from
  // Hono's zValidator (body shape: { success: false, error: { issues: [...] } }).
  // Callers that need field-level errors (e.g. mapping a cross-field
  // refine to a specific form input) read this instead of the message.
  constructor(
    public readonly status: number,
    message: string,
    public readonly code?: string,
    public readonly zodIssues?: ZodIssue[],
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

// Narrow the zValidator 400 body's `error` field to a Zod issue list.
// zValidator serializes a ZodError as { issues: [{ path, message, ... }] };
// anything else (a plain string error from an app route) yields undefined.
function parseZodIssues(error: unknown): ZodIssue[] | undefined {
  if (typeof error !== 'object' || error === null || !('issues' in error)) {
    return undefined
  }
  const { issues } = error as { issues: unknown }
  if (!Array.isArray(issues)) return undefined
  const parsed = issues.filter(
    (issue): issue is ZodIssue =>
      typeof issue === 'object' &&
      issue !== null &&
      Array.isArray((issue as { path?: unknown }).path) &&
      typeof (issue as { message?: unknown }).message === 'string',
  )
  return parsed.length > 0 ? parsed : undefined
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
    // App routes return a string message; Hono's zValidator returns a
    // serialized ZodError object ({ issues: [...] }) on 400. Handle both.
    error?: string | { issues?: unknown }
    // Optional discriminator used by routes that want clients to brand-
    // narrow specific failure modes (admin contests resolve/defer return
    // code: 'precondition_failed' on 409). Threaded through ApiError.code.
    code?: string
  }

  if (!res.ok || !body.success) {
    const zodIssues = parseZodIssues(body.error)
    const message =
      typeof body.error === 'string'
        ? body.error
        : `Request failed with status ${res.status}`
    throw new ApiError(res.status, message, body.code, zodIssues)
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
