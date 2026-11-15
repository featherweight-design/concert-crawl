// @vitest-environment jsdom
import '@testing-library/jest-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';

const mocks = vi.hoisted(() => ({
  signIn: {
    status: 'needs_identifier',
    password: vi.fn(),
    finalize: vi.fn(),
    create: vi.fn(),
    emailCode: { sendCode: vi.fn(), verifyCode: vi.fn() },
    mfa: { sendEmailCode: vi.fn(), verifyEmailCode: vi.fn() },
    supportedSecondFactors: [{ strategy: 'email_code' }] as
      { strategy: string }[] | null,
  },
  clerk: { loaded: true },
  replace: vi.fn(),
  push: vi.fn(),
}));

vi.mock('@clerk/nextjs', () => ({
  useClerk: () => mocks.clerk,
  useSignIn: () => ({ signIn: mocks.signIn }),
}));
vi.mock('@clerk/nextjs/errors', () => ({
  isClerkAPIResponseError: (err: unknown) =>
    Boolean(err && typeof err === 'object' && 'errors' in err),
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mocks.replace, push: mocks.push }),
}));

import { SIGN_IN_COPY } from '../definitions/copy';
import { FLOOR_MS, RESET_FLOOR_MS } from '@/lib/auth/timing-pad';
import { SignInFlow } from './SignInFlow';

const COPY = SIGN_IN_COPY;
const clerkError = (status: number, ...codes: string[]) => ({
  status,
  errors: codes.map((code) => ({ code })),
});

