import { describe, it, expect } from 'vitest';
import { buildBreadcrumbs } from './breadcrumbs';

const params = (query: string) => new URLSearchParams(query);

describe('buildBreadcrumbs', () => {
  it('shows only the section on a section page', () => {
    expect(buildBreadcrumbs('/admin/venues')).toEqual([{ label: 'Venues' }]);
    expect(buildBreadcrumbs('/admin')).toEqual([{ label: 'Health' }]);
    expect(buildBreadcrumbs('/admin/needs-you')).toEqual([
      { label: 'Needs you' },
    ]);
  });

  it('names the interim Review tab by its new home', () => {
    expect(buildBreadcrumbs('/admin/review', params('tab=all-events'))).toEqual(
      [{ label: 'Events' }],
    );
  });

  it('holds the venue-name slot with "…" until the page names it', () => {
    // `07/loading-venue-page` draws "Venues / …" while the venue loads.
    expect(buildBreadcrumbs('/admin/venues/abc123')).toEqual([
      { label: 'Venues', href: '/admin/venues' },
      { label: '…' },
    ]);
  });

  it('labels the robots audit tool with its own title', () => {
    expect(buildBreadcrumbs('/admin/venues/robots-audit')).toEqual([
      { label: 'Venues', href: '/admin/venues' },
      { label: 'robots.txt audit' },
    ]);
  });

  // `07/invite-codes` draws "People / Invite codes"; Posters sits beside it.
  it('puts Invite codes and Posters under People', () => {
    expect(buildBreadcrumbs('/admin/people/invite-codes')).toEqual([
      { label: 'People', href: '/admin/people' },
      { label: 'Invite codes', subtitle: true },
    ]);
    expect(buildBreadcrumbs('/admin/people/invite-codes/posters')).toEqual([
      { label: 'People', href: '/admin/people' },
      { label: 'Posters', subtitle: true },
    ]);
  });

  // `07/activity-log` draws "Operations / {tab}".
  it('puts the Operations tab under Operations', () => {
    const operations = { label: 'Operations', href: '/admin/operations' };
    expect(buildBreadcrumbs('/admin/operations')).toEqual([
      operations,
      { label: 'Feedback', subtitle: true },
    ]);
    expect(buildBreadcrumbs('/admin/feedback')).toEqual([
      operations,
      { label: 'Feedback', subtitle: true },
    ]);
  });

  it('keeps a person under People / Details', () => {
    expect(buildBreadcrumbs('/admin/people/user_1')).toEqual([
      { label: 'People', href: '/admin/people' },
      { label: 'Details' },
    ]);
  });

  it('sends the event editor back to the Review tab it came from', () => {
    expect(
      buildBreadcrumbs('/admin/events/e1/edit', params('from=event-flags')),
    ).toEqual([
      { label: 'Needs you', href: '/admin/needs-you' },
      { label: 'Details' },
    ]);
    expect(buildBreadcrumbs('/admin/events/e1/edit')).toEqual([
      { label: 'Events', href: '/admin/events' },
      { label: 'Details' },
    ]);
  });

  it('titles the Events list, and its Past side Events / Past', () => {
    expect(buildBreadcrumbs('/admin/events')).toEqual([{ label: 'Events' }]);
    expect(buildBreadcrumbs('/admin/events', params('when=past'))).toEqual([
      { label: 'Events', href: '/admin/events' },
      { label: 'Past', view: true },
    ]);
  });

  it('titles More', () => {
    expect(buildBreadcrumbs('/admin/more')).toEqual([{ label: 'More' }]);
  });
});
