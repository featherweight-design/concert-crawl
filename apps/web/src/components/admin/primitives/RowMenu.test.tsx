// @vitest-environment jsdom
import '@testing-library/jest-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { Search, X } from 'lucide-react';
import { RowMenu } from './RowMenu';

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

  it('closes on Escape with focus back on ⋯', () => {
    renderMenu();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('menu')).toBeNull();
    expect(
      screen.getByRole('button', { name: 'More for Cashmere' }),
    ).toHaveFocus();
  });
});
