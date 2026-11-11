// @vitest-environment jsdom
import '@testing-library/jest-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';

const { mint } = vi.hoisted(() => ({
  mint: vi.fn(async () => ({ ok: true, code: 'BETA-AB12-CD34' })),
}));
vi.mock('@/app/(protected)/admin/invite-codes/actions', () => ({
  mintInviteCodeWithOptions: mint,
}));

import { InviteCreatorPanel, parseSeats } from './InviteCreatorPanel';

const seatsField = () => screen.getByRole('spinbutton');

describe('InviteCreatorPanel', () => {
  afterEach(() => {
    cleanup();
    mint.mockClear();
  });

  it('starts a labelled code at 50 seats, a plain one at 1', () => {
    render(<InviteCreatorPanel />);
    expect(seatsField()).toHaveValue(1);
    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'Hi-Dive bathroom' },
    });
    expect(seatsField()).toHaveValue(50);
  });

  it('lets the seat field be cleared and retyped', async () => {
    render(<InviteCreatorPanel />);
    fireEvent.change(seatsField(), { target: { value: '' } });
    expect(seatsField()).toHaveValue(null);
    fireEvent.change(seatsField(), { target: { value: '50' } });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /mint code/i }));
    });
    expect(mint).toHaveBeenCalledWith(expect.objectContaining({ maxUses: 50 }));
    expect(screen.getByText(/BETA-AB12-CD34 · 50 seats/)).toBeInTheDocument();
  });

  it('starts fresh after a mint, so the next one is a personal code', async () => {
    render(<InviteCreatorPanel />);
    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'Hi-Dive bathroom' },
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /mint code/i }));
    });
    expect(screen.getByRole('textbox')).toHaveValue('');
    expect(seatsField()).toHaveValue(1);
  });

  it('refuses a seat count the API would not take, rather than rewriting it', () => {
    expect(parseSeats('50')).toBe(50);
    for (const typed of ['', '0', '12.7', 'abc', '501']) {
      expect(parseSeats(typed)).toBeNull();
    }
  });

  it('holds Mint shut while the seat count is invalid', () => {
    render(<InviteCreatorPanel />);
    fireEvent.change(seatsField(), { target: { value: '' } });
    expect(screen.getByRole('button', { name: /mint code/i })).toBeDisabled();
    fireEvent.change(seatsField(), { target: { value: '20' } });
    expect(screen.getByRole('button', { name: /mint code/i })).toBeEnabled();
  });
});
