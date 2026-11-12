// @vitest-environment jsdom

import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { Avatar } from './Avatar';

afterEach(cleanup);

describe('Avatar edge', () => {
  it('keeps the tint edge by default', () => {
    const { container } = render(
      <Avatar handle="hugh" avatarColor="accent" size={36} />,
    );
    expect(container.firstElementChild?.getAttribute('data-avatar-edge')).toBe(
      'tint',
    );
  });

  it('draws the solid edge the header disc asks for', () => {
    const { container } = render(
      <Avatar handle="hugh" avatarColor="accent" size={36} edge="solid" />,
    );
    expect(container.firstElementChild?.getAttribute('data-avatar-edge')).toBe(
      'solid',
    );
  });

  it('marks the loading disc busy, with no initial', () => {
    const { container } = render(
      <Avatar handle={null} avatarColor={null} size={36} loading />,
    );
    const disc = container.firstElementChild;
    expect(disc?.getAttribute('aria-busy')).toBe('true');
    expect(disc?.getAttribute('data-avatar-state')).toBe('loading');
    expect(disc?.textContent).toBe('');
  });
});
