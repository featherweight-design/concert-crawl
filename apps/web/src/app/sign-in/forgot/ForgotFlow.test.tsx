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
    create: vi.fn(),
    finalize: vi.fn(),
    resetPasswordEmailCode: {
      sendCode: vi.fn(),
      verifyCode: vi.fn(),
      submitPassword: vi.fn(),
    },
  },
  clerk: { loaded: true },
  replace: vi.fn(),
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
  useRouter: () => ({ replace: mocks.replace, push: vi.fn() }),
}));

import { SIGN_IN_COPY } from '../definitions/copy';
import { RESET_FLOOR_MS } from '@/lib/auth/timing-pad';
import { ForgotFlow } from './ForgotFlow';

const COPY = SIGN_IN_COPY;
const clerkError = (status: number, ...codes: string[]) => ({
  status,
  errors: codes.map((code) => ({ code })),
});
const settle = (ms: number) =>
  act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });

beforeEach(() => {
  vi.useFakeTimers();
  mocks.clerk.loaded = true;
  mocks.signIn.status = 'needs_identifier';
  mocks.signIn.create.mockReset().mockResolvedValue({ error: null });
  mocks.signIn.finalize.mockReset().mockResolvedValue({ error: null });
  const reset = mocks.signIn.resetPasswordEmailCode;
  reset.sendCode.mockReset().mockResolvedValue({ error: null });
  reset.verifyCode.mockReset().mockResolvedValue({ error: null });
  reset.submitPassword.mockReset().mockResolvedValue({ error: null });
  mocks.replace.mockReset();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

async function toReset(email = 'fan+clerk_test@example.com') {
  render(<ForgotFlow returnTo="/events/42" />);
  fireEvent.change(screen.getByLabelText(COPY.start.emailLabel), {
    target: { value: email },
  });
  fireEvent.click(screen.getByRole('button', { name: COPY.forgot.send }));
  await settle(RESET_FLOOR_MS);
}

async function save(code = '123456', password = 'Quartz-Ember-42!') {
  fireEvent.change(screen.getByLabelText('6-digit code'), {
    target: { value: code },
  });
  fireEvent.change(screen.getByLabelText(COPY.forgot.newLabel), {
    target: { value: password },
  });
  fireEvent.click(screen.getByRole('button', { name: COPY.forgot.save }));
  await settle(RESET_FLOOR_MS);
}

describe('ForgotFlow, email', () => {
  it('shows the title, an email field and a way back that carries the return path', () => {
    render(<ForgotFlow returnTo="/events/42" />);
    expect(
      screen.getByRole('heading', { name: COPY.forgot.title }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(COPY.start.emailLabel)).toHaveAttribute(
      'autocomplete',
      'email',
    );
    expect(
      screen.getByRole('link', { name: COPY.forgot.back }),
    ).toHaveAttribute('href', '/sign-in/new?redirect_url=%2Fevents%2F42');
  });

  it('refuses a malformed address on the page without asking Clerk', () => {
    render(<ForgotFlow returnTo="/events" />);
    fireEvent.change(screen.getByLabelText(COPY.start.emailLabel), {
      target: { value: 'nope' },
    });
    fireEvent.click(screen.getByRole('button', { name: COPY.forgot.send }));
    expect(screen.getByLabelText(COPY.start.emailLabel)).toHaveAttribute(
      'aria-invalid',
      'true',
    );
    expect(mocks.signIn.create).not.toHaveBeenCalled();
  });

  it('holds the answer to the 1500 ms floor', async () => {
    render(<ForgotFlow returnTo="/events" />);
    fireEvent.change(screen.getByLabelText(COPY.start.emailLabel), {
      target: { value: 'fan+clerk_test@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: COPY.forgot.send }));
    await settle(RESET_FLOOR_MS - 1);
    expect(
      screen.queryByRole('heading', { name: COPY.forgot.codeTitle }),
    ).toBeNull();
    await settle(1);
    expect(
      screen.getByRole('heading', { name: COPY.forgot.codeTitle }),
    ).toBeInTheDocument();
  });

  it.each([
    [
      'a returned error',
      () =>
        mocks.signIn.create.mockResolvedValue({
          error: clerkError(422, 'form_identifier_not_found'),
        }),
    ],
    [
      'a thrown error',
      () => mocks.signIn.create.mockRejectedValue(new Error('not found')),
    ],
    ['a send', () => undefined],
  ])(
    'shows the same screen and body for %s, never leaking',
    async (_name, arrange) => {
      arrange();
      await toReset('nobody@example.com');
      expect(
        screen.getByRole('heading', { name: COPY.forgot.codeTitle }),
      ).toBeInTheDocument();
      expect(
        screen.getByText(COPY.forgot.codeBody('nobody@example.com')),
      ).toBeInTheDocument();
    },
  );

  it('says no code is coming on a 429, which is true of every address', async () => {
    mocks.signIn.resetPasswordEmailCode.sendCode.mockResolvedValue({
      error: clerkError(429, 'too_many_requests'),
    });
    render(<ForgotFlow returnTo="/events" />);
    fireEvent.change(screen.getByLabelText(COPY.start.emailLabel), {
      target: { value: 'fan+clerk_test@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: COPY.forgot.send }));
    await settle(RESET_FLOOR_MS);
    expect(screen.getByText(COPY.failed)).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: COPY.forgot.codeTitle }),
    ).toBeNull();
  });
});

describe('ForgotFlow, reset', () => {
  it('checks the code, saves the password, signs in and goes to the return path after a beat', async () => {
    await toReset();
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
    await save();
    const reset = mocks.signIn.resetPasswordEmailCode;
    expect(reset.verifyCode).toHaveBeenCalledWith({ code: '123456' });
    expect(reset.submitPassword).toHaveBeenCalledWith({
      password: 'Quartz-Ember-42!',
    });
    expect(
      screen.getByRole('heading', { name: COPY.forgot.doneTitle }),
    ).toBeInTheDocument();
    expect(mocks.replace).not.toHaveBeenCalled();
    await settle(1000);
    expect(mocks.replace).toHaveBeenCalledWith('/events/42');
  });

  it('refuses a short password on the page, sending nothing', async () => {
    await toReset();
    await save('123456', 'short');
    expect(screen.getByText(COPY.forgot.tooShort)).toBeInTheDocument();
    expect(
      mocks.signIn.resetPasswordEmailCode.verifyCode,
    ).not.toHaveBeenCalled();
  });

  it.each([
    ['form_code_incorrect', COPY.forgot.codeWrong],
    ['verification_expired', COPY.forgot.codeExpired],
  ])(
    'reads a %s code refusal under the boxes, saving no password',
    async (code, text) => {
      await toReset();
      mocks.signIn.resetPasswordEmailCode.verifyCode.mockResolvedValue({
        error: clerkError(422, code),
      });
      await save();
      expect(screen.getByText(text)).toBeInTheDocument();
      expect(
        mocks.signIn.resetPasswordEmailCode.submitPassword,
      ).not.toHaveBeenCalled();
    },
  );

  it.each([
    [['form_password_not_strong_enough'], COPY.forgot.weak],
    [['form_password_pwned'], COPY.forgot.breached],
    [
      ['form_password_not_strong_enough', 'form_password_pwned'],
      COPY.forgot.breached,
    ],
    [['form_password_length_too_short'], COPY.forgot.tooShort],
  ])('reads %s under the password and keeps the code', async (codes, text) => {
    await toReset();
    mocks.signIn.resetPasswordEmailCode.submitPassword.mockResolvedValue({
      error: clerkError(422, ...codes),
    });
    await save();
    expect(screen.getByText(text)).toBeInTheDocument();
    expect(screen.getByLabelText('6-digit code')).toHaveValue('123456');
  });

  it.each([
    [
      'a captcha refusal on the password',
      () =>
        mocks.signIn.resetPasswordEmailCode.submitPassword.mockResolvedValue({
          error: clerkError(400, 'captcha_invalid'),
        }),
    ],
    [
      'a 429 on the password',
      () =>
        mocks.signIn.resetPasswordEmailCode.submitPassword.mockResolvedValue({
          error: clerkError(429, 'form_password_not_strong_enough'),
        }),
    ],
    [
      'a 429 on the code',
      () =>
        mocks.signIn.resetPasswordEmailCode.verifyCode.mockResolvedValue({
          error: clerkError(429, 'form_code_incorrect'),
        }),
    ],
    [
      'a throw',
      () =>
        mocks.signIn.resetPasswordEmailCode.verifyCode.mockRejectedValue(
          new Error('network'),
        ),
    ],
  ])(
    'shows the generic line for %s, never a refusal, and does not hang',
    async (_name, arrange) => {
      await toReset();
      arrange();
      await save();
      expect(screen.getByText(COPY.failed)).toBeInTheDocument();
      expect(screen.queryByText(COPY.forgot.weak)).toBeNull();
      expect(screen.queryByText(COPY.forgot.codeWrong)).toBeNull();
      expect(
        screen.getByRole('button', { name: COPY.forgot.save }),
      ).not.toHaveAttribute('aria-busy');
    },
  );

  it('does not check the code twice when the password is refused and retried', async () => {
    await toReset();
    const reset = mocks.signIn.resetPasswordEmailCode;
    reset.submitPassword.mockResolvedValueOnce({
      error: clerkError(422, 'form_password_not_strong_enough'),
    });
    await save();
    expect(screen.getByText(COPY.forgot.weak)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(COPY.forgot.newLabel), {
      target: { value: 'A-much-better-passphrase-42' },
    });
    fireEvent.click(screen.getByRole('button', { name: COPY.forgot.save }));
    await settle(RESET_FLOOR_MS);
    expect(reset.verifyCode).toHaveBeenCalledOnce();
    expect(reset.submitPassword).toHaveBeenCalledTimes(2);
  });

  it('checks a changed code again', async () => {
    await toReset();
    const reset = mocks.signIn.resetPasswordEmailCode;
    reset.submitPassword.mockResolvedValueOnce({
      error: clerkError(422, 'form_password_not_strong_enough'),
    });
    await save();
    fireEvent.change(screen.getByLabelText('6-digit code'), {
      target: { value: '654321' },
    });
    fireEvent.click(screen.getByRole('button', { name: COPY.forgot.save }));
    await settle(RESET_FLOOR_MS);
    expect(reset.verifyCode).toHaveBeenCalledTimes(2);
  });

  it('offers Send a new code, and says it was sent', async () => {
    await toReset();
    fireEvent.click(screen.getByRole('button', { name: COPY.forgot.resend }));
    await settle(RESET_FLOOR_MS);
    expect(mocks.signIn.resetPasswordEmailCode.sendCode).toHaveBeenCalledTimes(
      2,
    );
    expect(screen.getByText(COPY.forgot.sent)).toBeInTheDocument();
  });

  it('clears the old code, password and errors on Back', async () => {
    await toReset();
    mocks.signIn.resetPasswordEmailCode.verifyCode.mockResolvedValue({
      error: clerkError(422, 'form_code_incorrect'),
    });
    await save();
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    fireEvent.click(screen.getByRole('button', { name: COPY.forgot.send }));
    await settle(RESET_FLOOR_MS);
    expect(screen.queryByText(COPY.forgot.codeWrong)).toBeNull();
    expect(screen.getByLabelText('6-digit code')).toHaveValue('');
    expect(screen.getByLabelText(COPY.forgot.newLabel)).toHaveValue('');
  });

  it('goes on at once on Continue and cancels the beat', async () => {
    await toReset();
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
    await save();
    fireEvent.click(screen.getByRole('button', { name: COPY.forgot.doneLink }));
    expect(mocks.replace).toHaveBeenCalledWith('/events/42');
    await settle(2000);
    expect(mocks.replace).toHaveBeenCalledOnce();
  });

  it('has the README attributes: new-password and one-time-code', async () => {
    await toReset();
    expect(screen.getByLabelText(COPY.forgot.newLabel)).toHaveAttribute(
      'autocomplete',
      'new-password',
    );
    expect(screen.getByLabelText('6-digit code')).toHaveAttribute(
      'autocomplete',
      'one-time-code',
    );
  });
});

describe('ForgotFlow, loading', () => {
  it('waits for Clerk before drawing the form', () => {
    mocks.clerk.loaded = false;
    render(<ForgotFlow returnTo="/events" />);
    expect(screen.queryByLabelText(COPY.start.emailLabel)).toBeNull();
  });
});
