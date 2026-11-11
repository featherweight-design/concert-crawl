// @vitest-environment jsdom

import '@testing-library/jest-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

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
