import type { DataCollection, ResolvedDataCollection } from '@sentry/core';

/**
 * The privacy options every `Sentry.init` spreads in (web client, server and
 * edge, the API, the crawler and the e2e smoke reporter). Imported through the
 * `@concert-crawl/types/sentry` subpath so the browser bundle does not pull in
 * the whole types barrel.
 *
 * Sentry 11 replaced `sendDefaultPii` with `dataCollection`, and when the
 * option is unset it collects everything: user info, cookies, headers, HTTP
 * bodies, query strings, database query data, queue payloads, AI prompts and
 * stack-frame variables. Every switch is off here. The scrubbers
 * (`apps/web/src/lib/sentry-redact.ts`, `apps/api/src/lib/sentry-scrub.ts`)
 * are the second line, for what a captured error still carries.
 *
 * The `satisfies` clause fails the build when a Sentry release adds a switch,
 * top-level or inside the graphQL, genAI and mcp groups, that this block does
 * not set. `frameContextLines` is left at its default:
 * it is the count of our own source lines shown around a stack frame, not
 * collected data.
 *
 * `attachStacktrace: false` keeps captureMessage grouping as it was: Sentry 11
 * attaches a stack trace to every message by default, which would split
 * existing issues.
 */
const dataCollection = {
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
} satisfies Omit<ResolvedDataCollection, 'frameContextLines' | 'httpHeaders'> &
  Required<Pick<DataCollection, 'httpHeaders'>>;

function deepFreeze<T extends object>(value: T): T {
  for (const child of Object.values(value)) {
    if (child !== null && typeof child === 'object') deepFreeze(child);
  }
  return Object.freeze(value);
}

export const SENTRY_PRIVACY_OPTIONS = deepFreeze({
  dataCollection,
  attachStacktrace: false,
});
