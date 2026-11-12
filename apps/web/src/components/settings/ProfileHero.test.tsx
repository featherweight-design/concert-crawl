// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { ProfileHero } from './ProfileHero';

// jsdom has no matchMedia, and ProfileHero reads the viewport through it.
beforeEach(() => {
  vi.stubGlobal('matchMedia', (query: string): MediaQueryList => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    addListener: () => undefined,
    removeListener: () => undefined,
    dispatchEvent: () => false,
  }));
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const base = {
  handle: 'hugh',
  displayRole: 'fan' as const,
  roleBadge: null,
  city: null,
  joined: 'Nov 2026',
  cred: 0,
};

const bannerImage = () =>
  (screen.getByTestId('profile-banner') as HTMLElement).style.backgroundImage;

describe('ProfileHero banner', () => {
  it('is a solid band with one avatar colour', () => {
    render(
      <ProfileHero {...base} avatarColor="signal" avatarSecondColor={null} />,
    );
    expect(screen.getByTestId('profile-banner').dataset.striped).toBe('false');
    expect(bannerImage()).not.toContain('repeating-linear-gradient');
  });

  it('is a solid band when both colours are the same', () => {
    render(
      <ProfileHero {...base} avatarColor="signal" avatarSecondColor="signal" />,
    );
    expect(screen.getByTestId('profile-banner').dataset.striped).toBe('false');
  });

  it('is striped with two different colours', () => {
    render(
      <ProfileHero {...base} avatarColor="signal" avatarSecondColor="accent" />,
    );
    expect(screen.getByTestId('profile-banner').dataset.striped).toBe('true');
    expect(bannerImage()).toContain('repeating-linear-gradient');
  });
});
