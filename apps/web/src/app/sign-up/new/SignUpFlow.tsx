'use client';

import { useClerk, useSignUp } from '@clerk/nextjs';
import Link from 'next/link';
import { useRef, useState, type FormEvent, type ReactNode } from 'react';
import {
  AuthErrorLine,
  AuthField,
  PasswordField,
} from '@/components/auth/flow/AuthField';
import { AuthHeading, AuthPage } from '@/components/auth/flow/AuthPage';
import {
  InviteChip,
  LinkButton,
  PrimaryButton,
} from '@/components/auth/flow/AuthButtons';
import { ConsentCheck, LegalLink } from '@/components/auth/flow/ConsentCheck';
import { AUTH_FLOW_COPY } from '@/components/auth/flow/definitions/copy';
import { LegalSheet } from '@/components/auth/flow/LegalSheet';
import { AuthBanner, StepTrail } from '@/components/auth/flow/AuthNotices';
import { classifySignUpError } from '@/lib/auth/clerk-errors';
import { held } from '@/lib/auth/timing-pad';
import { formatClock, useCountdown } from '@/lib/auth/use-countdown';
import { useOnline } from '@/lib/auth/use-online';
import { AuthLoadingState } from '@/app/sign-in/AuthLoadingState';
import { SIGN_IN_COPY } from '@/app/sign-in/definitions/copy';
import { SIGN_UP_COPY } from '../definitions/copy';

const COPY = SIGN_UP_COPY;
const FLOW = AUTH_FLOW_COPY;

type Doc = 'terms' | 'privacy' | 'beta';
type PasswordLine = 'tooShort' | 'weak' | 'breached' | null;

const MIN_PASSWORD = 8;
const WAIT_SECONDS = 60;

const isEmailShape = (value: string): boolean =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

interface SignUpFlowProps {
  /** `/auth/complete?...`, computed on the server. */
  target: string;
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
  beta,
  inviteCode,
  changeHref,
  legal,
}: SignUpFlowProps) {
  const clerk = useClerk();
  const { signUp, fetchStatus } = useSignUp();
  const online = useOnline();
  const throttle = useCountdown();
  const [screen, setScreen] = useState<'form' | 'verify'>('form');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [consentError, setConsentError] = useState(false);
  const [emailInvalid, setEmailInvalid] = useState(false);
  const [passwordLine, setPasswordLine] = useState<PasswordLine>(null);
  const [failed, setFailed] = useState(false);
  const [captchaFailed, setCaptchaFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [openDoc, setOpenDoc] = useState<Doc | null>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const consentRef = useRef<HTMLInputElement>(null);

  if (!clerk.loaded) return <AuthLoadingState />;

  // Clerk's own check can hold a press open after ours would clear.
  const locked = busy || fetchStatus === 'fetching' || throttle.remaining > 0;
  const total = beta ? 3 : 2;
  const formStep = beta ? 2 : 1;

  // One rule for every press (and Google's, in a later PR): nothing is sent
  // until the box is ticked.
  function requireConsent(): boolean {
    if (agreed) return true;
    setConsentError(true);
    consentRef.current?.focus();
    return false;
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
      const created = await signUp.password({
        emailAddress: address,
        password,
        legalAccepted: true,
      });
      error = created.error;
      if (!error && signUp.missingFields?.includes('legal_accepted')) {
        // Impossible while the gate holds; fail closed to the red box.
        setConsentError(true);
        consentRef.current?.focus();
        await held(since);
        setBusy(false);
        return;
      }
      if (!error) error = (await signUp.verifications.sendEmailCode()).error;
    } catch (thrown) {
      error = thrown;
    }
    await held(since);
    const outcome = error ? classifySignUpError(error) : null;
    if (!error || outcome === 'taken') {
      // A taken email goes on to the same screen as any address.
      setScreen('verify');
    } else if (outcome === 'breached') {
      setPasswordLine('breached');
      passwordRef.current?.focus();
    } else if (outcome === 'weak') {
      setPasswordLine('weak');
      passwordRef.current?.focus();
    } else if (outcome === 'tooShort') {
      setPasswordLine('tooShort');
      passwordRef.current?.focus();
    } else if (outcome === 'email') {
      setEmailInvalid(true);
      emailRef.current?.focus();
    } else if (outcome === 'legal') {
      setConsentError(true);
      consentRef.current?.focus();
    } else if (outcome === 'rateLimited') {
      throttle.start(WAIT_SECONDS);
    } else {
      setCaptchaFailed(outcome === 'captcha');
      setFailed(true);
    }
    setBusy(false);
  }

  const docTitle = {
    terms: COPY.legal.terms,
    privacy: COPY.legal.privacy,
    beta: COPY.legal.beta,
  };

  if (screen === 'verify') {
    return (
      <AuthPage onBack={() => setScreen('form')}>
        <StepTrail step={beta ? 3 : 2} total={total} />
        <AuthHeading title={COPY.verify.title} sub={COPY.verify.body(email)} />
        <LinkButton onClick={() => setScreen('form')}>{FLOW.back}</LinkButton>
      </AuthPage>
    );
  }

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
      <StepTrail step={formStep as 1 | 2} total={total} />
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
          disabled={locked}
          error={emailInvalid ? COPY.form.emailInvalid : undefined}
        />
        <PasswordField
          ref={passwordRef}
          label={COPY.form.passwordLabel}
          value={password}
          onChange={(evt) => setPassword(evt.target.value)}
          autoComplete="new-password"
          disabled={locked}
          hint={FLOW.password.rule}
          error={passwordError}
        />
        <ConsentCheck
          checked={agreed}
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
          busy={busy || fetchStatus === 'fetching'}
          busyLabel={COPY.form.busy}
          disabled={!online || throttle.remaining > 0}
        >
          {throttle.remaining > 0
            ? SIGN_IN_COPY.rateLimited.countdown(lockClock)
            : COPY.form.submit}
        </PrimaryButton>
      </form>
      <p className="m-0 text-center text-sm text-fg-muted">
        {COPY.form.foot}{' '}
        <Link href="/sign-in/new" className="font-bold text-signal">
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
