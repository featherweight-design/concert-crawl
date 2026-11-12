import { SENTRY_PRIVACY_OPTIONS } from '@concert-crawl/types/sentry';
import { SENTRY_INITIAL_SCOPE } from '@concert-crawl/types/sentry-tags';
import * as Sentry from '@sentry/nextjs';

import { beforeBreadcrumb, beforeSend } from './src/lib/sentry-redact';

const environment = process.env['SENTRY_ENVIRONMENT']?.trim() || 'local';

Sentry.init({
  dsn: process.env['SENTRY_DSN'],
  environment,
  // The deployed commit; blank (local, a build without it) leaves it unset.
  release: process.env['VERCEL_GIT_COMMIT_SHA'] || undefined,
  initialScope: SENTRY_INITIAL_SCOPE,
  // See apps/api/src/instrument.ts — local runs never send, so dev noise
  // cannot bury real production errors.
  enabled: environment !== 'local',
  // No tracing, no default personal data, no stack traces on messages (see
  // the constant). Sentry.logger calls still send logs.
  ...SENTRY_PRIVACY_OPTIONS,
  beforeBreadcrumb,
  beforeSend,
});
