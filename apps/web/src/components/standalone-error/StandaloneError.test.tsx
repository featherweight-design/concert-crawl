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

  describe('the error ID chip', () => {
    const original = Object.getOwnPropertyDescriptor(navigator, 'clipboard');
    const setClipboard = (value: unknown) =>
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value,
      });
    afterEach(() => {
      // Put the real property back so later tests see what they started with.
      if (original) Object.defineProperty(navigator, 'clipboard', original);
      else Reflect.deleteProperty(navigator, 'clipboard');
    });

    it('is not drawn when there is no id', () => {
      render(<StandaloneError onRetry={vi.fn()} />);
      expect(screen.queryByText(copy.errorIdLabel)).toBeNull();
    });

    it('copies the id and says so', async () => {
      const writeText = vi.fn().mockResolvedValue(undefined);
      setClipboard({ writeText });
      render(<StandaloneError errorId="abc" onRetry={vi.fn()} />);

      fireEvent.click(screen.getByRole('button', { name: /abc/ }));

      expect(writeText).toHaveBeenCalledWith('abc');
      expect(await screen.findByText(copy.copiedErrorId)).toBeTruthy();
    });

    it('survives a missing clipboard', () => {
      setClipboard(undefined);
      render(<StandaloneError errorId="abc" onRetry={vi.fn()} />);

      expect(() =>
        fireEvent.click(screen.getByRole('button', { name: /abc/ })),
      ).not.toThrow();
    });

    it('survives a refused write', async () => {
      const writeText = vi.fn().mockRejectedValue(new Error('denied'));
      setClipboard({ writeText });
      render(<StandaloneError errorId="abc" onRetry={vi.fn()} />);

      fireEvent.click(screen.getByRole('button', { name: /abc/ }));
      await Promise.resolve();

      expect(screen.queryByText(copy.copiedErrorId)).toBeNull();
    });
  });

  describe('layout', () => {
    it('splits into two columns on a wide screen only when it carries a card', () => {
      const { container, rerender } = render(
        <StandaloneError errorId="1" onRetry={vi.fn()}>
          <p>card</p>
        </StandaloneError>,
      );
      expect(container.querySelector('main')?.getAttribute('data-split')).toBe(
        'true',
      );
      // The card sits in the aside area, the chip in its own.
      expect(container.querySelector('.cc-se-aside')?.textContent).toBe('card');
      expect(container.querySelector('.cc-se-chip')).not.toBeNull();

      rerender(<StandaloneError errorId="1" onRetry={vi.fn()} />);
      expect(container.querySelector('main')?.hasAttribute('data-split')).toBe(
        false,
      );
      expect(container.querySelector('.cc-se-aside')).toBeNull();
    });

    it('carries the desktop rules in its own style, so no shared CSS is needed', () => {
      const { container } = render(
        <StandaloneError errorId="1" onRetry={vi.fn()} />,
      );
      const css = container.querySelector('style')?.textContent ?? '';
      expect(css).toContain('@media (min-width: 900px)');
      expect(css).toContain("grid-template-areas: 'copy aside' 'chip aside'");
    });

    it('draws Try again as a fill that ends on --cta-end', () => {
      render(<StandaloneError errorId="1" onRetry={vi.fn()} />);
      expect(
        screen.getByRole('button', { name: copy.tryAgainButton }).style
          .background,
      ).toContain('var(--cta-end)');
    });
  });
});
