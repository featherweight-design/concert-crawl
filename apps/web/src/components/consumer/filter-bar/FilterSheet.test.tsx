// @vitest-environment jsdom

import '@testing-library/jest-dom';
import { describe, it, expect, vi, beforeAll, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import Link from 'next/link';
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy';
import { FilterSheet } from './FilterSheet';

afterEach(cleanup);

const options = [
  { value: 'small', label: 'Under 500' },
  { value: 'large', label: '2,000 and up' },
];

const renderBesideCards = (
  props: Partial<Parameters<typeof FilterSheet>[0]>,
) => {
  const onCardClick = vi.fn((event: React.MouseEvent) =>
    event.preventDefault(),
  );
  const onSelect = vi.fn();
  const onClose = vi.fn();
  const view = render(
    <div data-testid="list">
      <Link href="/venues/some-venue" onClick={onCardClick}>
        A venue card
      </Link>
      <FilterSheet
        open
        title="Capacity"
        placeholder="Any size"
        options={options}
        value=""
        onSelect={onSelect}
        onClose={onClose}
        {...props}
      />
    </div>,
  );
  return { view, onCardClick, onSelect, onClose };
};

describe('FilterSheet', () => {
  it('renders into the body, not inside the list it sits beside', () => {
    renderBesideCards({});
    const dialog = screen.getByRole('dialog', { name: 'Capacity filter' });
    expect(document.body).toContainElement(dialog);
    expect(screen.getByTestId('list')).not.toContainElement(dialog);
  });

  it('selects once and closes once on an option tap, and never reaches the card', () => {
    const { onCardClick, onSelect, onClose } = renderBesideCards({});
    fireEvent.click(screen.getByRole('button', { name: 'Under 500' }));
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith('small');
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onCardClick).not.toHaveBeenCalled();
  });

  it('clears with the placeholder row, unless the filter is always on', () => {
    const first = renderBesideCards({ value: 'small' });
    fireEvent.click(screen.getByRole('button', { name: 'Any size' }));
    expect(first.onSelect).toHaveBeenCalledWith('');
    cleanup();
    renderBesideCards({ alwaysOn: true });
    expect(screen.queryByRole('button', { name: 'Any size' })).toBeNull();
  });

  it('closes from the scrim without reaching the card', () => {
    const { onCardClick, onClose } = renderBesideCards({});
    fireEvent.click(
      screen.getByRole('button', {
        name: CONSUMER_COPY.filterBar.filterSheet.closeAriaLabel,
      }),
    );
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onCardClick).not.toHaveBeenCalled();
  });

  it('draws nothing when closed', () => {
    renderBesideCards({ open: false });
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});

// jsdom has no PointerEvent, and React reads pointerId and clientY off it.
beforeAll(() => {
  if (typeof window.PointerEvent !== 'undefined') return;
  class PointerEventStub extends MouseEvent {
    pointerId: number;
    pointerType: string;
    constructor(type: string, init: PointerEventInit = {}) {
      super(type, init);
      this.pointerId = init.pointerId ?? 1;
      this.pointerType = init.pointerType ?? 'touch';
    }
  }
  Object.defineProperty(window, 'PointerEvent', {
    value: PointerEventStub,
    configurable: true,
  });
});

const stubPhone = (phone: boolean) => {
  vi.stubGlobal('matchMedia', (query: string): MediaQueryList => ({
    matches: phone && query.includes('max-width'),
    media: query,
    onchange: null,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    addListener: () => undefined,
    removeListener: () => undefined,
    dispatchEvent: () => false,
  }));
};

describe('FilterSheet on a phone', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('is dragged down by its handle to dismiss', () => {
    stubPhone(true);
    const { onClose } = renderBesideCards({});
    const handle = screen
      .getByRole('dialog', { name: 'Capacity filter' })
      .querySelector('div');
    expect(handle).not.toBeNull();
    if (handle === null) return;
    fireEvent.pointerDown(handle, { pointerId: 1, clientY: 0 });
    fireEvent.pointerMove(handle, { pointerId: 1, clientY: 160 });
    fireEvent.pointerUp(handle, { pointerId: 1, clientY: 160 });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes on Escape and keeps Tab inside', () => {
    stubPhone(true);
    const { onClose } = renderBesideCards({});
    const dialog = screen.getByRole('dialog', { name: 'Capacity filter' });
    expect(dialog).toHaveFocus();
    const last = Array.from(
      dialog.querySelectorAll<HTMLElement>('button:not(:disabled)'),
    ).pop();
    last?.focus();
    fireEvent.keyDown(document, { key: 'Tab' });
    // Wrapped to the first control inside the sheet, not out behind the scrim.
    expect(dialog).toContainElement(document.activeElement as HTMLElement);
    expect(document.activeElement).not.toBe(last);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe('FilterSheet kept mounted but hidden at desktop width', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('does not close on Escape or take focus', () => {
    stubPhone(false);
    const { onClose } = renderBesideCards({});
    const dialog = screen.getByRole('dialog', { name: 'Capacity filter' });
    expect(dialog).not.toHaveFocus();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();
  });
});
