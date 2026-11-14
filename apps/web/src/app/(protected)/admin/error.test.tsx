// @vitest-environment jsdom
import '@testing-library/jest-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

const { refresh, pathname } = vi.hoisted(() => {
  const current: { current: string | null } = { current: '/admin/venues' };
  return { refresh: vi.fn(), pathname: current };
});
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh }),
  usePathname: () => pathname.current,
}));

import AdminError from './error';

afterEach(() => {
  cleanup();
  pathname.current = '/admin/venues';
});

describe('admin error boundary', () => {
  it("renders Couldn't load in the content area, with a way out", () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const reset = vi.fn();
    render(
      <AdminError
        error={Object.assign(new Error('boom'), { digest: 'd1' })}
        reset={reset}
      />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent("Couldn't load");
    expect(screen.getByRole('link', { name: 'Open Health' })).toHaveAttribute(
      'href',
      '/admin',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(reset).toHaveBeenCalled();
    expect(refresh).toHaveBeenCalled();
  });

  it('draws no Error ID line: 02/couldnt-load has none', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <AdminError
        error={Object.assign(new Error('boom'), { digest: 'd1' })}
        reset={vi.fn()}
      />,
    );
    expect(screen.queryByText(/Error ID/)).toBeNull();
    expect(screen.queryByText(/d1/)).toBeNull();
  });

  it.each([
    ['/admin', 'Health'],
    ['/admin/needs-you', 'Needs you'],
    ['/admin/venues', 'Venues'],
    ['/admin/venues/v1/runs', 'Venues'],
    ['/admin/events', 'Events'],
    ['/admin/artists', 'Artists'],
    ['/admin/prices', 'Prices'],
    ['/admin/people', 'People'],
    ['/admin/feature-flags', 'Feature flags'],
    ['/admin/crawl', 'Crawl status'],
    ['/admin/feedback', 'Feedback'],
    ['/admin/settings', 'Settings'],
  ])('names the page at %s', (path, page) => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    pathname.current = path;
    render(<AdminError error={new Error('boom')} reset={vi.fn()} />);
    expect(
      screen.getByRole('heading', { name: `Couldn't load ${page}` }),
    ).toBeInTheDocument();
  });

  it('keeps the generic heading on a route with no title of its own', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    pathname.current = '/admin/review';
    render(<AdminError error={new Error('boom')} reset={vi.fn()} />);
    expect(
      screen.getByRole('heading', { name: "Couldn't load this page" }),
    ).toBeInTheDocument();
  });

  it('is only the content: no nav or heading chrome of its own', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { container } = render(
      <AdminError error={new Error('boom')} reset={vi.fn()} />,
    );
    expect(container.querySelector('nav, aside, header')).toBeNull();
  });
});
