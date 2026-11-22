'use client';

import { useClerk, useSignIn } from '@clerk/nextjs';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRef, useState, type FormEvent } from 'react';
import {
  AuthErrorLine,
  AuthField,
  PasswordField,
} from '@/components/auth/flow/AuthField';
import { AuthHeading, AuthPage } from '@/components/auth/flow/AuthPage';
import { LinkButton, PrimaryButton } from '@/components/auth/flow/AuthButtons';
import { CodeBoxes } from '@/components/auth/flow/CodeBoxes';
import {
  classifyNewPasswordError,
  codesOf,
  isRateLimited,
} from '@/lib/auth/clerk-errors';
import { held, RESET_FLOOR_MS } from '@/lib/auth/timing-pad';
import { AuthLoadingState } from '../AuthLoadingState';
import { SIGN_IN_COPY } from '../definitions/copy';

const COPY = SIGN_IN_COPY;

type Screen = 'email' | 'reset' | 'done';
type Line =
  | 'sent'
  | 'codeWrong'
  | 'codeExpired'
  | 'tooShort'
  | 'weak'
  | 'breached'
  | 'failed'
  | null;

const MIN_PASSWORD = 8;
/** How long the "changed" screen shows before the return path. */
const DONE_MS = 1000;

const isEmailShape = (value: string): boolean =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

/**
 * Reset a password: the email, then the emailed code and the new password on
 * one screen, then through. Sending the code asks Clerk twice and answers the
 * same whether or not the address has an account (a 1500 ms floor covers the
 * gap; Strict enumeration protection covers the rest).
 */
