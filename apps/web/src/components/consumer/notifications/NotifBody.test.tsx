// @vitest-environment jsdom

import '@testing-library/jest-dom';
import { describe, it, expect, afterEach, vi } from 'vitest';
import {
  render,
  screen,
  cleanup,
  within,
  fireEvent,
} from '@testing-library/react';
import type { ConsumerNotification } from '@/lib/notifications';
import { NotifBody } from './NotifBody';
import { NotifItem } from './NotifItem';
import { NOTIFICATIONS_COPY } from './definitions/copy';
import { categoryFor } from './definitions/categories';

afterEach(cleanup);

const NOW = new Date('2026-07-24T20:10:00-06:00');

const notification = (
  over: Partial<ConsumerNotification> = {},
): ConsumerNotification => ({
  id: 'n1',
  category: 'watch.cancelled',
  title: 'The price for Geese at Bluebird Theater dropped from $41 to $28.',
  body: "Cheapest it's been since the on-sale.",
  actionUrl: '/events/e1',
  readAt: null,
  createdAt: '2026-07-24T18:10:00-06:00',
  metadata: null,
  ...over,
});

describe('NotifBody — panel states', () => {
  it('renders the loading state as a polite busy region, never a list', () => {
    render(<NotifBody state="loading" now={NOW} />);
    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('aria-busy', 'true');
    expect(status).toHaveTextContent(NOTIFICATIONS_COPY.loading);
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });

  it('drops the header subtitle while loading — neither a stale count nor a claim', () => {
    // "All caught up." before the first page lands is a guess presented as a
    // fact, and the same string sat directly above "Couldn't reach the crawl."
    // in the error state. An unsettled query says nothing at all.
    render(<NotifBody state="loading" unreadCount={4} now={NOW} />);
    expect(screen.queryByText(NOTIFICATIONS_COPY.markedAll)).toBeNull();
    expect(screen.queryByText(NOTIFICATIONS_COPY.panelSub(4))).toBeNull();
    expect(
      screen.queryByRole('button', { name: NOTIFICATIONS_COPY.markAll }),
    ).not.toBeInTheDocument();
  });

  it('drops the header subtitle in the error state too', () => {
    render(<NotifBody state="error" unreadCount={4} now={NOW} />);
    expect(screen.queryByText(NOTIFICATIONS_COPY.markedAll)).toBeNull();
  });

  it('renders an inline notice under the header when one is supplied', () => {
    render(
      <NotifBody
        state="ready"
        unreadCount={0}
        now={NOW}
        notice={NOTIFICATIONS_COPY.actionFailed}
      />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent(
      NOTIFICATIONS_COPY.actionFailed,
    );
  });

  it('renders the error state as an alert with a wired Retry', async () => {
    const onRetry = vi.fn();
    render(<NotifBody state="error" onRetry={onRetry} now={NOW} />);
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent(NOTIFICATIONS_COPY.error);
    expect(alert).toHaveTextContent(NOTIFICATIONS_COPY.errorBody);
    fireEvent.click(
      screen.getByRole('button', { name: NOTIFICATIONS_COPY.errorAction }),
    );
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('renders the empty state with a wired CTA', async () => {
    const onAction = vi.fn();
    render(
      <NotifBody state="ready" items={[]} onAction={onAction} now={NOW} />,
    );
    expect(screen.getByText(NOTIFICATIONS_COPY.emptyTitle)).toBeInTheDocument();
    expect(screen.getByText(NOTIFICATIONS_COPY.emptyBody)).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole('button', { name: NOTIFICATIONS_COPY.emptyAction }),
    );
    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it('renders zero-after-mark-all as a list, not as the empty state', () => {
    render(
      <NotifBody
        state="ready"
        items={[notification({ readAt: '2026-07-24T19:00:00-06:00' })]}
        now={NOW}
      />,
    );
    expect(screen.getByRole('list')).toBeInTheDocument();
    expect(screen.getByText(NOTIFICATIONS_COPY.markedAll)).toBeInTheDocument();
    expect(
      screen.queryByText(NOTIFICATIONS_COPY.emptyTitle),
    ).not.toBeInTheDocument();
  });
});

describe('NotifBody — tabs (addendum 2, item 1)', () => {
  const mixed = [
    notification({ id: 'show', category: 'watch.soldout', title: 'S' }),
    notification({ id: 'alert', category: 'artist.new_show', title: 'A' }),
    notification({ id: 'crew', category: 'crew.joined', title: 'C' }),
    notification({ id: 'price', category: 'watch.pricedrop', title: 'P' }),
    notification({ id: 'check', category: 'contest.resolved', title: 'R' }),
    notification({ id: 'odd', category: 'venue.gone', title: 'U' }),
  ];
  const titles = (): string[] =>
    screen
      .getAllByRole('listitem')
      .map((row) => row.textContent ?? '')
      .map((text) => text.charAt(0));

  it('opens on Shows with all three tabs and the total count', () => {
    render(<NotifBody state="ready" items={mixed} unreadCount={6} now={NOW} />);
    expect(screen.getByRole('tab', { name: 'Shows' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getByRole('tab', { name: /^Alerts/ })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /^Prices/ })).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(1);
    expect(
      screen.getByText(NOTIFICATIONS_COPY.panelSub(6)),
    ).toBeInTheDocument();
  });

  it('puts artist.*, crew.* and unknown categories under Alerts', () => {
    render(<NotifBody state="ready" items={mixed} now={NOW} />);
    fireEvent.click(screen.getByRole('tab', { name: /^Alerts/ }));
    expect(titles().sort()).toEqual(['A', 'C', 'U']);
  });

  it('puts pricedrop and contest.* under Prices, not Shows', () => {
    render(<NotifBody state="ready" items={mixed} now={NOW} />);
    fireEvent.click(screen.getByRole('tab', { name: /^Prices/ }));
    expect(titles().sort()).toEqual(['P', 'R']);
  });

  it('keeps one tab stop: only the selected tab is tabbable', () => {
    render(<NotifBody state="ready" items={mixed} now={NOW} />);
    expect(screen.getByRole('tab', { name: 'Shows' })).toHaveAttribute(
      'tabindex',
      '0',
    );
    expect(screen.getByRole('tab', { name: /^Alerts/ })).toHaveAttribute(
      'tabindex',
      '-1',
    );
    expect(screen.getByRole('tab', { name: /^Prices/ })).toHaveAttribute(
      'tabindex',
      '-1',
    );
  });

  it('moves focus and selection with the arrow, Home and End keys', () => {
    render(<NotifBody state="ready" items={mixed} now={NOW} />);
    const shows = screen.getByRole('tab', { name: 'Shows' });
    shows.focus();
    fireEvent.keyDown(shows, { key: 'ArrowRight' });
    const alerts = screen.getByRole('tab', { name: /^Alerts/ });
    expect(alerts).toHaveAttribute('aria-selected', 'true');
    expect(alerts).toHaveFocus();
    fireEvent.keyDown(alerts, { key: 'End' });
    expect(screen.getByRole('tab', { name: /^Prices/ })).toHaveFocus();
    fireEvent.keyDown(screen.getByRole('tab', { name: /^Prices/ }), {
      key: 'ArrowRight',
    });
    expect(screen.getByRole('tab', { name: 'Shows' })).toHaveFocus();
    fireEvent.keyDown(screen.getByRole('tab', { name: 'Shows' }), {
      key: 'ArrowLeft',
    });
    expect(screen.getByRole('tab', { name: /^Prices/ })).toHaveFocus();
    fireEvent.keyDown(screen.getByRole('tab', { name: /^Prices/ }), {
      key: 'Home',
    });
    expect(screen.getByRole('tab', { name: 'Shows' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });

  it('labels the panel by its tab even when that tab is empty', () => {
    render(
      <NotifBody
        state="ready"
        items={[notification({ category: 'watch.pricedrop' })]}
        now={NOW}
      />,
    );
    expect(screen.getByRole('tabpanel', { name: 'Shows' })).toBeInTheDocument();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });

  it('draws the tab row, "0 new" and Mark all read on the empty state, as the board does', () => {
    render(
      <NotifBody state="ready" items={[]} onMarkAll={vi.fn()} now={NOW} />,
    );
    expect(screen.getByRole('tablist')).toBeInTheDocument();
    expect(
      screen.getByText(NOTIFICATIONS_COPY.panelSub(0)),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: NOTIFICATIONS_COPY.markAll }),
    ).toBeInTheDocument();
    expect(screen.getByRole('tabpanel', { name: 'Shows' })).toBeInTheDocument();
  });

  it('draws the tab row and Mark all read on the error state, with the count held as an ellipsis', () => {
    render(
      <NotifBody
        state="error"
        onRetry={vi.fn()}
        onMarkAll={vi.fn()}
        now={NOW}
      />,
    );
    expect(screen.getByRole('tablist')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: NOTIFICATIONS_COPY.markAll }),
    ).toBeInTheDocument();
    expect(screen.queryByText(NOTIFICATIONS_COPY.markedAll)).toBeNull();
  });

  it('dots a tab other than the open one while it holds an unread item, and never the open tab', () => {
    render(
      <NotifBody
        state="ready"
        items={[
          notification({ id: 'a', category: 'watch.cancelled', readAt: null }),
          notification({ id: 'b', category: 'artist.new_show', readAt: null }),
          notification({
            id: 'c',
            category: 'watch.pricedrop',
            readAt: '2026-07-24T19:00:00-06:00',
          }),
        ]}
        now={NOW}
      />,
    );
    // Opens on Shows: its own rows show their dots, so the tab does not.
    expect(screen.queryByTestId('notif-tab-dot-shows')).toBeNull();
    expect(screen.getByTestId('notif-tab-dot-alerts')).toBeInTheDocument();
    // A screen reader hears the cue too.
    expect(
      screen.getByRole('tab', {
        // Whitespace-tolerant: the accessible-name pass may pad the cue.
        name: new RegExp(
          `^${NOTIFICATIONS_COPY.segments.alerts}\\s*${NOTIFICATIONS_COPY.tabUnread}$`,
        ),
      }),
    ).toBeInTheDocument();
    // The Prices item is read: no dot.
    expect(screen.queryByTestId('notif-tab-dot-prices')).toBeNull();
  });

  it('keeps the tab row above the skeleton while loading (B19a)', () => {
    render(<NotifBody state="loading" now={NOW} />);
    expect(screen.getByRole('tablist')).toBeInTheDocument();
    expect(screen.getAllByRole('tab')).toHaveLength(3);
    expect(screen.getByRole('tabpanel', { name: 'Shows' })).toBeInTheDocument();
  });

  it('draws the single-tab empty card with the tab name and its line (B19a)', () => {
    render(
      <NotifBody
        state="ready"
        items={[notification({ category: 'watch.pricedrop' })]}
        now={NOW}
      />,
    );
    const card = screen.getByTestId('state-card');
    expect(card).toHaveTextContent(NOTIFICATIONS_COPY.segments.shows);
    expect(card).toHaveTextContent(NOTIFICATIONS_COPY.tabEmpty.shows);
  });

  it('gives sold out the accent tag and price checks the warning tag (B19a)', () => {
    expect(categoryFor('watch.soldout')).toMatchObject({
      ink: 'var(--accent)',
      glyph: 'tag',
    });
    expect(categoryFor('contest.resolved')).toMatchObject({
      ink: 'var(--warning)',
      glyph: 'tag',
    });
    expect(categoryFor('contest.needs_info')).toMatchObject({
      ink: 'var(--warning)',
      glyph: 'tag',
    });
  });
});

describe('NotifBody — header count', () => {
  it('prefers the API window count over the loaded page', () => {
    render(
      <NotifBody state="ready" items={[notification()]} unreadCount={12} />,
    );
    expect(
      screen.getByText(NOTIFICATIONS_COPY.panelSub(12)),
    ).toBeInTheDocument();
  });

  it('falls back to the loaded page when no count is supplied', () => {
    render(
      <NotifBody
        state="ready"
        items={[
          notification({ id: 'a' }),
          notification({ id: 'b', readAt: '2026-07-24T19:00:00-06:00' }),
        ]}
      />,
    );
    expect(
      screen.getByText(NOTIFICATIONS_COPY.panelSub(1)),
    ).toBeInTheDocument();
  });

  it('fires onMarkAll from the header', async () => {
    const onMarkAll = vi.fn();
    render(
      <NotifBody
        state="ready"
        items={[notification()]}
        onMarkAll={onMarkAll}
      />,
    );
    fireEvent.click(
      screen.getByRole('button', { name: NOTIFICATIONS_COPY.markAll }),
    );
    expect(onMarkAll).toHaveBeenCalledTimes(1);
  });
});

describe('NotifBody — day grouping', () => {
  it('renders one divider per day run, in list order', () => {
    render(
      <NotifBody
        state="ready"
        now={NOW}
        items={[
          notification({ id: 'a', createdAt: '2026-07-24T18:35:00-06:00' }),
          notification({ id: 'b', createdAt: '2026-07-24T11:20:00-06:00' }),
          notification({ id: 'c', createdAt: '2026-07-23T21:14:00-06:00' }),
        ]}
      />,
    );
    expect(screen.getByText(NOTIFICATIONS_COPY.today)).toBeInTheDocument();
    expect(screen.getByText(NOTIFICATIONS_COPY.yesterday)).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(3);
  });

  it('opens on the newest real day when nothing arrived today', () => {
    render(
      <NotifBody
        state="ready"
        now={NOW}
        items={[
          notification({ id: 'a', createdAt: '2026-07-20T18:35:00-06:00' }),
          notification({ id: 'b', createdAt: '2026-07-19T15:22:00-06:00' }),
        ]}
      />,
    );
    expect(screen.getByText('Mon, Jul 20')).toBeInTheDocument();
    expect(screen.getByText('Sun, Jul 19')).toBeInTheDocument();
    expect(
      screen.queryByText(NOTIFICATIONS_COPY.today),
    ).not.toBeInTheDocument();
  });

  it('keeps duplicate rows with distinct ids — writers are not exactly-once', () => {
    render(
      <NotifBody
        state="ready"
        now={NOW}
        items={[notification({ id: 'a' }), notification({ id: 'b' })]}
      />,
    );
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
  });

  it('renders a flat list with no dividers when grouping is off', () => {
    render(
      <NotifBody
        state="ready"
        grouped={false}
        now={NOW}
        items={[notification()]}
      />,
    );
    expect(
      screen.queryByText(NOTIFICATIONS_COPY.today),
    ).not.toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(1);
  });
});

describe('NotifBody — paging footer', () => {
  it('closes the list with the end-of-list line when there is no more', () => {
    render(<NotifBody state="ready" items={[notification()]} now={NOW} />);
    expect(screen.getByText(NOTIFICATIONS_COPY.endOfList)).toBeInTheDocument();
  });

  it('offers "Older notifications" and fires onLoadMore', async () => {
    const onLoadMore = vi.fn();
    render(
      <NotifBody
        state="ready"
        items={[notification()]}
        hasMore
        onLoadMore={onLoadMore}
        now={NOW}
      />,
    );
    fireEvent.click(
      screen.getByRole('button', { name: NOTIFICATIONS_COPY.loadMore }),
    );
    expect(onLoadMore).toHaveBeenCalledTimes(1);
  });

  it('disables and relabels the load-more button while a page is in flight', () => {
    render(
      <NotifBody
        state="ready"
        items={[notification()]}
        hasMore
        isLoadingMore
        onLoadMore={vi.fn()}
      />,
    );
    const button = screen.getByRole('button', {
      name: NOTIFICATIONS_COPY.loadingVisible,
    });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
  });
});

describe('NotifBody — unwired controls never render', () => {
  // Every handler on this component is optional, so a caller that forgets one
  // would otherwise ship a button that looks live and does nothing. Hiding is
  // the panel's rule for a dead control, already used for mark-all at zero.

  it('hides "Mark all read" when no handler is wired, despite a count', () => {
    render(
      <NotifBody state="ready" items={[notification()]} unreadCount={3} />,
    );
    expect(
      screen.queryByRole('button', { name: NOTIFICATIONS_COPY.markAll }),
    ).not.toBeInTheDocument();
  });

  it('hides the close button when showClose is set but onClose is not', () => {
    render(<NotifBody state="ready" items={[notification()]} showClose />);
    expect(
      screen.queryByRole('button', { name: NOTIFICATIONS_COPY.closeLabel }),
    ).not.toBeInTheDocument();
  });

  it('hides Retry rather than showing an inert one', () => {
    render(<NotifBody state="error" />);
    // The error still explains itself; only the dead control is gone.
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: NOTIFICATIONS_COPY.errorAction }),
    ).not.toBeInTheDocument();
  });

  it('hides the empty-state CTA rather than showing an inert one', () => {
    render(<NotifBody state="ready" items={[]} />);
    expect(screen.getByText(NOTIFICATIONS_COPY.emptyBody)).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: NOTIFICATIONS_COPY.emptyAction }),
    ).not.toBeInTheDocument();
  });

  it('falls back to the end-of-list line when hasMore has no onLoadMore', () => {
    render(<NotifBody state="ready" items={[notification()]} hasMore />);
    expect(
      screen.queryByRole('button', { name: NOTIFICATIONS_COPY.loadMore }),
    ).not.toBeInTheDocument();
    expect(screen.getByText(NOTIFICATIONS_COPY.endOfList)).toBeInTheDocument();
  });
});

