'use client';

import { useClerk, useSignUp } from '@clerk/nextjs';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react';
import {
  AuthErrorLine,
  AuthField,
  PasswordField,
} from '@/components/auth/flow/AuthField';
import { AuthHeading, AuthPage } from '@/components/auth/flow/AuthPage';
import {
  GoogleButton,
  InviteChip,
  LinkButton,
  OrDivider,
  PrimaryButton,
} from '@/components/auth/flow/AuthButtons';
import { IntentCard } from '@/components/auth/flow/IntentCard';
import type { IntentSubject } from '@/lib/auth/intent-subject';
import { ssoCallbackUrl } from '@/lib/auth/sso';
import { CodeBoxes } from '@/components/auth/flow/CodeBoxes';
import { ConsentCheck, LegalLink } from '@/components/auth/flow/ConsentCheck';
import { AUTH_FLOW_COPY } from '@/components/auth/flow/definitions/copy';
import { LegalSheet } from '@/components/auth/flow/LegalSheet';
import { AuthBanner, StepTrail } from '@/components/auth/flow/AuthNotices';
import {
  classifyCodeError,
  classifySignUpError,
  codesOf,
  isRateLimited,
} from '@/lib/auth/clerk-errors';
import { held } from '@/lib/auth/timing-pad';
import { formatClock, useCountdown } from '@/lib/auth/use-countdown';
import { useOnline } from '@/lib/auth/use-online';
import { AuthLoadingState } from '@/app/sign-in/AuthLoadingState';
import { SIGN_IN_COPY } from '@/app/sign-in/definitions/copy';
import { SIGN_UP_COPY } from './definitions/copy';

const COPY = SIGN_UP_COPY;
const FLOW = AUTH_FLOW_COPY;

type Doc = 'terms' | 'privacy' | 'beta';
type PasswordLine = 'tooShort' | 'weak' | 'breached' | null;

const MIN_PASSWORD = 8;
const WAIT_SECONDS = 60;

const isEmailShape = (value: string): boolean =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

type CodeLine = 'wrong' | 'expired' | 'sent' | 'failed' | null;

interface SignUpFlowProps {
  /** `/auth/complete?...`, computed on the server: where a finished sign-up goes. */
  target: string;
  /** What they were about to do, for the card over the form's title. */
  intent?: IntentSubject;
  /** Before launch: the invite chip, the Beta Agreement and three steps. */
  beta: boolean;
  /** The invite the visitor arrived with; null shows no chip. */
  inviteCode: string | null;
  changeHref: string;
  /** The legal pages' bodies, for the sheet. The beta one only before launch. */
  legal: { terms: ReactNode; privacy: ReactNode; beta: ReactNode };
}

/**
 * The sign-up form: email, password and one consent box, asking Clerk for an
 * account and an emailed code. Pressing unticked sends nothing: the box goes
 * red and takes focus. `legalAccepted: true` goes to Clerk only from the tick.
 * The verify and done screens are the next PR's.
 */
