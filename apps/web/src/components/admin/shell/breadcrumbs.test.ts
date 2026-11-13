import { describe, it, expect } from 'vitest';
import { buildBreadcrumbs } from './breadcrumbs';

const params = (query: string) => new URLSearchParams(query);

describe('buildBreadcrumbs', () => {
  it('shows only the section on a section page', () => {
    expect(buildBreadcrumbs('/admin/venues')).toEqual([{ label: 'Venues' }]);
    expect(buildBreadcrumbs('/admin')).toEqual([{ label: 'Health' }]);
    expect(buildBreadcrumbs('/admin/review')).toEqual([{ label: 'Needs you' }]);
  });

  it('names the interim Review tabs by their new homes', () => {
    expect(buildBreadcrumbs('/admin/review', params('tab=all-events'))).toEqual(
      [{ label: 'Events' }],
    );
    expect(buildBreadcrumbs('/admin/review', params('tab=prices'))).toEqual([
      { label: 'Prices' },
    ]);
  });

  it('links the section above a venue detail page', () => {
    expect(buildBreadcrumbs('/admin/venues/abc123')).toEqual([
      { label: 'Venues', href: '/admin/venues' },
      { label: 'Edit venue' },
    ]);
  });

  it('labels the robots audit tool with its own title', () => {
    expect(buildBreadcrumbs('/admin/venues/robots-audit')).toEqual([
      { label: 'Venues', href: '/admin/venues' },
      { label: 'robots.txt audit' },
    ]);
  });

  it('labels the invite codes Posters page Posters', () => {
    expect(buildBreadcrumbs('/admin/invite-codes/posters')).toEqual([
      { label: 'Invite codes', href: '/admin/invite-codes' },
      { label: 'Posters' },
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
      { label: 'Events', href: '/admin/review?tab=all-events' },
      { label: 'Details' },
    ]);
  });

  it('titles More', () => {
    expect(buildBreadcrumbs('/admin/more')).toEqual([{ label: 'More' }]);
  });
});
