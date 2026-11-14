// @vitest-environment jsdom

import '@testing-library/jest-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';

const push = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
  usePathname: () => '/events/evt-1',
}));

import { SignInRedirect } from './SignInRedirect';

beforeEach(() => {
  push.mockClear();
  window.history.replaceState({}, '', '/events/evt-1?tab=prices');
});

afterEach(() => {
  cleanup();
  window.history.replaceState({}, '', '/');
});

describe('SignInRedirect', () => {
  it('pushes sign-in with the current path and query once, then calls onDone once', () => {
    const onDone = vi.fn();
    const { container } = render(<SignInRedirect onDone={onDone} />);

    expect(container).toBeEmptyDOMElement();
    expect(push).toHaveBeenCalledTimes(1);
    expect(push).toHaveBeenCalledWith(
      `/sign-in?redirect_url=${encodeURIComponent('/events/evt-1?tab=prices')}`,
    );
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('does not redirect again when the parent re-renders', () => {
    const onDone = vi.fn();
    const { rerender } = render(<SignInRedirect onDone={onDone} />);
    rerender(<SignInRedirect onDone={() => onDone()} />);

    expect(push).toHaveBeenCalledTimes(1);
    expect(onDone).toHaveBeenCalledTimes(1);
  });
});
