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
    // Morning or evening? A bare hour needs its am or pm.
    expect(parseTime('7')).toBeNull();
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
        label="Doors"
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: '6:00 PM' }));
    expect(
      screen.getByRole('option', { name: '6:00 PM', selected: true }),
    ).toBeInTheDocument();
    const field = screen.getByRole('textbox', { name: 'Doors' });
    fireEvent.change(field, { target: { value: '7:15 pm' } });
    fireEvent.keyDown(field, { key: 'Enter' });
    expect(onChange).toHaveBeenCalledWith('19:15');

    fireEvent.click(screen.getByRole('button', { name: '6:00 PM' }));
    fireEvent.click(screen.getByRole('option', { name: '8:30 PM' }));
    expect(onChange).toHaveBeenLastCalledWith('20:30');
  });

  it('clears on an emptied field, and flags text that is not a time', () => {
    const onChange = vi.fn();
    render(
      <TimeField
        id="t"
        value="18:00:00"
        onChange={onChange}
        phone={false}
        placeholder="—"
        label="Doors"
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: '6:00 PM' }));
    const field = screen.getByRole('textbox', { name: 'Doors' });
    fireEvent.change(field, { target: { value: '7' } });
    expect(field).toHaveAttribute('aria-invalid', 'true');
    fireEvent.keyDown(field, { key: 'Enter' });
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.change(field, { target: { value: '' } });
    fireEvent.keyDown(field, { key: 'Enter' });
    expect(onChange).toHaveBeenCalledWith(null);
  });

  describe('where the list opens', () => {
    // jsdom lays nothing out, so every offset reads 0. Stand in the drawn
    // geometry: 28 options 34px tall, 4px apart, in a 240px window. Before
    // the fix nothing ever set the list's scrollTop, so it stayed 0 (10:00 AM
    // at the top) whatever the value, and the centring, off-grid and bottom
    // assertions fail. jsdom doesn't clamp scrollTop either, so the bottom
    // case proves the code clamps it.
    const ROW = 34;
    const STEP = ROW + 4;
    const WINDOW = 240;
    const SLOTS = 28;
    const SCROLL_HEIGHT = SLOTS * STEP - 4;
    const BOTTOM = SCROLL_HEIGHT - WINDOW;
    afterEach(() => vi.restoreAllMocks());
    /** Renders with `value`, opens the list, and returns it. */
    const openAt = (value: string) => {
      render(
        <TimeField
          id="t"
          value={value}
          onChange={vi.fn()}
          phone={false}
          placeholder="—"
          label="Show"
        />,
      );
      fireEvent.click(screen.getByRole('button'));
      return screen.getByRole('listbox');
    };
    const layOut = () => {
      vi.spyOn(HTMLElement.prototype, 'offsetTop', 'get').mockImplementation(
        function offsetTop(this: HTMLElement) {
          const parent = this.parentElement;
          if (this.getAttribute('role') !== 'option' || parent === null) {
            return 0;
          }
          return Array.from(parent.children).indexOf(this) * STEP;
        },
      );
      vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(
        ROW,
      );
      vi.spyOn(Element.prototype, 'clientHeight', 'get').mockImplementation(
        function clientHeight(this: Element) {
          return this.getAttribute('role') === 'listbox' ? WINDOW : 0;
        },
      );
      vi.spyOn(Element.prototype, 'scrollHeight', 'get').mockImplementation(
        function scrollHeight(this: Element) {
          return this.getAttribute('role') === 'listbox' ? SCROLL_HEIGHT : 0;
        },
      );
    };

    it('centres the nearest half hour to an off-grid time, with no check', () => {
      layOut();
      // 7:15 PM rounds to 7:30 PM (index 19).
      expect(openAt('19:15:00').scrollTop).toBe(19 * STEP - (WINDOW - ROW) / 2);
      expect(
        screen.queryByRole('option', { selected: true }),
      ).not.toBeInTheDocument();
    });

    it('opens an off-grid time past the last slot at the bottom', () => {
      layOut();
      // 11:45 PM is past 11:30 PM, the last slot.
      expect(openAt('23:45').scrollTop).toBe(BOTTOM);
      expect(
        screen.queryByRole('option', { selected: true }),
      ).not.toBeInTheDocument();
    });

    it('opens an off-grid time before the first slot at the top', () => {
      layOut();
      expect(openAt('09:00').scrollTop).toBe(0);
    });

    it('clamps at the top for the first slots', () => {
      layOut();
      expect(openAt('10:00').scrollTop).toBe(0);
      cleanup();
      expect(openAt('10:30').scrollTop).toBe(0);
    });

    it('clamps at the bottom for the last slot', () => {
      layOut();
      // Centring 11:30 PM (index 27) would ask for 923, past the 820 end.
      expect(27 * STEP - (WINDOW - ROW) / 2).toBeGreaterThan(BOTTOM);
      expect(openAt('23:30').scrollTop).toBe(BOTTOM);
      expect(
        screen.getByRole('option', { name: '11:30 PM', selected: true }),
      ).toBeInTheDocument();
    });

    it('centres the chosen half hour', () => {
      layOut();
      // 7:30 PM is the 20th half hour from 10:00 AM (index 19).
      expect(openAt('19:30:00').scrollTop).toBe(19 * STEP - (WINDOW - ROW) / 2);
    });

    it('stays at the top with no time chosen', () => {
      layOut();
      render(
        <TimeField
          id="t"
          value={null}
          onChange={vi.fn()}
          phone={false}
          placeholder="Add a time"
          label="Show"
        />,
      );
      fireEvent.click(screen.getByRole('button', { name: 'Add a time' }));
      expect(screen.getByRole('listbox').scrollTop).toBe(0);
    });
  });
});