export function ForgotFlow({ returnTo }: { returnTo: string }) {
  const clerk = useClerk();
  const { signIn } = useSignIn();
  const router = useRouter();
  const [screen, setScreen] = useState<Screen>('email');
  const [email, setEmail] = useState('');
  const [emailInvalid, setEmailInvalid] = useState(false);
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [line, setLine] = useState<Line>(null);
  const [busy, setBusy] = useState(false);
  // Once Clerk has accepted the code it does not take it again, so a retry
  // after a refused password goes straight to the password.
  const [codeVerified, setCodeVerified] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);
  const doneUrl = useRef(returnTo);
  const doneTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  if (!clerk.loaded) return <AuthLoadingState />;

  const backHref = `/sign-in?${new URLSearchParams({ redirect_url: returnTo }).toString()}`;

  async function onSend(evt: FormEvent) {
    evt.preventDefault();
    if (busy) return;
    const address = email.trim();
    if (!isEmailShape(address)) {
      setEmailInvalid(true);
      emailRef.current?.focus();
      return;
    }
    setEmail(address);
    setEmailInvalid(false);
    setBusy(true);
    setLine(null);
    const { limited } = await sendCode(address);
    if (limited) {
      // True of every address, so it can be said: no code is coming.
      setLine('failed');
    } else {
      setCode('');
      setCodeVerified(false);
      setScreen('reset');
    }
    setBusy(false);
  }

  // Two Clerk calls, whatever Clerk answers; only a 429 is reported.
  async function sendCode(address: string): Promise<{ limited: boolean }> {
    const since = Date.now();
    let limited = false;
    try {
      const created = await signIn.create({ identifier: address });
      const sent = await signIn.resetPasswordEmailCode.sendCode();
      limited = isRateLimited(created.error) || isRateLimited(sent.error);
    } catch {
      // The same screen either way.
    }
    await held(since, RESET_FLOOR_MS);
    return { limited };
  }

  async function onResend() {
    if (busy) return;
    setBusy(true);
    setLine(null);
    const { limited } = await sendCode(email);
    setCode('');
    setCodeVerified(false);
    setLine(limited ? 'failed' : 'sent');
    setBusy(false);
  }

  function backToEmail() {
    setLine(null);
    setCode('');
    setPassword('');
    setCodeVerified(false);
    setScreen('email');
  }

  function goOn() {
    if (doneTimer.current) clearTimeout(doneTimer.current);
    const url = doneUrl.current;
    if (url.startsWith('http')) window.location.assign(url);
    else router.replace(url);
  }

  async function finish() {
    const { error } = await signIn.finalize({
      navigate: async ({ session, decorateUrl }) => {
        const task = session?.currentTask;
        if (task) {
          // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- the task page needs a full load, not a client transition
          window.location.assign(`/sign-in/tasks/${task.key}`);
          return;
        }
        setScreen('done');
        // Kept so the Continue button goes the same decorated way, and a click
        // cancels the beat's timer rather than racing it.
        doneUrl.current = decorateUrl(returnTo);
        doneTimer.current = setTimeout(goOn, DONE_MS);
      },
    });
    if (error) setLine('failed');
  }

  async function onSave(evt: FormEvent) {
    evt.preventDefault();
    if (busy || code.length < 6) return;
    if (password.length < MIN_PASSWORD) {
      setLine('tooShort');
      return;
    }
    setBusy(true);
    setLine(null);
    const since = Date.now();
    try {
      if (!codeVerified) {
        const verified = await signIn.resetPasswordEmailCode.verifyCode({
          code,
        });
        if (verified.error) {
          await held(since, RESET_FLOOR_MS);
          if (isRateLimited(verified.error)) setLine('failed');
          else if (codesOf(verified.error).includes('verification_expired'))
            setLine('codeExpired');
          else if (codesOf(verified.error).length > 0) setLine('codeWrong');
          else setLine('failed');
          setBusy(false);
          return;
        }
        setCodeVerified(true);
      }
      const saved = await signIn.resetPasswordEmailCode.submitPassword({
        password,
      });
      await held(since, RESET_FLOOR_MS);
      if (saved.error) {
        const outcome = classifyNewPasswordError(saved.error);
        setLine(outcome === 'rateLimited' ? 'failed' : outcome);
      } else if (signIn.status === 'complete') {
        await finish();
      } else {
        // A second factor on a reset is not supported here yet.
        setLine('failed');
      }
    } catch {
      await held(since, RESET_FLOOR_MS);
      setLine('failed');
    }
    setBusy(false);
  }

  if (screen === 'done') {
    return (
      <AuthPage>
        <AuthHeading title={COPY.forgot.doneTitle} sub={COPY.forgot.doneBody} />
        <LinkButton className="justify-start" onClick={goOn}>
          {COPY.forgot.doneLink}
        </LinkButton>
      </AuthPage>
    );
  }

  if (screen === 'reset') {
    const codeError =
      line === 'codeWrong'
        ? COPY.forgot.codeWrong
        : line === 'codeExpired'
          ? COPY.forgot.codeExpired
          : undefined;
    const passwordError =
      line === 'tooShort'
        ? COPY.forgot.tooShort
        : line === 'weak'
          ? COPY.forgot.weak
          : line === 'breached'
            ? COPY.forgot.breached
            : undefined;
    return (
      <AuthPage onBack={backToEmail}>
        <AuthHeading
          title={COPY.forgot.codeTitle}
          sub={COPY.forgot.codeBody(email)}
        />
        <form noValidate onSubmit={onSave} className="flex flex-col gap-4">
          <CodeBoxes
            value={code}
            onChange={(next) => {
              setCode(next);
              // A different code has to be checked again.
              setCodeVerified(false);
            }}
            error={codeError}
            disabled={busy}
          />
          <PasswordField
            label={COPY.forgot.newLabel}
            value={password}
            onChange={(evt) => setPassword(evt.target.value)}
            autoComplete="new-password"
            disabled={busy}
            hint={COPY.forgot.rule}
            error={passwordError}
          />
          <div aria-live="polite">
            {line === 'sent' ? (
              <p className="m-0 text-[13px] text-fg-muted">
                {COPY.forgot.sent}
              </p>
            ) : null}
            {line === 'failed' ? (
              <AuthErrorLine>{SIGN_IN_COPY.failed}</AuthErrorLine>
            ) : null}
          </div>
          <PrimaryButton
            busy={busy}
            busyLabel={COPY.forgot.busy}
            disabled={code.length < 6 || password.length === 0}
          >
            {COPY.forgot.save}
          </PrimaryButton>
        </form>
        <LinkButton onClick={onResend} disabled={busy}>
          {COPY.forgot.resend}
        </LinkButton>
      </AuthPage>
    );
  }

  return (
    <AuthPage>
      <AuthHeading title={COPY.forgot.title} sub={COPY.forgot.body} />
      <form noValidate onSubmit={onSend} className="flex flex-col gap-4">
        <AuthField
          ref={emailRef}
          label={COPY.start.emailLabel}
          type="email"
          value={email}
          onChange={(evt) => setEmail(evt.target.value)}
          placeholder={COPY.start.emailPlaceholder}
          autoComplete="email"
          inputMode="email"
          autoCapitalize="none"
          spellCheck={false}
          disabled={busy}
          error={emailInvalid ? COPY.start.emailInvalid : undefined}
        />
        {line === 'failed' ? (
          <div aria-live="polite">
            <AuthErrorLine>{SIGN_IN_COPY.failed}</AuthErrorLine>
          </div>
        ) : null}
        <PrimaryButton busy={busy} busyLabel={COPY.forgot.sending}>
          {COPY.forgot.send}
        </PrimaryButton>
      </form>
      <Link
        href={backHref}
        className="inline-flex min-h-11 items-center justify-center text-sm font-bold text-signal"
      >
        {COPY.forgot.back}
      </Link>
    </AuthPage>
  );
}
