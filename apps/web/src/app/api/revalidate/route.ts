import { timingSafeEqual } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Only paths we actually serve from the ISR cache may be revalidated. An
// arbitrary caller-supplied path must never reach `revalidatePath` — the token
// holder is trusted, but an allowlist keeps a leaked token from being used to
// stampede regeneration across the whole app.
const REVALIDATABLE_PATHS = ['/'] as const

type RevalidatablePath = (typeof REVALIDATABLE_PATHS)[number]

// Single-path body today. Shaped as an object (not a bare string) so a
// `paths: string[]` variant can be added later without a breaking change.
// Hand-written rather than Zod: apps/web carries no Zod dependency, and one
// allowlisted string field does not justify adding one.
const readRevalidatablePath = (body: unknown): RevalidatablePath | null => {
  if (typeof body !== 'object' || body === null || !('path' in body)) {
    return null
  }
  const { path } = body
  return REVALIDATABLE_PATHS.find((allowed) => allowed === path) ?? null
}

const tokensMatch = (provided: string, expected: string): boolean => {
  const providedBuf = Buffer.from(provided, 'utf8')
  const expectedBuf = Buffer.from(expected, 'utf8')
  // timingSafeEqual throws on length mismatch, which would itself leak length.
  // Comparing the provided token against itself keeps the work constant, then
  // the length check decides the result.
  if (providedBuf.length !== expectedBuf.length) {
    timingSafeEqual(providedBuf, providedBuf)
    return false
  }
  return timingSafeEqual(providedBuf, expectedBuf)
}

export async function POST(request: NextRequest) {
  const secret = process.env['REVALIDATE_SECRET']
  // Fail closed: with no secret configured the endpoint is disabled, never open.
  if (!secret) {
    return new NextResponse(null, { status: 401 })
  }

  const token = request.headers.get('x-revalidate-token')
  if (!token || !tokensMatch(token, secret)) {
    return new NextResponse(null, { status: 401 })
  }

  let rawBody: unknown
  try {
    rawBody = await request.json()
  } catch (err) {
    console.warn('[api/revalidate] unparseable JSON body', { err })
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const path = readRevalidatablePath(rawBody)
  if (path === null) {
    return NextResponse.json(
      { error: 'Invalid body: path must be a revalidatable path' },
      { status: 400 },
    )
  }

  revalidatePath(path)

  return new NextResponse(null, { status: 204 })
}
