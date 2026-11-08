import * as Sentry from '@sentry/hono/node';
import { SENTRY_PRIVACY_OPTIONS } from '@concert-crawl/types/sentry';
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
  // Errors only: no tracing, no default personal data, no stack traces on
  // messages (see the constant).
  ...SENTRY_PRIVACY_OPTIONS,
  beforeSend: scrubEvent,
});
