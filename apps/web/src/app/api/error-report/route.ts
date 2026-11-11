import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { reportPage } from '@/components/consumer/error-report/lib/report-context';
import { DOING_LABELS } from '@/components/consumer/standalone-error/definitions/copy';
import { parseErrorReport } from '@/components/consumer/standalone-error/lib/parse';

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001';
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

  const raw: unknown = await request.json().catch(() => null);
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
    return NextResponse.json(
      { error: 'Upstream rejected the report' },
      { status: upstream.status },
    );
  } catch {
    return NextResponse.json(
      { error: 'Upstream unreachable' },
      { status: 502 },
    );
  }
}