describe('NotifItem', () => {
  it('gives an unread row a category rail, a dot and a bold title', () => {
    render(
      <NotifItem
        item={notification({ category: 'watch.backonsale' })}
        onOpen={vi.fn()}
        now={NOW}
      />,
    );
    const row = screen.getByRole('button');
    // jsdom drops declarations carrying var()/color-mix() from the computed
    // style, so assert on the serialised inline style.
    expect(row.getAttribute('style')).toContain(
      'box-shadow: inset 2px 0 0 var(--success)',
    );
    expect(row.getAttribute('style')).toContain(
      'background: color-mix(in srgb, var(--success) 4%, transparent)',
    );
    const title = within(row).getByText(/The price for Geese/);
    expect(title).toHaveStyle({ fontWeight: '700' });
    expect(row.getAttribute('aria-label')).toContain('. Unread');
  });

  it('drops every unread signal once the row has been read', () => {
    render(
      <NotifItem
        item={notification({ readAt: '2026-07-24T19:00:00-06:00' })}
        onOpen={vi.fn()}
        now={NOW}
      />,
    );
    const row = screen.getByRole('button');
    expect(row.getAttribute('style')).toContain('box-shadow: none');
    expect(row.getAttribute('style')).toContain('background: transparent');
    expect(row.getAttribute('style')).not.toContain('color-mix');
    expect(within(row).getByText(/The price for Geese/)).toHaveStyle({
      fontWeight: '600',
    });
    expect(row.getAttribute('aria-label')).not.toContain('Unread');
  });

  it('is not announced as a button when no open handler is wired', () => {
    // An inert focusable row is worse for a keyboard or screen-reader user
    // than a plain one — the text still reads either way.
    render(<NotifItem item={notification()} now={NOW} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.getByText(notification().title)).toBeInTheDocument();
  });

  it('drops the hover and focus affordances along with the semantics', () => {
    // `.notif-row` is purely interaction styling — hover fill, focus ring,
    // chevron reveal — so an unwired row must not carry it either.
    const { container } = render(<NotifItem item={notification()} now={NOW} />);
    expect(container.querySelector('.notif-row')).toBeNull();
  });

  it('is a single target with no nested interactives', () => {
    render(<NotifItem item={notification()} onOpen={vi.fn()} now={NOW} />);
    expect(screen.getAllByRole('button')).toHaveLength(1);
    expect(screen.getByRole('button')).toHaveAttribute('tabindex', '0');
  });

  it('spells the category out, so colour is never the only signal', () => {
    render(
      <NotifItem
        item={notification({ category: 'watch.pricedrop' })}
        now={NOW}
      />,
    );
    expect(screen.getByText('Prices')).toBeInTheDocument();
    expect(screen.getByText('2h')).toBeInTheDocument();
  });

  it('falls back to a neutral presentation for an unknown category', () => {
    render(
      <NotifItem
        item={notification({ category: 'venue.gone' })}
        onOpen={vi.fn()}
        now={NOW}
      />,
    );
    expect(screen.getByText('Update')).toBeInTheDocument();
    expect(screen.getByRole('button').getAttribute('style')).toContain(
      'border-left: 2px solid var(--fg-muted)',
    );
  });

  it('opens on click', async () => {
    const onOpen = vi.fn();
    render(<NotifItem item={notification()} onOpen={onOpen} now={NOW} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onOpen).toHaveBeenCalledWith(expect.objectContaining({ id: 'n1' }));
  });

  it('opens on Enter', () => {
    const onOpen = vi.fn();
    render(<NotifItem item={notification()} onOpen={onOpen} now={NOW} />);
    fireEvent.keyDown(screen.getByRole('button'), { key: 'Enter' });
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it('opens on Space without letting the page scroll', () => {
    const onOpen = vi.fn();
    render(<NotifItem item={notification()} onOpen={onOpen} now={NOW} />);
    // fireEvent returns false when the handler called preventDefault, which is
    // the only thing standing between Space and a scrolled-away panel.
    const notCancelled = fireEvent.keyDown(screen.getByRole('button'), {
      key: ' ',
    });
    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(notCancelled).toBe(false);
  });

  it('opens once when Space is held down, not once per repeat', () => {
    const onOpen = vi.fn();
    render(<NotifItem item={notification()} onOpen={onOpen} now={NOW} />);
    const row = screen.getByRole('button');
    fireEvent.keyDown(row, { key: ' ' });
    fireEvent.keyDown(row, { key: ' ', repeat: true });
    fireEvent.keyDown(row, { key: ' ', repeat: true });
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it('still blocks page scroll on a repeated Space', () => {
    const onOpen = vi.fn();
    render(<NotifItem item={notification()} onOpen={onOpen} now={NOW} />);
    const event = new KeyboardEvent('keydown', {
      key: ' ',
      repeat: true,
      bubbles: true,
      cancelable: true,
    });
    fireEvent(screen.getByRole('button'), event);
    expect(event.defaultPrevented).toBe(true);
  });

  it('ignores keys that are not activation keys, and lets them through', () => {
    const onOpen = vi.fn();
    render(<NotifItem item={notification()} onOpen={onOpen} now={NOW} />);
    const row = screen.getByRole('button');
    for (const key of ['Tab', 'ArrowDown', 'a', 'Escape']) {
      expect(fireEvent.keyDown(row, { key })).toBe(true);
    }
    expect(onOpen).not.toHaveBeenCalled();
  });

  it('omits the body element entirely when the body is empty', () => {
    render(<NotifItem item={notification({ body: '' })} now={NOW} />);
    expect(
      screen.queryByText("Cheapest it's been since the on-sale."),
    ).not.toBeInTheDocument();
  });

  it('carries the action url as data, not as a nested link', () => {
    render(<NotifItem item={notification()} onOpen={vi.fn()} now={NOW} />);
    expect(screen.getByRole('button')).toHaveAttribute(
      'data-action-url',
      '/events/e1',
    );
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('omits the data attribute when there is nowhere to go', () => {
    render(
      <NotifItem
        item={notification({ actionUrl: null })}
        onOpen={vi.fn()}
        now={NOW}
      />,
    );
    expect(screen.getByRole('button')).not.toHaveAttribute('data-action-url');
  });
});

// B19: the B+ state boards (`06-states/bp-s-notif_*`).
describe('NotifBody — B+ states', () => {
  it('labels the loading skeleton with the Catching up divider', () => {
    render(<NotifBody state="loading" now={NOW} />);
    const status = screen.getByRole('status');
    expect(
      within(status).getByText(NOTIFICATIONS_COPY.loadingVisible),
    ).toBeInTheDocument();
  });

  it('holds the count with a placeholder hidden from assistive tech while loading', () => {
    render(<NotifBody state="loading" unreadCount={4} now={NOW} />);
    const pending = screen.getByText(NOTIFICATIONS_COPY.countPending);
    expect(pending.closest('[aria-hidden="true"]')).not.toBeNull();
  });

  it('drops the placeholder once the first page lands', () => {
    render(<NotifBody state="ready" items={[notification()]} now={NOW} />);
    expect(screen.queryByText(NOTIFICATIONS_COPY.countPending)).toBeNull();
  });

  it('gives the empty state its All caught up eyebrow', () => {
    render(<NotifBody state="ready" items={[]} onAction={vi.fn()} now={NOW} />);
    expect(
      screen.getByText(NOTIFICATIONS_COPY.emptyEyebrow),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: NOTIFICATIONS_COPY.emptyAction }),
    ).toBeInTheDocument();
  });

  it('gives the error state its eyebrow inside the alert', () => {
    render(<NotifBody state="error" onRetry={vi.fn()} now={NOW} />);
    expect(
      within(screen.getByRole('alert')).getByText(
        NOTIFICATIONS_COPY.errorEyebrow,
      ),
    ).toBeInTheDocument();
  });

  it('washes an unread row in its category ink and leaves a read row plain', () => {
    const { container, rerender } = render(
      <NotifItem item={notification()} onOpen={vi.fn()} now={NOW} />,
    );
    const unreadLayers = container.querySelectorAll(
      '.notif-row > span[aria-hidden="true"]',
    ).length;
    rerender(
      <NotifItem
        item={notification({ readAt: '2026-07-24T19:00:00-06:00' })}
        onOpen={vi.fn()}
        now={NOW}
      />,
    );
    const readLayers = container.querySelectorAll(
      '.notif-row > span[aria-hidden="true"]',
    ).length;
    expect(unreadLayers).toBe(readLayers + 1);
  });
});
