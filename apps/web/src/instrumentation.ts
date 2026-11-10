import * as Sentry from '@sentry/nextjs';

// Next loads this once per server runtime. Without it the server and edge
// Sentry configs never run, so server-rendered pages, route handlers and the
// proxy report nothing. Both configs spread SENTRY_PRIVACY_OPTIONS (every
// dataCollection switch off) and the web redaction hooks.
export async function register(): Promise<void> {
  if (process.env['NEXT_RUNTIME'] === 'nodejs') {
    await import('../sentry.server.config');
  }
  if (process.env['NEXT_RUNTIME'] === 'edge') {
    await import('../sentry.edge.config');
  }
}

// Reports errors thrown while rendering or handling a request, in either
// runtime, through the config register() loaded.
export const onRequestError = Sentry.captureRequestError;
