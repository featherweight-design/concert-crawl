// @vitest-environment jsdom
import '@testing-library/jest-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { CrewMemberPreview, CrewShow } from '@concert-crawl/types';

const nav = vi.hoisted(() => ({ refresh: vi.fn() }));
const toggle = vi.hoisted(() => ({
  mutate: vi.fn(),
  isPending: false,
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: nav.refresh, push: vi.fn() }),
}));
vi.mock('@/lib/queries/use-attending-toggle', () => ({
  useAttendingToggle: () => toggle,
}));

import { CrewUpcoming } from './CrewUpcoming';
import { todayMt } from './lib/coming-up';

const member = (userId: string, handle: string): CrewMemberPreview => ({
  userId,
  handle,
  avatarColor: null,
  avatarSecondColor: null,
});

const show = (overrides: Partial<CrewShow> = {}): CrewShow => ({
  eventId: 'e1',
  iso: '2099-03-06',
  showTime: '20:00:00',
  title: 'Marian Hill',
  artist: 'Marian Hill',
  imageUrl: null,
  artistPhotoUrl: null,
  venue: 'Bluebird Theater',
  venueSlug: 'bluebird-theater',
  goingCount: 1,
  going: [member('me', 'hugh')],
  ...overrides,
});

describe('CrewUpcoming', () => {
  beforeEach(() => {
    toggle.mutate.mockReset();
    toggle.isPending = false;
    nav.refresh.mockReset();
  });
  afterEach(cleanup);

  it('draws a row per show with the date tile, the act, time and venue, and the going line', () => {
    render(<CrewUpcoming shows={[show()]} viewerId="me" />);
    const row = screen.getByTestId('crew-coming-up-row');
    expect(screen.getByTestId('crew-coming-up-tile')).toHaveTextContent('MAR');
    expect(row).toHaveTextContent('Marian Hill');
    expect(row).toHaveTextContent('Bluebird');
    expect(screen.getByTestId('crew-coming-up-going')).toHaveTextContent(
      '1 GOING · YOU',
    );
    // The viewer is already in, so there is nothing to join.
    expect(screen.queryByRole('button', { name: /I'm in/ })).toBeNull();
    expect(screen.getByRole('link', { name: 'Marian Hill' })).toHaveAttribute(
      'href',
      '/events/e1',
    );
  });

  it("offers I'm in when others are going and you are not, and sends Yes, going", () => {
    render(
      <CrewUpcoming
        shows={[
          show({
            goingCount: 2,
            going: [member('mira', 'mira'), member('theo', 'theo')],
          }),
        ]}
        viewerId="me"
      />,
    );
    expect(screen.getByTestId('crew-coming-up-going')).toHaveTextContent(
      '2 GOING · MIRA, THEO',
    );
    fireEvent.click(
      screen.getByRole('button', { name: /I'm in for Marian Hill/ }),
    );
    expect(toggle.mutate).toHaveBeenCalledWith(
      { eventId: 'e1', going: true },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
    // The crew page is a server read, so it refreshes once the yes lands.
    const options = toggle.mutate.mock.calls[0]?.[1] as {
      onSuccess: () => void;
    };
    options.onSuccess();
    expect(nav.refresh).toHaveBeenCalledTimes(1);
  });

  it('swaps the tile for TONIGHT on the night itself', () => {
    render(<CrewUpcoming shows={[show({ iso: todayMt() })]} viewerId="me" />);
    expect(screen.getByTestId('crew-coming-up-row')).toHaveAttribute(
      'data-tonight',
      'true',
    );
    expect(screen.getByTestId('crew-coming-up-tile')).toHaveTextContent(
      'TONIGHT',
    );
  });

  it('keeps the order it is given, so the API puts tonight first', () => {
    render(
      <CrewUpcoming
        shows={[
          show({ eventId: 'a', artist: 'First Act', title: 'First Act' }),
          show({ eventId: 'b', artist: 'Second Act', title: 'Second Act' }),
        ]}
        viewerId="me"
      />,
    );
    const rows = screen.getAllByTestId('crew-coming-up-row');
    expect(rows[0]).toHaveTextContent('First Act');
    expect(rows[1]).toHaveTextContent('Second Act');
  });

  it('says nothing is coming up, and points at Browse, when there are no shows', () => {
    render(<CrewUpcoming shows={[]} viewerId="me" />);
    const empty = screen.getByTestId('crew-coming-up-empty');
    expect(empty).toHaveTextContent('Nothing coming up.');
    expect(empty).toHaveTextContent(
      'One yes from anyone in the crew puts a show here.',
    );
    expect(screen.getByRole('link', { name: 'Find a show' })).toHaveAttribute(
      'href',
      '/events',
    );
  });
});
