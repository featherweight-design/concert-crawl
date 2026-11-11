// @vitest-environment jsdom

import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, act } from '@testing-library/react';
import { InstallDismissedToast } from '../InstallDismissedToast';
import { INSTALL_COPY } from '../definitions/copy';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('InstallDismissedToast', () => {
  it('writes the note into its live region, then clears itself after 6s', () => {
    vi.useFakeTimers();
    const onDone = vi.fn();
    render(<InstallDismissedToast onDone={onDone} />);
    expect(screen.getByRole('status').textContent).toBe('');

    act(() => {
      vi.advanceTimersByTime(0);
    });
    expect(screen.getByRole('status').textContent).toBe(
      INSTALL_COPY.dismissNote,
    );

    act(() => {
      vi.advanceTimersByTime(5999);
    });
    expect(onDone).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('cancels its timer when unmounted early', () => {
    vi.useFakeTimers();
    const onDone = vi.fn();
    const { unmount } = render(<InstallDismissedToast onDone={onDone} />);
    unmount();
    act(() => {
      vi.advanceTimersByTime(10000);
    });
    expect(onDone).not.toHaveBeenCalled();
  });
});
