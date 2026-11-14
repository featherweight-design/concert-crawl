import { afterEach, describe, expect, it, vi } from 'vitest';

const notFound = vi.fn(() => {
  throw new Error('NEXT_NOT_FOUND');
});
vi.mock('next/navigation', () => ({ notFound }));
vi.mock('@/components/auth/flow/AuthParts', () => ({
  AuthParts: () => null,
}));

import AuthPartsPage from './page';

afterEach(() => {
  vi.unstubAllEnvs();
  notFound.mockClear();
});

describe('/sign-in/parts', () => {
  it('answers 404 in a production build, so the preview never ships', () => {
    vi.stubEnv('NODE_ENV', 'production');
    expect(() => AuthPartsPage()).toThrow('NEXT_NOT_FOUND');
    expect(notFound).toHaveBeenCalledOnce();
  });

  it('renders the parts in development', () => {
    vi.stubEnv('NODE_ENV', 'development');
    expect(() => AuthPartsPage()).not.toThrow();
    expect(notFound).not.toHaveBeenCalled();
  });
});
