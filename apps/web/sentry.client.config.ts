import { SENTRY_PRIVACY_OPTIONS } from '@concert-crawl/types/sentry';
import * as Sentry from '@sentry/nextjs';

import { beforeBreadcrumb, beforeSend } from './src/lib/sentry-redact';

const environment =
  process.env['NEXT_PUBLIC_SENTRY_ENVIRONMENT']?.trim() || 'local';

Sentry.init({
  dsn: process.env['NEXT_PUBLIC_SENTRY_DSN'],
  environment,
  // See apps/api/src/instrument.ts — local runs never send, so dev noise
  // cannot bury real production errors.
  enabled: environment !== 'local',
  // Errors only: no tracing, no default personal data, no stack traces on
  // messages (see the constant).
  ...SENTRY_PRIVACY_OPTIONS,
  beforeBreadcrumb,
  beforeSend,
});
