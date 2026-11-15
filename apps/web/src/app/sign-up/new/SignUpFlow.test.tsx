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
  signUp: {
    status: 'missing_requirements',
    missingFields: [] as string[],
    password: vi.fn(),
    verifications: { sendEmailCode: vi.fn() },
  },
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
vi.mock('@clerk/nextjs/errors', () => ({
  isClerkAPIResponseError: (err: unknown) =>
    Boolean(err && typeof err === 'object' && 'errors' in err),
}));

import { AUTH_FLOW_COPY } from '@/components/auth/flow/definitions/copy';
import { FLOOR_MS } from '@/lib/auth/timing-pad';
import { SIGN_IN_COPY } from '@/app/sign-in/definitions/copy';
import { SIGN_UP_COPY } from '../definitions/copy';
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
  mocks.signUp.verifications.sendEmailCode
    .mockReset()
    .mockResolvedValue({ error: null });
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
    const terms = screen.getByRole('link', { name: FLOW.consent.terms });
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
    expect(document.body.textContent).not.toMatch(/already|exists|taken/i);
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
    fireEvent.click(screen.getByRole('button', { name: FLOW.back }));
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

describe('SignUpFlow, loading', () => {
  it('waits for Clerk before drawing the form', () => {
    mocks.clerk.loaded = false;
    renderFlow();
    expect(screen.queryByLabelText(COPY.form.emailLabel)).toBeNull();
  });
});
