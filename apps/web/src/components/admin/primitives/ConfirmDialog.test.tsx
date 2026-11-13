// @vitest-environment jsdom
import '@testing-library/jest-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { Trash2 } from 'lucide-react';
import { ConfirmDialog } from './ConfirmDialog';

const setPhone = (matches: boolean) => {
  window.matchMedia = vi.fn().mockImplementation(() => ({
    matches,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
};

beforeEach(() => setPhone(false));
afterEach(cleanup);

const renderDialog = (
  props: Partial<Parameters<typeof ConfirmDialog>[0]> = {},
) => {
  const onConfirm = vi.fn();
  const onCancel = vi.fn();
  render(
    <ConfirmDialog
      title="Pause crawling Levitt Pavilion?"
      body="Its 18 shows stay listed."
      confirmLabel="Pause crawling"
      onConfirm={onConfirm}
      onCancel={onCancel}
      {...props}
    />,
  );
  return { onConfirm, onCancel };
};

describe('ConfirmDialog', () => {
  it('names the action on its button and confirms once', () => {
    const { onConfirm } = renderDialog();
    fireEvent.click(screen.getByRole('button', { name: 'Pause crawling' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('is a centred dialog on desktop', () => {
    renderDialog();
    expect(
      screen.getByRole('dialog', { name: 'Pause crawling Levitt Pavilion?' }),
    ).toBeInTheDocument();
    expect(screen.queryByTestId('admin-sheet')).toBeNull();
  });

  it('is a sheet on the phone', () => {
    setPhone(true);
    renderDialog();
    expect(screen.getByTestId('admin-sheet')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Pause crawling Levitt Pavilion?' }),
    ).toBeVisible();
  });

  it.each([
    ['desktop', false],
    ['phone', true],
  ])('sets overflow-wrap on a long unbroken title on %s', (_label, phone) => {
    setPhone(phone);
    const title = `Make @${'x'.repeat(50)} an admin?`;
    renderDialog({ title });
    expect(
      screen.getByRole('heading', { name: title }).style.overflowWrap,
    ).toBe('anywhere');
  });

  it('opens on Cancel on the phone, never on a dangerous action', () => {
    setPhone(true);
    renderDialog({ tone: 'danger' });
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus();
  });

  it('cancels on Escape, but not while pending', () => {
    const first = renderDialog();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(first.onCancel).toHaveBeenCalledTimes(1);
    cleanup();
    const second = renderDialog({ pending: true });
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(second.onCancel).not.toHaveBeenCalled();
    expect(
      screen.getByRole('button', { name: 'Pause crawling' }),
    ).toBeDisabled();
  });

  it('dims the confirm while pending, and not before', () => {
    renderDialog();
    expect(
      screen.getByRole('button', { name: 'Pause crawling' }).style.opacity,
    ).toBe('');
    cleanup();
    renderDialog({ pending: true });
    expect(
      screen.getByRole('button', { name: 'Pause crawling' }).style.opacity,
    ).toBe('0.45');
  });

  it('confirmDisabled holds only the confirm, and draws its icon', () => {
    const { onConfirm, onCancel } = renderDialog({
      confirmDisabled: true,
      confirmIcon: Trash2,
    });
    const confirm = screen.getByRole('button', { name: 'Pause crawling' });
    expect(confirm).toBeDisabled();
    expect(confirm.style.opacity).toBe('0.45');
    expect(confirm.style.cursor).toBe('default');
    expect(confirm.querySelector('svg')).not.toBeNull();
    fireEvent.click(confirm);
    expect(onConfirm).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
