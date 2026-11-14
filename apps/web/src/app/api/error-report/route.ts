import { NextResponse } from 'next/server';
import { z } from 'zod';

import { auth } from '@/lib/auth';

// The same base every web server route uses. `lib/api.ts` declares its own
// copy privately and exports only its bearer-fetch clients, which do a
// different job (no pass-through of the upstream status), so this stays local.
const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001';

// The browser gives up at 8s (`send-report.ts`). This route's whole answer
// (session check, token, upstream call) fits inside 7s from the request's
// start, so the browser gets this route's 504 rather than its own abort; both
// read as a transient failure, so the report is saved for the next launch.
const DEADLINE_MS = 7_000;

// A report is a chip, up to 2000 characters of note and a few short ids: far
// under this. The cap bounds what the passthrough metadata below can carry.
const MAX_BODY_BYTES = 16 * 1024;

// Statuses whose response must not carry a body.
const NULL_BODY_STATUSES = new Set([204, 205, 304]);

export const dynamic = 'force-dynamic';

const errorIdSchema = z.string().regex(/^[\w-]{1,64}$/);

// What `sendErrorReport` builds: a `bug` from an error page. The top level is
// strict and the discriminators are required, so this handler can only ever
// file an error report and never becomes a general proxy for `/v1/feedback`
// (ideas, praise, screenshots stay on their own path). `metadata` passes
// unknown keys through unchanged, so a key the client and API gain together
// is not stripped here; the body cap bounds it, and the API validates the
// body again itself.
const errorReportSchema = z.strictObject({
  category: z.literal('bug'),
  message: z.string().min(1).max(2000),
  pageUrl: z.string().max(2048),
  metadata: z
    .object({
      source: z.literal('error'),
      build: z.string().max(100),
      device: z.string().max(200),
      doing: z.string().max(1000),
      digest: errorIdSchema.optional(),
      sentryEventId: errorIdSchema.optional(),
    })
    .catchall(z.unknown()),
});

const fail = (error: string, status: number) =>
  NextResponse.json({ success: false, error }, { status });

const isTimeout = (err: unknown): boolean =>
  err instanceof DOMException &&
  (err.name === 'TimeoutError' || err.name === 'AbortError');

/**
 * POST /api/error-report: the Tell us card's send, from an error page. The
 * card posts here same-origin with `keepalive`, and this handler checks the
 * cookie session server-side and forwards to `/v1/feedback` with a token.
 *
 * Public in `proxy.ts` on purpose. Behind the middleware's `auth.protect`, a
 * lost session would 307 this POST to /sign-in, the browser's fetch would
 * follow it to a 200 HTML page, and the report would read as sent. This handler
 * answers a lost session itself, with 401 JSON, so the card can switch to the
 * signed-out layout.
 *
 * Otherwise the answer is the API's own status and body, passed through, so
 * the client can tell refused (429, other 4xx) from transient (408, 425, 5xx).
 * Except: an upstream 401 is 502 `upstream_auth` (the session was already
 * confirmed here, so the API rejecting its token is our fault, not a lost
 * session). When the API cannot be reached: 504 on the deadline, 502
 * otherwise. A body over 16KB is 413.
 */
export async function POST(request: Request) {
  const startedAt = Date.now();

  const { userId, getToken } = await auth();
  if (!userId) return fail('signed_out', 401);
  const token = await getToken();
  if (!token) return fail('signed_out', 401);

  // A cross-site form can post `text/plain` without a preflight; JSON cannot.
  const contentType = request.headers.get('content-type') ?? '';
  if (!contentType.toLowerCase().startsWith('application/json')) {
    return fail('Invalid input', 400);
  }

  const declaredLength = Number(request.headers.get('content-length'));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
    return fail('too_large', 413);
  }
  const text = await request.text();
  if (new TextEncoder().encode(text).length > MAX_BODY_BYTES) {
    return fail('too_large', 413);
  }
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return fail('Invalid input', 400);
  }
  const parsed = errorReportSchema.safeParse(raw);
  if (!parsed.success) return fail('Invalid input', 400);

  const remainingMs = DEADLINE_MS - (Date.now() - startedAt);
  if (remainingMs <= 0) {
    console.warn('[api/error-report] deadline spent before the upstream call');
    return fail('upstream_timeout', 504);
  }

  let upstream: Response;
  try {
    upstream = await fetch(`${API_URL}/v1/feedback`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(parsed.data),
      signal: AbortSignal.timeout(remainingMs),
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

  if (upstream.status === 401) {
    console.warn('[api/error-report] upstream rejected a live session token');
    return fail('upstream_auth', 502);
  }

  if (NULL_BODY_STATUSES.has(upstream.status)) {
    return new NextResponse(null, { status: upstream.status });
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
