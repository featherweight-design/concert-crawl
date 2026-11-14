// @vitest-environment jsdom
import '@testing-library/jest-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import { DateField, TimeField, parseTime } from './pickers';

const COPY = ADMIN_COPY.eventEdit.pickers;

afterEach(cleanup);

describe('parseTime', () => {
  it('reads the ways a time gets typed', () => {
    expect(parseTime('7:30 PM')).toBe('19:30');
    expect(parseTime('7pm')).toBe('19:00');
    expect(parseTime('12:00 am')).toBe('00:00');
    expect(parseTime('12 pm')).toBe('12:00');
    expect(parseTime('19:30')).toBe('19:30');
  });

  it('refuses what is not a time', () => {
    expect(parseTime('25:00')).toBeNull();
    expect(parseTime('13 pm')).toBeNull();
    expect(parseTime('7:75')).toBeNull();
    expect(parseTime('soon')).toBeNull();
  });
});

describe('DateField on desktop', () => {
  it('opens the month, picks a day, and rings today', () => {
    const onChange = vi.fn();
    render(
      <DateField
        id="d"
        value="2026-11-14"
        onChange={onChange}
        today="2026-11-12"
        phone={false}
        withYear
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Sat, Nov 14, 2026' }));
    expect(screen.getByRole('dialog', { name: 'November 2026' })).toBeVisible();
    expect(
      screen.getByRole('button', { name: 'Sat, Nov 14, 2026', pressed: true }),
    ).toBeInTheDocument();
    expect(screen.getByText(COPY.pastAllowed)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Fri, Nov 20, 2026' }));
    expect(onChange).toHaveBeenCalledWith('2026-11-20');
  });

  it('bars days before `min` (Postponed takes future dates only)', () => {
    const onChange = vi.fn();
    render(
      <DateField
        id="d"
        value="2026-11-14"
        onChange={onChange}
        today="2026-11-12"
        min="2026-11-12"
        phone={false}
        withYear={false}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Sat, Nov 14' }));
    expect(
      screen.getByRole('button', { name: 'Tue, Nov 10, 2026' }),
    ).toBeDisabled();
    expect(screen.getByText(COPY.futureOnly)).toBeInTheDocument();
  });

  it('uses the OS date picker on the phone', () => {
    render(
      <DateField
        id="d"
        value="2026-11-14"
        onChange={vi.fn()}
        today="2026-11-12"
        phone
        withYear={false}
      />,
    );
    expect(document.getElementById('d')).toHaveAttribute('type', 'date');
  });
});

describe('TimeField on desktop', () => {
  it('takes a typed time on Enter, or a half hour from the list', () => {
    const onChange = vi.fn();
    render(
      <TimeField
        id="t"
        value="18:00:00"
        onChange={onChange}
        phone={false}
        placeholder="—"
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: '6:00 PM' }));
    expect(
      screen.getByRole('option', { name: '6:00 PM', selected: true }),
    ).toBeInTheDocument();
    const field = screen.getByDisplayValue('6:00 PM');
    fireEvent.change(field, { target: { value: '7:15 pm' } });
    fireEvent.keyDown(field, { key: 'Enter' });
    expect(onChange).toHaveBeenCalledWith('19:15');
  });
});
