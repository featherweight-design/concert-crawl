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

  describe('in the app shell (addendum-2 §18, error-in-app-m)', () => {
    it('standalone: its own logo bar, the full viewport and its own ground', () => {
      render(<StandaloneError errorId="1" onRetry={vi.fn()} />);
      const page = screen.getByTestId('standalone-error');
      expect(page.querySelector('header')).not.toBeNull();
      // The style attribute, not `page.style`: jsdom's parser may drop a
      // `dvh` length or a `color-mix()` ground it does not understand.
      const style = page.getAttribute('style') ?? '';
      expect(style).toContain('100dvh');
      expect(style).toContain('var(--bg)');
      expect(page.hasAttribute('data-in-app')).toBe(false);
    });

    it('in-app: no logo bar, no viewport height, no ground of its own', () => {
      render(<StandaloneError inApp errorId="1" onRetry={vi.fn()} />);
      const page = screen.getByTestId('standalone-error');
      expect(page.querySelector('header')).toBeNull();
      expect(
        screen.queryByRole('link', { name: copy.homeLinkLabel }),
      ).toBeNull();
      const style = page.getAttribute('style') ?? '';
      expect(style).not.toContain('100dvh');
      expect(style).not.toContain('var(--bg)');
      expect(page.getAttribute('data-in-app')).toBe('true');
    });

    it('in-app phone rules stop at 900px, so desktop is the standalone page', () => {
      const { container } = render(
        <StandaloneError inApp errorId="1" onRetry={vi.fn()} />,
      );
      const css = container.querySelector('style')?.textContent ?? '';
      const phone = css.slice(
        css.indexOf('@media (max-width: 899px)'),
        css.indexOf('@media (min-width: 900px)'),
      );
      // The board's frame, sizes and rhythm, phone only.
      expect(phone).toContain('padding: 26px 16px 80px');
      expect(phone).toContain('row-gap: 26px');
      expect(phone).toContain('font-size: 28px');
      expect(phone).toContain(
        'min-height: 48px; font-size: 15px; border-radius: 12px',
      );
      expect(phone).toContain(
        'font-size: 9.5px !important; letter-spacing: 0.16em !important',
      );
      expect(phone).toContain('font-size: 14.5px !important; max-width: 320px');
      expect(phone).toContain('font-size: 14px !important');
      // No in-app rule reaches the desktop block.
      const desktop = css.slice(css.indexOf('@media (min-width: 900px)'));
      expect(desktop).not.toContain('data-in-app');
      // The standalone frame padding holds at every width outside the phone
      // in-app rule.
      expect(css).toContain(
        "[data-testid='standalone-error'] { padding: 24px 20px 48px; }",
      );
    });
  });

  describe('focus', () => {
    // A throw can unmount the focused control; the heading takes focus so
    // the page announces itself instead of leaving focus on <body>.
    it.each([false, true])(
      'moves focus to the heading on mount (inApp: %s)',
      (inApp) => {
        render(<StandaloneError inApp={inApp} errorId="1" onRetry={vi.fn()} />);
        const heading = screen.getByRole('heading', {
          name: copy.errorHeading,
        });
        expect(heading.getAttribute('tabindex')).toBe('-1');
        expect(document.activeElement).toBe(heading);
      },
    );

    it('in-app keeps the error, the card and the error ID as the standalone page draws them', () => {
      const onSignOut = vi.fn();
      const { container } = render(
        <StandaloneError
          inApp
          errorId="2849"
          onRetry={vi.fn()}
          onSignOut={onSignOut}
        >
          <p>card</p>
        </StandaloneError>,
      );
      expect(
        screen.getByRole('heading', { name: copy.errorHeading }),
      ).toBeTruthy();
      expect(screen.getByText(copy.errorBody)).toBeTruthy();
      expect(
        screen.getByRole('button', { name: copy.signOutButton }),
      ).toBeTruthy();
      expect(container.querySelector('.cc-se-aside')?.textContent).toBe('card');
      expect(screen.getByText('2849')).toBeTruthy();
      // The desktop split is the standalone one, untouched.
      const css = container.querySelector('style')?.textContent ?? '';
      expect(css).toContain("grid-template-areas: 'copy aside' 'chip aside'");
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

    // global-error replaces the root layout, so globals.css (where --cta-end is
    // defined) is not loaded: the page defines the same token itself.
    it('draws Try again as a fill that ends on --cta-end, which the page defines itself', () => {
      const { container } = render(
        <StandaloneError errorId="1" onRetry={vi.fn()} />,
      );
      expect(
        screen.getByRole('button', { name: copy.tryAgainButton }).style
          .background,
      ).toContain('var(--cta-end)');
      const css = container.querySelector('style')?.textContent ?? '';
      expect(css).toContain(
        '--cta-end: color-mix(in srgb, var(--accent) 75%, var(--signal));',
      );
    });
  });

  // 12-error-page: Try again sweeps at 135 degrees; the chip carries a drawn
  // copy mark, not the text glyph.
  it('sweeps Try again at 135 degrees and draws a copy icon in the ID chip', () => {
    render(<StandaloneError errorId="2849204133" onRetry={vi.fn()} />);
    const tryAgain = screen.getByRole('button', { name: copy.tryAgainButton });
    expect(tryAgain.style.background).toContain('135deg');
    const chip = screen.getByRole('button', {
      name: new RegExp(copy.copyErrorId),
    });
    expect(chip.textContent).not.toContain('⧉');
    expect(chip.querySelector('svg')).not.toBeNull();
  });
});
