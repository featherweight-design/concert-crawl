import * as Sentry from '@sentry/hono/node';
import { SENTRY_DATA_COLLECTION } from '@concert-crawl/types';
import { scrubEvent } from './lib/sentry-scrub.js';

// `||` rather than `??`: a variable that exists but is blank must still read
// as local, or the gate below would send from an unnamed environment.
const environment = process.env['SENTRY_ENVIRONMENT']?.trim() || 'local';

Sentry.init({
  dsn: process.env['SENTRY_DSN'],
  environment,
  // Dev machines and agent worktrees produced 86 of 89 error events over a
  // two-week window — unrun migrations, port clashes, half-built packages —
  // none of which say anything about deployed health. Reporting them buries
  // real production errors and burns quota, so local never sends.
  enabled: environment !== 'local',
  // Errors only: no tracing, and no default personal data (see the constant).
  dataCollection: SENTRY_DATA_COLLECTION,
  // Keep captureMessage grouping as it was: Sentry 11 attaches a stack trace
  // to every message by default, which would split existing issues.
  attachStacktrace: false,
  beforeSend: scrubEvent,
});
