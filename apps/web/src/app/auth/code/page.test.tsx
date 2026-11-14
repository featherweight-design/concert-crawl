// @vitest-environment jsdom

import '@testing-library/jest-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

// The server action pulls in next/headers; the link under test never calls it.
const { validateAndSetInviteCode } = vi.hoisted(() => ({
  validateAndSetInviteCode: vi.fn(),
}));
vi.mock('./actions', () => ({ validateAndSetInviteCode }));
vi.mock('@/components/waitlist/WaitlistModal', () => ({
  WaitlistModal: () => null,
}));

import InviteCodePage from './page';

describe('invite-code screen links the Private Beta Agreement (#1619)', () => {
  it('renders a link to /legal/beta named after the agreement', () => {
    render(<InviteCodePage />);

    const link = screen.getByRole('link', { name: 'Private Beta Agreement' });
    expect(link).toHaveAttribute('href', '/legal/beta');
    expect(link.closest('p')).toHaveTextContent(
      'By continuing you agree to our Private Beta Agreement.',
    );
  });
});

describe('invite-code screen pre-fills a code from a poster link', () => {
  afterEach(() => {
    window.history.replaceState(null, '', '/');
    validateAndSetInviteCode.mockReset();
  });

  it('fills the field from ?code= and redeems nothing until pressed', () => {
    window.history.replaceState(null, '', '/auth/code?code=beta-ab12-cd34');
    render(<InviteCodePage />);

    expect(screen.getByRole('textbox')).toHaveValue('BETA-AB12-CD34');
    expect(validateAndSetInviteCode).not.toHaveBeenCalled();
  });

  it('leaves the field empty without a code', () => {
    window.history.replaceState(null, '', '/auth/code');
    render(<InviteCodePage />);

    expect(screen.getByRole('textbox')).toHaveValue('');
  });
});

// admin addendum-3 12/code-ended-fan-m: a code an admin ended is a page.
describe('invite-code screen shows "This code has ended"', () => {
  afterEach(() => {
    window.history.replaceState(null, '', '/');
    validateAndSetInviteCode.mockReset();
  });

  it('replaces the form with the ended page, with two ways on', async () => {
    validateAndSetInviteCode.mockResolvedValue({ ok: false, error: 'ended' });
    window.history.replaceState(null, '', '/auth/code?code=beta-ab12-cd34');
    render(<InviteCodePage />);

    fireEvent.click(screen.getByRole('button', { name: /continue/i }));

    expect(await screen.findByText('This code has ended')).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(
      screen.getByRole('link', { name: "See what's on in Denver" }),
    ).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute(
      'href',
      '/sign-in',
    );
    // The board's "still open to everyone" is not true while the beta is
    // invite-only, so the page does not say it.
    expect(screen.queryByText(/open to everyone/i)).toBeNull();
  });
});
