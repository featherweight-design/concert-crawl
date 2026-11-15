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
import { FLOOR_MS } from '@/lib/auth/timing-pad';
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

  it('reads a 429 as the generic line even when it carries a wrong-credential code', async () => {
    toPassword();
    mocks.signIn.password.mockResolvedValue({
      error: clerkError(429, 'form_password_incorrect', 'too_many_requests'),
    });
    await press();
    expect(screen.getByText(COPY.failed)).toBeInTheDocument();
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

describe('SignInFlow, loading', () => {
  it('waits for Clerk before drawing the form', () => {
    mocks.clerk.loaded = false;
    render(<SignInFlow returnTo="/events" />);
    expect(screen.queryByLabelText(COPY.start.emailLabel)).toBeNull();
  });
});
