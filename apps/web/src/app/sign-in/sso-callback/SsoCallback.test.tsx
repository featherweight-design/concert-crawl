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
  clerk: {
    loaded: true,
    __internal_resolvePendingProtectCheck: vi.fn() as
      ReturnType<typeof vi.fn> | undefined,
  },
  signIn: {
    status: 'needs_first_factor' as string | null,
    isTransferable: false,
    create: vi.fn(),
    finalize: vi.fn(),
  },
  signUp: {
    status: null as string | null,
    missingFields: [] as string[],
    emailAddress: null as string | null,
    isTransferable: false,
    update: vi.fn(),
    finalize: vi.fn(),
    create: vi.fn(),
    password: vi.fn(),
  },
  replace: vi.fn(),
  captureException: vi.fn(),
}));

vi.mock('@clerk/nextjs', () => ({
  useClerk: () => mocks.clerk,
  useSignIn: () => ({ signIn: mocks.signIn }),
  useSignUp: () => ({ signUp: mocks.signUp }),
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mocks.replace }),
}));
vi.mock('@sentry/nextjs', () => ({
  captureException: mocks.captureException,
}));

import { AUTH_FLOW_COPY } from '@/components/auth/flow/definitions/copy';
import { SIGN_IN_COPY } from '../definitions/copy';
import { SsoCallback } from './SsoCallback';

const COPY = SIGN_IN_COPY;
const resolveFn = () => mocks.clerk.__internal_resolvePendingProtectCheck;

const legal = { terms: <p>The terms.</p>, privacy: <p>The privacy policy.</p> };
const renderCallback = (returnTo = '/events') =>
  render(<SsoCallback returnTo={returnTo} legal={legal} />);
const settle = () => act(async () => {});

// Runs `navigate` the way Clerk's finalize does.
const finalizeRuns = (
  target: { finalize: ReturnType<typeof vi.fn> },
  session: { currentTask?: { key: string } | null } | null = null,
) =>
  target.finalize.mockImplementation(
    async ({
      navigate,
    }: {
      navigate: (args: {
        session: typeof session;
        decorateUrl: (url: string) => string;
      }) => Promise<void>;
    }) => {
      await navigate({ session, decorateUrl: (url) => url });
      return { error: null };
    },
  );

beforeEach(() => {
  mocks.clerk.loaded = true;
  mocks.clerk.__internal_resolvePendingProtectCheck = vi
    .fn()
    .mockResolvedValue(undefined);
  mocks.signIn.status = 'needs_first_factor';
  mocks.signIn.isTransferable = false;
  mocks.signIn.create.mockReset().mockResolvedValue({ error: null });
  mocks.signIn.finalize.mockReset().mockResolvedValue({ error: null });
  mocks.signUp.status = null;
  mocks.signUp.missingFields = [];
  mocks.signUp.emailAddress = null;
  mocks.signUp.isTransferable = false;
  mocks.signUp.update.mockReset().mockResolvedValue({ error: null });
  mocks.signUp.finalize.mockReset().mockResolvedValue({ error: null });
  mocks.signUp.create.mockReset();
  mocks.signUp.password.mockReset();
  mocks.replace.mockReset();
  mocks.captureException.mockReset();
});
afterEach(() => cleanup());

