// @vitest-environment jsdom

import '@testing-library/jest-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';

// The server action pulls in next/headers; the link under test never calls it.
const { validateAndSetInviteCode, releaseInviteCode } = vi.hoisted(() => ({
  validateAndSetInviteCode: vi.fn(),
  releaseInviteCode: vi.fn(),
}));
vi.mock('./actions', () => ({ validateAndSetInviteCode, releaseInviteCode }));
vi.mock('@/components/waitlist/WaitlistModal', () => ({
  WaitlistModal: () => null,
}));

import InviteCodePage from './page';
import { copy } from './definitions/copy';

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

describe('invite-code screen (custom auth restyle)', () => {
  afterEach(() => {
    window.history.replaceState(null, '', '/');
    validateAndSetInviteCode.mockReset();
    releaseInviteCode.mockReset();
    vi.useRealTimers();
  });

  const press = () =>
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));
  const type = (value: string) =>
    fireEvent.change(screen.getByRole('textbox'), { target: { value } });

  it('names the step in the trail and links to sign in', () => {
    render(<InviteCodePage />);
    expect(screen.getByText('Step 1 of 3')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Enter your invite code' }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'Sign in' })[0]).toHaveAttribute(
      'href',
      '/sign-in',
    );
  });

  it('says nothing on an empty field, the paste hint while typing and "Looks good" when whole', () => {
    render(<InviteCodePage />);
    expect(screen.queryByText(copy.hint.paste)).toBeNull();
    type('BETA-7KQ');
    expect(screen.getByText(copy.hint.paste)).toBeInTheDocument();
    type('BETA-7KQ2-M9XD');
    expect(screen.getByText(copy.hint.valid)).toBeInTheDocument();
    expect(screen.queryByText(copy.hint.paste)).toBeNull();
  });

  it('shows "You\'re invited" for a code from the link, and the plain page once they type', () => {
    window.history.replaceState(null, '', '/auth/code?code=beta-7kq2-m9xd');
    render(<InviteCodePage />);
    expect(
      screen.getByRole('heading', { name: copy.prefilled.heading }),
    ).toBeInTheDocument();
    expect(screen.getByText(copy.prefilled.body)).toBeInTheDocument();
    type('REDROCKS');
    expect(
      screen.getByRole('heading', { name: copy.heading }),
    ).toBeInTheDocument();
  });

  it('adds where to go next to a used code', async () => {
    validateAndSetInviteCode.mockResolvedValue({ ok: false, error: 'used' });
    render(<InviteCodePage />);
    type('REDROCKS');
    press();
    expect(
      await screen.findByText(/already been redeemed/),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: copy.usedNext.link }),
    ).toHaveAttribute('href', '/sign-in');
    expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'true');
  });

  it('adds the waitlist to an expired code', async () => {
    validateAndSetInviteCode.mockResolvedValue({ ok: false, error: 'expired' });
    render(<InviteCodePage />);
    type('REDROCKS');
    press();
    expect(await screen.findByText(/has expired/)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: copy.expiredNext.link }),
    ).toBeInTheDocument();
  });

  it('locks the field and counts down after too many tries', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    validateAndSetInviteCode.mockResolvedValue({
      ok: false,
      error: 'ratelimit',
    });
    render(<InviteCodePage />);
    type('REDROCKS');
    press();
    await act(async () => {});
    expect(screen.getByText(copy.errors.ratelimit)).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toBeDisabled();
    const wait = screen.getByRole('button', { name: /try again in 3:00/i });
    expect(wait).toBeDisabled();
    await act(async () => {
      vi.advanceTimersByTime(181_000);
    });
    expect(screen.getByRole('textbox')).toBeEnabled();
    expect(
      screen.getByRole('button', { name: copy.button.idle }),
    ).toBeEnabled();
  });

  it('shows the plain page for a link whose code is nothing usable', () => {
    window.history.replaceState(null, '', '/auth/code?code=!!!');
    render(<InviteCodePage />);
    expect(
      screen.getByRole('heading', { name: copy.heading }),
    ).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toHaveValue('');
  });

  it('drops "You\'re invited" once the link\'s own code is refused', async () => {
    validateAndSetInviteCode.mockResolvedValue({
      ok: false,
      error: 'notfound',
    });
    window.history.replaceState(null, '', '/auth/code?code=beta-7kq2-m9xd');
    render(<InviteCodePage />);
    press();
    expect(await screen.findByText(copy.errors.notfound)).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: copy.heading }),
    ).toBeInTheDocument();
  });

  it('clears the spent "too many attempts" line and refocuses the field when the lock ends', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    validateAndSetInviteCode.mockResolvedValue({
      ok: false,
      error: 'ratelimit',
    });
    render(<InviteCodePage />);
    type('REDROCKS');
    press();
    await act(async () => {});
    await act(async () => {
      vi.advanceTimersByTime(181_000);
    });
    expect(screen.queryByText(copy.errors.ratelimit)).toBeNull();
    await waitFor(() => expect(screen.getByRole('textbox')).toHaveFocus());
  });

  it('says so when the release of the old code fails', async () => {
    window.history.replaceState(null, '', '/auth/code?change=1');
    releaseInviteCode.mockRejectedValue(new Error('boom'));
    render(<InviteCodePage />);
    expect(
      await screen.findByText(copy.errors.server_error),
    ).toBeInTheDocument();
  });

  it('releases the code they redeemed when they came to use a different one, once', () => {
    window.history.replaceState(null, '', '/auth/code?change=1');
    releaseInviteCode.mockResolvedValue(undefined);
    render(<InviteCodePage />);
    expect(releaseInviteCode).toHaveBeenCalledOnce();
  });

  it('takes change=1 out of the address once it has released, keeping the rest', () => {
    window.history.replaceState(
      null,
      '',
      '/auth/code?change=1&redirect_url=%2Fe%2Fabc',
    );
    releaseInviteCode.mockResolvedValue(undefined);
    render(<InviteCodePage />);
    expect(window.location.search).toBe('?redirect_url=%2Fe%2Fabc');
    // A remount (Back, Forward, reload) finds nothing left to release.
    cleanup();
    render(<InviteCodePage />);
    expect(releaseInviteCode).toHaveBeenCalledOnce();
  });

  it('releases nothing on an ordinary visit', () => {
    render(<InviteCodePage />);
    expect(releaseInviteCode).not.toHaveBeenCalled();
  });
});

