// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  LAUNCH_MS,
  isStandaloneDisplay,
  readStored,
  shouldPlayLaunch,
  writeStored,
} from './launch';

const base = {
  standalone: true,
  alreadyPlayed: false,
  reducedMotion: false,
};

afterEach(() => {
  vi.unstubAllGlobals();
  window.localStorage.clear();
  window.sessionStorage.clear();
});

describe('shouldPlayLaunch', () => {
  it('plays on a cold standalone start, with no switch to consult', () => {
    expect(shouldPlayLaunch(base)).toBe(true);
  });

  it.each([
    ['a browser tab', { standalone: false }],
    ['a later open in the same session', { alreadyPlayed: true }],
    ['reduced motion', { reducedMotion: true }],
  ])('does not play in %s', (_label, override) => {
    expect(shouldPlayLaunch({ ...base, ...override })).toBe(false);
  });
});

describe('timeline', () => {
  it('runs its beats in order and ends at 1040ms', () => {
    const order = [
      LAUNCH_MS.tileFadeEnd,
      LAUNCH_MS.growEnd,
      LAUNCH_MS.trailEnd,
      LAUNCH_MS.coreBlueEnd,
      LAUNCH_MS.pulseEnd,
      LAUNCH_MS.shrinkStart,
      LAUNCH_MS.total,
    ];
    expect([...order].sort((left, right) => left - right)).toEqual(order);
    expect(LAUNCH_MS.total).toBe(1040);
  });
});

describe('isStandaloneDisplay', () => {
  it('reads display-mode: standalone', () => {
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: query === '(display-mode: standalone)',
    }));
    expect(isStandaloneDisplay()).toBe(true);
  });

  it('falls back to the iOS navigator.standalone flag', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: false }));
    Object.defineProperty(window.navigator, 'standalone', {
      value: true,
      configurable: true,
    });
    expect(isStandaloneDisplay()).toBe(true);
    Reflect.deleteProperty(window.navigator, 'standalone');
    expect(isStandaloneDisplay()).toBe(false);
  });
});

describe('storage', () => {
  it('round-trips, and treats a throwing store as empty', () => {
    writeStored('local', 'k', '1');
    expect(readStored('local', 'k')).toBe('1');
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(readStored('local', 'k')).toBeNull();
    vi.restoreAllMocks();
  });
});
