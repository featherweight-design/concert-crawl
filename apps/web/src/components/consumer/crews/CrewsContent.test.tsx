// @vitest-environment jsdom

import '@testing-library/jest-dom';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import type { CrewSummary } from '@concert-crawl/types';

const refresh = vi.fn();
const push = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh, push }),
  usePathname: () => '/crews',
}));

const entitlement = {
  isLoading: false,
  active: true,
  surface: 'visible-active',
};
vi.mock('@/lib/queries/use-entitlement', () => ({
  useEntitlement: () => entitlement,
}));
const session: { isSignedIn: boolean | undefined } = { isSignedIn: true };
vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({
    isSignedIn: session.isSignedIn,
    getToken: () => Promise.resolve('tok'),
  }),
}));
vi.mock('./CreateCrewSheet', () => ({
  CreateCrewSheet: ({
    open,
    onCreated,
  }: {
    open: boolean;
    onCreated: (crew: CrewSummary) => void;
  }) =>
    open ? (
      <button
        data-testid="create-sheet"
        onClick={() =>
          onCreated({
            id: 'new',
            name: 'Mondays',
            patchSalt: 0,
            memberCount: 1,
            members: [],
            upcomingCount: 0,
            isKeeper: true,
            muted: false,
          })
        }
      >
        {'confirm'}
      </button>
    ) : null,
}));

import { CrewsContent } from './CrewsContent';
import { CREWS_COPY } from './definitions/copy';

afterEach(cleanup);

beforeEach(() => {
  refresh.mockClear();
  push.mockClear();
  entitlement.isLoading = false;
  entitlement.active = true;
  entitlement.surface = 'visible-active';
  session.isSignedIn = true;
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
});

const crew = (over: Partial<CrewSummary> = {}): CrewSummary => ({
  id: 'c1',
  name: 'Thursdays',
  patchSalt: 0,
  memberCount: 3,
  members: [
    { userId: 'u1', handle: 'ana', avatarColor: null, avatarSecondColor: null },
  ],
  upcomingCount: 2,
  isKeeper: true,
  muted: false,
  ...over,
});

describe('CrewsContent states (#1226)', () => {
  it('renders a row per crew in the ready state', () => {
    render(
      <CrewsContent
        initialCrews={[crew(), crew({ id: 'c2', name: 'Fridays' })]}
      />,
    );
    expect(screen.getByText('Thursdays')).toBeInTheDocument();
    expect(screen.getByText('Fridays')).toBeInTheDocument();
    expect(screen.queryByText(CREWS_COPY.empty.title)).not.toBeInTheDocument();
  });

  // B+: the three steps sit under a lone crew and go once there are two.
  it('shows How crews work with exactly one crew, and not with two', () => {
    const { unmount } = render(<CrewsContent initialCrews={[crew()]} />);
    expect(
      screen.getByRole('heading', { name: CREWS_COPY.howItWorks.eyebrow }),
    ).toBeInTheDocument();
    for (const step of CREWS_COPY.howItWorks.steps) {
      expect(screen.getByText(step.title)).toBeInTheDocument();
    }
    unmount();

    render(
      <CrewsContent
        initialCrews={[crew(), crew({ id: 'c2', name: 'Fridays' })]}
      />,
    );
    expect(
      screen.queryByText(CREWS_COPY.howItWorks.eyebrow),
    ).not.toBeInTheDocument();
  });

  it('shows the empty state and a create affordance when there are none', () => {
    render(<CrewsContent initialCrews={[]} />);
    expect(screen.getByText(CREWS_COPY.empty.title)).toBeInTheDocument();
    // One in the header, one under the empty state, and both are the same
    // component (Z7) rather than two separately-wired buttons.
    expect(screen.getAllByText(CREWS_COPY.list.create)).toHaveLength(2);
  });

  it('paints the error state with a real retry button and no create control', () => {
    render(<CrewsContent initialCrews={null} />);
    const retry = screen.getByRole('button', { name: CREWS_COPY.net.retry });
    expect(retry.tagName).toBe('BUTTON');
    expect(screen.queryByText(CREWS_COPY.list.create)).not.toBeInTheDocument();
    fireEvent.click(retry);
    expect(refresh).toHaveBeenCalled();
  });

  it('announces the loading state and hides the create control', () => {
    render(<CrewsContent initialCrews={[]} loading />);
    expect(screen.getByText(CREWS_COPY.net.loading)).toBeInTheDocument();
    expect(screen.queryByText(CREWS_COPY.list.create)).not.toBeInTheDocument();
  });
});

