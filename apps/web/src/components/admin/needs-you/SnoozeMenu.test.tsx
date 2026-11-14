// @vitest-environment jsdom
import '@testing-library/jest-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { SnoozeMenu } from './SnoozeMenu';

// Friday Nov 13 2026, noon Mountain: tomorrow is Nov 14.
const NOW = new Date('2026-11-13T19:00:00Z');
const ABOUT = { warning: 'Crawl failing', venue: "Fiddler's Green" };

const open = (withVenue = true) => {
  const onSnooze = vi.fn();
  const onNotUseful = vi.fn();
  render(
    <SnoozeMenu
      now={NOW}
      onSnooze={onSnooze}
      onNotUseful={withVenue ? onNotUseful : undefined}
      about={{ ...ABOUT, venue: withVenue ? ABOUT.venue : null }}
    />,
  );
  fireEvent.click(screen.getByTestId('snooze-trigger'));
  return { onSnooze, onNotUseful };
};

// `useIsPhone` reads matchMedia, which jsdom lacks: a desktop-width stand-in.
beforeEach(() => {
  window.matchMedia = vi.fn().mockImplementation(() => ({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
});

afterEach(cleanup);

describe('SnoozeMenu', () => {
  it('is an icon button that opens the three rows and Not useful', () => {
    open();
    expect(screen.getByTestId('snooze-trigger')).toHaveAccessibleName(
      'Snooze this decision',
    );
    expect(screen.getByText('Snooze 1 day')).toBeInTheDocument();
    expect(screen.getByText('Snooze a week')).toBeInTheDocument();
    expect(screen.getByText('Until a date…')).toBeInTheDocument();
    expect(
      screen.getByText("Turns this kind of warning off for Fiddler's Green."),
    ).toBeInTheDocument();
  });

  it('keeps Not useful out for an item with no venue', () => {
    open(false);
    expect(screen.queryByText(/Not useful/)).toBeNull();
  });

  it('picks a day on the month grid and snoozes to 8 AM that day', () => {
    const { onSnooze } = open();
    fireEvent.click(screen.getByText('Until a date…'));
    expect(screen.getByText('November 2026')).toBeInTheDocument();
    // Today and earlier are off; nothing is chosen yet.
    expect(
      screen.getByRole('button', { name: /Friday, November 13/ }),
    ).toBeDisabled();
    expect(screen.getByRole('button', { name: /Snooze until/ })).toBeDisabled();
    fireEvent.click(
      screen.getByRole('button', { name: /Thursday, November 19/ }),
    );
    expect(
      screen.getByText(
        /Back on Thu, Nov 19 at 8 AM\. If Fiddler's Green fills up/,
      ),
    ).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole('button', { name: 'Snooze until Nov 19' }),
    );
    expect(onSnooze).toHaveBeenCalledWith('2026-11-19T08:00:00-07:00');
  });

  it('cannot page back before the first day it allows', () => {
    open();
    fireEvent.click(screen.getByText('Until a date…'));
    expect(
      screen.getByRole('button', { name: 'Previous month' }),
    ).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Next month' }));
    expect(screen.getByText('December 2026')).toBeInTheDocument();
  });

  it('names the warning, takes a reason and a note, then turns it off', () => {
    const { onNotUseful } = open();
    fireEvent.click(screen.getByText('Not useful…'));
    expect(
      screen.getByText("Turn off “Crawl failing” for Fiddler's Green?"),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('radio', { name: 'We already know why' }));
    fireEvent.change(screen.getByLabelText('Anything to add? (optional)'), {
      target: { value: 'Off-season' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Turn it off' }));
    expect(onNotUseful).toHaveBeenCalledWith('We already know why: Off-season');
  });

  it('starts on It’s normal and goes Back to the rows', () => {
    const { onNotUseful } = open();
    fireEvent.click(screen.getByText('Not useful…'));
    fireEvent.click(
      screen.getAllByRole('button', { name: 'Back' })[0] as HTMLElement,
    );
    expect(screen.getByText('Snooze 1 day')).toBeInTheDocument();
    expect(onNotUseful).not.toHaveBeenCalled();
  });
});
