// @vitest-environment jsdom

import type {
  ArtistDetailResponse,
  ArtistShow,
  PlanState,
} from '@concert-crawl/types';
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type * as EntitlementsModule from '@concert-crawl/entitlements';

import { ArtistPageContent } from './ArtistPageContent';
import {
  AP_STICKY_AFTER,
  AP_STICKY_BAR_H,
  CRAWL_SINCE,
} from './definitions/constants';
import { REPORTING_COPY } from '@/components/consumer/reporting/definitions/copy';

import { ARTIST_COPY } from './definitions/copy';

// The mobile hero renders BackChip, which reaches for the app router.
vi.mock('next/navigation', () => ({
  useRouter: () => ({ back: vi.fn(), push: vi.fn() }),
  usePathname: () => '/artists/neal-francis',
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('@/components/consumer/tier-picker/TierPickerSheet', () => ({
  TierPickerSheet: () => null,
}));

// The page and the report card each mount a picker; only an open one draws,
// carrying its entry so a test can tell which hand-off opened it.
vi.mock('@/components/consumer/tier-picker/lazy', () => ({
  TierPickerSheet: ({ open, entry }: { open: boolean; entry: string }) =>
    open ? <div data-testid="tier-picker" data-entry={entry} /> : null,
}));

const { plan } = vi.hoisted(
  (): { plan: { current: PlanState | undefined } } => ({
    plan: { current: undefined },
  }),
);

vi.mock('@/lib/queries/use-plan-state', () => ({
  usePlanState: () => ({ data: plan.current }),
}));

// Going free (2026-10-29) left no signed-in plan the matrix denies following,
// so the locked skin is driven by re-gating chosen tiers in nfLocked. It is
// kept for a future re-gate; roleComped still wins, as it does in the matrix.
const regate = vi.hoisted(() => ({ plans: new Set<string>() }));
vi.mock('@concert-crawl/entitlements', async (importOriginal) => {
  const actual = await importOriginal<typeof EntitlementsModule>();
  return {
    ...actual,
    nfLocked: (state: Parameters<typeof actual.nfLocked>[0]) =>
      regate.plans.has(state.plan) ? !state.roleComped : actual.nfLocked(state),
  };
});

const planOn = (tier: PlanState['plan'], roleComped = false): PlanState => ({
  plan: tier,
  onTrial: false,
  trialEndsAt: null,
  status: null,
  cancelAtPeriodEnd: false,
  currentPeriodEnd: null,
  roleComped,
});

vi.mock('@/components/consumer/watch-show-button/WatchShowButton', () => ({
  WatchShowButton: () => <button data-testid="watch-stub" type="button" />,
}));

// The player asks the provider which plate colour to hand Spotify.
vi.mock('@/theme', () => ({
  useTheme: () => ({ theme: 'electric', setTheme: () => undefined }),
}));

vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({ getToken: async () => 'token', isSignedIn: true }),
}));

const base: ArtistDetailResponse = {
  artist: {
    name: 'Neal Francis',
    slug: 'neal-francis',
    spotifyArtistId: null,
    photoUrl: null,
  },
  shows: [],
  past: [],
  history: { count: 0, venues: [] },
  following: null,
  myOpenReport: null,
  match: null,
};

const show = (iso: string, venue: string): ArtistShow => ({
  eventId: `${venue}-${iso}`,
  iso,
  showTime: null,
  venue,
  venueSlug: venue.toLowerCase().replace(/\s+/g, '-'),
  city: 'Denver',
  price: null,
  tourName: null,
  genres: [],
  imageUrl: null,
  status: 'upcoming',
});

const withShows: ArtistDetailResponse = {
  ...base,
  shows: [show('2026-09-12', 'Hi Dive'), show('2026-10-01', 'Bluebird')],
};

const withPast: ArtistDetailResponse = {
  ...base,
  past: [
    {
      eventId: 'evt_1',
      iso: '2026-05-04',
      venue: 'Larimer Lounge',
      venueSlug: 'larimer-lounge',
      city: 'Denver',
      attending: null,
    },
  ],
  history: { count: 1, venues: ['Larimer Lounge'] },
};

