// @vitest-environment jsdom
import '@testing-library/jest-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { Search, X } from 'lucide-react';
import { RowMenu, RowMenuItems } from './RowMenu';

afterEach(cleanup);

const renderMenu = () => {
  const onChange = vi.fn();
  const onNot = vi.fn();
  render(
    <RowMenu
      label="More for Cashmere"
      items={[
        {
          key: 'change',
          icon: Search,
          label: 'Change match…',
          hint: 'Pick another Spotify artist.',
          disabled: true,
          onSelect: onChange,
        },
        {
          key: 'not',
          icon: X,
          label: 'Not an artist…',
          hint: 'A tour name, promoter, series or sports.',
          muted: true,
          divided: true,
          onSelect: onNot,
        },
      ]}
    />,
  );
  fireEvent.click(screen.getByRole('button', { name: 'More for Cashmere' }));
  return { onChange, onNot };
};

describe('RowMenu', () => {
  it('keeps the menu open on a disabled item, and does nothing', () => {
    const { onChange } = renderMenu();
    const item = screen.getByRole('menuitem', { name: /Change match/ });
    expect(item).toHaveAttribute('aria-disabled', 'true');
    fireEvent.mouseDown(item);
    fireEvent.click(item);
    expect(
      screen.getByRole('menu', { name: 'More for Cashmere' }),
    ).toBeVisible();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('runs an enabled item, closes, and hands focus back to ⋯', () => {
    const { onNot } = renderMenu();
    fireEvent.click(screen.getByRole('menuitem', { name: /Not an artist/ }));
    expect(onNot).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('menu')).toBeNull();
    expect(
      screen.getByRole('button', { name: 'More for Cashmere' }),
    ).toHaveFocus();
  });

  it('draws a warning item in the warning colour, label and icon', () => {
    render(
      <RowMenu
        label="More for Ball Arena"
        items={[
          {
            key: 'hide',
            icon: X,
            label: 'Hide from site…',
            hint: 'Removes the venue and its shows from the app.',
            warning: true,
            onSelect: vi.fn(),
          },
        ]}
      />,
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'More for Ball Arena' }),
    );
    const item = screen.getByRole('menuitem', { name: /Hide from site/ });
    const [tile, text] = Array.from(item.querySelectorAll(':scope > span'));
    const label = text?.querySelector('span');
    expect(tile instanceof HTMLElement && tile.style.color).toBe(
      'var(--warning)',
    );
    expect(label instanceof HTMLElement && label.style.color).toBe(
      'var(--warning)',
    );
  });

  it('draws a success item in the success colour, label and icon (43/approve-menu-d)', () => {
    render(
      <RowMenu
        label="Price actions"
        items={[
          {
            key: 'approve',
            icon: Search,
            label: 'Approve',
            hint: 'Publishes $44 to fans now.',
            success: true,
            onSelect: vi.fn(),
          },
        ]}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Price actions' }));
    const item = screen.getByRole('menuitem', { name: /Approve/ });
    const [tile, text] = Array.from(item.querySelectorAll(':scope > span'));
    const label = text?.querySelector('span');
    expect(tile instanceof HTMLElement && tile.style.color).toBe(
      'var(--success)',
    );
    expect(label instanceof HTMLElement && label.style.color).toBe(
      'var(--success)',
    );
  });

  it("can't be opened while disabled, and reports opening and closing", () => {
    const onOpenChange = vi.fn();
    const { rerender } = render(
      <RowMenu
        label="Price actions"
        disabled
        onOpenChange={onOpenChange}
        items={[
          { key: 'a', icon: Search, label: 'A', hint: 'a', onSelect: vi.fn() },
        ]}
      />,
    );
    const trigger = screen.getByRole('button', { name: 'Price actions' });
    // aria-disabled, so it keeps focus; a press still does nothing.
    expect(trigger).not.toBeDisabled();
    expect(trigger).toHaveAttribute('aria-disabled', 'true');
    fireEvent.click(trigger);
    expect(screen.queryByRole('menu')).toBeNull();
    expect(onOpenChange).not.toHaveBeenCalled();
    rerender(
      <RowMenu
        label="Price actions"
        onOpenChange={onOpenChange}
        items={[
          { key: 'a', icon: Search, label: 'A', hint: 'a', onSelect: vi.fn() },
        ]}
      />,
    );
    fireEvent.click(trigger);
    expect(onOpenChange).toHaveBeenLastCalledWith(true);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
  });

  it('closes and reports it when the ⋯ goes busy, or the row unmounts, while open', () => {
    const onOpenChange = vi.fn();
    const items = [
      { key: 'a', icon: Search, label: 'A', hint: 'a', onSelect: vi.fn() },
    ];
    const { rerender, unmount } = render(
      <RowMenu
        label="Price actions"
        onOpenChange={onOpenChange}
        items={items}
      />,
    );
    const trigger = screen.getByRole('button', { name: 'Price actions' });
    fireEvent.click(trigger);
    expect(screen.getByRole('menu')).toBeVisible();
    rerender(
      <RowMenu
        label="Price actions"
        disabled
        onOpenChange={onOpenChange}
        items={items}
      />,
    );
    expect(screen.queryByRole('menu')).toBeNull();
    expect(onOpenChange).toHaveBeenLastCalledWith(false);

    rerender(
      <RowMenu
        label="Price actions"
        onOpenChange={onOpenChange}
        items={items}
      />,
    );
    fireEvent.click(trigger);
    expect(onOpenChange).toHaveBeenLastCalledWith(true);
    const calls = onOpenChange.mock.calls.length;
    unmount();
    expect(onOpenChange).toHaveBeenCalledTimes(calls + 1);
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
  });

  it('draws RowMenuItems as plain buttons outside a menu, marked by testId', () => {
    const onSelect = vi.fn();
    const item = {
      key: 'approve',
      icon: Search,
      label: 'Approve',
      hint: 'Publishes $44 to fans now.',
      onSelect,
    };
    render(
      <RowMenuItems
        items={[item]}
        onPick={(picked) => picked.onSelect()}
        testId="sheet"
      />,
    );
    expect(screen.queryByRole('menuitem')).toBeNull();
    const button = screen.getByTestId('sheet-approve');
    expect(button).not.toHaveAttribute('tabindex');
    fireEvent.click(button);
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it('closes on Escape with focus back on ⋯', () => {
    renderMenu();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('menu')).toBeNull();
    expect(
      screen.getByRole('button', { name: 'More for Cashmere' }),
    ).toHaveFocus();
  });
});