describe('SsoCallback', () => {
  it('shows "Signing you in" while it decides', async () => {
    renderCallback();
    expect(
      screen.getByRole('heading', { name: COPY.google.returnTitle }),
    ).toBeInTheDocument();
    expect(screen.getByText(COPY.google.returnBody)).toBeInTheDocument();
    await settle();
  });

  it('waits for Clerk before deciding anything', async () => {
    mocks.clerk.loaded = false;
    renderCallback();
    await settle();
    expect(resolveFn()).not.toHaveBeenCalled();
    expect(mocks.replace).not.toHaveBeenCalled();
  });

  it('settles a pending bot check for both flows before it reads anything', async () => {
    mocks.signIn.status = 'complete';
    renderCallback();
    await settle();
    expect(resolveFn()).toHaveBeenNthCalledWith(1, 'signIn');
    expect(resolveFn()).toHaveBeenNthCalledWith(2, 'signUp');
  });

  it('finishes a sign-in and goes to the return path', async () => {
    mocks.signIn.status = 'complete';
    finalizeRuns(mocks.signIn);
    renderCallback('/events/42');
    await settle();
    expect(mocks.signIn.finalize).toHaveBeenCalledOnce();
    expect(mocks.replace).toHaveBeenCalledWith('/events/42');
  });

  it('finishes a sign-up Google made (an invite was used) the same way', async () => {
    mocks.signUp.status = 'complete';
    finalizeRuns(mocks.signUp);
    renderCallback('/auth/complete?return=%2Fe%2Fabc');
    await settle();
    expect(mocks.signUp.finalize).toHaveBeenCalledOnce();
    expect(mocks.replace).toHaveBeenCalledWith(
      '/auth/complete?return=%2Fe%2Fabc',
    );
  });

  it('refuses a Google account with no account here, and never makes one', async () => {
    mocks.signIn.status = 'needs_identifier';
    mocks.signIn.isTransferable = true;
    renderCallback('/events');
    await settle();
    expect(mocks.replace).toHaveBeenCalledWith(
      '/sign-in/new?google=refused&redirect_url=%2Fevents',
    );
    expect(mocks.signUp.create).not.toHaveBeenCalled();
    expect(mocks.signUp.password).not.toHaveBeenCalled();
    expect(mocks.signUp.update).not.toHaveBeenCalled();
    expect(mocks.signUp.finalize).not.toHaveBeenCalled();
    expect(mocks.signIn.finalize).not.toHaveBeenCalled();
  });

  it('turns a sign-up for an account that already exists into the sign-in it should have been', async () => {
    mocks.signUp.status = 'missing_requirements';
    mocks.signUp.isTransferable = true;
    mocks.signIn.create.mockImplementation(async () => {
      mocks.signIn.status = 'complete';
      return { error: null };
    });
    finalizeRuns(mocks.signIn);
    renderCallback('/events');
    await settle();
    expect(mocks.signIn.create).toHaveBeenCalledWith({ transfer: true });
    expect(mocks.signIn.finalize).toHaveBeenCalledOnce();
    expect(mocks.replace).toHaveBeenCalledWith('/events');
    expect(mocks.signUp.finalize).not.toHaveBeenCalled();
  });

  it('goes to the failed note when that transfer does not complete', async () => {
    mocks.signUp.status = 'missing_requirements';
    mocks.signUp.isTransferable = true;
    renderCallback('/events');
    await settle();
    expect(mocks.signIn.finalize).not.toHaveBeenCalled();
    expect(mocks.replace).toHaveBeenCalledWith(
      '/sign-in/new?google=failed&redirect_url=%2Fevents',
    );
  });

  it('never calls a transfer for an unknown Google account', async () => {
    mocks.signIn.isTransferable = true;
    renderCallback();
    await settle();
    expect(mocks.signIn.create).not.toHaveBeenCalled();
  });

  it('goes back to the start with a quiet note when Google was cancelled', async () => {
    renderCallback();
    await settle();
    expect(mocks.replace).toHaveBeenCalledWith(
      '/sign-in/new?google=cancelled&redirect_url=%2Fevents',
    );
  });

  it.each(['needs_second_factor', 'needs_client_trust'])(
    'goes to the failed line, not through, for %s',
    async (status) => {
      mocks.signIn.status = status;
      renderCallback();
      await settle();
      expect(mocks.replace).toHaveBeenCalledWith(
        '/sign-in/new?google=failed&redirect_url=%2Fevents',
      );
      expect(mocks.signIn.finalize).not.toHaveBeenCalled();
    },
  );

  it('fails closed, and tells Sentry, when Clerk no longer has the bot-check resolver', async () => {
    mocks.clerk.__internal_resolvePendingProtectCheck = undefined;
    mocks.signIn.status = 'complete';
    renderCallback();
    await settle();
    expect(mocks.replace).toHaveBeenCalledWith(
      '/sign-in/new?google=failed&redirect_url=%2Fevents',
    );
    expect(mocks.signIn.finalize).not.toHaveBeenCalled();
    expect(mocks.captureException).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'sso-callback-protect-missing' }),
      { tags: { site: 'sso-callback-protect-missing' } },
    );
  });

  it('fails closed, and tells Sentry, when the bot check throws', async () => {
    resolveFn()?.mockRejectedValue(new Error('boom'));
    mocks.signIn.status = 'complete';
    renderCallback();
    await settle();
    expect(mocks.replace).toHaveBeenCalledWith(
      '/sign-in/new?google=failed&redirect_url=%2Fevents',
    );
    expect(mocks.signIn.finalize).not.toHaveBeenCalled();
    expect(mocks.captureException).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'sso-callback-protect-failed' }),
      { tags: { site: 'sso-callback-protect-failed' } },
    );
  });

  it('goes to the failed line when finishing the sign-in fails', async () => {
    mocks.signIn.status = 'complete';
    mocks.signIn.finalize.mockResolvedValue({ error: { code: 'x' } });
    renderCallback();
    await settle();
    expect(mocks.replace).toHaveBeenCalledWith(
      '/sign-in/new?google=failed&redirect_url=%2Fevents',
    );
  });

  it('sends a pending session task to its page with a full load', async () => {
    mocks.signIn.status = 'complete';
    finalizeRuns(mocks.signIn, { currentTask: { key: 'reset-password' } });
    const assign = vi.fn();
    vi.stubGlobal('location', { ...window.location, assign });
    renderCallback();
    await settle();
    expect(assign).toHaveBeenCalledWith('/sign-in/tasks/reset-password');
    expect(mocks.replace).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
});

