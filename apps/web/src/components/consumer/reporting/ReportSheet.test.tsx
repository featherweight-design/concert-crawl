// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ReportSheet } from './ReportSheet';
import { REPORTING_COPY } from './definitions/copy';

const copy = REPORTING_COPY.reportSheet;

let isSignedIn = true;
let isLoaded = true;

vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({ isLoaded, isSignedIn }),
}));

const push = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
  usePathname: () => '/events/evt_1',
}));

const onClose = vi.fn();

const renderSheet = () =>
  render(
    <ReportSheet
      open
      onClose={onClose}
      liveStatus={null}
      eventDate="2026-09-01T02:00:00.000Z"
      onSelect={vi.fn()}
    />,
  );

beforeEach(() => {
  isSignedIn = true;
  isLoaded = true;
  push.mockClear();
  onClose.mockClear();

  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
});

describe('ReportSheet', () => {
  afterEach(cleanup);

  it('says why Continue is disabled before a type is picked', () => {
    renderSheet();

    const continueButton = screen.getByRole('button', {
      name: copy.continueButton,
    });
    expect(continueButton.hasAttribute('disabled')).toBe(true);

    const hint = screen.getByText(copy.continueHint);
    expect(continueButton.getAttribute('aria-describedby')).toBe(hint.id);
  });

  it('drops the hint and enables Continue once a type is picked', () => {
    renderSheet();

    fireEvent.click(screen.getByText(copy.options.cancelled.title));

    const continueButton = screen.getByRole('button', {
      name: copy.continueButton,
    });
    expect(continueButton.hasAttribute('disabled')).toBe(false);
    expect(continueButton.getAttribute('aria-describedby')).toBe(null);
    expect(screen.queryByText(copy.continueHint)).toBe(null);
  });

  it('sends a signed-out visitor to sign-in instead of the form', () => {
    isSignedIn = false;
    renderSheet();

    expect(push).toHaveBeenCalledTimes(1);
    expect(push).toHaveBeenCalledWith(
      `/sign-in?redirect_url=${encodeURIComponent('/events/evt_1')}`,
    );
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(screen.queryByText(copy.options.cancelled.title)).toBe(null);
  });

  it('does not redirect while Clerk is still loading', () => {
    isLoaded = false;
    isSignedIn = false;
    renderSheet();

    expect(push).not.toHaveBeenCalled();
    expect(screen.getByText(copy.options.cancelled.title)).toBeTruthy();
  });
});
