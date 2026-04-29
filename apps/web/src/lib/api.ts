const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001'

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
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

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders,
      ...options.headers,
    },
  })

  // Guard against non-JSON responses (e.g. plain-text 500 from the server)
  const contentType = res.headers.get('content-type') ?? ''
  if (!contentType.includes('application/json')) {
    throw new ApiError(res.status, `Request failed with status ${res.status}`)
  }

  const body = (await res.json()) as {
    success: boolean
    data?: T
    error?: string
  }

  if (!res.ok || !body.success) {
    throw new ApiError(
      res.status,
      body.error ?? `Request failed with status ${res.status}`,
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

  delete: <T>(path: string, token: string) =>
    request<T>(path, token, { method: 'DELETE' }),
}

// publicApiClient — for unauthenticated public endpoints (events, venues)
export const publicApiClient = {
  get: <T>(path: string) => request<T>(path, null),
}
