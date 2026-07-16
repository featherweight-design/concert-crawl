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
// Pure runtime type-guards (Record<string, unknown> index access) — no casts.
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isZodIssue(value: unknown): value is ZodIssue {
  if (!isRecord(value)) return false
  const { path, message } = value
  return (
    Array.isArray(path) &&
    path.every(
      (segment) => typeof segment === 'string' || typeof segment === 'number',
    ) &&
    typeof message === 'string'
  )
}

function parseZodIssues(error: unknown): ZodIssue[] | undefined {
  if (!isRecord(error)) return undefined
  const { issues } = error
  if (!Array.isArray(issues)) return undefined
  const parsed = issues.filter(isZodIssue)
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

  // Parse as `unknown` and narrow with the runtime guard rather than casting
  // to a shape TypeScript can't verify. `error` is a string from app routes or
  // a serialized ZodError ({ issues: [...] }) from Hono's zValidator on 400;
  // `code` is an optional discriminator some routes send so clients can brand-
  // narrow failure modes (e.g. contests resolve/defer 'precondition_failed').
  const body: unknown = await res.json()
  const record = isRecord(body) ? body : {}
  const success = record['success'] === true
  const errorField = record['error']
  const codeField =
    typeof record['code'] === 'string' ? record['code'] : undefined

  if (!res.ok || !success) {
    const zodIssues = parseZodIssues(errorField)
    // When `error` is a zValidator ZodError object rather than a string, fall
    // back to the first issue's message so callers that surface `message`
    // directly still see the real validation reason instead of a generic code.
    const message =
      typeof errorField === 'string'
        ? errorField
        : (zodIssues?.[0]?.message ??
          `Request failed with status ${res.status}`)
    throw new ApiError(res.status, message, codeField, zodIssues)
  }

  // The success payload's shape is the caller's generic T; the API client
  // can't statically verify it, so this is the one unavoidable boundary cast.
  return record['data'] as T
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
