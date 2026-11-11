import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { reportPage } from '@/components/consumer/error-report/lib/report-context';
import { DOING_LABELS } from '@/components/consumer/standalone-error/definitions/copy';
import { parseErrorReport } from '@/components/consumer/standalone-error/lib/parse';

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001';
// Well inside the page's own 12s timeout, so the page hears this handler's
// answer rather than aborting while the upstream is still deciding.
const UPSTREAM_TIMEOUT_MS = 7000;

/**
 * The error page's report, same-origin so it needs nothing from the app that
 * just failed: the session is checked here from Clerk's cookie, and the
 * report is filed as an ordinary bug in admin feedback, carrying the error id
 * the team finds the matching Sentry event by. Public in the middleware so a
 * missing session is this handler's 401, not a redirect a fetch would follow.
 */
export async function POST(request: Request) {
  const { getToken } = await auth();
  const token = await getToken();
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let raw: unknown = null;
  try {
    raw = await request.json();
  } catch (err) {
    console.warn('[api/error-report] unparseable JSON body', { err });
  }
  const report = parseErrorReport(raw);
  if (report === null) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 422 });
  }

  const { errorId, doing, note, page, device } = report;
  const doingLabel = doing === undefined ? undefined : DOING_LABELS[doing];
  // The parser guarantees a note or a chip, and the note is trimmed.
  const message = note ?? doingLabel;
  if (message === undefined) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 422 });
  }

  try {
    const upstream = await fetch(`${API_URL}/v1/feedback`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        // The API dedupes on metadata.errorId; the header says so too.
        'Idempotency-Key': `error-report:${errorId}`,
      },
      body: JSON.stringify({
        category: 'bug',
        message,
        pageUrl: reportPage(page),
        metadata: {
          source: 'error',
          errorId,
          device,
          build: process.env['NEXT_PUBLIC_APP_VERSION'] ?? 'dev',
          ...(doingLabel === undefined ? {} : { doing: doingLabel }),
        },
      }),
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
    if (upstream.ok) {
      return NextResponse.json({ ok: true }, { status: 201 });
    }
    console.error('[api/error-report] upstream refused the report', {
      status: upstream.status,
      errorId,
    });
    // Only this handler's own missing session is a 401: that is what tells
    // the page to drop to its signed-out layout. An upstream 401 means the
    // token we forwarded was refused, which is our fault, not the reader's.
    return NextResponse.json(
      { error: 'Upstream rejected the report' },
      { status: upstream.status === 401 ? 502 : upstream.status },
    );
  } catch (err) {
    console.error('[api/error-report] upstream unreachable', { err, errorId });
    return NextResponse.json(
      { error: 'Upstream unreachable' },
      { status: 502 },
    );
  }
}
