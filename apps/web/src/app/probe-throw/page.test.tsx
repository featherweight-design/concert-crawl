import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND');
  },
}));

import ProbeThrowPage from './page';

afterEach(() => {
  vi.unstubAllEnvs();
});

const setEnv = (sentryEnvironment: string, nodeEnv: string) => {
  vi.stubEnv('NEXT_PUBLIC_SENTRY_ENVIRONMENT', sentryEnvironment);
  vi.stubEnv('NODE_ENV', nodeEnv);
};

describe('probe-throw page', () => {
  // Staging deploys as Vercel "production", so the gate is the Sentry
  // environment, and anything unrecognised fails closed.
  it.each([
    ['production', 'production'],
    ['', 'production'],
    ['preview-typo', 'production'],
  ])('is a 404 for environment "%s" on a %s build', (sentryEnv, nodeEnv) => {
    setEnv(sentryEnv, nodeEnv);
    expect(() => ProbeThrowPage()).toThrow('NEXT_NOT_FOUND');
  });

  it.each([
    ['staging', 'production'],
    ['', 'development'],
  ])(
    'throws on purpose for environment "%s" on a %s build',
    (sentryEnv, nodeEnv) => {
      setEnv(sentryEnv, nodeEnv);
      expect(() => ProbeThrowPage()).toThrow('probe-throw: deliberate error');
    },
  );
});
