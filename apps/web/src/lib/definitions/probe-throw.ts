/**
 * A page that always throws, so the root error page (`app/global-error.tsx`)
 * can be probed on a real deploy: `apps/e2e/probes/global-error-retry-theme.mjs`
 * presses Try again and Go home on it. Outside production only; production
 * answers 404. Sentry events from it carry `PROBE_THROW_TAG`, so triage skips
 * them.
 */
export const PROBE_THROW_PATH = '/probe-throw';
export const PROBE_THROW_TAG = { key: 'probe', value: 'global-error' } as const;

/** True for a path on the probe page (query, hash and trailing slash allowed). */
export const isProbeThrowPath = (value: string): boolean => {
  const path = value.replace(/^[a-z]+:\/\/[^/]+/i, '').split(/[?#]/)[0] ?? '';
  return path === PROBE_THROW_PATH || path === `${PROBE_THROW_PATH}/`;
};
