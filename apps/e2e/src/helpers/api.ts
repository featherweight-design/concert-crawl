import { type APIRequestContext } from '@playwright/test'

const API_URL =
  process.env['PLAYWRIGHT_API_URL'] ??
  process.env['NEXT_PUBLIC_API_URL'] ??
  'http://localhost:3001'

export async function apiGet<T = unknown>(
  request: APIRequestContext,
  path: string,
): Promise<{ status: number; body: T }> {
  const response = await request.get(`${API_URL}${path}`)
  const body = (await response.json()) as T
  return { status: response.status(), body }
}

export async function healthCheck(
  request: APIRequestContext,
): Promise<boolean> {
  try {
    const { status, body } = await apiGet<{ status: string }>(
      request,
      '/v1/health',
    )
    return status === 200 && body.status === 'ok'
  } catch {
    return false
  }
}
