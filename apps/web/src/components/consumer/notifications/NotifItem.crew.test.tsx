// @vitest-environment jsdom
//
// Crew rows in the bell (#1226 PR-7). Drawn as every other row since
// addendum-2 `notif-alerts-m`: the people glyph in a signal tile and the CREWS
// category label. The crew's name lives in the row's own title.

import '@testing-library/jest-dom';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import type { ConsumerNotification } from '@/lib/notifications';
import { isNotificationCategory } from '@/lib/notifications';
import { NotifItem } from './NotifItem';
import { CATEGORY_MAP } from './definitions/categories';
import { crewRowIdentity } from './lib/crew-meta';

afterEach(cleanup);

const NOW = new Date('2026-08-08T20:10:00-06:00');

const crewRow = (
  over: Partial<ConsumerNotification> = {},
): ConsumerNotification => ({
  id: 'n1',
  category: 'crew.going',
  title: 'hugh is going to Big Thief at Bluebird Theater.',
  body: '',
  actionUrl: '/events/e1',
  readAt: null,
  createdAt: '2026-08-08T18:10:00-06:00',
  metadata: {
    crewId: '4f0d1b6e-1a2b-4c3d-8e9f-0a1b2c3d4e5f',
    crewName: 'The Regulars',
    patchSalt: 3,
    category: 'crew.going',
  },
  ...over,
});

describe('crew categories are known to the panel', () => {
  it.each(['crew.going', 'crew.joined', 'crew.left'] as const)(
    'recognises %s and gives it a presentation',
    (category) => {
      expect(isNotificationCategory(category)).toBe(true);
      // Not the fallback: a crew row that fell through to "Update" would look
      // identical to an unrecognised future category.
      expect(
        isNotificationCategory(category) && CATEGORY_MAP[category].label,
      ).not.toBe('Update');
    },
  );
});

describe('crewRowIdentity', () => {
  it('reads id, name and salt off a well-formed blob', () => {
    expect(
      crewRowIdentity('crew.joined', {
        crewId: 'c1',
        crewName: 'Aces',
        patchSalt: 2,
      }),
    ).toEqual({ crewId: 'c1', crewName: 'Aces', patchSalt: 2 });
  });

  it('defaults a missing or non-integer salt to 0 rather than rejecting the row', () => {
    expect(
      crewRowIdentity('crew.left', { crewId: 'c1', crewName: 'Aces' }),
    ).toEqual({ crewId: 'c1', crewName: 'Aces', patchSalt: 0 });
    expect(
      crewRowIdentity('crew.left', {
        crewId: 'c1',
        crewName: 'Aces',
        patchSalt: 1.5,
      }),
    ).toEqual({ crewId: 'c1', crewName: 'Aces', patchSalt: 0 });
  });

  it.each([
    ['no metadata at all', null],
    ['an empty crew name', { crewId: 'c1', crewName: '   ' }],
    ['a missing crew id', { crewName: 'Aces' }],
  ])('rejects %s', (_label, metadata) => {
    expect(crewRowIdentity('crew.going', metadata)).toBeNull();
  });

  it('never claims a non-crew category, however crew-shaped the blob', () => {
    expect(
      crewRowIdentity('watch.pricedrop', { crewId: 'c1', crewName: 'Aces' }),
    ).toBeNull();
  });
});

describe('NotifItem — crew rows', () => {
  it('draws the people glyph in a signal tile, not the crew patch', () => {
    const { container } = render(<NotifItem item={crewRow()} now={NOW} />);
    expect(container.querySelector('svg[viewBox="0 0 100 100"]')).toBeNull();
    expect(container.querySelector('svg[viewBox="0 0 16 16"]')).not.toBeNull();
    const tile = container.querySelector<HTMLElement>(
      'span[aria-hidden="true"]',
    );
    expect(tile?.style.color).toBe('var(--signal)');
  });

  it('labels the row with the category, not the crew name', () => {
    render(<NotifItem item={crewRow()} now={NOW} />);
    expect(
      screen.getByText(CATEGORY_MAP['crew.going'].label),
    ).toBeInTheDocument();
    expect(screen.queryByText('The Regulars')).toBeNull();
  });

  it('keeps the row furniture: title, unread pip and time-ago', () => {
    render(<NotifItem item={crewRow()} now={NOW} />);
    expect(
      screen.getByText('hugh is going to Big Thief at Bluebird Theater.'),
    ).toBeInTheDocument();
    expect(screen.getByText('2h')).toBeInTheDocument();
    expect(
      document.querySelector('[data-testid="notif-unread-dot"]'),
    ).not.toBeNull();
  });

  it('drops the unread pip once the row has been read', () => {
    render(
      <NotifItem item={crewRow({ readAt: NOW.toISOString() })} now={NOW} />,
    );
    expect(
      document.querySelector('[data-testid="notif-unread-dot"]'),
    ).toBeNull();
  });

  it('still names the crew in the accessible name of an actionable row', () => {
    render(<NotifItem item={crewRow()} onOpen={() => {}} now={NOW} />);
    const row = screen.getByRole('button');
    expect(row).toHaveAccessibleName(/The Regulars/);
    expect(row).toHaveAccessibleName(
      /hugh is going to Big Thief at Bluebird Theater\./,
    );
  });

  it("keeps the other reader's handle out of analytics", () => {
    render(<NotifItem item={crewRow()} onOpen={() => {}} now={NOW} />);
    const row = screen.getByRole('button');
    // Autocapture records every ancestor's attributes, so the name is never
    // carried in an aria-label on the row.
    expect(row).not.toHaveAttribute('aria-label');
    expect(row).toHaveAttribute(
      'data-ph-capture-attribute-notification-category',
      'crew.going',
    );
    const title = screen.getByText(
      'hugh is going to Big Thief at Bluebird Theater.',
    );
    expect(title).toHaveClass('ph-no-capture');
    const labelId = row.getAttribute('aria-labelledby') ?? '';
    expect(document.getElementById(labelId)).toHaveClass('ph-no-capture');
  });
});
