import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';
config({ path: fileURLToPath(new URL('../.env.local', import.meta.url)) });

import * as Sentry from '@sentry/node';
import { SENTRY_PRIVACY_OPTIONS } from '@concert-crawl/types/sentry';

const environment = process.env['SENTRY_ENVIRONMENT']?.trim() || 'local';

Sentry.init({
  dsn: process.env['SENTRY_DSN'],
  environment,
  // See apps/api/src/instrument.ts — local runs never send, so dev noise
  // cannot bury real production errors.
  enabled: environment !== 'local',
  // No tracing, no default personal data, no stack traces on messages (see
  // the constant). Sentry.logger calls still send logs.
  ...SENTRY_PRIVACY_OPTIONS,
});
