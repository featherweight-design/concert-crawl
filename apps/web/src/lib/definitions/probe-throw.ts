import { adminEnvironment } from '../admin/environment';

/**
 * A page that always throws, so the root error page (`app/global-error.tsx`)
 * can be probed on a real deploy: `apps/e2e/probes/global-error-retry-theme.mjs`
 * presses Try again and Go home on it. Sentry events from it carry
 * `PROBE_THROW_TAG`, so triage can filter them out (`!probe:global-error`).
 */
export const PROBE_THROW_PATH = '/probe-throw';
export const PROBE_THROW_TAG = { key: 'probe', value: 'global-error' } as const;

/**
 * On only for staging and `next dev`; everything else, production and any
 * build with no environment set included, answers 404. Staging deploys as
 * Vercel "production", so VERCEL_ENV cannot tell it apart: the Sentry
 * environment each Vercel project sets does.
 */
export const isProbeThrowEnabled = (): boolean =>
  adminEnvironment() === 'staging' || process.env.NODE_ENV === 'development';

/**
 * True for the probe page's path, from a URL, a path, or a server transaction
 * name such as `GET /probe-throw` (query, hash and trailing slash allowed).
 */
export const isProbeThrowPath = (value: string): boolean => {
  const bare = value.replace(/^[A-Z]+ /, '');
  // beforeSend calls this on every event: a value that will not parse is not
  // the probe page, and must never throw and cost Sentry the event.
  let pathname: string;
  try {
    ({ pathname } = new URL(bare, 'http://local'));
  } catch {
    return false;
  }
  return pathname === PROBE_THROW_PATH || pathname === `${PROBE_THROW_PATH}/`;
};
