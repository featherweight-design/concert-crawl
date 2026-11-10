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
// runtime, through the config register() loaded. The error's digest (the id
// the visitor's error page shows, and a problem report carries) is tagged on
// the event, so a report filed from that page can be searched straight to it.
export const onRequestError: typeof Sentry.captureRequestError = (
  error,
  request,
  context,
) => {
  const digest =
    typeof error === 'object' && error !== null && 'digest' in error
      ? error.digest
      : undefined;
  Sentry.withScope((scope) => {
    if (typeof digest === 'string') scope.setTag('digest', digest);
    Sentry.captureRequestError(error, request, context);
  });
};
