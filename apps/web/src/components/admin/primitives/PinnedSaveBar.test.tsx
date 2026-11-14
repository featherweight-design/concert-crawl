// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ContentPaneSlotContext } from '@/components/admin/shell/content-pane-slot';
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

  it('stacks the message over a row of both buttons', () => {
    render(
      <PinnedSaveBar
        {...props({
          phone: true,
          look: {
            gap: 8,
            stack: true,
            padding: '10px 16px 24px',
            messageStyle: { fontSize: 12 },
            discardVariant: 'outline',
            discardStyle: { height: 44 },
            saveStyle: { flex: 1, height: 44 },
          },
        })}
      />,
    );
    const bar = screen.getByTestId('bar');
    expect(bar.style.flexDirection).toBe('column');
    expect(bar.style.alignItems).toBe('');
    const save = screen.getByRole('button', { name: 'Save' });
    const row = save.parentElement;
    expect(row).not.toBe(bar);
    expect(row?.parentElement).toBe(bar);
    expect(row?.style.gap).toBe('8px');
    expect(screen.getByRole('button', { name: 'Discard' }).parentElement).toBe(
      row,
    );
    expect(save.style.height).toBe('44px');
  });

  const paneLook: PinnedSaveBarProps['look'] = {
    gap: 10,
    padding: '0 28px',
    messageStyle: {},
    discardVariant: 'ghost',
    pane: { height: 64 },
    barStyle: { borderRadius: 0 },
  };

  it('renders into the content pane slot, out over its gutters', () => {
    const slot = document.createElement('div');
    document.body.appendChild(slot);
    try {
      render(
        <ContentPaneSlotContext.Provider value={slot}>
          <PinnedSaveBar
            {...props({
              look: paneLook,
              failure: { title: 'Couldn’t save', saved: 'Still saved.' },
            })}
          />
        </ContentPaneSlotContext.Provider>,
      );
      const bar = screen.getByTestId('bar');
      expect(bar.parentElement).toBe(slot);
      expect(bar.style.position).toBe('sticky');
      expect(bar.style.bottom).toBe('0px');
      expect(bar.style.height).toBe('64px');
      expect(bar.style.margin).toBe('0px -28px -24px');
      expect(bar.style.borderRadius).toBe('0px');
      // The toast keeps to the page's column, not the bar's width.
      const toastBox = screen
        .getByTestId('save-failed')
        .closest('[style*="bottom: calc"]');
      expect(toastBox?.getAttribute('style')).toContain('left: 28px');
      expect(toastBox?.getAttribute('style')).not.toContain('right: 0px');
    } finally {
      cleanup();
      slot.remove();
    }
  });

  it('stays inline, with no gutter run-out, outside the shell', () => {
    render(<PinnedSaveBar {...props({ look: paneLook })} />);
    const bar = screen.getByTestId('bar');
    expect(bar.style.position).toBe('sticky');
    expect(bar.style.height).toBe('64px');
    expect(bar.style.margin).toBe('');
  });

  it('keeps one row when not stacked', () => {
    render(<PinnedSaveBar {...props()} />);
    const bar = screen.getByTestId('bar');
    expect(bar.style.flexDirection).toBe('');
    expect(bar.style.alignItems).toBe('center');
    expect(screen.getByRole('button', { name: 'Save' }).parentElement).toBe(
      bar,
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

  describe('inline', () => {
    it('draws a plain right-aligned row: no message, no bar, not pinned', () => {
      render(<PinnedSaveBar {...props({ variant: 'inline' })} />);
      const row = screen.getByTestId('bar');
      expect(row.style.position).toBe('relative');
      expect(row.style.justifyContent).toBe('flex-end');
      expect(row.style.gap).toBe('8px');
      expect(row.style.border).toBe('');
      expect(row.style.background).toBe('');
      expect(screen.queryByText('1 unsaved change')).toBeNull();
      expect(screen.getAllByRole('button')).toHaveLength(2);
    });

    it('floats a failure above the row while the edit stays', () => {
      render(
        <PinnedSaveBar
          {...props({
            variant: 'inline',
            failure: { title: 'Nope', saved: 'Still saved.' },
          })}
        />,
      );
      expect(
        screen.getByTestId('bar').contains(screen.getByTestId('save-failed')),
      ).toBe(true);
    });
  });
});