beforeEach(() => {
  vi.useFakeTimers();
  mocks.clerk.loaded = true;
  mocks.signIn.status = 'needs_identifier';
  mocks.signIn.password.mockReset().mockResolvedValue({ error: null });
  mocks.signIn.finalize.mockReset().mockResolvedValue({ error: null });
  mocks.signIn.create.mockReset().mockResolvedValue({ error: null });
  mocks.signIn.emailCode.sendCode
    .mockReset()
    .mockResolvedValue({ error: null });
  mocks.signIn.emailCode.verifyCode
    .mockReset()
    .mockResolvedValue({ error: null });
  mocks.signIn.mfa.sendEmailCode.mockReset().mockResolvedValue({ error: null });
  mocks.signIn.mfa.verifyEmailCode
    .mockReset()
    .mockResolvedValue({ error: null });
  mocks.signIn.supportedSecondFactors = [{ strategy: 'email_code' }];
  vi.spyOn(window.navigator, 'onLine', 'get').mockReturnValue(true);
  mocks.replace.mockReset();
  mocks.push.mockReset();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

function toPassword(email = 'fan@example.com') {
  render(<SignInFlow returnTo="/events" />);
  fireEvent.change(screen.getByLabelText(COPY.start.emailLabel), {
    target: { value: email },
  });
  fireEvent.click(screen.getByRole('button', { name: COPY.start.continue }));
}

async function press(password = 'Quartz-Ember-42!') {
  fireEvent.change(screen.getByLabelText(COPY.password.label), {
    target: { value: password },
  });
  fireEvent.click(screen.getByRole('button', { name: COPY.password.submit }));
  await act(async () => {
    await vi.advanceTimersByTimeAsync(FLOOR_MS);
  });
}

describe('SignInFlow, start', () => {
  it('shows the title and email field, with the invite-code link and no Google button', () => {
    render(<SignInFlow returnTo="/events/42" />);
    expect(
      screen.getByRole('heading', { name: COPY.start.title }),
    ).toBeInTheDocument();
    const email = screen.getByLabelText(COPY.start.emailLabel);
    expect(email).toHaveAttribute('autocomplete', 'username');
    expect(screen.queryByText(/google/i)).toBeNull();
    expect(
      screen.getByRole('link', { name: COPY.start.footBetaLink }),
    ).toHaveAttribute('href', '/auth/code?redirect_url=%2Fevents%2F42');
  });

  it('refuses a malformed address on the page, without asking Clerk', () => {
    render(<SignInFlow returnTo="/events" />);
    fireEvent.change(screen.getByLabelText(COPY.start.emailLabel), {
      target: { value: 'not an email' },
    });
    fireEvent.click(screen.getByRole('button', { name: COPY.start.continue }));
    const input = screen.getByLabelText(COPY.start.emailLabel);
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveFocus();
    expect(screen.getByText(COPY.start.emailInvalid)).toBeInTheDocument();
    expect(mocks.signIn.password).not.toHaveBeenCalled();
  });

  it('takes any address to the password screen without a Clerk call', () => {
    toPassword('nobody@example.com');
    expect(
      screen.getByRole('heading', { name: COPY.password.title }),
    ).toBeInTheDocument();
    expect(mocks.signIn.password).not.toHaveBeenCalled();
  });

  it('Change returns to the email, kept', () => {
    toPassword();
    fireEvent.click(screen.getByRole('button', { name: COPY.password.change }));
    expect(screen.getByLabelText(COPY.start.emailLabel)).toHaveValue(
      'fan@example.com',
    );
  });
});

describe('SignInFlow, password', () => {
  it('finalizes a complete sign-in and goes to the return path', async () => {
    toPassword();
    mocks.signIn.status = 'complete';
    mocks.signIn.finalize.mockImplementation(
      async (args: {
        navigate: (ctx: {
          session: null;
          decorateUrl: (to: string) => string;
        }) => Promise<void>;
      }) => {
        await args.navigate({ session: null, decorateUrl: (to) => to });
        return { error: null };
      },
    );
    await press();
    expect(mocks.signIn.password).toHaveBeenCalledWith({
      identifier: 'fan@example.com',
      password: 'Quartz-Ember-42!',
    });
    expect(mocks.replace).toHaveBeenCalledWith('/events');
  });

  it.each([
    'form_password_incorrect',
    'form_identifier_not_found',
    'user_locked',
    'strategy_for_user_invalid',
  ])('reads %s as the one didn’t-work line, password cleared', async (code) => {
    toPassword();
    mocks.signIn.password.mockResolvedValue({ error: clerkError(422, code) });
    await press();
    expect(screen.getByText(COPY.password.didntWork)).toBeInTheDocument();
    expect(screen.getByLabelText(COPY.password.label)).toHaveValue('');
    expect(screen.getByLabelText(COPY.password.label)).toHaveFocus();
  });

  it('holds a fast answer back until the floor', async () => {
    toPassword();
    mocks.signIn.password.mockResolvedValue({
      error: clerkError(422, 'form_identifier_not_found'),
    });
    fireEvent.change(screen.getByLabelText(COPY.password.label), {
      target: { value: 'x' },
    });
    fireEvent.click(screen.getByRole('button', { name: COPY.password.submit }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(FLOOR_MS - 1);
    });
    expect(screen.queryByText(COPY.password.didntWork)).toBeNull();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
    expect(screen.getByText(COPY.password.didntWork)).toBeInTheDocument();
  });

  it('keeps focus on the button while it works', async () => {
    toPassword();
    fireEvent.change(screen.getByLabelText(COPY.password.label), {
      target: { value: 'x' },
    });
    const button = screen.getByRole('button', { name: COPY.password.submit });
    button.focus();
    fireEvent.click(button);
    const busy = screen.getByRole('button', { name: COPY.password.busy });
    expect(busy).toHaveAttribute('aria-busy', 'true');
    // Held with aria-disabled, not `disabled`: focus stays on the button.
    expect(busy).toBe(button);
    expect(busy).toHaveFocus();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(FLOOR_MS);
    });
  });

  it('sends a breached password, or a forced new one, to the reset screen', async () => {
    toPassword();
    mocks.signIn.password.mockResolvedValue({
      error: clerkError(
        422,
        'form_password_not_strong_enough',
        'form_password_pwned__sign_in',
      ),
    });
    await press();
    expect(
      screen.getByRole('heading', { name: COPY.breached.title }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: COPY.breached.button }));
    expect(mocks.push).toHaveBeenCalledWith(
      '/sign-in/forgot?redirect_url=%2Fevents',
    );
  });

  it('reads needs_new_password as breached', async () => {
    toPassword();
    mocks.signIn.status = 'needs_new_password';
    await press();
    expect(
      screen.getByRole('heading', { name: COPY.breached.title }),
    ).toBeInTheDocument();
  });

  it('shows the generic line for a captcha refusal or a 429, never a refusal', async () => {
    toPassword();
    mocks.signIn.password.mockResolvedValue({
      error: clerkError(400, 'captcha_invalid'),
    });
    await press();
    expect(screen.getByText(COPY.failed)).toBeInTheDocument();
    expect(screen.queryByText(COPY.password.didntWork)).toBeNull();
  });

  it('reads a 429 as the wait, never as a wrong password, even when it carries a wrong-credential code', async () => {
    toPassword();
    mocks.signIn.password.mockResolvedValue({
      error: clerkError(429, 'form_password_incorrect', 'too_many_requests'),
    });
    await press();
    expect(screen.getByText(COPY.rateLimited.message)).toBeInTheDocument();
    expect(screen.queryByText(COPY.password.didntWork)).toBeNull();
  });

  it('does not hang on "Signing in" when finalize throws', async () => {
    toPassword();
    mocks.signIn.status = 'complete';
    mocks.signIn.finalize.mockRejectedValue(new Error('network'));
    await press();
    expect(screen.getByText(COPY.failed)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: COPY.password.submit }),
    ).not.toHaveAttribute('aria-busy');
  });

  it('does not carry a typed password to another email after Change', async () => {
    toPassword();
    mocks.signIn.password.mockResolvedValue({
      error: clerkError(422, 'form_password_or_identifier_incorrect'),
    });
    await press('first-try-1');
    fireEvent.click(screen.getByRole('button', { name: COPY.password.change }));
    fireEvent.change(screen.getByLabelText(COPY.start.emailLabel), {
      target: { value: 'other@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: COPY.start.continue }));
    expect(screen.getByLabelText(COPY.password.label)).toHaveValue('');
    expect(screen.queryByText(COPY.password.didntWork)).toBeNull();
  });

  it('never says whether an email has an account', async () => {
    toPassword();
    mocks.signIn.password.mockResolvedValue({
      error: clerkError(422, 'form_identifier_not_found'),
    });
    await press();
    expect(document.body.textContent).not.toMatch(
      /no account|doesn.t exist|not found|couldn.t find/i,
    );
  });
});

async function toEmailCode() {
  toPassword();
  fireEvent.click(
    screen.getByRole('button', { name: COPY.password.codeInstead }),
  );
  // The send is two Clerk calls, so it is held to the higher floor.
  await act(async () => {
    await vi.advanceTimersByTimeAsync(RESET_FLOOR_MS);
  });
}

async function enterCode(code = '123456') {
  fireEvent.change(screen.getByLabelText('6-digit code'), {
    target: { value: code },
  });
  fireEvent.click(
    screen.getByRole('button', { name: /^(Sign in|Confirm and sign in)$/ }),
  );
  await act(async () => {
    await vi.advanceTimersByTimeAsync(FLOOR_MS);
  });
}

describe('SignInFlow, email code', () => {
  it('shows the same screen whether or not Clerk could send, never leaking', async () => {
    mocks.signIn.create.mockRejectedValue(new Error('identifier not found'));
    await toEmailCode();
    expect(
      screen.getByRole('heading', { name: COPY.emailCode.title }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(COPY.emailCode.body('fan@example.com')),
    ).toBeInTheDocument();
  });

  it('shows the same screen when Clerk returns an error instead of throwing', async () => {
    mocks.signIn.create.mockResolvedValue({
      error: clerkError(422, 'form_identifier_not_found'),
    });
    await toEmailCode();
    expect(
      screen.getByRole('heading', { name: COPY.emailCode.title }),
    ).toBeInTheDocument();
  });

  it('does not say "sent" when a resend is throttled, and locks the boxes with the wait shown', async () => {
    await toEmailCode();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_000);
    });
    mocks.signIn.emailCode.sendCode.mockResolvedValue({
      error: clerkError(429, 'too_many_requests'),
    });
    fireEvent.click(
      screen.getByRole('button', { name: COPY.emailCode.resend }),
    );
    await act(async () => {
      await vi.advanceTimersByTimeAsync(RESET_FLOOR_MS);
    });
    expect(screen.queryByText(COPY.emailCode.sent)).toBeNull();
    expect(screen.getByText(COPY.rateLimited.message)).toBeInTheDocument();
    expect(screen.getByLabelText('6-digit code')).toBeDisabled();
  });

  it('a 429 on a code locks only the code screen, not the password', async () => {
    await toEmailCode();
    mocks.signIn.emailCode.verifyCode.mockResolvedValue({
      error: clerkError(429, 'too_many_requests'),
    });
    await enterCode();
    expect(screen.getByText(COPY.rateLimited.message)).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole('button', { name: COPY.emailCode.usePassword }),
    );
    expect(screen.getByLabelText(COPY.password.label)).not.toBeDisabled();
  });

  it('signs in with a right code', async () => {
    await toEmailCode();
    mocks.signIn.status = 'complete';
    await enterCode();
    expect(mocks.signIn.emailCode.verifyCode).toHaveBeenCalledWith({
      code: '123456',
    });
    expect(mocks.signIn.finalize).toHaveBeenCalledOnce();
  });

  it('reads a wrong code and an expired one, keeping the screen', async () => {
    await toEmailCode();
    mocks.signIn.emailCode.verifyCode.mockResolvedValue({
      error: clerkError(422, 'form_code_incorrect'),
    });
    await enterCode();
    expect(screen.getByText(COPY.emailCode.wrong)).toBeInTheDocument();
    mocks.signIn.emailCode.verifyCode.mockResolvedValue({
      error: clerkError(422, 'verification_expired'),
    });
    await enterCode();
    expect(screen.getByText(COPY.emailCode.expired)).toBeInTheDocument();
  });

  it('holds Send a new code behind a countdown, then offers it and says it was sent', async () => {
    await toEmailCode();
    expect(
      screen.getByRole('button', { name: COPY.emailCode.resendIn('1:00') }),
    ).toBeDisabled();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_000);
    });
    fireEvent.click(
      screen.getByRole('button', { name: COPY.emailCode.resend }),
    );
    await act(async () => {
      await vi.advanceTimersByTimeAsync(RESET_FLOOR_MS);
    });
    expect(screen.getByText(COPY.emailCode.sent)).toBeInTheDocument();
  });

  it('goes back to the password screen on Use my password instead', async () => {
    await toEmailCode();
    fireEvent.click(
      screen.getByRole('button', { name: COPY.emailCode.usePassword }),
    );
    expect(
      screen.getByRole('heading', { name: COPY.password.title }),
    ).toBeInTheDocument();
  });
});

