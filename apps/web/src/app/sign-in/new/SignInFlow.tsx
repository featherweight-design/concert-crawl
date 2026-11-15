'use client';

import { useClerk, useSignIn } from '@clerk/nextjs';
import { Lock } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRef, useState, type FormEvent } from 'react';
import {
  AuthErrorLine,
  AuthField,
  PasswordField,
} from '@/components/auth/flow/AuthField';
import { AuthHeading, AuthPage } from '@/components/auth/flow/AuthPage';
import { AuthIconTile } from '@/components/auth/flow/AuthNotices';
import { LinkButton, PrimaryButton } from '@/components/auth/flow/AuthButtons';
import { classifyPasswordError } from '@/lib/auth/clerk-errors';
import { held } from '@/lib/auth/timing-pad';
import { AuthLoadingState } from '../AuthLoadingState';
import { SIGN_IN_COPY } from '../definitions/copy';

const COPY = SIGN_IN_COPY;

type Screen = 'start' | 'password' | 'breached';
type Line = 'wrong' | 'failed' | null;

const isEmailShape = (value: string): boolean =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

/**
 * The sign-in on the custom pages: email, then password, then through. Continue
 * on the email screen never asks Clerk anything, so every address reaches the
 * password screen and the screen cannot say whether it has an account. The
 * second-factor, email-code and rate-limit screens are the next PR's.
 */
export function SignInFlow({ returnTo }: { returnTo: string }) {
  const clerk = useClerk();
  const { signIn } = useSignIn();
  const router = useRouter();
  const [screen, setScreen] = useState<Screen>('start');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailInvalid, setEmailInvalid] = useState(false);
  const [line, setLine] = useState<Line>(null);
  const [busy, setBusy] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  // Clerk's script comes from our own domain; a blocker drops it silently, so
  // the loading state is also the blocked state after 10 seconds.
  if (!clerk.loaded) return <AuthLoadingState />;

  const returnQuery = new URLSearchParams({
    redirect_url: returnTo,
  }).toString();
  const forgotHref = `/sign-in/forgot?${new URLSearchParams({ email }).toString()}`;

  function onContinue(evt: FormEvent) {
    evt.preventDefault();
    if (!isEmailShape(email.trim())) {
      setEmailInvalid(true);
      emailRef.current?.focus();
      return;
    }
    setEmail(email.trim());
    setEmailInvalid(false);
    setLine(null);
    setScreen('password');
  }

  async function finish() {
    const { error } = await signIn.finalize({
      navigate: async ({ session, decorateUrl }) => {
        const task = session?.currentTask;
        // A pending session task is a full load: the task page needs a clean
        // client, and `/sign-in/tasks` is public in the proxy.
        if (task) {
          // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- the task page needs a full load, not a client transition
          window.location.assign(`/sign-in/tasks/${task.key}`);
          return;
        }
        const url = decorateUrl(returnTo);
        if (url.startsWith('http')) window.location.assign(url);
        else router.replace(url);
      },
    });
    if (error) setLine('failed');
  }

  async function next() {
    // Read fresh: Clerk changes the status across the awaits above.
    const status = signIn.status;
    if (status === 'complete') return finish();
    if (status === 'needs_new_password') return setScreen('breached');
    return setLine('failed');
  }

  async function onSignIn(evt: FormEvent) {
    evt.preventDefault();
    if (busy) return;
    setBusy(true);
    setLine(null);
    const since = Date.now();
    let error: unknown = null;
    try {
      error = (await signIn.password({ identifier: email, password })).error;
    } catch (thrown) {
      error = thrown;
    }
    await held(since);
    if (!error) {
      await next();
    } else {
      const outcome = classifyPasswordError(error);
      if (outcome === 'breached') {
        setScreen('breached');
      } else if (outcome === 'wrong') {
        setLine('wrong');
        setPassword('');
        passwordRef.current?.focus();
      } else {
        setLine('failed');
      }
    }
    setBusy(false);
  }

  if (screen === 'breached') {
    return (
      <AuthPage onBack={() => setScreen('password')}>
        <AuthIconTile tone="warning">
          <Lock size={22} strokeWidth={1.8} />
        </AuthIconTile>
        <AuthHeading
          eyebrow={COPY.breached.eyebrow}
          eyebrowTone="warning"
          title={COPY.breached.title}
          sub={COPY.breached.body}
        />
        <PrimaryButton type="button" onClick={() => router.push(forgotHref)}>
          {COPY.breached.button}
        </PrimaryButton>
      </AuthPage>
    );
  }

  if (screen === 'password') {
    return (
      <AuthPage onBack={() => setScreen('start')}>
        <AuthHeading
          title={COPY.password.title}
          sub={
            <>
              {COPY.password.body(email)}{' '}
              <LinkButton
                className="min-h-0 text-[14.5px]"
                onClick={() => setScreen('start')}
              >
                {COPY.password.change}
              </LinkButton>
            </>
          }
        />
        <form noValidate onSubmit={onSignIn} className="flex flex-col gap-4">
          <PasswordField
            ref={passwordRef}
            label={COPY.password.label}
            value={password}
            onChange={(evt) => setPassword(evt.target.value)}
            autoComplete="current-password"
            disabled={busy}
            error={line === 'wrong' ? COPY.password.didntWork : undefined}
            labelAside={
              <Link
                href={forgotHref}
                className="text-[13px] font-bold text-signal"
              >
                {COPY.password.forgot}
              </Link>
            }
          />
          {line === 'failed' ? (
            <div aria-live="polite">
              <AuthErrorLine>{COPY.failed}</AuthErrorLine>
            </div>
          ) : null}
          <PrimaryButton
            busy={busy}
            busyLabel={COPY.password.busy}
            disabled={password.length === 0}
          >
            {COPY.password.submit}
          </PrimaryButton>
        </form>
      </AuthPage>
    );
  }

  return (
    <AuthPage>
      <AuthHeading
        eyebrow={COPY.start.eyebrow}
        title={COPY.start.title}
        sub={COPY.start.body}
      />
      <form noValidate onSubmit={onContinue} className="flex flex-col gap-4">
        <AuthField
          ref={emailRef}
          label={COPY.start.emailLabel}
          type="email"
          value={email}
          onChange={(evt) => setEmail(evt.target.value)}
          placeholder={COPY.start.emailPlaceholder}
          autoComplete="username"
          inputMode="email"
          autoCapitalize="none"
          spellCheck={false}
          error={emailInvalid ? COPY.start.emailInvalid : undefined}
        />
        <PrimaryButton>{COPY.start.continue}</PrimaryButton>
      </form>
      <p className="m-0 text-center text-sm text-fg-muted">
        {COPY.start.footBeta}{' '}
        <Link
          href={`/auth/code?${returnQuery}`}
          className="font-bold text-signal"
        >
          {COPY.start.footBetaLink}
        </Link>
      </p>
    </AuthPage>
  );
}
