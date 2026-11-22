// @vitest-environment jsdom
import '@testing-library/jest-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';

const mocks = vi.hoisted(() => ({
  signUp: {
    status: 'missing_requirements',
    missingFields: [] as string[],
    password: vi.fn(),
    sso: vi.fn(),
    verifications: { sendEmailCode: vi.fn(), verifyEmailCode: vi.fn() },
    finalize: vi.fn(),
  },
  router: { replace: vi.fn() },
  fetchStatus: 'idle' as 'idle' | 'fetching',
  clerk: { loaded: true },
}));

vi.mock('@clerk/nextjs', () => ({
  useClerk: () => mocks.clerk,
  useSignUp: () => ({
    signUp: mocks.signUp,
    fetchStatus: mocks.fetchStatus,
  }),
}));
vi.mock('next/navigation', () => ({ useRouter: () => mocks.router }));
vi.mock('@clerk/nextjs/errors', () => ({
  isClerkAPIResponseError: (err: unknown) =>
    Boolean(err && typeof err === 'object' && 'errors' in err),
}));

import { AUTH_FLOW_COPY } from '@/components/auth/flow/definitions/copy';
import { FLOOR_MS } from '@/lib/auth/timing-pad';
import { SIGN_IN_COPY } from '@/app/sign-in/definitions/copy';
import { SIGN_UP_COPY } from './definitions/copy';
import { SignUpFlow } from './SignUpFlow';

const COPY = SIGN_UP_COPY;
const FLOW = AUTH_FLOW_COPY;
const clerkError = (status: number, ...codes: string[]) => ({
  status,
  errors: codes.map((code) => ({ code })),
});

const legal = {
  terms: <p>The terms.</p>,
  privacy: <p>The privacy policy.</p>,
  beta: <p>The beta agreement.</p>,
};

function renderFlow(
  props: Partial<React.ComponentProps<typeof SignUpFlow>> = {},
) {
  return render(
    <SignUpFlow
      target="/auth/complete?return=%2Fe%2Fabc"
      beta
      inviteCode="BETA-AB12-CD34"
      changeHref="/auth/code"
      legal={legal}
      {...props}
    />,
  );
}

const settle = (ms: number) =>
  act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });

function fill(
  email = 'fan+clerk_test@example.com',
  password = 'Quartz-Ember-42!',
) {
  fireEvent.change(screen.getByLabelText(COPY.form.emailLabel), {
    target: { value: email },
  });
  fireEvent.change(screen.getByLabelText(COPY.form.passwordLabel), {
    target: { value: password },
  });
}

const tick = () => fireEvent.click(screen.getByRole('checkbox'));
const press = async () => {
  fireEvent.click(screen.getByRole('button', { name: COPY.form.submit }));
  await settle(FLOOR_MS);
};