describe('SignInFlow, new device', () => {
  it('sends an emailed code for a second-factor status, and signs in with it', async () => {
    toPassword();
    mocks.signIn.status = 'needs_client_trust';
    await press();
    expect(mocks.signIn.mfa.sendEmailCode).toHaveBeenCalledOnce();
    expect(
      screen.getByRole('heading', { name: COPY.device.title }),
    ).toBeInTheDocument();
    mocks.signIn.status = 'complete';
    await enterCode();
    expect(mocks.signIn.mfa.verifyEmailCode).toHaveBeenCalledWith({
      code: '123456',
    });
    expect(mocks.signIn.finalize).toHaveBeenCalledOnce();
  });

  it('says it failed when no emailed-code factor is offered', async () => {
    toPassword();
    mocks.signIn.status = 'needs_second_factor';
    mocks.signIn.supportedSecondFactors = [{ strategy: 'totp' }];
    await press();
    expect(screen.getByText(COPY.failed)).toBeInTheDocument();
    expect(mocks.signIn.mfa.sendEmailCode).not.toHaveBeenCalled();
  });
});

describe('SignInFlow, throttle and offline', () => {
  it('locks the field on a 429 with a countdown, padded like any answer, then wakes', async () => {
    toPassword();
    mocks.signIn.password.mockResolvedValue({
      error: clerkError(429, 'too_many_requests'),
    });
    fireEvent.change(screen.getByLabelText(COPY.password.label), {
      target: { value: 'x' },
    });
    fireEvent.click(screen.getByRole('button', { name: COPY.password.submit }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(FLOOR_MS - 1);
    });
    expect(screen.queryByText(COPY.rateLimited.message)).toBeNull();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
    expect(screen.getByText(COPY.rateLimited.message)).toBeInTheDocument();
    expect(screen.getByLabelText(COPY.password.label)).toBeDisabled();
    expect(screen.getByText(COPY.rateLimited.countdown('1:00'))).toBeVisible();
    expect(screen.queryByText(COPY.password.didntWork)).toBeNull();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_000);
    });
    expect(screen.getByLabelText(COPY.password.label)).not.toBeDisabled();
  });

  it('shows the offline strip, keeps the fields and sends nothing', async () => {
    toPassword();
    vi.spyOn(window.navigator, 'onLine', 'get').mockReturnValue(false);
    await act(async () => {
      window.dispatchEvent(new Event('offline'));
    });
    expect(screen.getByRole('status')).toHaveTextContent(/offline/i);
    fireEvent.change(screen.getByLabelText(COPY.password.label), {
      target: { value: 'Quartz-Ember-42!' },
    });
    fireEvent.click(screen.getByRole('button', { name: COPY.password.submit }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(FLOOR_MS);
    });
    expect(mocks.signIn.password).not.toHaveBeenCalled();
    expect(screen.getByLabelText(COPY.password.label)).toHaveValue(
      'Quartz-Ember-42!',
    );
  });
});

