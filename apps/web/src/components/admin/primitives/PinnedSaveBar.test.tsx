// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { PinnedSaveBar, type PinnedSaveBarProps } from './PinnedSaveBar';

const LABELS = { discard: 'Discard', save: 'Save', saving: 'Saving…' };

const props = (over: Partial<PinnedSaveBarProps> = {}): PinnedSaveBarProps => ({
  phone: false,
  dirty: true,
  saving: false,
  testId: 'bar',
  message: '1 unsaved change',
  labels: LABELS,
  failure: null,
  onDiscard: vi.fn(),
  onSave: vi.fn(),
  look: {
    gap: 8,
    padding: '10px 16px',
    messageStyle: { fontSize: 12 },
    discardVariant: 'outline',
  },
  ...over,
});

afterEach(cleanup);

describe('PinnedSaveBar', () => {
  it('renders nothing while clean and nothing failed', () => {
    const { container } = render(
      <PinnedSaveBar {...props({ dirty: false })} />,
    );
    expect(container.innerHTML).toBe('');
  });

  it('shows the message, Discard and Save while dirty, and wires both', () => {
    const onDiscard = vi.fn();
    const onSave = vi.fn();
    render(<PinnedSaveBar {...props({ onDiscard, onSave })} />);
    expect(screen.getByTestId('bar')).toBeTruthy();
    expect(screen.getByText('1 unsaved change')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Discard' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(onDiscard).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it('names Saving and disables both buttons while saving', () => {
    render(<PinnedSaveBar {...props({ saving: true })} />);
    const save = screen.getByRole('button', { name: 'Saving…' });
    expect(save).toHaveProperty('disabled', true);
    expect(screen.getByRole('button', { name: 'Discard' })).toHaveProperty(
      'disabled',
      true,
    );
  });

  it('applies the call site look', () => {
    render(
      <PinnedSaveBar
        {...props({
          phone: true,
          look: {
            gap: 10,
            wrap: true,
            padding: '12px 16px 24px',
            messageStyle: { color: 'var(--warning)' },
            discardVariant: 'ghost',
            saveStyle: { flex: 1 },
          },
        })}
      />,
    );
    const bar = screen.getByTestId('bar');
    expect(bar.style.gap).toBe('10px');
    expect(bar.style.flexWrap).toBe('wrap');
    expect(bar.style.padding).toBe('12px 16px 24px');
    expect(bar.style.borderRadius).toBe('0px');
    expect(screen.getByText('1 unsaved change').style.color).toBe(
      'var(--warning)',
    );
    expect(screen.getByRole('button', { name: 'Save' }).style.flex).not.toBe(
      '',
    );
  });

  it('floats a failure above the bar, with Try again only when retryable', () => {
    const onRetry = vi.fn();
    render(
      <PinnedSaveBar
        {...props({
          failure: { title: 'Couldn’t save', saved: 'Still saved.', onRetry },
        })}
      />,
    );
    expect(screen.getByTestId('bar')).toBeTruthy();
    expect(screen.getByTestId('save-failed').textContent).toContain(
      'Still saved.',
    );
    expect(screen.getAllByRole('button')).toHaveLength(3);
  });

  it('keeps a failure on screen once the bar is down, without Try again', () => {
    render(
      <PinnedSaveBar
        {...props({
          dirty: false,
          failure: { title: 'Couldn’t save', saved: 'Still saved.' },
        })}
      />,
    );
    expect(screen.queryByTestId('bar')).toBeNull();
    expect(screen.getByTestId('save-failed')).toBeTruthy();
    expect(screen.queryAllByRole('button')).toHaveLength(0);
  });
});