describe('SsoCallback, consent still needed', () => {
  const toConsent = async () => {
    mocks.signUp.status = 'missing_requirements';
    mocks.signUp.missingFields = ['legal_accepted'];
    mocks.signUp.emailAddress = 'sam.r@gmail.com';
    renderCallback();
    await settle();
  };
  const make = () =>
    fireEvent.click(
      screen.getByRole('button', { name: COPY.googleConsent.submit }),
    );

  it('shows the box, alone, naming the Google address', async () => {
    await toConsent();
    expect(
      screen.getByRole('heading', { name: COPY.googleConsent.title }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(COPY.googleConsent.body('sam.r@gmail.com')),
    ).toBeInTheDocument();
    expect(screen.getByRole('checkbox')).not.toBeChecked();
    expect(mocks.replace).not.toHaveBeenCalled();
  });

  it('sends nothing unticked: the box goes red and takes focus', async () => {
    await toConsent();
    make();
    await settle();
    expect(mocks.signUp.update).not.toHaveBeenCalled();
    const box = screen.getByRole('checkbox');
    expect(box).toHaveAttribute('aria-invalid', 'true');
    expect(box).toHaveFocus();
    expect(screen.getByText(AUTH_FLOW_COPY.consent.error)).toBeInTheDocument();
  });

  it('records the tick with Clerk, then finishes the sign-up', async () => {
    await toConsent();
    mocks.signUp.update.mockImplementation(async () => {
      mocks.signUp.status = 'complete';
      return { error: null };
    });
    finalizeRuns(mocks.signUp);
    fireEvent.click(screen.getByRole('checkbox'));
    make();
    await settle();
    expect(mocks.signUp.update).toHaveBeenCalledWith({ legalAccepted: true });
    expect(mocks.signUp.finalize).toHaveBeenCalledOnce();
    expect(mocks.replace).toHaveBeenCalledWith('/events');
  });

  it('says Google did not work, and frees the button, when Clerk refuses', async () => {
    await toConsent();
    mocks.signUp.update.mockResolvedValue({ error: { code: 'x' } });
    fireEvent.click(screen.getByRole('checkbox'));
    make();
    await settle();
    expect(screen.getByText(COPY.google.failed)).toBeInTheDocument();
    expect(mocks.signUp.finalize).not.toHaveBeenCalled();
    expect(
      screen.getByRole('button', { name: COPY.googleConsent.submit }),
    ).not.toHaveAttribute('aria-busy');
  });

  it('"Not now" goes back to the start with a cancelled note', async () => {
    await toConsent();
    fireEvent.click(
      screen.getByRole('button', { name: COPY.googleConsent.cancel }),
    );
    expect(mocks.replace).toHaveBeenCalledWith(
      '/sign-in/new?google=cancelled&redirect_url=%2Fevents',
    );
  });

  it('opens the Terms over the box, keeping the tick', async () => {
    await toConsent();
    fireEvent.click(screen.getByRole('checkbox'));
    const label = screen.getByRole('checkbox').closest('label');
    if (!label) throw new Error('no consent label');
    fireEvent.click(
      label.querySelector<HTMLAnchorElement>('a[href="/legal/terms"]')!,
    );
    expect(screen.getByText('The terms.')).toBeInTheDocument();
    expect(screen.getByRole('checkbox')).toBeChecked();
  });
});
