// @vitest-environment jsdom

import '@testing-library/jest-dom';
import { describe, it, expect, vi, afterEach } from 'vitest';
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