describe('CrewsContent create gating (#1226)', () => {
  it('opens the create sheet directly when the feature is active', () => {
    render(<CrewsContent initialCrews={[crew()]} />);
    fireEvent.click(screen.getByText(CREWS_COPY.list.create));
    expect(screen.getByTestId('create-sheet')).toBeInTheDocument();
  });

  // Starting a crew is free: a signed-in fan whose plan fetch failed (the hook
  // says inactive) still gets the create sheet, never a paywall.
  it('opens the create sheet for a signed-in fan the hook calls inactive', () => {
    entitlement.active = false;
    entitlement.surface = 'paywall-on-tap';
    render(<CrewsContent initialCrews={[crew()]} />);
    // No "paid feature" suffix on the name: the exact label is the whole name.
    fireEvent.click(
      screen.getByRole('button', { name: CREWS_COPY.list.create }),
    );
    expect(screen.getByTestId('create-sheet')).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });

  // The session decides sign-in, not the entitlement surface: a signed-in fan
  // whose plan resolved to the logged-out cell still gets the sheet.
  it('opens the create sheet for a signed-in fan even on tier-picker-on-tap', () => {
    entitlement.active = false;
    entitlement.surface = 'tier-picker-on-tap';
    render(<CrewsContent initialCrews={[crew()]} />);
    fireEvent.click(screen.getByText(CREWS_COPY.list.create));
    expect(screen.getByTestId('create-sheet')).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });

  it('sends a signed-out viewer to sign-in, whatever the surface says', () => {
    session.isSignedIn = false;
    render(<CrewsContent initialCrews={[crew()]} />);
    fireEvent.click(screen.getByText(CREWS_COPY.list.create));
    expect(push).toHaveBeenCalledTimes(1);
    expect(push).toHaveBeenCalledWith(
      `/sign-in?redirect_url=${encodeURIComponent('/crews')}`,
    );
    expect(screen.queryByTestId('create-sheet')).not.toBeInTheDocument();
  });

  // Flagged off, the route 404s; the affordance must not render either.
  it('renders no create affordance when crews is hidden', () => {
    entitlement.active = false;
    entitlement.surface = 'hidden';
    render(<CrewsContent initialCrews={[crew()]} />);
    expect(screen.queryByText(CREWS_COPY.list.create)).not.toBeInTheDocument();
  });
});

describe('CrewsContent server-data sync (#1226)', () => {
  // The list used to seed useState from initialCrews and never look again, so
  // the error state's retry refetched successfully and still painted "no crews".
  it('picks up crews that arrive after the first render', () => {
    const view = render(<CrewsContent initialCrews={null} />);
    expect(
      screen.getByRole('button', { name: CREWS_COPY.net.retry }),
    ).toBeInTheDocument();

    view.rerender(<CrewsContent initialCrews={[crew()]} />);
    expect(screen.getByText('Thursdays')).toBeInTheDocument();
    expect(screen.queryByText(CREWS_COPY.empty.title)).not.toBeInTheDocument();
  });

  // The sheet closes and a row appears; without this the whole mutation is
  // silent to a screen reader.
  it('announces a newly created crew in a live region', () => {
    render(<CrewsContent initialCrews={[]} />);
    fireEvent.click(screen.getAllByText(CREWS_COPY.list.create)[0]!);
    fireEvent.click(screen.getByTestId('create-sheet'));
    const live = screen.getByText(CREWS_COPY.list.created('Mondays'));
    expect(live).toHaveAttribute('aria-live', 'polite');
  });

  // Join, leave, delete and handoff all navigate; creating one was the only
  // path that left you looking at the list you just added to.
  it('lands on the new crew rather than the list', () => {
    render(<CrewsContent initialCrews={[]} />);
    fireEvent.click(screen.getAllByText(CREWS_COPY.list.create)[0]!);
    fireEvent.click(screen.getByTestId('create-sheet'));
    expect(push).toHaveBeenCalledWith('/crews/new');
    // The optimistic row survives the navigation: the list is what a back tap
    // returns to, and it is still cached without the new crew in it.
    expect(screen.getByText('Mondays')).toBeInTheDocument();
  });

  it('drops an optimistic row once the server returns the same crew', () => {
    const view = render(<CrewsContent initialCrews={[]} />);
    fireEvent.click(screen.getAllByText(CREWS_COPY.list.create)[0]!);
    expect(screen.getByTestId('create-sheet')).toBeInTheDocument();

    view.rerender(<CrewsContent initialCrews={[crew()]} />);
    expect(screen.getAllByText('Thursdays')).toHaveLength(1);
  });
});