describe('DateField on the phone', () => {
  it('refuses a typed date before `min`', () => {
    const onChange = vi.fn();
    render(
      <DateField
        id="d"
        value="2026-11-14"
        onChange={onChange}
        today="2026-11-12"
        min="2026-11-12"
        phone
        withYear={false}
      />,
    );
    const field = document.getElementById('d');
    if (field === null) throw new Error('field');
    fireEvent.change(field, { target: { value: '2026-11-01' } });
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.change(field, { target: { value: '2026-11-20' } });
    expect(onChange).toHaveBeenCalledWith('2026-11-20');
  });
});

describe('a host form’s field look (Add a show)', () => {
  it('draws the height, the danger border and the error line’s id', () => {
    render(
      <>
        <DateField
          id="d"
          value=""
          onChange={vi.fn()}
          today="2026-11-12"
          phone={false}
          withYear={false}
          height={38}
          invalid
          describedBy="d-error"
        />
        <TimeField
          id="t"
          value={null}
          onChange={vi.fn()}
          phone
          placeholder="—"
          label="Doors"
          height={38}
          invalid
          describedBy="t-error"
        />
      </>,
    );
    const date = document.getElementById('d');
    const time = document.getElementById('t');
    if (date === null || time === null) throw new Error('fields');
    expect(date).toHaveStyle({ height: '38px' });
    expect(date.getAttribute('style')).toContain('var(--danger)');
    expect(date).toHaveAttribute('aria-describedby', 'd-error');
    expect(time).toHaveStyle({ height: '38px' });
    expect(time.getAttribute('style')).toContain('var(--danger)');
    expect(time).toHaveAttribute('aria-invalid', 'true');
    expect(time).toHaveAttribute('aria-describedby', 't-error');
  });

  it('marks the phone’s native date input invalid, and not when valid', () => {
    const { rerender } = render(
      <DateField
        id="d"
        value=""
        onChange={vi.fn()}
        today="2026-11-12"
        phone
        withYear={false}
        invalid
        describedBy="d-error"
      />,
    );
    const date = () => {
      const field = document.getElementById('d');
      if (field === null) throw new Error('field');
      return field;
    };
    expect(date()).toHaveAttribute('type', 'date');
    expect(date()).toHaveAttribute('aria-invalid', 'true');
    expect(date()).toHaveAttribute('aria-describedby', 'd-error');
    rerender(
      <DateField
        id="d"
        value=""
        onChange={vi.fn()}
        today="2026-11-12"
        phone
        withYear={false}
      />,
    );
    expect(date()).not.toHaveAttribute('aria-invalid');
  });

  it('draws the desktop field’s danger border only when invalid', () => {
    const props = {
      id: 'd',
      value: '',
      onChange: vi.fn(),
      today: '2026-11-12',
      phone: false,
      withYear: false,
    };
    const { rerender } = render(<DateField {...props} invalid />);
    const date = () => {
      const field = document.getElementById('d');
      if (field === null) throw new Error('field');
      return field;
    };
    // A button takes no aria-invalid: the border and the error line say it.
    expect(date().tagName).toBe('BUTTON');
    expect(date().getAttribute('style')).toContain('var(--danger)');
    rerender(<DateField {...props} />);
    expect(date().getAttribute('style')).not.toContain('var(--danger)');
    // `invalid` outranks Postponed's amber highlight.
    rerender(<DateField {...props} highlight invalid />);
    expect(date().getAttribute('style')).toContain('var(--danger)');
    expect(date().getAttribute('style')).not.toContain('var(--warning)');
  });

  it('keeps Event edit’s 40px field with no error state by default', () => {
    render(
      <DateField
        id="d"
        value=""
        onChange={vi.fn()}
        today="2026-11-12"
        phone
        withYear={false}
      />,
    );
    const date = document.getElementById('d');
    if (date === null) throw new Error('field');
    expect(date).toHaveStyle({ height: '40px' });
    expect(date).not.toHaveAttribute('aria-invalid');
    expect(date).not.toHaveAttribute('aria-describedby');
  });
});
