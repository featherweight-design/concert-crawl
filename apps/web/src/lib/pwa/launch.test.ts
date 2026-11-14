// @vitest-environment jsdom

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  LAUNCH_ATTR,
  LAUNCH_DETECT,
  LAUNCH_MS,
  LAUNCH_PLAYED_KEY,
  endLaunch,
  markLaunchPlayed,
} from './launch';

afterEach(() => {
  vi.restoreAllMocks();
  window.sessionStorage.clear();
  document.documentElement.removeAttribute(LAUNCH_ATTR);
  document.documentElement.removeAttribute('style');
});

interface FakeWindow {
  matchMedia?: ((query: string) => { matches: boolean }) | undefined;
  navigator: { standalone?: boolean };
  sessionStorage: { getItem: (key: string) => string | null };
  innerWidth: number;
  innerHeight: number;
}

// Runs the head script the way the browser does: against a window, with the
// real document, so the attribute and the CSS variables land on <html>.
const detect = (over: Partial<FakeWindow> = {}) => {
  const win: FakeWindow = {
    matchMedia: (query) => ({ matches: query.includes('standalone') }),
    navigator: {},
    sessionStorage: { getItem: () => null },
    innerWidth: 390,
    innerHeight: 844,
    ...over,
  };
  new Function('window', 'document', LAUNCH_DETECT)(win, document);
};

const launching = () => document.documentElement.hasAttribute(LAUNCH_ATTR);

describe('LAUNCH_DETECT', () => {
  it('marks a cold start of the installed app, with no switch to consult', () => {
    detect();
    expect(launching()).toBe(true);
  });

  it('hands the CSS the viewport as unitless pixels', () => {
    detect({ innerWidth: 320, innerHeight: 640 });
    const style = document.documentElement.style;
    expect(style.getPropertyValue('--ll-w')).toBe('320');
    expect(style.getPropertyValue('--ll-h')).toBe('640');
  });

  it("counts the iOS home screen's navigator.standalone as installed", () => {
    detect({
      matchMedia: () => ({ matches: false }),
      navigator: { standalone: true },
    });
    expect(launching()).toBe(true);
  });

  it.each([
    ['a browser tab', { matchMedia: () => ({ matches: false }) }],
    [
      'reduced motion',
      {
        matchMedia: (query: string) => ({
          matches: query.includes('standalone') || query.includes('reduced'),
        }),
      },
    ],
    [
      'a session that has had its launch',
      { sessionStorage: { getItem: () => '1' } },
    ],
  ])('does not mark %s', (_label, override) => {
    detect(override);
    expect(launching()).toBe(false);
  });

  // The script runs before the app does, in every document: nothing it reads
  // may throw into the page.
  it.each([
    ['no matchMedia', { matchMedia: undefined }],
    [
      'blocked storage',
      {
        sessionStorage: {
          getItem: () => {
            throw new Error('blocked');
          },
        },
      },
    ],
  ])('never throws, with %s', (_label, override) => {
    expect(() => detect(override)).not.toThrow();
    expect(launching()).toBe(false);
  });

  it("only reads: the played flag is the overlay's to write", () => {
    detect();
    expect(window.sessionStorage.getItem(LAUNCH_PLAYED_KEY)).toBeNull();
  });
});

describe('markLaunchPlayed and endLaunch', () => {
  it('records the launch, and treats blocked storage as nothing to record', () => {
    markLaunchPlayed();
    expect(window.sessionStorage.getItem(LAUNCH_PLAYED_KEY)).toBe('1');
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(() => markLaunchPlayed()).not.toThrow();
  });

  it('stops the overlay showing', () => {
    document.documentElement.setAttribute(LAUNCH_ATTR, '1');
    endLaunch();
    expect(launching()).toBe(false);
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

// launch.css cannot import the timeline, so its keyframe offsets are written
// out as percentages of the total. This is what stops them drifting from the
// handoff's beats in `LAUNCH_MS`.
describe('launch.css', () => {
  const css = readFileSync(
    resolve(__dirname, '../../components/pwa/launch.css'),
    'utf8',
  );
  const pct = (ms: number) =>
    String(Number(((ms / LAUNCH_MS.total) * 100).toFixed(4)));
  const offsets = (name: string): string[] => {
    const body = new RegExp(`@keyframes ${name} \\{([\\s\\S]*?)\\n\\}`).exec(
      css,
    )?.[1];
    return [...(body ?? '').matchAll(/^ {2}([\d.]+)% \{/gm)].map((match) =>
      String(Number(match[1])),
    );
  };

  it('runs every animation over the full 1040ms', () => {
    expect(css).toContain('animation: ll-root 1040ms linear forwards');
    for (const name of ['tile', 'bloom', 'mark', 'word', 'core', 'halo']) {
      expect(css).toContain(`animation: ll-${name} 1040ms linear forwards`);
    }
    expect(LAUNCH_MS.total).toBe(1040);
  });

  it.each([
    ['ll-root', [LAUNCH_MS.shrinkStart]],
    ['ll-tile', [LAUNCH_MS.tileFadeEnd]],
    [
      'll-mark',
      [LAUNCH_MS.growStart, LAUNCH_MS.growEnd, LAUNCH_MS.shrinkStart],
    ],
    [
      'll-bloom',
      [
        LAUNCH_MS.pulseStart,
        (LAUNCH_MS.pulseStart + LAUNCH_MS.pulseEnd) / 2,
        Math.min(LAUNCH_MS.pulseEnd, LAUNCH_MS.shrinkStart),
      ],
    ],
    [
      'll-halo',
      [
        LAUNCH_MS.pulseStart,
        (LAUNCH_MS.pulseStart + LAUNCH_MS.pulseEnd) / 2,
        LAUNCH_MS.pulseEnd,
      ],
    ],
    [
      'll-word',
      [LAUNCH_MS.wordStart, LAUNCH_MS.wordEnd, LAUNCH_MS.shrinkStart],
    ],
  ])('%s keys its beats off LAUNCH_MS', (name, beats) => {
    const written = offsets(name);
    for (const beat of beats) expect(written).toContain(pct(beat));
  });

  it('keys the core off the trail landing, the blue and the pulse', () => {
    const landed = LAUNCH_MS.trailStart + LAUNCH_MS.trailStep * 7;
    const written = offsets('ll-core');
    for (const beat of [
      landed,
      landed + LAUNCH_MS.trailStep,
      LAUNCH_MS.trailEnd,
      LAUNCH_MS.coreBlueEnd,
      (LAUNCH_MS.pulseStart + LAUNCH_MS.pulseEnd) / 2,
      LAUNCH_MS.pulseEnd,
    ])
      expect(written).toContain(pct(beat));
  });

  it('lights each trail dot for two steps', () => {
    expect(css).toContain(
      `animation: ll-dot ${LAUNCH_MS.trailStep * 2}ms linear both`,
    );
  });

  it('is a straight cut under reduced motion', () => {
    expect(css).toMatch(
      /@media \(prefers-reduced-motion: reduce\) \{\s*html\[data-launch\] \.launch-loader \{\s*display: none;/,
    );
  });

  // A var() in a keyframe's animation-timing-function is dropped and the
  // segment goes linear: it cost the mark's grow its expo-out once.
  it('writes the expo-out curve out in the keyframes', () => {
    expect(css).not.toMatch(/animation-timing-function: var\(/);
    expect(
      css.match(
        /animation-timing-function: cubic-bezier\(0\.16, 1, 0\.3, 1\)/g,
      ),
    ).toHaveLength(2);
  });
});