/** jsdom ships no matchMedia; this is the only viewport switch on the page. */
const setViewport = (desktop: boolean) => {
  window.matchMedia = (query: string) => ({
    matches: desktop,
    media: query,
    onchange: null,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    addListener: () => undefined,
    removeListener: () => undefined,
    dispatchEvent: () => false,
  });
};

const scrollTo = (position: number) => {
  act(() => {
    window.scrollY = position;
    fireEvent.scroll(window);
  });
};

/** Every accessible name a follow control can carry, in any state. */
const followNames = (name: string) => [
  ARTIST_COPY.followAria(name),
  ARTIST_COPY.followingAria(name),
  ARTIST_COPY.followSignedOutAria(name),
];

const countFollows = (container: HTMLElement, name: string) =>
  Array.from(container.querySelectorAll('button')).filter((button) =>
    followNames(name).includes(button.getAttribute('aria-label') ?? ''),
  ).length;

beforeEach(() => {
  setViewport(false);
  window.scrollY = 0;
  plan.current = undefined;
  regate.plans.clear();
});

afterEach(cleanup);

describe('ArtistPageContent', () => {
  // The wrapper carries the block's top margin, so rendering it around a
  // PastShows that returned null leaves a visible gap under the last row.
  it('omits the past-shows wrapper entirely when there are no past shows', () => {
    const { container } = render(<ArtistPageContent data={base} />);
    expect(container.querySelector('.ap-block-past')).toBeNull();
  });

  it('renders the past-shows wrapper when there are past shows', () => {
    const { container } = render(<ArtistPageContent data={withPast} />);
    expect(container.querySelector('.ap-block-past')).not.toBeNull();
  });

  // The handoff is explicit: enforce this in code, not by convention.
  describe('exactly one live follow affordance', () => {
    // Addendum 2, item 27: Follow stays under the hero and is not sticky.
    it('(a) mobile, has shows, scrolled — the block under the stage keeps it', () => {
      const { container } = render(<ArtistPageContent data={withShows} />);
      expect(countFollows(container, 'Neal Francis')).toBe(1);

      scrollTo(AP_STICKY_AFTER + 10);
      const bar = container.querySelector('[data-sticky-bar]');
      expect(bar).not.toBeNull();
      expect(countFollows(bar as HTMLElement, 'Neal Francis')).toBe(0);
      expect(countFollows(container, 'Neal Francis')).toBe(1);
      const block = container.querySelector('.ap-block-follow');
      expect(countFollows(block as HTMLElement, 'Neal Francis')).toBe(1);
    });

    it('(b) mobile, no shows — the block under the stage owns it', () => {
      const { container } = render(<ArtistPageContent data={base} />);
      expect(countFollows(container, 'Neal Francis')).toBe(1);
      const block = container.querySelector('.ap-block-follow');
      expect(countFollows(block as HTMLElement, 'Neal Francis')).toBe(1);
      // The empty block is copy only now: the follow already sits above it.
      const empty = container.querySelector('[data-empty-upcoming]');
      expect(countFollows(empty as HTMLElement, 'Neal Francis')).toBe(0);

      scrollTo(AP_STICKY_AFTER + 10);
      expect(countFollows(container, 'Neal Francis')).toBe(1);
    });

    it('(c) desktop, has shows — the stage owns it, no sub-header', () => {
      setViewport(true);
      const { container } = render(<ArtistPageContent data={withShows} />);
      expect(countFollows(container, 'Neal Francis')).toBe(1);
      const stage = container.querySelector('[data-testid="hero-band"]');
      expect(countFollows(stage as HTMLElement, 'Neal Francis')).toBe(1);

      scrollTo(AP_STICKY_AFTER + 400);
      expect(container.querySelector('[data-sticky-bar]')).toBeNull();
      expect(countFollows(container, 'Neal Francis')).toBe(1);
    });

    it('(d) desktop, no shows — the stage owns it and the empty block stays copy only', () => {
      setViewport(true);
      const { container } = render(<ArtistPageContent data={base} />);
      expect(countFollows(container, 'Neal Francis')).toBe(1);
      const stage = container.querySelector('[data-testid="hero-band"]');
      expect(countFollows(stage as HTMLElement, 'Neal Francis')).toBe(1);
      const empty = container.querySelector('[data-empty-upcoming]');
      expect(countFollows(empty as HTMLElement, 'Neal Francis')).toBe(0);
    });
  });

  // The stage's height follows the card and the name's wrap, so a fixed
  // assumption brings the bar up over a stage still on screen.
  it('times the sticky bar off the measured band, not a fixed height', () => {
    const TALL = 620;
    const observers: (() => void)[] = [];
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(private readonly cb: () => void) {}
        observe() {
          observers.push(this.cb);
        }
        disconnect() {}
        unobserve() {}
      },
    );
    const height = vi
      .spyOn(HTMLElement.prototype, 'offsetHeight', 'get')
      .mockReturnValue(TALL);

    const { container } = render(<ArtistPageContent data={withShows} />);
    expect(observers.length).toBeGreaterThan(0);

    // Past the old constant, but the band is still on screen.
    scrollTo(AP_STICKY_AFTER + 10);
    expect(container.querySelector('[data-sticky-bar]')).toBeNull();

    scrollTo(TALL - AP_STICKY_BAR_H + 10);
    expect(container.querySelector('[data-sticky-bar]')).not.toBeNull();

    height.mockRestore();
    vi.unstubAllGlobals();
  });

  it('never hands the sticky bar the follow, with or without shows', () => {
    const { container, rerender } = render(
      <ArtistPageContent data={withShows} />,
    );
    scrollTo(AP_STICKY_AFTER + 10);
    let bar = container.querySelector('[data-sticky-bar]');
    expect(bar).not.toBeNull();
    expect(countFollows(bar as HTMLElement, 'Neal Francis')).toBe(0);

    rerender(<ArtistPageContent data={base} />);
    bar = container.querySelector('[data-sticky-bar]');
    expect(bar).not.toBeNull();
    expect(countFollows(bar as HTMLElement, 'Neal Francis')).toBe(0);
    const block = container.querySelector('.ap-block-follow');
    expect(countFollows(block as HTMLElement, 'Neal Francis')).toBe(1);
  });

  // Regression for Hugh's staging bug on main: scrolling past the hero hid the
  // Follow block, the page got shorter, and at the bottom the shorter page
  // pulled the scroll back above the threshold, so the sub-header toggled and
  // the heading jittered. Addendum 2 item 27 removed the cause (Follow is not
  // scroll-driven); this pins it. Every listener the page could use is driven:
  // window scroll and any IntersectionObserver it registers.
  it('scrolling past the hero never changes the in-flow layout', () => {
    class FakeIntersectionObserver implements IntersectionObserver {
      static instances: FakeIntersectionObserver[] = [];
      readonly root = null;
      readonly rootMargin = '0px';
      readonly thresholds: readonly number[] = [0];
      readonly targets: Element[] = [];
      constructor(readonly callback: IntersectionObserverCallback) {
        FakeIntersectionObserver.instances.push(this);
      }
      observe(target: Element) {
        this.targets.push(target);
      }
      unobserve() {}
      disconnect() {}
      takeRecords(): IntersectionObserverEntry[] {
        return [];
      }
      /** Report every observed target as off screen, as past the hero. */
      leave() {
        const rect: DOMRectReadOnly = {
          x: 0,
          y: -600,
          top: -600,
          left: 0,
          width: 320,
          height: 440,
          right: 320,
          bottom: -160,
          toJSON: () => ({}),
        };
        this.callback(
          this.targets.map((target) => ({
            target,
            isIntersecting: false,
            intersectionRatio: 0,
            boundingClientRect: rect,
            intersectionRect: rect,
            rootBounds: null,
            time: 0,
          })),
          this,
        );
      }
    }
    vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver);

    try {
      const { container } = render(<ArtistPageContent data={withShows} />);
      const main = container.querySelector('main');
      expect(main).not.toBeNull();

      // Everything in flow: the page minus the fixed sub-header. Identical
      // markup and styles means an identical document height.
      const inFlow = () =>
        Array.from(main?.children ?? [])
          .filter((child) => !child.hasAttribute('data-sticky-bar'))
          .map((child) => child.outerHTML)
          .join('');
      const before = inFlow();
      const mainStyle = main?.getAttribute('style') ?? '';
      const mainClass = main?.className;

      const settle = (position: number) => {
        scrollTo(position);
        act(() => {
          for (const observer of FakeIntersectionObserver.instances) {
            observer.leave();
          }
        });
      };

      // Past the hero, then jitter around the threshold at the page bottom.
      for (const position of [
        AP_STICKY_AFTER + 10,
        AP_STICKY_AFTER + 2000,
        AP_STICKY_AFTER + 1999,
        AP_STICKY_AFTER + 2000,
      ]) {
        settle(position);

        // Follow is still rendered, once, in its block under the hero.
        const block = container.querySelector<HTMLElement>(
          '.ap-shell > .ap-block-follow',
        );
        if (!block) throw new Error('the Follow block left the page');
        expect(countFollows(block, 'Neal Francis')).toBe(1);
        expect(countFollows(container, 'Neal Francis')).toBe(1);

        // The in-flow page is untouched, so its height cannot move.
        expect(inFlow()).toBe(before);
        expect(main?.getAttribute('style') ?? '').toBe(mainStyle);
        expect(main?.className).toBe(mainClass);

        // The sub-header is the only change, and it is out of flow.
        const bar = container.querySelector<HTMLElement>('[data-sticky-bar]');
        expect(bar).not.toBeNull();
        expect(bar?.style.position).toBe('fixed');
      }

      // Nothing on the document itself toggles either.
      expect(document.documentElement.getAttribute('style')).toBeNull();
      expect(document.body.getAttribute('style')).toBeNull();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  // B+ `09-artist` reads Upcoming first, then the player. Desktop lifts the
  // player into a side column with CSS only, so the tab order stays this one.
  it('walks back → follow → rows → skip player → iframe → report', () => {
    const data: ArtistDetailResponse = {
      ...withShows,
      following: false,
      artist: { ...base.artist, spotifyArtistId: '3TVXtAsR1Inumwj472S9r4' },
    };
    const { container } = render(<ArtistPageContent data={data} />);

    const focusables = Array.from(
      container.querySelectorAll('a[href], button, iframe'),
    );
    const indexOf = (node: Element | null) => {
      expect(node).not.toBeNull();
      return focusables.indexOf(node as Element);
    };

    const back = indexOf(container.querySelector('button[aria-label="Back"]'));
    const follow = indexOf(
      Array.from(container.querySelectorAll('button')).find((button) =>
        followNames('Neal Francis').includes(
          button.getAttribute('aria-label') ?? '',
        ),
      ) ?? null,
    );
    const firstRow = indexOf(container.querySelector('a[href^="/events/"]'));
    const skip = indexOf(container.querySelector('a.ap-skip'));
    const iframe = indexOf(container.querySelector('iframe'));
    const report = indexOf(
      container.querySelector('[data-testid="artist-report-card"]'),
    );

    expect(back).toBeLessThan(follow);
    expect(follow).toBeLessThan(firstRow);
    expect(firstRow).toBeLessThan(skip);
    expect(skip).toBeLessThan(iframe);
    expect(iframe).toBeLessThan(report);
    // The skip lands past the player, on the report card's block.
    expect(container.querySelector('a.ap-skip')?.getAttribute('href')).toBe(
      '#artist-report',
    );
  });

  it('skips the player to Previously when there are past shows', () => {
    const data: ArtistDetailResponse = {
      ...withShows,
      past: withPast.past,
      history: withPast.history,
      artist: { ...base.artist, spotifyArtistId: '3TVXtAsR1Inumwj472S9r4' },
    };
    const { container } = render(<ArtistPageContent data={data} />);
    expect(container.querySelector('a.ap-skip')?.getAttribute('href')).toBe(
      '#previously',
    );
    expect(container.querySelector('#previously')).not.toBeNull();
  });

  describe('the upcoming note', () => {
    it('invites a follow when the viewer does not follow', () => {
      const { container } = render(
        <ArtistPageContent data={{ ...withShows, following: false }} />,
      );
      expect(container.querySelector('[data-upcoming-note]')?.textContent).toBe(
        ARTIST_COPY.upcomingNote,
      );
    });

    it('confirms the promise once they do', () => {
      const { container } = render(
        <ArtistPageContent data={{ ...withShows, following: true }} />,
      );
      expect(container.querySelector('[data-upcoming-note]')?.textContent).toBe(
        ARTIST_COPY.upcomingNoteFollowing,
      );
    });

    it('invites a signed-out visitor, who cannot be following', () => {
      const { container } = render(<ArtistPageContent data={withShows} />);
      expect(container.querySelector('[data-upcoming-note]')?.textContent).toBe(
        ARTIST_COPY.upcomingNote,
      );
    });

    it('is not drawn with no shows: the empty block already says it', () => {
      const { container } = render(<ArtistPageContent data={base} />);
      expect(container.querySelector('[data-upcoming-note]')).toBeNull();
    });
  });

  // The gate is asked once, here, and passed down — six surfaces each asking
  // for themselves is how one of them ships ungated (design R2 did exactly
  // that by testing `tier === 'free'` inline).
  describe('the follow gate', () => {
    const signedIn: ArtistDetailResponse = { ...withShows, following: false };
    const lockGlyph = (container: HTMLElement) =>
      container.querySelector('[data-glyph="lock"]');

    it('locks a plan that cannot follow', () => {
      regate.plans.add('supporter');
      plan.current = planOn('supporter');
      const { container } = render(<ArtistPageContent data={signedIn} />);
      expect(lockGlyph(container)).not.toBeNull();
    });

    it.each(['free', 'supporter'] as const)(
      'leaves a %s plan live (going free, 2026-10-29)',
      (tier) => {
        plan.current = planOn(tier);
        const { container } = render(<ArtistPageContent data={signedIn} />);
        expect(lockGlyph(container)).toBeNull();
      },
    );

    it('leaves a premium plan live', () => {
      plan.current = planOn('premium');
      const { container } = render(<ArtistPageContent data={signedIn} />);
      expect(lockGlyph(container)).toBeNull();
    });

    it('leaves a comped free account live', () => {
      // roleComped is an override the matrix does not encode, which is why the
      // page asks nfLocked(planState) and never `plan === 'free'`.
      regate.plans.add('free');
      plan.current = planOn('free', true);
      const { container } = render(<ArtistPageContent data={signedIn} />);
      expect(lockGlyph(container)).toBeNull();
    });

    it('never flashes a lock while the plan is still resolving', () => {
      plan.current = undefined;
      const { container } = render(<ArtistPageContent data={signedIn} />);
      expect(lockGlyph(container)).toBeNull();
    });

    it('leaves an existing follow unlocked after a downgrade, so it can be undone', () => {
      // Eng spec §3.2: downgrading never deletes follows, and DELETE is
      // unentitled by design. A locked skin here would strand the follow on
      // the one surface a user would go to to remove it.
      regate.plans.add('free');
      plan.current = planOn('free');
      const { container } = render(
        <ArtistPageContent data={{ ...withShows, following: true }} />,
      );
      expect(lockGlyph(container)).toBeNull();
    });

    it('does not lock a signed-out visitor, who gets the sign-in hand-off', () => {
      plan.current = planOn('logged-out');
      const { container } = render(<ArtistPageContent data={withShows} />);
      expect(lockGlyph(container)).toBeNull();
    });
  });

  it('drops the player block when we have no Spotify match', () => {
    const { container } = render(<ArtistPageContent data={withShows} />);
    expect(container.querySelector('iframe')).toBeNull();
    expect(container.textContent).toContain(ARTIST_COPY.playerNone);
  });

  // B+ `09-artist`: one stage on both viewports.
  describe('the stage', () => {
    const photo = 'https://i.example.com/neal.jpg';
    const withPhoto: ArtistDetailResponse = {
      ...base,
      artist: { ...base.artist, photoUrl: photo },
    };
    const card = (container: HTMLElement) =>
      container.querySelector<HTMLElement>('[data-testid="stage-card"]');

    it('names the headliner exactly once across the whole page', () => {
      const { container } = render(<ArtistPageContent data={withShows} />);
      expect(container.querySelectorAll('h1')).toHaveLength(1);
      expect(container.querySelector('h1')?.textContent).toBe('Neal Francis');
      expect(container.textContent).toContain(ARTIST_COPY.eyebrow);

      cleanup();
      setViewport(true);
      const desktop = render(<ArtistPageContent data={withShows} />).container;
      expect(desktop.querySelectorAll('h1')).toHaveLength(1);
    });

    it('places the history line once: under the follow on mobile, in the stage on desktop', () => {
      const line = ARTIST_COPY.historyNone(CRAWL_SINCE);
      const mobile = render(<ArtistPageContent data={base} />).container;
      expect(mobile.querySelectorAll('.ap-history')).toHaveLength(1);
      expect(mobile.querySelector('.ap-history-card')?.textContent).toBe(line);

      cleanup();
      setViewport(true);
      const desktop = render(<ArtistPageContent data={base} />).container;
      expect(desktop.querySelectorAll('.ap-history')).toHaveLength(1);
      expect(
        desktop.querySelector('[data-testid="hero-band"] .ap-history')
          ?.textContent,
      ).toBe(line);
    });

    it('rings the card in the lead genre and chips the genres under the name', () => {
      const data: ArtistDetailResponse = {
        ...base,
        shows: [
          {
            ...show('2026-11-10', 'Marquis Theater'),
            genres: ['electronic', 'hip-hop'],
          },
        ],
      };
      const { container } = render(<ArtistPageContent data={data} />);
      expect(card(container)?.style.boxShadow).toContain('var(--genre-');
      const chips = container.querySelectorAll(
        '[data-testid="hero-band"] [data-testid="genre-chip"]',
      );
      expect(Array.from(chips).map((chip) => chip.textContent)).toEqual([
        'electronic',
        'hip-hop',
      ]);
      expect(card(container)?.style.boxShadow).toContain(
        'var(--genre-electronic)',
      );
    });

    it('rings the card in the first bucketed genre when the lead has no bucket', () => {
      const data: ArtistDetailResponse = {
        ...base,
        shows: [
          {
            ...show('2026-11-10', 'Marquis Theater'),
            genres: ['zzz-unbucketed', 'electronic'],
          },
        ],
      };
      const { container } = render(<ArtistPageContent data={data} />);
      expect(card(container)?.style.boxShadow).toContain(
        'var(--genre-electronic)',
      );
    });

    it('draws the neutral ring and no chips for an artist with no shows', () => {
      const { container } = render(<ArtistPageContent data={base} />);
      expect(card(container)?.style.boxShadow).toContain(
        'var(--border-strong)',
      );
      expect(container.querySelector('[data-testid="genre-chip"]')).toBeNull();
    });

    it('falls to generated art when the portrait URL has expired', () => {
      // A signed press URL can die between the server render and the browser's
      // request, so the fallback is a render-time gate, not a fetch-time one.
      const { container } = render(<ArtistPageContent data={withPhoto} />);
      const image = card(container)?.querySelector('img');
      if (!(image instanceof HTMLImageElement)) throw new Error('no portrait');

      const before = card(container)?.firstElementChild?.getAttribute('style');
      act(() => {
        fireEvent.error(image);
      });

      expect(card(container)?.querySelector('img')).toBeNull();
      expect(card(container)?.querySelector('svg')).not.toBeNull();
      // The box is unchanged, so the fallback costs no layout shift.
      expect(card(container)?.firstElementChild?.getAttribute('style')).toBe(
        before,
      );
    });

    it('draws generated art rather than borrowing a show poster', () => {
      // §2.3: an artist surface resolves portrait → generated and never event
      // artwork, on a page whose shows do have their own imagery.
      const { container } = render(
        <ArtistPageContent
          data={{
            ...withShows,
            shows: withShows.shows.map((item) => ({
              ...item,
              imageUrl: 'https://i.example.com/poster.jpg',
            })),
          }}
        />,
      );
      expect(card(container)?.querySelector('img')).toBeNull();
      expect(card(container)?.querySelector('svg')).not.toBeNull();
    });

    it('puts Share in the stage, opposite the back chip', () => {
      const { container } = render(<ArtistPageContent data={withShows} />);
      const stage = container.querySelector('[data-testid="hero-band"]');
      expect(
        stage?.querySelector(`button[aria-label="${ARTIST_COPY.shareAria}"]`),
      ).not.toBeNull();
      expect(stage?.querySelector('button[aria-label="Back"]')).not.toBeNull();
    });

    it('draws the starburst on desktop only, in CSS', () => {
      setViewport(true);
      const { container } = render(<ArtistPageContent data={withPhoto} />);
      const burst = container.querySelector<HTMLElement>(
        '[data-testid="stage-starburst"]',
      );
      expect(burst?.className).toContain('hidden');
      expect(burst?.className).toContain('md:block');
      expect(burst?.style.opacity).toBe('0.08');
    });
  });

  // Wrong-artist report card. One card, at the foot of the main column.
  describe('the wrong-artist card', () => {
    const copy = ARTIST_COPY.report;
    const signedIn: ArtistDetailResponse = { ...withShows, following: false };
    const cards = (container: HTMLElement) =>
      Array.from(container.querySelectorAll('button')).filter((button) =>
        button.textContent?.includes(copy.card.title),
      );
    const reported: ArtistDetailResponse = {
      ...signedIn,
      myOpenReport: {
        id: 'rep_1',
        reason: 'wrong_photo',
        createdAt: '2026-11-11T12:00:00.000Z',
      },
    };

    it('is the event page card, not a copy', () => {
      const { container } = render(<ArtistPageContent data={signedIn} />);

      // The eyebrow is the event card's own string, reused rather than copied.
      expect(container.textContent).toContain(
        REPORTING_COPY.reportFooterLink.eyebrow,
      );
    });

    it('ends the page on mobile, after the shows and the player', () => {
      const { container } = render(<ArtistPageContent data={signedIn} />);

      expect(cards(container)).toHaveLength(1);
      const last = container.querySelector('.ap-grid > div:last-child');
      expect(last?.className).toContain('ap-block-report');
      expect(last?.textContent).toContain(copy.card.title);
    });

    it('ends the page on mobile with no shows too, after the player', () => {
      const { container } = render(
        <ArtistPageContent data={{ ...base, following: false }} />,
      );

      const last = container.querySelector('.ap-grid > div:last-child');
      expect(last?.textContent).toContain(copy.card.title);
    });

    it('ends the main column on desktop too, never the player column', () => {
      setViewport(true);
      const { container } = render(<ArtistPageContent data={signedIn} />);

      expect(cards(container)).toHaveLength(1);
      const last = container.querySelector('.ap-grid > div:last-child');
      expect(last?.className).toContain('ap-block-report');
      expect(
        container.querySelector('.ap-block-player')?.textContent ?? '',
      ).not.toContain(copy.card.title);
    });

    it('names the artist in the card body', () => {
      const { container } = render(<ArtistPageContent data={signedIn} />);

      expect(container.textContent).toContain(
        copy.card.subtitle('Neal Francis'),
      );
    });

    it('starts at rest when there is no open report', () => {
      const { container } = render(<ArtistPageContent data={signedIn} />);

      expect(container.textContent).not.toContain(copy.card.reportedChip);
    });

    it('starts reported when the viewer has an open report', () => {
      const { container } = render(<ArtistPageContent data={reported} />);

      expect(container.textContent).toContain(copy.card.reportedTitle);
      expect(container.textContent).toContain(copy.card.reportedChip);
      expect(container.textContent).toContain(copy.card.reportedFootnote);
      expect(container.textContent).not.toContain(copy.card.title);
    });

    it('opens Already reported when the reported card is tapped', () => {
      const { getByText } = render(<ArtistPageContent data={reported} />);

      fireEvent.click(getByText(copy.card.reportedTitle));

      expect(document.body.textContent).toContain(copy.already.title);
    });

    it('opens the report sheet from the card', () => {
      const { getByText } = render(<ArtistPageContent data={signedIn} />);

      fireEvent.click(getByText(copy.card.title));

      expect(document.body.textContent).toContain(copy.sheet.title);
    });

    it('opens the tier picker on its own entry for a signed-out tap', () => {
      const { getByTestId, queryByTestId } = render(
        <ArtistPageContent data={withShows} />,
      );
      expect(queryByTestId('tier-picker')).toBeNull();

      fireEvent.click(getByTestId('artist-report-card'));

      expect(getByTestId('tier-picker').getAttribute('data-entry')).toBe(
        'logged-out-artist-report',
      );
      // The picker stands in for the sheet; no report form opens.
      expect(document.body.textContent).not.toContain(copy.sheet.title);
    });

    it('still renders for a signed-out visitor, announcing the gate', () => {
      const { container } = render(<ArtistPageContent data={withShows} />);

      const card = Array.from(container.querySelectorAll('button')).find(
        (button) =>
          button.getAttribute('aria-label') === copy.card.ariaSignedOut,
      );
      expect(card).not.toBeUndefined();
      // Announced, not drawn: the visible title is the same.
      expect(card?.textContent).toContain(copy.card.title);
    });
  });
});
