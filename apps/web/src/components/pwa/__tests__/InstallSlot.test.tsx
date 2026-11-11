// @vitest-environment jsdom

import React from 'react';
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import {
  render,
  screen,
  cleanup,
  act,
  fireEvent,
} from '@testing-library/react';

const isIosSafariMock = vi.fn(() => false);
const isStandaloneMock = vi.fn(() => false);
vi.mock('@/lib/pwa/beforeinstallprompt', () => ({
  isIosSafari: () => isIosSafariMock(),
  isStandalone: () => isStandaloneMock(),
}));

// Import after mocks are set up.
import { InstallSlot } from '../InstallSlot';
import { dismissOnce } from '@/lib/pwa/install-dismissal';
import { INSTALL_COPY } from '../definitions/copy';

afterEach(() => {
  cleanup();
  localStorage.clear();
  isIosSafariMock.mockReturnValue(false);
  isStandaloneMock.mockReturnValue(false);
});

beforeEach(() => {
  localStorage.clear();
});

describe('InstallSlot', () => {
  it('renders nothing when neither installable nor iOS Safari', () => {
    const { container } = render(<InstallSlot />);
    expect(container.innerHTML).toBe('');
  });

  it('renders nothing when the app is standalone (already installed)', () => {
    isStandaloneMock.mockReturnValue(true);
    isIosSafariMock.mockReturnValue(true); // even if we would show on iOS
    const { container } = render(<InstallSlot />);
    expect(container.innerHTML).toBe('');
  });

  it('shows the slot on iOS Safari', () => {
    isIosSafariMock.mockReturnValue(true);
    render(<InstallSlot />);
    const button = screen.getByRole('button', {
      name: /install concert crawl/i,
    });
    expect(button).not.toBeNull();
  });

  it('leaves a status note when the slot is dismissed, then hides', async () => {
    isIosSafariMock.mockReturnValue(true);
    render(<InstallSlot />);
    fireEvent.click(
      screen.getByRole('button', { name: INSTALL_COPY.dismissAria }),
    );
    expect(
      screen.queryByRole('button', { name: /install concert crawl/i }),
    ).toBeNull();
    // The live region mounts empty and the note is written in a tick later.
    expect(screen.getByRole('status').textContent).toBe('');
    expect(await screen.findByText(INSTALL_COPY.dismissNote)).toBeTruthy();
  });

  it('shows no note when the slot was already dismissed on an earlier visit', () => {
    isIosSafariMock.mockReturnValue(true);
    dismissOnce();
    render(<InstallSlot />);
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('hides after dismissOnce marks a first dismiss (quiet state)', () => {
    isIosSafariMock.mockReturnValue(true);
    // Dismiss relative to now: InstallSlot reads the real clock, so a pinned
    // date silently leaves the 30-day quiet window and flips this assertion.
    // A fixed 2026-07-18 did exactly that on 2026-08-17.
    dismissOnce();
    render(<InstallSlot />);
    const button = screen.queryByRole('button', {
      name: /install concert crawl/i,
    });
    expect(button).toBeNull();
  });

  it('shows the beforeinstallprompt path when the browser fires the event', () => {
    render(<InstallSlot />);
    act(() => {
      // Assemble the beforeinstallprompt shape via Object.assign — no `as`.
      // The BeforeInstallPromptEvent interface is declaration-merged into
      // WindowEventMap in `@/lib/pwa/beforeinstallprompt`, so the handler
      // receives a fully-typed event without a runtime cast.
      const event = Object.assign(new Event('beforeinstallprompt'), {
        prompt: async () => {},
        userChoice: Promise.resolve({ outcome: 'accepted' as const }),
        platforms: ['web'],
      });
      window.dispatchEvent(event);
    });
    const button = screen.getByRole('button', {
      name: /install concert crawl/i,
    });
    expect(button).not.toBeNull();
  });
});
