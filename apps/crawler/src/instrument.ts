import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';
config({ path: fileURLToPath(new URL('../.env.local', import.meta.url)) });

import * as Sentry from '@sentry/node';
import { SENTRY_DATA_COLLECTION } from '@concert-crawl/types';

const environment = process.env['SENTRY_ENVIRONMENT']?.trim() || 'local';

Sentry.init({
  dsn: process.env['SENTRY_DSN'],
  environment,
  // See apps/api/src/instrument.ts — local runs never send, so dev noise
  // cannot bury real production errors.
  enabled: environment !== 'local',
  // Errors only: no tracing, and no default personal data (see the constant).
  dataCollection: SENTRY_DATA_COLLECTION,
  // See apps/api/src/instrument.ts: keeps captureMessage grouping unchanged.
  attachStacktrace: false,
});
