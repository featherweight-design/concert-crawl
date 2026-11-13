// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import '@testing-library/jest-dom';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
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

// jsdom does no hit-testing, so these pin the two classes that decide who gets
// a tap where the avatar layer rises into the banner.
describe('ProfileHero Edit button', () => {
  const zOf = (el: Element) =>
    Number(/(?:^|\s)z-(\d+)(?:\s|$)/.exec(el.className)?.[1] ?? 0);

  it('shrinks the avatar layer to its content (self-start) and stacks Edit above it', () => {
    render(
      <ProfileHero {...base} avatarColor="signal" avatarSecondColor={null} />,
    );
    const layer = screen.getByTestId('profile-avatar-layer');
    expect(layer.className).toContain('self-start');
    expect(zOf(screen.getByRole('link', { name: 'Edit' }))).toBeGreaterThan(
      zOf(layer),
    );
  });

  it.each([
    ['link', undefined],
    ['button', () => undefined],
  ] as const)('stacks the Edit %s above the avatar layer', (role, onEdit) => {
    render(
      <ProfileHero
        {...base}
        avatarColor="signal"
        avatarSecondColor={null}
        {...(onEdit ? { onEdit } : {})}
      />,
    );
    const edit = screen.getByRole(role, { name: 'Edit' });
    const layer = screen.getByTestId('profile-avatar-layer');
    expect(zOf(edit)).toBeGreaterThan(zOf(layer));
  });

  it('calls onEdit when the button is clicked', () => {
    const onEdit = vi.fn();
    render(
      <ProfileHero
        {...base}
        avatarColor="signal"
        avatarSecondColor={null}
        onEdit={onEdit}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    expect(onEdit).toHaveBeenCalledOnce();
  });

  it('links to /me/edit without an onEdit', () => {
    render(
      <ProfileHero {...base} avatarColor="signal" avatarSecondColor={null} />,
    );
    expect(screen.getByRole('link', { name: 'Edit' })).toHaveAttribute(
      'href',
      '/me/edit',
    );
  });
});
