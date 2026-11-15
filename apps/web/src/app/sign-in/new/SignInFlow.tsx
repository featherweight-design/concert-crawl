'use client';

import { useClerk, useSignIn } from '@clerk/nextjs';
import { Lock } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import {
  AuthErrorLine,
  AuthField,
  PasswordField,
} from '@/components/auth/flow/AuthField';
import { AuthHeading, AuthPage } from '@/components/auth/flow/AuthPage';
import { AuthBanner, AuthIconTile } from '@/components/auth/flow/AuthNotices';
import {
  LinkButton,
  PrimaryButton,
  SecondaryButton,
} from '@/components/auth/flow/AuthButtons';
import { CodeBoxes } from '@/components/auth/flow/CodeBoxes';
import { AUTH_FLOW_COPY } from '@/components/auth/flow/definitions/copy';
import {
  classifyPasswordError,
  codesOf,
  isRateLimited,
} from '@/lib/auth/clerk-errors';
import { held, RESET_FLOOR_MS } from '@/lib/auth/timing-pad';
import { formatClock, useCountdown } from '@/lib/auth/use-countdown';
import { useOnline } from '@/lib/auth/use-online';
import { AuthLoadingState } from '../AuthLoadingState';
import { SIGN_IN_COPY } from '../definitions/copy';

const COPY = SIGN_IN_COPY;

type Screen = 'start' | 'password' | 'emailCode' | 'deviceCode' | 'breached';
type Line = 'wrong' | 'failed' | 'rateLimited' | null;
type CodeLine = 'wrong' | 'expired' | 'sent' | 'failed' | null;

/** Clerk's answers for a code that is not the right one. */
const WRONG_CODE_CODES: ReadonlySet<string> = new Set([
  'form_code_incorrect',
  'form_code_invalid',
  'verification_failed',
]);

/** How long a throttled or resent screen waits, in seconds. */
const WAIT_SECONDS = 60;

const isEmailShape = (value: string): boolean =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

