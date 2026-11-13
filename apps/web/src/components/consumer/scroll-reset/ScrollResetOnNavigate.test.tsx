// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';

let pathname = '/events';
vi.mock('next/navigation', () => ({
  usePathname: () => pathname,
}));

import { ScrollResetOnNavigate } from './ScrollResetOnNavigate';

let scrollTo: ReturnType<typeof vi.fn<(x: number, y: number) => void>>;

beforeEach(() => {
  pathname = '/events';
  window.history.replaceState({}, '', '/events');
  scrollTo = vi.fn<(x: number, y: number) => void>();
  vi.spyOn(window, 'scrollTo').mockImplementation(scrollTo);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const navigate = (
  view: ReturnType<typeof render>,
  next: string,
  opts: { popstate?: boolean; hash?: string } = {},
) => {
  window.history.pushState({}, '', `${next}${opts.hash ?? ''}`);
  if (opts.popstate) window.dispatchEvent(new PopStateEvent('popstate'));
  pathname = next;
  view.rerender(<ScrollResetOnNavigate />);
};

describe('ScrollResetOnNavigate', () => {
  it('does not scroll on the first render', () => {
    render(<ScrollResetOnNavigate />);
    expect(scrollTo).not.toHaveBeenCalled();
  });

  // Regression: Next skips its reset when the new page's top is on screen,
  // which landed a navigation from a part-scrolled page part way down.
  it('scrolls the window to the top when the pathname changes', () => {
    const view = render(<ScrollResetOnNavigate />);
    navigate(view, '/venues');
    expect(scrollTo).toHaveBeenCalledWith(0, 0);
  });

  // The My shows tab row stays mounted across its three tabs, so a tab tap
  // must not throw the reader back to the top.
  it.each([
    ['/watching', '/history'],
    ['/history', '/following'],
    ['/following', '/watching'],
  ])('keeps its place between My shows tabs (%s to %s)', (from, to) => {
    pathname = from;
    const view = render(<ScrollResetOnNavigate />);
    navigate(view, to);
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it.each([
    ['/events', '/watching'],
    ['/watching', '/events'],
  ])('still resets into or out of My shows (%s to %s)', (from, to) => {
    pathname = from;
    const view = render(<ScrollResetOnNavigate />);
    navigate(view, to);
    expect(scrollTo).toHaveBeenCalledWith(0, 0);
  });

  it('keeps its place on a re-render with the same pathname', () => {
    const view = render(<ScrollResetOnNavigate />);
    view.rerender(<ScrollResetOnNavigate />);
    expect(scrollTo).not.toHaveBeenCalled();
  });

  // Only the component's half of Back/Forward: it does not scroll when a
  // popstate landed on the new pathname. That the browser then restores the
  // offset is a real-browser fact, pinned in apps/e2e scroll-position.spec.ts.
  it('does not scroll when a popstate landed on the new pathname', () => {
    const view = render(<ScrollResetOnNavigate />);
    navigate(view, '/venues', { popstate: true });
    expect(scrollTo).not.toHaveBeenCalled();
  });

  // A query-only Back never changes the pathname; it must not swallow the
  // next real navigation's reset.
  it('does not let a query-only Back suppress the next reset', () => {
    const view = render(<ScrollResetOnNavigate />);
    window.history.pushState({}, '', '/events?when=today');
    window.dispatchEvent(new PopStateEvent('popstate'));
    navigate(view, '/venues');
    expect(scrollTo).toHaveBeenCalledWith(0, 0);
  });

  it('leaves a #hash target to the router', () => {
    const view = render(<ScrollResetOnNavigate />);
    navigate(view, '/venues', { hash: '#map' });
    expect(scrollTo).not.toHaveBeenCalled();
  });
});
