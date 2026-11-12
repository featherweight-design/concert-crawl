// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

import { CONSUMER_COPY } from '@/components/consumer/definitions/copy';
import { StandaloneError } from './StandaloneError';

const copy = CONSUMER_COPY.error;

afterEach(cleanup);

describe('StandaloneError', () => {
  it('draws the heading, Try again first, the logo as a link home and the error ID', () => {
    const onRetry = vi.fn();
    render(<StandaloneError errorId="2849204133" onRetry={onRetry} />);

    expect(
      screen.getByRole('heading', { name: copy.errorHeading }),
    ).toBeTruthy();
    expect(screen.getByText(copy.eyebrow)).toBeTruthy();
    expect(
      screen
        .getByRole('link', { name: copy.homeLinkLabel })
        .getAttribute('href'),
    ).toBe('/');
    expect(screen.getByText('2849204133')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: copy.tryAgainButton }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('signed out (no sign-out handler): Go home and the signed-out body', () => {
    render(<StandaloneError errorId="1" onRetry={vi.fn()} />);

    expect(
      screen
        .getByRole('link', { name: copy.goHomeButton })
        .getAttribute('href'),
    ).toBe('/');
    expect(screen.getByText(copy.signedOutBody)).toBeTruthy();
    expect(
      screen.queryByRole('button', { name: copy.signOutButton }),
    ).toBeNull();
  });

  it('signed in: Sign out calls the handler', () => {
    const onSignOut = vi.fn();
    render(
      <StandaloneError errorId="1" onRetry={vi.fn()} onSignOut={onSignOut} />,
    );

    fireEvent.click(screen.getByRole('button', { name: copy.signOutButton }));
    expect(onSignOut).toHaveBeenCalledTimes(1);
    expect(screen.getByText(copy.errorBody)).toBeTruthy();
  });

  it('shows no chip when there is no id, and survives a missing clipboard', () => {
    const { rerender } = render(<StandaloneError onRetry={vi.fn()} />);
    expect(screen.queryByText(copy.errorIdLabel)).toBeNull();

    rerender(<StandaloneError errorId="abc" onRetry={vi.fn()} />);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: undefined,
    });
    expect(() =>
      fireEvent.click(screen.getByRole('button', { name: /abc/ })),
    ).not.toThrow();
  });
});