describe('SignInFlow, code edge cases', () => {
  it('reads only a code refusal as a wrong code; anything else is the generic line', async () => {
    await toEmailCode();
    mocks.signIn.emailCode.verifyCode.mockResolvedValue({
      error: clerkError(400, 'captcha_invalid'),
    });
    await enterCode();
    expect(screen.getByText(COPY.failed)).toBeInTheDocument();
    expect(screen.queryByText(COPY.emailCode.wrong)).toBeNull();
  });

  it('carries on to the return path when a session already exists', async () => {
    await toEmailCode();
    mocks.signIn.emailCode.verifyCode.mockResolvedValue({
      error: clerkError(400, 'session_exists'),
    });
    await enterCode();
    expect(mocks.replace).toHaveBeenCalledWith('/events');
  });

  it('says a failed device-code resend failed, never "sent"', async () => {
    toPassword();
    mocks.signIn.status = 'needs_client_trust';
    await press();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_000);
    });
    mocks.signIn.mfa.sendEmailCode.mockResolvedValue({
      error: clerkError(500, 'internal_error'),
    });
    fireEvent.click(
      screen.getByRole('button', { name: COPY.emailCode.resend }),
    );
    await act(async () => {
      await vi.advanceTimersByTimeAsync(FLOOR_MS);
    });
    expect(screen.getByText(COPY.failed)).toBeInTheDocument();
    expect(screen.queryByText(COPY.emailCode.sent)).toBeNull();
  });

  it('does not promise a code when the first send is throttled', async () => {
    toPassword();
    mocks.signIn.emailCode.sendCode.mockResolvedValue({
      error: clerkError(429, 'too_many_requests'),
    });
    fireEvent.click(
      screen.getByRole('button', { name: COPY.password.codeInstead }),
    );
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1500);
    });
    expect(
      screen.queryByRole('heading', { name: COPY.emailCode.title }),
    ).toBeNull();
    expect(screen.getByText(COPY.rateLimited.message)).toBeInTheDocument();
  });

  it('disables the code screen submit and shows the strip while offline', async () => {
    await toEmailCode();
    vi.spyOn(window.navigator, 'onLine', 'get').mockReturnValue(false);
    await act(async () => {
      window.dispatchEvent(new Event('offline'));
    });
    expect(screen.getByRole('status')).toHaveTextContent(/offline/i);
    fireEvent.change(screen.getByLabelText('6-digit code'), {
      target: { value: '123456' },
    });
    expect(
      screen.getByRole('button', { name: COPY.emailCode.submit }),
    ).toBeDisabled();
    expect(mocks.signIn.emailCode.verifyCode).not.toHaveBeenCalled();
  });
});

describe('SignInFlow, loading', () => {
  it('waits for Clerk before drawing the form', () => {
    mocks.clerk.loaded = false;
    render(<SignInFlow returnTo="/events" />);
    expect(screen.queryByLabelText(COPY.start.emailLabel)).toBeNull();
  });
});