export function SignUpFlow({
  target,
  intent = { kind: 'generic' },
  beta,
  inviteCode,
  changeHref,
  legal,
}: SignUpFlowProps) {
  const clerk = useClerk();
  const { signUp, fetchStatus } = useSignUp();
  const online = useOnline();
  const throttle = useCountdown();
  const router = useRouter();
  const [screen, setScreen] = useState<'form' | 'verify' | 'done'>('form');
  const [code, setCode] = useState('');
  const [codeLine, setCodeLine] = useState<CodeLine>(null);
  const resend = useCountdown();
  // A 429 on a code must not lock the form's own press.
  const codeThrottle = useCountdown();
  // The code was right and the sign-up is complete: a retry only finishes it,
  // because a finished sign-up takes no further update.
  const verified = useRef(false);
  // A taken email never had a code sent, and says "sent" all the same.
  const sendSkipped = useRef(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [consentError, setConsentError] = useState(false);
  const [emailInvalid, setEmailInvalid] = useState(false);
  const [passwordLine, setPasswordLine] = useState<PasswordLine>(null);
  const [failed, setFailed] = useState(false);
  const [captchaFailed, setCaptchaFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [openDoc, setOpenDoc] = useState<Doc | null>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const consentRef = useRef<HTMLInputElement>(null);
  // Clerk's answer arrives while the fields are still disabled, and a disabled
  // field cannot take focus: so the move waits for the unlock.
  const [focusOn, setFocusOn] = useState<
    'email' | 'password' | 'consent' | null
  >(null);
  // The account exists at Clerk but its code never went out: a retry for the
  // same address sends the code again rather than creating it a second time.
  const createdFor = useRef<string | null>(null);

  // Coming back with the browser's Back from Google restores this page with
  // the press still dimmed: clear it.
  useEffect(() => {
    const onShow = (evt: PageTransitionEvent) => {
      if (evt.persisted) setGoogleBusy(false);
    };
    window.addEventListener('pageshow', onShow);
    return () => window.removeEventListener('pageshow', onShow);
  }, []);

  useEffect(() => {
    if (!focusOn || busy || fetchStatus === 'fetching') return;
    const target =
      focusOn === 'email'
        ? emailRef
        : focusOn === 'password'
          ? passwordRef
          : consentRef;
    target.current?.focus();
    setFocusOn(null);
  }, [focusOn, busy, fetchStatus]);

  if (!clerk.loaded) return <AuthLoadingState />;

  // Clerk's own check can hold a press open after ours would clear.
  const locked = busy || fetchStatus === 'fetching' || throttle.remaining > 0;
  const total = beta ? 3 : 2;
  const formStep: 1 | 2 = beta ? 2 : 1;

  // One rule for every press (and Google's, in a later PR): nothing is sent
  // until the box is ticked.
  function requireConsent(): boolean {
    if (agreed) return true;
    setConsentError(true);
    consentRef.current?.focus();
    return false;
  }

  // The same rule as the password press: nothing leaves until the box is
  // ticked, and `legalAccepted: true` goes with the sign-up Google starts, so
  // no account exists without it.
  async function onGoogle() {
    if (locked || googleBusy || !online) return;
    if (!requireConsent()) return;
    setGoogleBusy(true);
    setFailed(false);
    try {
      const { error } = await signUp.sso({
        strategy: 'oauth_google',
        redirectUrl: target,
        redirectCallbackUrl: ssoCallbackUrl(target),
        legalAccepted: true,
      });
      if (error) {
        setFailed(true);
        setGoogleBusy(false);
      }
    } catch {
      setFailed(true);
      setGoogleBusy(false);
    }
  }

  async function onSubmit(evt: FormEvent) {
    evt.preventDefault();
    if (locked || !online) return;
    if (!requireConsent()) return;
    const address = email.trim();
    if (!isEmailShape(address)) {
      setEmailInvalid(true);
      emailRef.current?.focus();
      return;
    }
    if (password.length < MIN_PASSWORD) {
      setPasswordLine('tooShort');
      passwordRef.current?.focus();
      return;
    }
    setEmail(address);
    setEmailInvalid(false);
    setPasswordLine(null);
    setFailed(false);
    setCaptchaFailed(false);
    setBusy(true);
    const since = Date.now();
    let error: unknown = null;
    try {
      if (createdFor.current !== address) {
        const created = await signUp.password({
          emailAddress: address,
          password,
          legalAccepted: true,
        });
        error = created.error;
        if (!error && signUp.missingFields?.includes('legal_accepted')) {
          // Impossible while the gate holds; fail closed to the red box.
          setConsentError(true);
          setFocusOn('consent');
          await held(since);
          setBusy(false);
          return;
        }
        if (!error) createdFor.current = address;
      }
      if (!error) error = (await signUp.verifications.sendEmailCode()).error;
    } catch (thrown) {
      error = thrown;
    }
    await held(since);
    const outcome = error ? classifySignUpError(error) : null;
    if (!error || outcome === 'taken') {
      // A taken email goes on to the same screen as any address.
      sendSkipped.current = outcome === 'taken';
      verified.current = false;
      setCode('');
      setCodeLine(null);
      codeThrottle.start(0);
      resend.start(WAIT_SECONDS);
      setScreen('verify');
    } else if (outcome === 'breached') {
      setPasswordLine('breached');
      setFocusOn('password');
    } else if (outcome === 'weak') {
      setPasswordLine('weak');
      setFocusOn('password');
    } else if (outcome === 'tooShort') {
      setPasswordLine('tooShort');
      setFocusOn('password');
    } else if (outcome === 'email') {
      setEmailInvalid(true);
      setFocusOn('email');
    } else if (outcome === 'legal') {
      setConsentError(true);
      setFocusOn('consent');
    } else if (outcome === 'rateLimited') {
      throttle.start(WAIT_SECONDS);
    } else {
      setCaptchaFailed(outcome === 'captcha');
      setFailed(true);
    }
    setBusy(false);
  }

  // Finishing hands the session to Clerk, which then says where to go: a
  // pending session task needs a full load, anything else is a client move.
  async function finish(): Promise<boolean> {
    const { error } = await signUp.finalize({
      navigate: async ({ session, decorateUrl }) => {
        const task = session?.currentTask;
        if (task) {
          // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- the task page needs a full load, not a client transition
          window.location.assign(`/sign-in/tasks/${task.key}`);
          return;
        }
        const url = decorateUrl(target);
        if (url.startsWith('http')) window.location.assign(url);
        else router.replace(url);
      },
    });
    return !error;
  }

  // Back keeps the email and the tick; the next press starts a fresh sign-up
  // (Clerk drops the unfinished one when the password goes in again).
  function backToForm() {
    // A check or a send in flight would finish a sign-up the visitor left.
    if (busy) return;
    setCode('');
    setCodeLine(null);
    verified.current = false;
    sendSkipped.current = false;
    createdFor.current = null;
    setScreen('form');
  }

  async function onVerify(evt: FormEvent) {
    evt.preventDefault();
    if (busy || code.length < 6 || !online || codeThrottle.remaining > 0) {
      return;
    }
    setBusy(true);
    setCodeLine(null);
    const since = Date.now();
    if (sendSkipped.current) {
      // A taken email never had a code, and no code is right: it reads as any
      // wrong code does, so the screen cannot say whether the address has an
      // account (Clerk's own refusal for it is not the same as a wrong code's).
      await held(since);
      setCodeLine('wrong');
      setCode('');
      setBusy(false);
      return;
    }
    let error: unknown = null;
    if (!verified.current) {
      try {
        error = (await signUp.verifications.verifyEmailCode({ code })).error;
      } catch (thrown) {
        error = thrown;
      }
      await held(since);
    }
    try {
      if (!error) {
        // Read fresh: Clerk changes the status across the await above.
        if (!verified.current && signUp.status !== 'complete') {
          setCodeLine('failed');
        } else {
          verified.current = true;
          setScreen('done');
          if (!(await finish())) {
            setScreen('verify');
            setCodeLine('failed');
          }
        }
      } else if (codesOf(error).includes('session_exists')) {
        // Already signed in (another tab): carry on to where they were going.
        router.replace(target);
      } else {
        const outcome = classifyCodeError(error);
        if (outcome === 'rateLimited') codeThrottle.start(WAIT_SECONDS);
        else setCodeLine(outcome);
        if (outcome === 'wrong' || outcome === 'expired') setCode('');
      }
    } catch {
      setScreen('verify');
      setCodeLine('failed');
    }
    setBusy(false);
  }

  async function onResend() {
    if (busy || resend.remaining > 0 || !online) return;
    setBusy(true);
    const since = Date.now();
    let error: unknown = null;
    // A taken email has nothing to resend, and answers the same.
    if (!sendSkipped.current) {
      try {
        error = (await signUp.verifications.sendEmailCode()).error;
      } catch (thrown) {
        error = thrown;
      }
    }
    await held(since);
    setCode('');
    if (error && isRateLimited(error)) {
      codeThrottle.start(WAIT_SECONDS);
      setCodeLine(null);
    } else if (error) {
      setCodeLine('failed');
    } else {
      setCodeLine('sent');
      resend.start(WAIT_SECONDS);
    }
    setBusy(false);
  }

  const docTitle = {
    terms: COPY.legal.terms,
    privacy: COPY.legal.privacy,
    beta: COPY.legal.beta,
  };

  if (screen === 'verify') {
    const waiting = resend.remaining > 0;
    const codeLocked = codeThrottle.remaining > 0;
    const codeError = codeLocked
      ? SIGN_IN_COPY.rateLimited.message
      : codeLine === 'wrong'
        ? COPY.verify.wrong
        : codeLine === 'expired'
          ? COPY.verify.expired
          : undefined;
    return (
      <AuthPage onBack={backToForm}>
        {online ? null : <AuthBanner>{FLOW.offline}</AuthBanner>}
        <StepTrail step={beta ? 3 : 2} total={total} />
        <AuthHeading title={COPY.verify.title} sub={COPY.verify.body(email)} />
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
                {COPY.verify.sent}
              </p>
            ) : null}
            {codeLine === 'failed' ? (
              <AuthErrorLine>{SIGN_IN_COPY.failed}</AuthErrorLine>
            ) : null}
          </div>
          <PrimaryButton
            busy={busy}
            busyLabel={COPY.verify.busy}
            disabled={code.length < 6 || codeLocked || !online}
          >
            {codeLocked
              ? SIGN_IN_COPY.rateLimited.countdown(
                  formatClock(codeThrottle.remaining),
                )
              : COPY.verify.submit}
          </PrimaryButton>
        </form>
        <LinkButton
          onClick={onResend}
          disabled={waiting}
          aria-disabled={waiting}
        >
          {waiting
            ? COPY.verify.resendIn(formatClock(resend.remaining))
            : COPY.verify.resend}
        </LinkButton>
        <LinkButton onClick={backToForm}>{COPY.verify.wrongEmail}</LinkButton>
        <p className="m-0 text-center text-sm text-fg-muted">
          {COPY.verify.haveAccount}{' '}
          <Link href="/sign-in" className="font-bold text-signal">
            {COPY.verify.haveAccountLink}
          </Link>
        </p>
      </AuthPage>
    );
  }

  // The finished account is the form again, every field fixed and the button
  // turned to "You're in" (board signup-done-m).
  const finished = screen === 'done';

  const lockClock = formatClock(throttle.remaining);
  const botVisible = fetchStatus === 'fetching' || captchaFailed;
  const link = (doc: Doc, label: string) => (
    <LegalLink href={`/legal/${doc}`} onClick={() => setOpenDoc(doc)}>
      {label}
    </LegalLink>
  );
  const passwordError =
    passwordLine === 'tooShort'
      ? COPY.errors.tooShort
      : passwordLine === 'weak'
        ? COPY.errors.weak
        : passwordLine === 'breached'
          ? COPY.errors.breached
          : undefined;

  return (
    <AuthPage>
      {online ? null : <AuthBanner>{FLOW.offline}</AuthBanner>}
      <StepTrail
        step={finished ? total : formStep}
        total={total}
        done={finished}
      />
      <IntentCard subject={intent} asTitle={false} />
      <AuthHeading
        title={COPY.form.title}
        sub={beta ? COPY.form.body : COPY.form.bodyLaunch}
      />
      {beta && inviteCode ? (
        <InviteChip
          label={COPY.form.inviteChip}
          code={inviteCode}
          changeLabel={COPY.form.inviteChange}
          changeHref={changeHref}
        />
      ) : null}
      <form noValidate onSubmit={onSubmit} className="flex flex-col gap-4">
        <AuthField
          ref={emailRef}
          label={COPY.form.emailLabel}
          type="email"
          value={email}
          onChange={(evt) => setEmail(evt.target.value)}
          placeholder={COPY.form.emailPlaceholder}
          autoComplete="email"
          inputMode="email"
          autoCapitalize="none"
          spellCheck={false}
          disabled={locked || finished}
          error={emailInvalid ? COPY.form.emailInvalid : undefined}
        />
        <PasswordField
          ref={passwordRef}
          label={COPY.form.passwordLabel}
          value={password}
          onChange={(evt) => setPassword(evt.target.value)}
          autoComplete="new-password"
          disabled={locked || finished}
          hint={FLOW.password.rule}
          error={passwordError}
        />
        <ConsentCheck
          checked={agreed || finished}
          disabled={finished}
          onChange={(next) => {
            setAgreed(next);
            if (next) setConsentError(false);
          }}
          error={consentError ? FLOW.consent.error : undefined}
          inputRef={consentRef}
        >
          {FLOW.consent.lead}
          {link('terms', FLOW.consent.terms)}
          {beta ? FLOW.consent.comma : FLOW.consent.and}
          {link('privacy', FLOW.consent.privacy)}
          {beta ? (
            <>
              {FLOW.consent.and}
              {link('beta', FLOW.consent.beta)}
            </>
          ) : null}
          {FLOW.consent.end}
        </ConsentCheck>
        {/* Clerk draws its bot check here when it needs one. It must be
            mounted: without it the call fails with `captcha_invalid`. */}
        {botVisible ? (
          <div role="status" className="flex flex-col gap-1">
            <b className="text-sm text-fg">{COPY.bot.title}</b>
            <span className="text-[13px] text-fg-muted">{COPY.bot.body}</span>
          </div>
        ) : null}
        <div id="clerk-captcha" className="empty:hidden" />
        <div aria-live="polite">
          {failed ? <AuthErrorLine>{SIGN_IN_COPY.failed}</AuthErrorLine> : null}
          {throttle.remaining > 0 ? (
            <AuthErrorLine>{SIGN_IN_COPY.rateLimited.message}</AuthErrorLine>
          ) : null}
        </div>
        <PrimaryButton
          done={finished}
          doneLabel={COPY.form.done}
          busy={busy || fetchStatus === 'fetching'}
          busyLabel={COPY.form.busy}
          disabled={!online || throttle.remaining > 0}
        >
          {throttle.remaining > 0
            ? SIGN_IN_COPY.rateLimited.countdown(lockClock)
            : COPY.form.submit}
        </PrimaryButton>
      </form>
      {finished ? null : (
        <>
          <OrDivider />
          <GoogleButton
            busy={googleBusy || fetchStatus === 'fetching'}
            disabled={locked}
            onClick={onGoogle}
          />
        </>
      )}
      <p className="m-0 text-center text-sm text-fg-muted">
        {COPY.form.foot}{' '}
        <Link href="/sign-in" className="font-bold text-signal">
          {COPY.form.footLink}
        </Link>
      </p>
      <LegalSheet
        open={openDoc !== null}
        onClose={() => setOpenDoc(null)}
        title={openDoc ? docTitle[openDoc] : ''}
      >
        {openDoc ? legal[openDoc] : null}
      </LegalSheet>
    </AuthPage>
  );
}