beforeEach(() => {
  vi.useFakeTimers();
  mocks.clerk.loaded = true;
  mocks.fetchStatus = 'idle';
  mocks.signUp.status = 'missing_requirements';
  mocks.signUp.missingFields = [];
  mocks.signUp.password.mockReset().mockResolvedValue({ error: null });
  mocks.signUp.sso.mockReset().mockResolvedValue({ error: null });
  mocks.signUp.verifications.sendEmailCode
    .mockReset()
    .mockResolvedValue({ error: null });
  mocks.signUp.verifications.verifyEmailCode
    .mockReset()
    .mockResolvedValue({ error: null });
  mocks.signUp.finalize.mockReset().mockResolvedValue({ error: null });
  mocks.router.replace.mockReset();
  vi.spyOn(window.navigator, 'onLine', 'get').mockReturnValue(true);
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('SignUpFlow, consent', () => {
  it('sends nothing when pressed unticked: the box goes red and takes focus, and the error is read out', async () => {
    renderFlow();
    fill();
    await press();
    expect(mocks.signUp.password).not.toHaveBeenCalled();
    const box = screen.getByRole('checkbox');
    expect(box).toHaveAttribute('aria-invalid', 'true');
    expect(box).toHaveFocus();
    expect(screen.getByText(FLOW.consent.error)).toBeInTheDocument();
    tick();
    expect(screen.queryByText(FLOW.consent.error)).toBeNull();
  });

  it('starts unticked, and legalAccepted goes only from the tick', async () => {
    renderFlow();
    expect(screen.getByRole('checkbox')).not.toBeChecked();
    fill();
    tick();
    await press();
    expect(mocks.signUp.password).toHaveBeenCalledWith({
      emailAddress: 'fan+clerk_test@example.com',
      password: 'Quartz-Ember-42!',
      legalAccepted: true,
    });
  });

  it('opens the legal sheet from a link without toggling the box, keeping the fields', () => {
    renderFlow();
    fill();
    // The page header and foot have a Terms link too: take the one in the box.
    const label = screen.getByRole('checkbox').closest('label');
    if (!label) throw new Error('no consent label');
    const terms = within(label).getByRole('link', { name: FLOW.consent.terms });
    expect(terms).toHaveAttribute('href', '/legal/terms');
    fireEvent.click(terms);
    expect(screen.getByRole('checkbox')).not.toBeChecked();
    expect(screen.getByText('The terms.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: FLOW.legal.done }));
    expect(screen.getByLabelText(COPY.form.emailLabel)).toHaveValue(
      'fan+clerk_test@example.com',
    );
  });

  it('names three documents before launch and two after, with the matching step count', () => {
    const { unmount } = renderFlow();
    expect(
      screen.getByRole('link', { name: FLOW.consent.beta }),
    ).toHaveAttribute('href', '/legal/beta');
    expect(screen.getByText('Step 2 of 3')).toBeInTheDocument();
    unmount();
    renderFlow({ beta: false, inviteCode: null });
    expect(screen.queryByRole('link', { name: FLOW.consent.beta })).toBeNull();
    expect(screen.getByText('Step 1 of 2')).toBeInTheDocument();
    expect(screen.getByText(COPY.form.bodyLaunch)).toBeInTheDocument();
  });

  it('shows the invite only before launch and only with a code, linking "Use a different code"', () => {
    const { unmount } = renderFlow();
    expect(screen.getByText('BETA-AB12-CD34')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: COPY.form.inviteChange }),
    ).toHaveAttribute('href', '/auth/code');
    unmount();
    renderFlow({ inviteCode: null });
    expect(screen.queryByText(COPY.form.inviteChip)).toBeNull();
  });
});

describe('SignUpFlow, the press', () => {
  it('checks the email and password on the page without asking Clerk', async () => {
    renderFlow();
    tick();
    fill('not an email', 'Quartz-Ember-42!');
    await press();
    expect(screen.getByLabelText(COPY.form.emailLabel)).toHaveAttribute(
      'aria-invalid',
      'true',
    );
    fill('fan+clerk_test@example.com', 'short');
    await press();
    expect(screen.getByText(COPY.errors.tooShort)).toBeInTheDocument();
    expect(mocks.signUp.password).not.toHaveBeenCalled();
  });

  it('creates the account, sends the code, and goes on after the floor', async () => {
    renderFlow();
    fill();
    tick();
    fireEvent.click(screen.getByRole('button', { name: COPY.form.submit }));
    await settle(FLOOR_MS - 1);
    expect(
      screen.queryByRole('heading', { name: COPY.verify.title }),
    ).toBeNull();
    await settle(1);
    expect(mocks.signUp.verifications.sendEmailCode).toHaveBeenCalledOnce();
    expect(
      screen.getByRole('heading', { name: COPY.verify.title }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(COPY.verify.body('fan+clerk_test@example.com')),
    ).toBeInTheDocument();
  });

  it('shows the same screen for a taken email as for a new one, never leaking', async () => {
    renderFlow();
    fill();
    tick();
    await press();
    const fresh = document.body.textContent;
    cleanup();
    mocks.signUp.password.mockResolvedValue({
      error: clerkError(422, 'form_identifier_exists'),
    });
    renderFlow();
    fill();
    tick();
    await press();
    expect(document.body.textContent).toBe(fresh);
    expect(mocks.signUp.verifications.sendEmailCode).toHaveBeenCalledTimes(1);
    // The one "Already" is the sign-in link every verify screen carries.
    const text = (document.body.textContent ?? '').replace(
      COPY.verify.haveAccount,
      '',
    );
    expect(text).not.toMatch(/already|exists|taken/i);
  });

  it('retries only the code when the account was made but the send failed', async () => {
    mocks.signUp.verifications.sendEmailCode.mockResolvedValueOnce({
      error: clerkError(500, 'something_else'),
    });
    renderFlow();
    fill();
    tick();
    await press();
    expect(mocks.signUp.password).toHaveBeenCalledTimes(1);
    await press();
    expect(mocks.signUp.password).toHaveBeenCalledTimes(1);
    expect(mocks.signUp.verifications.sendEmailCode).toHaveBeenCalledTimes(2);
  });

  it('moves focus to the password once the lock lifts after a weak answer', async () => {
    mocks.signUp.password.mockResolvedValue({
      error: clerkError(422, 'form_password_not_strong_enough'),
    });
    renderFlow();
    fill();
    tick();
    await press();
    expect(screen.getByLabelText(COPY.form.passwordLabel)).toHaveFocus();
  });

  it('goes back from the next screen with the fields and the tick kept', async () => {
    renderFlow();
    fill();
    tick();
    await press();
    // The page draws a phone arrow and a desktop link; either goes back.
    const [back] = screen.getAllByRole('button', { name: FLOW.back });
    if (!back) throw new Error('no Back button');
    fireEvent.click(back);
    expect(screen.getByLabelText(COPY.form.emailLabel)).toHaveValue(
      'fan+clerk_test@example.com',
    );
    expect(screen.getByRole('checkbox')).toBeChecked();
  });

  it.each([
    [
      ['form_password_not_strong_enough', 'form_password_pwned'],
      COPY.errors.breached,
    ],
    [['form_password_not_strong_enough'], COPY.errors.weak],
    [['form_password_length_too_short'], COPY.errors.tooShort],
  ])(
    'reads %j under the password, keeping both fields',
    async (codes, text) => {
      renderFlow();
      fill();
      tick();
      mocks.signUp.password.mockResolvedValue({
        error: clerkError(422, ...codes),
      });
      await press();
      expect(screen.getByText(text)).toBeInTheDocument();
      expect(screen.getByLabelText(COPY.form.passwordLabel)).toHaveValue(
        'Quartz-Ember-42!',
      );
    },
  );

  it.each([
    ['a captcha refusal', clerkError(400, 'captcha_invalid')],
    ['an unknown code', clerkError(500, 'internal')],
    ['a plain throw', new Error('network')],
  ])(
    'shows the generic line for %s, never a field error',
    async (_name, error) => {
      renderFlow();
      fill();
      tick();
      if (error instanceof Error)
        mocks.signUp.password.mockRejectedValue(error);
      else mocks.signUp.password.mockResolvedValue({ error });
      await press();
      expect(screen.getByText(SIGN_IN_COPY.failed)).toBeInTheDocument();
      expect(screen.queryByText(COPY.errors.weak)).toBeNull();
      expect(
        screen.getByRole('button', { name: COPY.form.submit }),
      ).not.toHaveAttribute('aria-busy');
    },
  );

  it('locks the form for a wait on a 429, never as a field error', async () => {
    renderFlow();
    fill();
    tick();
    mocks.signUp.password.mockResolvedValue({
      error: clerkError(429, 'too_many_requests', 'form_password_pwned'),
    });
    await press();
    expect(
      screen.getByText(SIGN_IN_COPY.rateLimited.message),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(COPY.form.emailLabel)).toBeDisabled();
    expect(screen.queryByText(COPY.errors.breached)).toBeNull();
  });

  it("mounts Clerk's bot-check target and locks while its check holds the press", () => {
    mocks.fetchStatus = 'fetching';
    renderFlow();
    expect(document.getElementById('clerk-captcha')).not.toBeNull();
    expect(screen.getByLabelText(COPY.form.emailLabel)).toBeDisabled();
    expect(screen.getByText(COPY.bot.title)).toBeInTheDocument();
  });

  it('shows the offline strip and does not send while offline', async () => {
    renderFlow();
    fill();
    tick();
    vi.spyOn(window.navigator, 'onLine', 'get').mockReturnValue(false);
    await act(async () => {
      window.dispatchEvent(new Event('offline'));
    });
    expect(screen.getByRole('status')).toHaveTextContent(/offline/i);
    await press();
    expect(mocks.signUp.password).not.toHaveBeenCalled();
    expect(screen.getByLabelText(COPY.form.emailLabel)).toHaveValue(
      'fan+clerk_test@example.com',
    );
  });

  it('treats a missing legal_accepted as the red box, never going on', async () => {
    renderFlow();
    fill();
    tick();
    mocks.signUp.missingFields = ['legal_accepted'];
    await press();
    expect(screen.getByText(FLOW.consent.error)).toBeInTheDocument();
    expect(mocks.signUp.verifications.sendEmailCode).not.toHaveBeenCalled();
  });
});

const toVerify = async () => {
  renderFlow();
  fill();
  tick();
  await press();
};
const enterCode = (value = '123456') =>
  fireEvent.change(screen.getByLabelText(FLOW.code.label), {
    target: { value },
  });
const finish = async () => {
  fireEvent.click(screen.getByRole('button', { name: COPY.verify.submit }));
  await settle(FLOOR_MS);
};
// A right code completes the sign-up at Clerk, and finalize runs `navigate`.
const completeOnVerify = () => {
  mocks.signUp.verifications.verifyEmailCode.mockImplementation(async () => {
    mocks.signUp.status = 'complete';
    return { error: null };
  });
  mocks.signUp.finalize.mockImplementation(
    async ({
      navigate,
    }: {
      navigate: (args: {
        session: null;
        decorateUrl: (url: string) => string;
      }) => Promise<void>;
    }) => {
      await navigate({ session: null, decorateUrl: (url) => url });
      return { error: null };
    },
  );
};

describe('SignUpFlow, verify', () => {
  it('checks the code, finishes the sign-up and goes to the target, drawing the form done', async () => {
    completeOnVerify();
    await toVerify();
    enterCode();
    await finish();
    expect(mocks.signUp.verifications.verifyEmailCode).toHaveBeenCalledWith({
      code: '123456',
    });
    expect(mocks.signUp.finalize).toHaveBeenCalledOnce();
    expect(mocks.router.replace).toHaveBeenCalledWith(
      '/auth/complete?return=%2Fe%2Fabc',
    );
    expect(screen.getByRole('button', { name: COPY.form.done })).toBeDisabled();
    expect(screen.getByText(FLOW.steps.done)).toBeInTheDocument();
    expect(screen.getByLabelText(COPY.form.emailLabel)).toBeDisabled();
    expect(screen.getByRole('checkbox')).toBeChecked();
    expect(screen.getByRole('checkbox')).toBeDisabled();
  });

  it.each([
    ['form_code_incorrect', COPY.verify.wrong],
    ['verification_failed', COPY.verify.wrong],
    ['verification_expired', COPY.verify.expired],
  ])('reads %s as its own line and clears the code', async (code, text) => {
    mocks.signUp.verifications.verifyEmailCode.mockResolvedValue({
      error: clerkError(422, code),
    });
    await toVerify();
    enterCode();
    await finish();
    expect(screen.getByText(text)).toBeInTheDocument();
    expect(screen.getByLabelText(FLOW.code.label)).toHaveValue('');
    expect(mocks.signUp.finalize).not.toHaveBeenCalled();
  });

  it('shows the generic line, not a wrong code, for an unknown refusal', async () => {
    mocks.signUp.verifications.verifyEmailCode.mockResolvedValue({
      error: clerkError(400, 'captcha_invalid'),
    });
    await toVerify();
    enterCode();
    await finish();
    expect(screen.getByText(SIGN_IN_COPY.failed)).toBeInTheDocument();
    expect(screen.queryByText(COPY.verify.wrong)).toBeNull();
  });

  it('locks the code for a wait on a 429', async () => {
    mocks.signUp.verifications.verifyEmailCode.mockResolvedValue({
      error: clerkError(429, 'too_many_requests'),
    });
    await toVerify();
    enterCode();
    await finish();
    expect(screen.getByLabelText(FLOW.code.label)).toBeDisabled();
    expect(screen.queryByText(COPY.verify.wrong)).toBeNull();
  });

  it('only finishes again after a failed finish, never re-checking the code', async () => {
    completeOnVerify();
    mocks.signUp.finalize.mockResolvedValueOnce({
      error: clerkError(500, 'something_else'),
    });
    await toVerify();
    enterCode();
    await finish();
    expect(screen.getByText(SIGN_IN_COPY.failed)).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: COPY.verify.title }),
    ).toBeInTheDocument();
    await finish();
    expect(mocks.signUp.verifications.verifyEmailCode).toHaveBeenCalledTimes(1);
    expect(mocks.signUp.finalize).toHaveBeenCalledTimes(2);
  });

  it('does not finish when Clerk says the sign-up is not complete', async () => {
    await toVerify();
    enterCode();
    await finish();
    expect(mocks.signUp.finalize).not.toHaveBeenCalled();
    expect(screen.getByText(SIGN_IN_COPY.failed)).toBeInTheDocument();
  });

  it('waits a minute to resend, then sends a new code and says so', async () => {
    await toVerify();
    const wait = screen.getByRole('button', { name: /Send a new code in/ });
    expect(wait).toBeDisabled();
    await settle(60_000);
    fireEvent.click(screen.getByRole('button', { name: COPY.verify.resend }));
    await settle(FLOOR_MS);
    expect(mocks.signUp.verifications.sendEmailCode).toHaveBeenCalledTimes(2);
    expect(screen.getByText(COPY.verify.sent)).toBeInTheDocument();
  });

  it('answers a resend for a taken email the same, without sending', async () => {
    mocks.signUp.password.mockResolvedValue({
      error: clerkError(422, 'form_identifier_exists'),
    });
    // Whatever Clerk would say for it, a code on a taken email reads wrong.
    mocks.signUp.verifications.verifyEmailCode.mockResolvedValue({
      error: clerkError(404, 'resource_not_found'),
    });
    await toVerify();
    enterCode();
    await finish();
    expect(screen.getByText(COPY.verify.wrong)).toBeInTheDocument();
    expect(screen.queryByText(SIGN_IN_COPY.failed)).toBeNull();
    expect(mocks.signUp.verifications.verifyEmailCode).not.toHaveBeenCalled();
    await settle(60_000);
    fireEvent.click(screen.getByRole('button', { name: COPY.verify.resend }));
    await settle(FLOOR_MS);
    expect(mocks.signUp.verifications.sendEmailCode).not.toHaveBeenCalled();
    expect(screen.getByText(COPY.verify.sent)).toBeInTheDocument();
  });

  it('goes back from "Wrong email?" and the next press makes a fresh sign-up', async () => {
    await toVerify();
    fireEvent.click(
      screen.getByRole('button', { name: COPY.verify.wrongEmail }),
    );
    expect(screen.getByLabelText(COPY.form.emailLabel)).toHaveValue(
      'fan+clerk_test@example.com',
    );
    expect(screen.getByRole('checkbox')).toBeChecked();
    await press();
    expect(mocks.signUp.password).toHaveBeenCalledTimes(2);
  });

  it('ignores Back while a code is being checked, so it cannot finish a sign-up the visitor left', async () => {
    completeOnVerify();
    await toVerify();
    enterCode();
    fireEvent.click(screen.getByRole('button', { name: COPY.verify.submit }));
    fireEvent.click(
      screen.getByRole('button', { name: COPY.verify.wrongEmail }),
    );
    await settle(FLOOR_MS);
    // Back did nothing: the check finished, and the form is drawn finished
    // (fields fixed), not open for editing.
    expect(screen.getByLabelText(COPY.form.emailLabel)).toBeDisabled();
    expect(
      screen.getByRole('button', { name: COPY.form.done }),
    ).toBeInTheDocument();
    expect(mocks.signUp.finalize).toHaveBeenCalledOnce();
  });

  it('links to sign in on every verify screen', async () => {
    await toVerify();
    expect(
      screen.getByRole('link', { name: COPY.verify.haveAccountLink }),
    ).toHaveAttribute('href', '/sign-in');
  });
});

