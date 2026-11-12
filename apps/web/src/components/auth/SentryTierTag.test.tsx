// @vitest-environment jsdom

import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const setTag = vi.fn();
vi.mock('@sentry/nextjs', () => ({ setTag }));
const useAuth = vi.fn();
vi.mock('@clerk/nextjs', () => ({ useAuth: () => useAuth() }));

const { SentryTierTag } = await import('./SentryTierTag');

describe('SentryTierTag', () => {
  beforeEach(() => setTag.mockClear());

  it('tags the plan from the session claim', () => {
    useAuth.mockReturnValue({
      isLoaded: true,
      isSignedIn: true,
      sessionClaims: { metadata: { plan: 'supporter' } },
    });
    render(<SentryTierTag />);
    expect(setTag).toHaveBeenCalledWith('tier', 'supporter');
  });

  it('tags unknown for a visitor and for a claim without a plan', () => {
    useAuth.mockReturnValue({
      isLoaded: true,
      isSignedIn: false,
      sessionClaims: undefined,
    });
    render(<SentryTierTag />);
    expect(setTag).toHaveBeenLastCalledWith('tier', 'unknown');

    useAuth.mockReturnValue({
      isLoaded: true,
      isSignedIn: true,
      sessionClaims: {},
    });
    render(<SentryTierTag />);
    expect(setTag).toHaveBeenLastCalledWith('tier', 'unknown');
  });

  it('writes nothing before Clerk has loaded, and resets on unmount', () => {
    useAuth.mockReturnValue({ isLoaded: false });
    render(<SentryTierTag />).unmount();
    expect(setTag).not.toHaveBeenCalled();

    useAuth.mockReturnValue({
      isLoaded: true,
      isSignedIn: true,
      sessionClaims: { metadata: { plan: 'supporter' } },
    });
    render(<SentryTierTag />).unmount();
    expect(setTag).toHaveBeenLastCalledWith('tier', 'unknown');
  });
});
