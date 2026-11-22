import { describe, it, expect } from 'vitest';

import { resolveSection } from './SettingsRouteDesktop';

describe('resolveSection', () => {
  it('honours a valid section param', () => {
    expect(resolveSection('notifications')).toBe('notifications');
  });

  it('falls back to profile for an unknown param', () => {
    expect(resolveSection('nonsense')).toBe('profile');
    expect(resolveSection(null)).toBe('profile');
  });

  it('sends a retired connections link to profile', () => {
    expect(resolveSection('connections')).toBe('profile');
  });
});