describe('SignUpFlow, Google', () => {
  const google = () => screen.getByRole('button', { name: FLOW.google.label });

  it('sends nothing when pressed unticked: the box goes red and takes focus', () => {
    renderFlow();
    fireEvent.click(google());
    expect(mocks.signUp.sso).not.toHaveBeenCalled();
    const box = screen.getByRole('checkbox');
    expect(box).toHaveAttribute('aria-invalid', 'true');
    expect(box).toHaveFocus();
  });

  it('starts Google ticked, with legalAccepted and a callback that returns to the target', async () => {
    renderFlow();
    tick();
    fireEvent.click(google());
    await act(async () => {});
    expect(mocks.signUp.sso).toHaveBeenCalledWith({
      strategy: 'oauth_google',
      redirectUrl: '/auth/complete?return=%2Fe%2Fabc',
      redirectCallbackUrl:
        '/sign-in/sso-callback?redirect_url=%2Fauth%2Fcomplete%3Freturn%3D%252Fe%252Fabc',
      legalAccepted: true,
    });
  });

  it('frees the button when the browser restores the page after Back from Google', async () => {
    renderFlow();
    tick();
    fireEvent.click(google());
    await act(async () => {});
    // Busy, the button reads "Opening Google…".
    expect(
      screen.getByRole('button', { name: FLOW.google.busy }),
    ).toHaveAttribute('aria-busy', 'true');
    await act(async () => {
      window.dispatchEvent(
        Object.assign(new Event('pageshow'), { persisted: true }),
      );
    });
    expect(google()).not.toHaveAttribute('aria-busy');
  });

  it('says so, and frees the button, when Clerk will not start Google', async () => {
    mocks.signUp.sso.mockResolvedValue({ error: clerkError(400, 'x') });
    renderFlow();
    tick();
    fireEvent.click(google());
    await act(async () => {});
    expect(screen.getByText(SIGN_IN_COPY.failed)).toBeInTheDocument();
    expect(google()).not.toHaveAttribute('aria-busy');
  });
});

describe('SignUpFlow, loading', () => {
  it('waits for Clerk before drawing the form', () => {
    mocks.clerk.loaded = false;
    renderFlow();
    expect(screen.queryByLabelText(COPY.form.emailLabel)).toBeNull();
  });
});
