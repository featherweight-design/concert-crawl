import type { DataCollection } from '@sentry/core';

/**
 * The one `dataCollection` block every `Sentry.init` passes (web client,
 * server and edge, the API, the crawler and the e2e smoke reporter).
 *
 * Sentry 11 replaced `sendDefaultPii` with `dataCollection`, and when the
 * option is unset it collects everything: user info, cookies, headers, HTTP
 * bodies, query strings, database query data, queue payloads, AI prompts and
 * stack-frame variables. Every switch is off here. The scrubbers
 * (`apps/web/src/lib/sentry-redact.ts`, `apps/api/src/lib/sentry-scrub.ts`)
 * are the second line, for what a captured error still carries.
 *
 * `satisfies Required<...>` fails the build when a Sentry release adds a
 * switch this block does not set. `frameContextLines` is left at its default:
 * it is the count of our own source lines shown around a stack frame, not
 * collected data.
 */
export const SENTRY_DATA_COLLECTION = Object.freeze({
  userInfo: false,
  cookies: false,
  httpHeaders: false,
  httpBodies: [],
  urlQueryParams: false,
  graphQL: { document: false, variables: false },
  genAI: { inputs: false, outputs: false },
  mcp: { inputs: false, outputs: false },
  databaseQueryData: false,
  queues: false,
  stackFrameVariables: false,
} satisfies Required<Omit<DataCollection, 'frameContextLines'>>);
