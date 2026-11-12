// @vitest-environment jsdom

import React from 'react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { BottomSheet } from '../BottomSheet';

afterEach(cleanup);

describe('BottomSheet', () => {
  it('renders nothing when open=false', () => {
    const { container } = render(
      <BottomSheet open={false} onClose={() => {}} title="test">
        <button>inside</button>
      </BottomSheet>,
    );
    expect(container.innerHTML).toBe('');
  });

  it('is a dialog with aria-modal when open', () => {
    render(
      <BottomSheet open onClose={() => {}} title="test">
        <button>inside</button>
      </BottomSheet>,
    );
    const dialog = screen.getByRole('dialog');
    expect(dialog.getAttribute('aria-modal')).toBe('true');
  });

  // Anchored to the bottom edge of a wide viewport this read as a stray
  // drawer, so it centers from sm up — one media query, not a second tree.
  it('is a bottom sheet on mobile and a centered modal from sm up', () => {
    render(
      <BottomSheet open onClose={() => {}} title="test">
        <button>inside</button>
      </BottomSheet>,
    );
    const dialog = screen.getByRole('dialog');

    expect(dialog.className).toContain('bottom-0');
    expect(dialog.className).toContain('rounded-t-2xl');

    expect(dialog.className).toContain('sm:inset-0');
    expect(dialog.className).toContain('sm:m-auto');
    expect(dialog.className).toContain('sm:h-fit');
    expect(dialog.className).toContain('sm:max-w-md');
    expect(dialog.className).toContain('sm:rounded-2xl');
  });

  it('closes on Escape', () => {
    const onClose = vi.fn();
    render(
      <BottomSheet open onClose={onClose} title="test">
        <button>inside</button>
      </BottomSheet>,
    );
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  // Escape is not a phone gesture and the backdrop above a tall sheet can be a
  // sliver, so the sheet carries its own visible close (#1358).
  it('renders a named close button that dismisses the sheet', () => {
    const onClose = vi.fn();
    render(
      <BottomSheet open onClose={onClose} title="test">
        <p>no interactives here</p>
      </BottomSheet>,
    );
    const close = screen.getByRole('button', { name: 'Close' });
    fireEvent.click(close);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('gives the close button a 44px tap target', () => {
    render(
      <BottomSheet open onClose={() => {}} title="test">
        <p>body</p>
      </BottomSheet>,
    );
    const close = screen.getByRole('button', { name: 'Close' });
    expect(close.className).toContain('h-11');
    expect(close.className).toContain('w-11');
  });

  it('lands initial focus on the close button, first in the sheet', () => {
    render(
      <BottomSheet open onClose={() => {}} title="test">
        <button>inside</button>
      </BottomSheet>,
    );
    expect(document.activeElement).toBe(
      screen.getByRole('button', { name: 'Close' }),
    );
  });

  it('pulls focus back into the sheet if Tab is pressed while focus is outside', () => {
    render(
      <>
        <button data-testid="outside-before">outside-before</button>
        <BottomSheet open onClose={() => {}} title="test">
          <button data-testid="inside-first">inside-first</button>
          <button data-testid="inside-last">inside-last</button>
        </BottomSheet>
      </>,
    );
    // Force focus outside the sheet.
    const outside = screen.getByTestId('outside-before');
    outside.focus();
    expect(document.activeElement).toBe(outside);
    fireEvent.keyDown(document, { key: 'Tab' });
    // The sheet's own close button is its first focusable.
    expect(document.activeElement).toBe(
      screen.getByRole('button', { name: 'Close' }),
    );
  });

  it('keeps the default modal width when no maxWidth is given', () => {
    render(
      <BottomSheet open onClose={() => {}} title="test">
        <button>inside</button>
      </BottomSheet>,
    );
    const dialog = screen.getByRole('dialog');
    expect(dialog.className).toContain('sm:max-w-md');
    expect(dialog.className).not.toContain('--sheet-max');
    expect(dialog.style.getPropertyValue('--sheet-max')).toBe('');
  });

  it('sets the modal width from maxWidth through a --sheet-max variable', () => {
    render(
      <BottomSheet open onClose={() => {}} title="test" maxWidth={480}>
        <button>inside</button>
      </BottomSheet>,
    );
    const dialog = screen.getByRole('dialog');
    expect(dialog.className).toContain('sm:max-w-[var(--sheet-max)]');
    expect(dialog.className).not.toContain('sm:max-w-md');
    expect(dialog.style.getPropertyValue('--sheet-max')).toBe('480px');
  });

  it('keeps the plain bordered dialog from sm up unless edgeFromSm is set', () => {
    const { rerender } = render(
      <BottomSheet open onClose={() => {}} title="test">
        <button>inside</button>
      </BottomSheet>,
    );
    const plain = screen.getByRole('dialog').className;
    expect(plain).toContain('max-sm:sheet-edge');
    expect(plain).toContain('sm:border-border');

    rerender(
      <BottomSheet open onClose={() => {}} title="test" edgeFromSm>
        <button>inside</button>
      </BottomSheet>,
    );
    const edged = screen.getByRole('dialog').className;
    // The gradient edge now draws at every width, with no flat border to
    // cover it from sm up.
    expect(edged).toContain('sheet-edge');
    expect(edged).not.toContain('max-sm:sheet-edge');
    expect(edged).not.toContain('sm:border-border');
  });

  it('draws the close as text when closeText is given, with no X icon', () => {
    const onClose = vi.fn();
    render(
      <BottomSheet open onClose={onClose} title="test" closeText="Cancel">
        <button>inside</button>
      </BottomSheet>,
    );
    const close = screen.getByRole('button', { name: 'Cancel' });
    expect(close.querySelector('svg')).toBeNull();
    fireEvent.click(close);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes when the scrim is clicked', () => {
    const onClose = vi.fn();
    const { container } = render(
      <BottomSheet open onClose={onClose} title="test">
        <button>inside</button>
      </BottomSheet>,
    );
    const scrim = container.querySelector('[aria-hidden="true"]');
    expect(scrim).not.toBeNull();
    fireEvent.click(scrim!);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
