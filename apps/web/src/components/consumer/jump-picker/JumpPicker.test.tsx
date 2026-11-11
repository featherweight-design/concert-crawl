// @vitest-environment jsdom

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { JumpPicker, dotsForCount } from './JumpPicker';
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy';

// jsdom + Vitest do not ship the @testing-library/jest-dom matchers in this
// repo (memory:feedback_no_type_casting bans `as` casts), so these tests read
// raw DOM properties instead of jest-dom helpers like toHaveAttribute.
const buttonByLabel = (label: string): HTMLButtonElement => {
  const node = screen.getByLabelText(label);
  if (!(node instanceof HTMLButtonElement)) {
    throw new Error(`Expected "${label}" to be an HTMLButtonElement`);
  }
  return node;
};

const availability = new Map<string, number>([
  ['2026-04-28', 2],
  ['2026-05-02', 3],
]);

function setup(overrides = {}) {
  const onPick = vi.fn();
  const onClose = vi.fn();
  render(
    <JumpPicker
      open
      onClose={onClose}
      selectedDate="2026-04-28"
      today="2026-04-28"
      availability={availability}
      onPick={onPick}
      {...overrides}
    />,
  );
  return { onPick, onClose };
}

describe('JumpPicker', () => {
  it('renders nothing when closed', () => {
    const { container } = render(
      <JumpPicker
        open={false}
        onClose={vi.fn()}
        selectedDate="2026-04-28"
        today="2026-04-28"
        availability={availability}
        onPick={vi.fn()}
      />,
    );
    expect(container.innerHTML).toBe('');
  });

  it('renders a dialog labelled by the visible month', () => {
    setup();
    const dialog = screen.getByRole('dialog');
    expect(dialog.getAttribute('aria-label')).toContain('April 2026');
  });

  it('marks the selected day with aria-selected', () => {
    setup();
    const sel = screen.getByRole('gridcell', {
      name: /Tuesday, April 28, 2 shows, today/,
    });
    expect(sel.getAttribute('aria-selected')).toBe('true');
  });

  it('encodes show count in the aria-label, not just the dot', () => {
    setup();
    // Page to May so May 2 is in-month and its count clause is present.
    fireEvent.click(buttonByLabel('Next month'));
    expect(
      screen.getByRole('gridcell', { name: /Saturday, May 2, 3 shows/ }),
    ).toBeTruthy();
  });

  it('disables past and out-of-month days', () => {
    setup();
    // April 27 is in-month but before today → disabled.
    const past = screen.getByRole('gridcell', { name: /Monday, April 27/ });
    expect(past.getAttribute('aria-disabled')).toBe('true');
  });

  it('calls onPick with the ISO date when a future in-month day is chosen', () => {
    const { onPick } = setup();
    // April 29 is in-month and after today → selectable in the default view.
    fireEvent.click(
      screen.getByRole('gridcell', { name: /Wednesday, April 29/ }),
    );
    expect(onPick).toHaveBeenCalledWith('2026-04-29');
  });

  it('calls onPick for a day reached by paging to its month', () => {
    const { onPick } = setup();
    // May 2 is an out-of-month spill in April; page to May, then it is in-month.
    fireEvent.click(buttonByLabel('Next month'));
    fireEvent.click(
      screen.getByRole('gridcell', { name: /Saturday, May 2, 3 shows/ }),
    );
    expect(onPick).toHaveBeenCalledWith('2026-05-02');
  });

  it('pages to the next month with the pager', () => {
    setup();
    fireEvent.click(buttonByLabel('Next month'));
    expect(screen.getByRole('dialog').getAttribute('aria-label')).toContain(
      'May 2026',
    );
  });

  it('selects today when the footer Today reset is clicked', () => {
    const { onPick } = setup({ selectedDate: '2026-05-15' });
    // Page away from the current month first, so the reset has real work to do —
    // it must select today via onPick, not merely re-view the current month.
    fireEvent.click(buttonByLabel('Next month'));
    fireEvent.click(
      screen.getByRole('button', { name: CONSUMER_COPY.jumpPickerToday }),
    );
    expect(onPick).toHaveBeenCalledWith('2026-04-28');
  });

  it('closes on Escape', () => {
    const { onClose } = setup();
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });

  it('calls onClose once for Escape pressed inside the grid', () => {
    const { onClose } = setup();
    // Escape in the grid must bubble to the dialog root and close exactly once,
    // not fire onClose in both the grid and root handlers.
    fireEvent.keyDown(screen.getByRole('grid'), { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('moves focus with arrow keys and skips disabled days', () => {
    setup();
    // Selected day (Apr 28) is focused on open; ArrowRight → Apr 29.
    fireEvent.keyDown(screen.getByRole('grid'), { key: 'ArrowRight' });
    const target = screen.getByRole('gridcell', {
      name: /Wednesday, April 29/,
    });
    expect(document.activeElement).toBe(target);
  });

  it('does not page before the current month (atMin)', () => {
    setup();
    expect(buttonByLabel('Previous month').disabled).toBe(true);
  });

  it('keys day cells by ISO date so paging reuses the same DOM node', () => {
    setup();
    // 2026-04-28 (today) sits at grid index 30 in April but index 2 in the May
    // grid's leading spill. Keyed by ISO, React reuses the same DOM node across
    // the page; keyed by array index it would rebind that node to a new date,
    // sticking stale focus/aria state to the wrong day.
    const aprNode = document.querySelector('[data-iso="2026-04-28"]');
    fireEvent.click(buttonByLabel('Next month'));
    const mayNode = document.querySelector('[data-iso="2026-04-28"]');
    expect(mayNode).not.toBeNull();
    expect(mayNode).toBe(aprNode);
  });

  it('lands the roving tab-stop on today when paging back to the current month', () => {
    setup();
    // Page forward to May, then back to April (the current/min month). April 1
    // is in the past (disabled), so the single tab-stop must land on today
    // rather than a dead disabled cell.
    fireEvent.click(buttonByLabel('Next month'));
    fireEvent.click(buttonByLabel('Previous month'));
    const todayCell = document.querySelector('[data-iso="2026-04-28"]');
    const firstCell = document.querySelector('[data-iso="2026-04-01"]');
    expect(todayCell?.getAttribute('tabindex')).toBe('0');
    expect(firstCell?.getAttribute('tabindex')).toBe('-1');
  });
});

describe('JumpPicker B+ grid', () => {
  it('maps a show count to one, two or three volume dots', () => {
    expect(dotsForCount(0)).toBe(0);
    expect(dotsForCount(1)).toBe(1);
    expect(dotsForCount(2)).toBe(1);
    expect(dotsForCount(4)).toBe(2);
    expect(dotsForCount(12)).toBe(3);
  });

  it('draws the dots in the cell and none on a day without shows', () => {
    setup();
    const busy = document.querySelector('[data-iso="2026-04-28"]');
    const quiet = document.querySelector('[data-iso="2026-04-29"]');
    expect(
      busy?.querySelectorAll('[data-testid="jump-dots"] > span'),
    ).toHaveLength(1);
    expect(
      quiet?.querySelectorAll('[data-testid="jump-dots"] > span'),
    ).toHaveLength(0);
  });

  it('lays the month out Monday-first, under a visible title', () => {
    setup();
    expect(
      screen.getByRole('heading', {
        name: CONSUMER_COPY.jumpPickerDialogPrefix,
      }),
    ).toBeTruthy();
    // April 2026 starts on a Wednesday: Mon Mar 30 and Tue Mar 31 lead the
    // grid, so April 1 is the third cell.
    const cells = document.querySelectorAll('[role="gridcell"]');
    expect(cells[0]?.getAttribute('data-iso')).toBe('2026-03-30');
    expect(cells[2]?.getAttribute('data-iso')).toBe('2026-04-01');
  });

  it('marks today for the signal outline', () => {
    setup({ selectedDate: '2026-04-30' });
    const todayCell = document.querySelector('[data-iso="2026-04-28"]');
    expect(todayCell?.getAttribute('data-today')).toBe('true');
    expect(todayCell?.getAttribute('style')).toContain('var(--signal)');
  });
});

describe('JumpPicker as a modal sheet', () => {
  it('is modal and closes on Escape pressed anywhere in the document', () => {
    const { onClose } = setup();
    expect(screen.getByRole('dialog').getAttribute('aria-modal')).toBe('true');
    fireEvent.keyDown(document.body, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('keeps Tab inside the dialog', () => {
    setup();
    const dialog = screen.getByRole('dialog');
    const today = screen.getByRole('button', {
      name: CONSUMER_COPY.jumpPickerToday,
    });
    today.focus();
    // Today is the last focusable control; Tab wraps to the first.
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(dialog.contains(document.activeElement)).toBe(true);
    expect(document.activeElement).not.toBe(today);
  });

  it('hides blank spill days from assistive tech but keeps them keyed', () => {
    setup();
    const spill = document.querySelector('[data-iso="2026-03-30"]');
    expect(spill).not.toBeNull();
    expect(spill?.getAttribute('aria-hidden')).toBe('true');
    const inMonth = document.querySelector('[data-iso="2026-04-29"]');
    expect(inMonth?.getAttribute('aria-hidden')).toBeNull();
  });
});

describe('JumpPicker Home and End (Monday-first)', () => {
  it('End moves to the Sunday that closes the week', () => {
    // Thu Apr 30 2026: a Monday-first week ends Sun May 3 (Sunday-first
    // would stop at Sat May 2).
    setup({ selectedDate: '2026-04-30' });
    fireEvent.keyDown(screen.getByRole('grid'), { key: 'End' });
    expect(document.activeElement?.getAttribute('data-iso')).toBe('2026-05-03');
  });

  it('Home moves to the Monday, walking forward past days already gone', () => {
    // Mon Apr 27 is before today (Apr 28), so Home lands on today.
    setup({ selectedDate: '2026-04-30' });
    fireEvent.keyDown(screen.getByRole('grid'), { key: 'Home' });
    expect(document.activeElement?.getAttribute('data-iso')).toBe('2026-04-28');
  });

  it('Home lands on the Monday itself when it is selectable', () => {
    // Thu May 7 sits in the week of Mon May 4.
    setup({ selectedDate: '2026-05-07' });
    fireEvent.keyDown(screen.getByRole('grid'), { key: 'Home' });
    expect(document.activeElement?.getAttribute('data-iso')).toBe('2026-05-04');
  });
});
