export type AdminEnvironment = 'staging' | 'production' | 'local';

/**
 * Which admin this is, from the Sentry environment each Vercel project
 * already sets (plan decision 15). Anything unrecognised reads as local, so a
 * misconfigured deploy never claims to be production.
 */
export const adminEnvironment = (
  value: string | undefined = process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT,
): AdminEnvironment => {
  if (value === 'production') return 'production';
  if (value === 'staging') return 'staging';
  return 'local';
};
