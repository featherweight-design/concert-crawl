import { NextResponse } from 'next/server';
import { z } from 'zod';

import { auth } from '@/lib/auth';

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001';

// The browser gives up at 8s (`send-report.ts`). Giving up a little sooner
// here means the browser gets this route's 504 rather than its own abort; both
// read as a transient failure, so the report is saved for the next launch.
const UPSTREAM_TIMEOUT_MS = 7_000;

// A session cookie never reaches the error page as a bearer, and the error page
// has no Clerk hooks (`global-error` has no ClerkProvider), so the report comes
// here same-origin and this handler swaps the cookie session for a token.
export const dynamic = 'force-dynamic';

const errorIdSchema = z.string().regex(/^[\w-]{1,64}$/);

// Exactly what `sendErrorReport` builds: a `bug` from an error page. Strict, so
// this handler can only ever file an error report and never becomes a general
// proxy for `/v1/feedback` (ideas, praise, screenshots stay on their own path).
// The bounds match the API's, which still validates the body itself.
const errorReportSchema = z.strictObject({
  category: z.literal('bug'),
  message: z.string().min(1).max(2000),
  pageUrl: z.string().max(2048),
  metadata: z.strictObject({
    source: z.literal('error'),
    build: z.string().max(100),
    device: z.string().max(200),
    doing: z.string().max(1000),
    digest: errorIdSchema.optional(),
    sentryEventId: errorIdSchema.optional(),
  }),
});

const fail = (error: string, status: number) =>
  NextResponse.json({ success: false, error }, { status });

const isTimeout = (err: unknown): boolean =>
  err instanceof DOMException &&
  (err.name === 'TimeoutError' || err.name === 'AbortError');

/**
 * POST /api/error-report: the Tell us card's send, from an error page.
 *
 * Public in `proxy.ts` on purpose. Behind the middleware's `auth.protect`, a
 * lost session would 307 this POST to /sign-in, the browser's fetch would
 * follow it to a 200 HTML page, and the report would read as sent. This handler
 * answers a lost session itself, with 401 JSON, so the card can switch to the
 * signed-out layout.
 *
 * Every other answer is the API's own status and body, passed through, so the
 * client can tell refused (429, other 4xx) from transient (408, 425, 5xx).
 * When the API cannot be reached: 504 on a timeout, 502 otherwise.
 */
export async function POST(request: Request) {
  const { userId, getToken } = await auth();
  if (!userId) return fail('signed_out', 401);
  const token = await getToken();
  if (!token) return fail('signed_out', 401);

  // A cross-site form can post `text/plain` without a preflight; JSON cannot.
  const contentType = request.headers.get('content-type') ?? '';
  if (!contentType.toLowerCase().startsWith('application/json')) {
    return fail('Invalid input', 400);
  }

  const raw: unknown = await request.json().catch(() => null);
  const parsed = errorReportSchema.safeParse(raw);
  if (!parsed.success) return fail('Invalid input', 400);

  let upstream: Response;
  try {
    upstream = await fetch(`${API_URL}/v1/feedback`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(parsed.data),
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
      cache: 'no-store',
    });
  } catch (err) {
    if (isTimeout(err)) {
      console.warn('[api/error-report] upstream timed out');
      return fail('upstream_timeout', 504);
    }
    console.warn('[api/error-report] upstream unreachable', { err });
    return fail('upstream_unreachable', 502);
  }

  // The API always answers JSON; a host error page in front of it may not.
  // The status is what the client classifies on, so it passes through either
  // way.
  const body: unknown = await upstream.json().catch(() => ({
    success: upstream.ok,
    error: upstream.ok ? undefined : 'upstream_unreadable',
  }));
  const headers = new Headers();
  const retryAfter = upstream.headers.get('retry-after');
  if (retryAfter !== null) headers.set('Retry-After', retryAfter);
  return NextResponse.json(body, { status: upstream.status, headers });
}
