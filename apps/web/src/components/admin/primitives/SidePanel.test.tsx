// @vitest-environment jsdom
import '@testing-library/jest-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { SidePanel } from './SidePanel';

afterEach(cleanup);

const renderPanel = (props: Partial<Parameters<typeof SidePanel>[0]> = {}) => {
  const onClose = vi.fn();
  render(
    <SidePanel title="Monthly LLM budget" onClose={onClose} {...props}>
      <input aria-label="Budget" />
      <button type="button" disabled>
        Save
      </button>
    </SidePanel>,
  );
  return onClose;
};

describe('SidePanel', () => {
  it('is a modal dialog named by its title, with focus inside', () => {
    renderPanel();
    expect(
      screen.getByRole('dialog', { name: 'Monthly LLM budget' }),
    ).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByRole('button', { name: 'Close' })).toHaveFocus();
  });

  it('closes on X, on the scrim and on Escape', () => {
    const onClose = renderPanel();
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    fireEvent.click(screen.getByTestId('side-panel-scrim'));
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(3);
  });

  it('does not close on a click inside the panel', () => {
    const onClose = renderPanel();
    fireEvent.click(screen.getByRole('textbox', { name: 'Budget' }));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('wraps Tab past a disabled control', () => {
    renderPanel();
    const input = screen.getByRole('textbox', { name: 'Budget' });
    input.focus();
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(screen.getByRole('button', { name: 'Close' })).toHaveFocus();
  });

  it('holds still mid-request, its X included', () => {
    const onClose = renderPanel({ dismissible: false });
    fireEvent.click(screen.getByTestId('side-panel-scrim'));
    fireEvent.keyDown(document, { key: 'Escape' });
    const close = screen.getByRole('button', { name: 'Close' });
    expect(close).toBeDisabled();
    fireEvent.click(close);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('inline mode has no scrim and no modal claim', () => {
    renderPanel({ inline: true });
    expect(screen.queryByTestId('side-panel-scrim')).toBeNull();
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByTestId('side-panel')).toBeInTheDocument();
  });

  // `02/needs-you-desktop`: docked flush right, full height, 440 wide.
  it('docks the inline panel flush to the right edge at 440 and full height', () => {
    renderPanel({ inline: true });
    const panel = screen.getByTestId('side-panel');
    expect(panel.style.position).toBe('fixed');
    expect(panel.style.right).toBe('0px');
    expect(panel.style.bottom).toBe('0px');
    expect(panel.style.width).toBe('440px');
  });
});
