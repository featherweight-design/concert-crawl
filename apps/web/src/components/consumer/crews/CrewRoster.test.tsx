// @vitest-environment jsdom
import '@testing-library/jest-dom';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { CREW_MEMBER_CAP, type CrewMember } from '@concert-crawl/types';

import { CrewRoster } from './CrewRoster';
import { CREWS_COPY } from './definitions/copy';

const COPY = CREWS_COPY.roster;

const member = (overrides: Partial<CrewMember>): CrewMember => ({
  userId: 'user_you',
  handle: 'hugh',
  avatarColor: 'signal',
  avatarSecondColor: null,
  joinedAt: '2026-10-01T00:00:00Z',
  isKeeper: true,
  isYou: true,
  ...overrides,
});

const crewOf = (count: number) =>
  Array.from({ length: count }, (_, i) =>
    member(
      i === 0
        ? {}
        : {
            userId: `user_${i}`,
            handle: `p${i}`,
            isKeeper: false,
            isYou: false,
          },
    ),
  );

describe('CrewRoster (B+ B14)', () => {
  afterEach(cleanup);

  it('shows the invite footer with the spots left, and it opens the invite', () => {
    const onInvite = vi.fn();
    render(
      <CrewRoster
        members={crewOf(1)}
        memberCount={1}
        isKeeper
        onInvite={onInvite}
        onRemove={vi.fn()}
        onLeave={vi.fn()}
      />,
    );
    const footer = screen.getByRole('button', {
      name: COPY.inviteMore(CREW_MEMBER_CAP - 1),
    });
    fireEvent.click(footer);
    expect(onInvite).toHaveBeenCalledTimes(1);
  });

  it('hides the invite footer at the cap', () => {
    render(
      <CrewRoster
        members={crewOf(CREW_MEMBER_CAP)}
        memberCount={CREW_MEMBER_CAP}
        isKeeper
        onInvite={vi.fn()}
        onRemove={vi.fn()}
        onLeave={vi.fn()}
      />,
    );
    expect(
      screen.queryByRole('button', { name: /spots? left/ }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(COPY.openSpot)).not.toBeInTheDocument();
  });

  it('draws open seats hidden from assistive tech', () => {
    render(
      <CrewRoster
        members={crewOf(1)}
        memberCount={1}
        isKeeper
        onRemove={vi.fn()}
        onLeave={vi.fn()}
      />,
    );
    const seats = screen.getAllByText(COPY.openSpot);
    expect(seats).toHaveLength(2);
    for (const seat of seats) {
      expect(seat.closest('li')).toHaveAttribute('aria-hidden', 'true');
    }
  });

  it("names the host as Host and draws the HOST chip on the host's row", () => {
    render(
      <CrewRoster
        members={crewOf(2)}
        memberCount={2}
        isKeeper
        onRemove={vi.fn()}
        onLeave={vi.fn()}
      />,
    );
    expect(screen.getByText(COPY.hostChip)).toBeInTheDocument();
    expect(
      screen.getByText(new RegExp(`· ${COPY.host} ·`)),
    ).toBeInTheDocument();
  });
});