/**
 * The sign-in on the custom pages: email, then password, then through. Continue
 * on the email screen never asks Clerk anything, so every address reaches the
 * password screen and the screen cannot say whether it has an account. The
 * email code, the new-device code, the throttle and the offline strip are here
 * too.
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
  const [code, setCode] = useState('');
  const [codeLine, setCodeLine] = useState<CodeLine>(null);
  const resend = useCountdown();
  const throttle = useCountdown();
  // The code screen's own wait: a 429 on a code must not lock the password.
  const codeThrottle = useCountdown();
  const online = useOnline();
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  // After a wrong password the field is empty and enabled again: focus it so
  // the retry (and a screen reader) lands there. An effect, not the press
  // handler, because the field is still disabled while the press is working.
  useEffect(() => {
    if (line === 'wrong') passwordRef.current?.focus();
  }, [line]);

  // Clerk's script comes from our own domain; a blocker drops it silently, so
  // the loading state is also the blocked state after 10 seconds.
  if (!clerk.loaded) return <AuthLoadingState />;

  const returnQuery = new URLSearchParams({
    redirect_url: returnTo,
  }).toString();
  // The return path travels; the email does not (it would land in history and
  // logs), so the reset screen asks for it again.
  const forgotHref = `/sign-in/forgot?${returnQuery}`;

  function backToStart() {
    setPassword('');
    setLine(null);
    setCode('');
    setCodeLine(null);
    setScreen('start');
  }

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

  // The second factor and the new-device check are the same screen: a 6-digit
  // code emailed to the address. Only the emailed code is supported.
  async function secondFactor() {
    const emailCodeOffered = signIn.supportedSecondFactors?.some(
      (factor) => factor.strategy === 'email_code',
    );
    if (!emailCodeOffered) return setLine('failed');
    const { error } = await signIn.mfa.sendEmailCode();
    if (error) return setLine('failed');
    setCode('');
    setCodeLine(null);
    resend.start(WAIT_SECONDS);
    setScreen('deviceCode');
  }

  async function next() {
    // Read fresh: Clerk changes the status across the awaits above.
    const status = signIn.status;
    if (status === 'complete') return finish();
    if (status === 'needs_new_password') return setScreen('breached');
    if (status === 'needs_second_factor' || status === 'needs_client_trust') {
      return secondFactor();
    }
    return setLine('failed');
  }

  // A 429 is instant (about 15 ms against 250 for a wrong password), so it is
  // padded like every other answer and reads as one locked field with a wait.
  function throttled() {
    setLine('rateLimited');
    throttle.start(WAIT_SECONDS);
  }

  async function onSignIn(evt: FormEvent) {
    evt.preventDefault();
    if (busy || throttle.remaining > 0 || !online) return;
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
    try {
      if (!error) {
        await next();
      } else {
        const outcome = classifyPasswordError(error);
        if (outcome === 'breached') {
          setScreen('breached');
        } else if (outcome === 'wrong') {
          setLine('wrong');
          setPassword('');
        } else if (outcome === 'rateLimited') {
          throttled();
        } else {
          setLine('failed');
        }
      }
    } catch {
      // finalize or the navigation threw: say so, never hang on "Signing in".
      setLine('failed');
    }
    setBusy(false);
  }

  // Sending the code never reveals anything: Clerk's answer, whether it
  // returns an error or throws, is swallowed and the screen is the same whether
  // or not the address has an account. Only a 429 is reported (true of every
  // address), so a throttled resend does not say "sent".
  async function sendCode(): Promise<{ limited: boolean }> {
    const since = Date.now();
    let limited = false;
    try {
      const created = await signIn.create({ identifier: email });
      const sent = await signIn.emailCode.sendCode();
      limited = isRateLimited(created.error) || isRateLimited(sent.error);
    } catch {
      // Same screen either way.
    }
    // Two Clerk calls, so the higher floor (as the reset press).
    await held(since, RESET_FLOOR_MS);
    return { limited };
  }

  async function onEmailCode() {
    if (busy || !online) return;
    setBusy(true);
    setLine(null);
    const { limited } = await sendCode();
    if (limited) {
      // Throttled: say so here rather than promise a code that is not coming.
      throttled();
      setBusy(false);
      return;
    }
    setCode('');
    setCodeLine(null);
    resend.start(WAIT_SECONDS);
    setScreen('emailCode');
    setBusy(false);
  }

  async function onResend() {
    if (busy || resend.remaining > 0 || !online) return;
    setBusy(true);
    let limited = false;
    let failed = false;
    if (screen === 'deviceCode') {
      // Past the password there is nothing to hide, so a failure is said.
      const since = Date.now();
      try {
        const { error } = await signIn.mfa.sendEmailCode();
        limited = isRateLimited(error);
        failed = Boolean(error) && !limited;
      } catch {
        failed = true;
      }
      await held(since);
    } else {
      limited = (await sendCode()).limited;
    }
    setCode('');
    if (limited) {
      codeThrottle.start(WAIT_SECONDS);
      setCodeLine(null);
    } else if (failed) {
      setCodeLine('failed');
    } else {
      setCodeLine('sent');
      resend.start(WAIT_SECONDS);
    }
    setBusy(false);
  }

  async function onVerify(evt: FormEvent) {
    evt.preventDefault();
    if (busy || code.length < 6 || !online || codeThrottle.remaining > 0)
      return;
    setBusy(true);
    setCodeLine(null);
    setLine(null);
    const since = Date.now();
    let error: unknown = null;
    try {
      error = (
        screen === 'deviceCode'
          ? await signIn.mfa.verifyEmailCode({ code })
          : await signIn.emailCode.verifyCode({ code })
      ).error;
    } catch (thrown) {
      error = thrown;
    }
    await held(since);
    try {
      if (!error) {
        await next();
      } else if (isRateLimited(error)) {
        codeThrottle.start(WAIT_SECONDS);
      } else if (codesOf(error).includes('session_exists')) {
        // Already signed in (another tab): carry on to where they were going.
        router.replace(returnTo);
      } else if (codesOf(error).includes('verification_expired')) {
        setCodeLine('expired');
      } else if (codesOf(error).some((item) => WRONG_CODE_CODES.has(item))) {
        setCodeLine('wrong');
      } else {
        // Anything else (a captcha, a stale client) is not a wrong code.
        setCodeLine('failed');
      }
    } catch {
      setCodeLine('failed');
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

  if (screen === 'emailCode' || screen === 'deviceCode') {
    const device = screen === 'deviceCode';
    const waiting = resend.remaining > 0;
    const clock = formatClock(resend.remaining);
    const codeLocked = codeThrottle.remaining > 0;
    const codeError = codeLocked
      ? COPY.rateLimited.message
      : codeLine === 'wrong'
        ? COPY.emailCode.wrong
        : codeLine === 'expired'
          ? COPY.emailCode.expired
          : undefined;
    return (
      <AuthPage onBack={() => setScreen('password')}>
        {online ? null : <AuthBanner>{AUTH_FLOW_COPY.offline}</AuthBanner>}
        <AuthHeading
          {...(device ? { eyebrow: COPY.device.eyebrow } : {})}
          eyebrowTone="signal"
          title={device ? COPY.device.title : COPY.emailCode.title}
          sub={device ? COPY.device.body(email) : COPY.emailCode.body(email)}
        />
        <form noValidate onSubmit={onVerify} className="flex flex-col gap-4">
          <CodeBoxes
            value={code}
            onChange={setCode}
            error={codeError}
            disabled={busy || codeLocked}
          />
          <div aria-live="polite">
            {codeLine === 'sent' ? (
              <p className="m-0 text-[13px] text-fg-muted">
                {COPY.emailCode.sent}
              </p>
            ) : null}
            {codeLine === 'failed' || line === 'failed' ? (
              <AuthErrorLine>{COPY.failed}</AuthErrorLine>
            ) : null}
          </div>
          <PrimaryButton
            busy={busy}
            busyLabel={COPY.password.busy}
            disabled={code.length < 6 || codeLocked || !online}
          >
            {codeLocked
              ? COPY.rateLimited.countdown(formatClock(codeThrottle.remaining))
              : device
                ? COPY.device.submit
                : COPY.emailCode.submit}
          </PrimaryButton>
        </form>
        <LinkButton
          onClick={onResend}
          disabled={waiting}
          aria-disabled={waiting}
        >
          {waiting ? COPY.emailCode.resendIn(clock) : COPY.emailCode.resend}
        </LinkButton>
        {device ? null : (
          <LinkButton onClick={() => setScreen('password')}>
            {COPY.emailCode.usePassword}
          </LinkButton>
        )}
      </AuthPage>
    );
  }

  if (screen === 'password') {
    const locked = throttle.remaining > 0;
    const lockClock = formatClock(throttle.remaining);
    return (
      <AuthPage onBack={backToStart}>
        {online ? null : <AuthBanner>{AUTH_FLOW_COPY.offline}</AuthBanner>}
        <AuthHeading
          title={COPY.password.title}
          sub={
            <>
              {COPY.password.body(email)}{' '}
              <LinkButton
                className="min-h-0 text-[14.5px]"
                onClick={backToStart}
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
            disabled={busy || locked}
            error={
              line === 'wrong'
                ? COPY.password.didntWork
                : locked
                  ? COPY.rateLimited.message
                  : undefined
            }
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
            disabled={password.length === 0 || locked || !online}
          >
            {locked
              ? COPY.rateLimited.countdown(lockClock)
              : COPY.password.submit}
          </PrimaryButton>
          <SecondaryButton onClick={onEmailCode} disabled={busy}>
            {COPY.password.codeInstead}
          </SecondaryButton>
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