// admin addendum-3 12/code-ended-fan-m: a code an admin ended is a page.
describe('invite-code screen shows "This code has ended"', () => {
  afterEach(() => {
    window.history.replaceState(null, '', '/');
    validateAndSetInviteCode.mockReset();
  });

  it('replaces the form with the ended page, with two ways on and a way back', async () => {
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

  // addendum 6 item 42: the way back is a third, quieter exit.
  it('"Enter it" returns to the code form, empty and focused', async () => {
    validateAndSetInviteCode.mockResolvedValue({ ok: false, error: 'ended' });
    window.history.replaceState(null, '', '/auth/code?code=beta-ab12-cd34');
    render(<InviteCodePage />);
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));
    await screen.findByText('This code has ended');

    expect(screen.getByText('Have another code?')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Enter it' }));

    const field = await screen.findByRole('textbox');
    expect(field).toHaveValue('');
    // The field is disabled until the redeem's transition settles, so the
    // focus lands a moment after it mounts.
    await waitFor(() => expect(field).toHaveFocus());
    // The ended code is not carried over, and the ended page is gone.
    expect(screen.queryByText('This code has ended')).toBeNull();
    // The focused field draws the board's signal border.
    expect(field).toHaveClass('border-signal');
  });

  // The race behind a flaky run: the field is disabled while a redeem's
  // transition is pending, and a disabled input cannot take focus. Pressing
  // Enter it in that window must still end with focus in the field.
  it('focuses the field once a redeem that was still pending settles', async () => {
    let finish: () => void = () => {};
    validateAndSetInviteCode.mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = () => resolve({ ok: false, error: 'ended' });
        }),
    );
    render(<InviteCodePage />);
    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'REDROCKS' },
    });
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));
    // Pending: the form is disabled and nothing is focused.
    expect(screen.getByRole('textbox')).toBeDisabled();
    await act(async () => {
      finish();
    });
    await screen.findByText('This code has ended');
    fireEvent.click(screen.getByRole('button', { name: 'Enter it' }));
    const field = await screen.findByRole('textbox');
    await waitFor(() => expect(field).toBeEnabled());
    await waitFor(() => expect(field).toHaveFocus());
  });

  it('ends again after another ended code, and the way back still works', async () => {
    validateAndSetInviteCode.mockResolvedValue({ ok: false, error: 'ended' });
    render(<InviteCodePage />);

    for (const code of ['REDROCKS', 'WINTERFEST']) {
      fireEvent.change(screen.getByRole('textbox'), {
        target: { value: code },
      });
      fireEvent.click(screen.getByRole('button', { name: /continue/i }));
      await screen.findByText('This code has ended');
      fireEvent.click(screen.getByRole('button', { name: 'Enter it' }));
      const field = await screen.findByRole('textbox');
      expect(field).toHaveValue('');
      await waitFor(() => expect(field).toHaveFocus());
    }
  });
});
