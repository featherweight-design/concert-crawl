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

describe('probe-throw page', () => {
  it('is a 404 in production', () => {
    vi.stubEnv('VERCEL_ENV', 'production');
    expect(() => ProbeThrowPage()).toThrow('NEXT_NOT_FOUND');
  });

  it.each(['preview', 'development', ''])(
    'throws on purpose when VERCEL_ENV is "%s"',
    (env) => {
      vi.stubEnv('VERCEL_ENV', env);
      expect(() => ProbeThrowPage()).toThrow('probe-throw: deliberate error');
    },
  );
});
