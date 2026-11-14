// @vitest-environment jsdom

import '@testing-library/jest-dom';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  SHEET_TOAST_MS,
  SheetToastProvider,
  useSheetToast,
} from './SheetToast';

const Trigger = ({
  toast,
}: {
  toast: Parameters<NonNullable<ReturnType<typeof useSheetToast>>['show']>[0];
}) => {
  const api = useSheetToast();
  return (
    <button type="button" onClick={() => api?.show(toast)}>
      fire
    </button>
  );
};

const renderSheet = (
  toast: Parameters<typeof Trigger>[0]['toast'],
  open = true,
) =>
  render(
    <SheetToastProvider open={open}>
      <Trigger toast={toast} />
    </SheetToastProvider>,
  );

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('SheetToast', () => {
  it('draws the toast and runs its action once, then dismisses it', () => {
    const onClick = vi.fn();
    renderSheet({
      message: 'Parra for Cuva is out of your Concerts.',
      action: { label: 'Undo', onClick },
    });
    fireEvent.click(screen.getByText('fire'));
    expect(screen.getByTestId('sheet-toast')).toHaveTextContent(
      'Parra for Cuva is out of your Concerts.',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('sheet-toast')).toBeNull();
  });

  it('draws the venue stamp for a stamped toast', () => {
    const { container } = renderSheet({
      message: 'Stamped. Culture Wars is in your Concerts.',
      stamp: { venueSlug: 'gothic-theatre', venueName: 'Gothic Theatre' },
    });
    fireEvent.click(screen.getByText('fire'));
    expect(container.querySelector('[data-venue-stamp]')).not.toBeNull();
  });

  it('is an alert for a failure and polite status otherwise', () => {
    const { rerender } = renderSheet({ message: 'Fine.' });
    expect(screen.getByRole('status')).toBeInTheDocument();
    rerender(
      <SheetToastProvider open>
        <Trigger toast={{ message: 'Broke.', tone: 'error' }} />
      </SheetToastProvider>,
    );
    fireEvent.click(screen.getByText('fire'));
    expect(screen.getByRole('alert')).toHaveTextContent('Broke.');
  });

  it('goes away on its own after a few seconds', () => {
    renderSheet({ message: 'Gone soon.' });
    fireEvent.click(screen.getByText('fire'));
    expect(screen.getByTestId('sheet-toast')).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(SHEET_TOAST_MS + 50);
    });
    expect(screen.queryByTestId('sheet-toast')).toBeNull();
  });

  it('clears when the sheet closes, so it never outlives it', () => {
    const view = renderSheet({ message: 'Still here?' });
    fireEvent.click(screen.getByText('fire'));
    expect(screen.getByTestId('sheet-toast')).toBeInTheDocument();
    view.rerender(
      <SheetToastProvider open={false}>
        <Trigger toast={{ message: 'Still here?' }} />
      </SheetToastProvider>,
    );
    expect(screen.queryByTestId('sheet-toast')).toBeNull();
  });

  it('is null outside a sheet, so callers fall back to the house toaster', () => {
    let seen: ReturnType<typeof useSheetToast> | undefined;
    const Probe = () => {
      seen = useSheetToast();
      return null;
    };
    render(<Probe />);
    expect(seen).toBeNull();
  });
});
