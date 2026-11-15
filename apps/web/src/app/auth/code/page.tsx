'use client';

import { Check } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef, useState, useTransition } from 'react';
import { AuthErrorLine } from '@/components/auth/flow/AuthField';
import { AuthHeading, AuthPage } from '@/components/auth/flow/AuthPage';
import { StepTrail } from '@/components/auth/flow/AuthNotices';
import { LinkButton, PrimaryButton } from '@/components/auth/flow/AuthButtons';
import { WaitlistModal } from '@/components/waitlist/WaitlistModal';
import { formatClock, useCountdown } from '@/lib/auth/use-countdown';
import { formatInviteCodeInput, isCompleteInviteCode } from '@/lib/invite-code';
import { releaseInviteCode, validateAndSetInviteCode } from './actions';
import { CodeEnded } from './CodeEnded';
import { copy } from './definitions/copy';

type ErrorKind =
  | 'invalid_format'
  | 'notfound'
  | 'used'
  | 'expired'
  | 'ended'
  | 'ratelimit'
  | 'server_error'
  | null;

/** How long the field stays locked after too many tries, in seconds. */
const LOCK_SECONDS = 180;

export default function InviteCodePage() {
  const [code, setCode] = useState('');
  // True while the code is the one the link filled in: the board's "You're
  // invited" page. Typing over it is the visitor's own code again.
  const [prefilled, setPrefilled] = useState(false);
  const [errorKind, setErrorKind] = useState<ErrorKind>(null);
  const [isPending, startTransition] = useTransition();
  const [waitlistOpen, setWaitlistOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  // Set by "Enter it" on the ended page: the form is not mounted until the
  // ended state clears, so the focus waits for the render that mounts it.
  const [refocus, setRefocus] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const lock = useCountdown();
  const released = useRef(false);

  // A poster's QR lands here as `?code=BETA-…`. The field is filled in and
  // nothing more: the visitor still presses the button, so a scan alone never
  // redeems a seat. Read after mount, like `redirect_url` below, so the page
  // needs no Suspense boundary and the server render matches the first paint.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const fromLink = params.get('code');
    if (fromLink) {
      setCode(formatInviteCodeInput(fromLink));
      setPrefilled(true);
    }
    // "Use a different code" on the sign-up form: the code they redeemed goes.
    if (params.get('change') === '1' && !released.current) {
      released.current = true;
      void releaseInviteCode().catch(() => {});
      // Spent: Back, Forward or a reload must not release the code they are
      // about to redeem next.
      const url = new URL(window.location.href);
      url.searchParams.delete('change');
      window.history.replaceState(null, '', url);
    }
  }, []);

  useEffect(() => {
    // The field is disabled while a redeem is pending, and a disabled input
    // cannot take focus: wait for it to be enabled, then focus it once.
    const input = inputRef.current;
    if (!refocus || isPending || input === null) return;
    input.focus();
    setRefocus(false);
  }, [refocus, isPending]);

  const isComplete = isCompleteInviteCode(code);
  const locked = lock.remaining > 0;

  // The way back from the ended page: the form again, empty. The ended code
  // is not carried over.
  function handleEnterAnother() {
    setCode('');
    setPrefilled(false);
    setErrorKind(null);
    // The field that held focus was unmounted without a blur.
    setFocused(false);
    setRefocus(true);
  }

  function handleChange(ev: React.ChangeEvent<HTMLInputElement>) {
    setErrorKind(null);
    setPrefilled(false);
    setCode(formatInviteCodeInput(ev.target.value));
  }

  function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!isComplete || isPending || locked) return;
    // Read at submit time rather than through `useSearchParams`, which would
    // force this page behind a Suspense boundary for a value only the click
    // needs. The middleware attaches `redirect_url` when it bounces an
    // invite-gated route here; the action sanitises it.
    const returnPath = new URLSearchParams(window.location.search).get(
      'redirect_url',
    );
    startTransition(async () => {
      const result = await validateAndSetInviteCode(code, returnPath);
      if (!result.ok) {
        setErrorKind(result.error);
        if (result.error === 'ratelimit') lock.start(LOCK_SECONDS);
      }
    });
  }

  // An ended code is a page of its own: there is nothing to retype.
  if (errorKind === 'ended') {
    return <CodeEnded onEnterAnother={handleEnterAnother} />;
  }

  const errorId = 'invite-code-error';
  const off = !isComplete || isPending || locked;
  const border = errorKind
    ? 'border-danger'
    : isComplete || focused
      ? 'border-signal'
      : 'border-border-strong';

  return (
    <AuthPage>
      <StepTrail step={1} total={3} />
      <AuthHeading
        {...(prefilled ? { eyebrow: copy.prefilled.eyebrow } : {})}
        eyebrowTone="signal"
        title={prefilled ? copy.prefilled.heading : copy.heading}
        sub={prefilled ? copy.prefilled.body : copy.description}
      />

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <input
            ref={inputRef}
            type="text"
            value={code}
            onChange={handleChange}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder={copy.input.placeholder}
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            disabled={isPending || locked}
            aria-label={copy.input.ariaLabel}
            aria-invalid={errorKind ? true : undefined}
            aria-describedby={errorKind ? errorId : undefined}
            className={`box-border h-16 w-full rounded-xl border-[1.5px] bg-surface-1 px-5 text-center font-mono text-[22px] font-semibold tracking-[0.06em] text-fg uppercase outline-none transition-colors disabled:opacity-60 ${border}`}
          />
          <div aria-live="polite">
            {errorKind ? (
              <AuthErrorLine id={errorId}>
                {copy.errors[errorKind]}
                {errorKind === 'used' ? (
                  <>
                    {copy.usedNext.lead}
                    <Link
                      href={copy.usedNext.href}
                      className="font-bold text-signal"
                    >
                      {copy.usedNext.link}
                    </Link>
                    {copy.usedNext.end}
                  </>
                ) : null}
                {errorKind === 'expired' ? (
                  <>
                    {copy.expiredNext.lead}
                    <button
                      type="button"
                      onClick={() => setWaitlistOpen(true)}
                      className="font-bold text-signal underline underline-offset-2"
                    >
                      {copy.expiredNext.link}
                    </button>
                    {copy.expiredNext.end}
                  </>
                ) : null}
              </AuthErrorLine>
            ) : code.length > 0 ? (
              <p className="m-0 flex items-center justify-center gap-1.5 text-[13px] text-fg-subtle">
                {isComplete ? (
                  <>
                    <Check
                      size={14}
                      strokeWidth={2.6}
                      aria-hidden
                      className="text-success"
                    />
                    {copy.hint.valid}
                  </>
                ) : (
                  copy.hint.paste
                )}
              </p>
            ) : null}
          </div>
        </div>

        <PrimaryButton
          busy={isPending}
          busyLabel={copy.button.pending}
          disabled={off}
        >
          {locked
            ? copy.button.wait(formatClock(lock.remaining))
            : copy.button.idle}
        </PrimaryButton>

        <p className="m-0 text-center text-xs leading-normal text-fg-subtle">
          {copy.agreement.prefix}
          {/* New tab, like the checkout panel's legal links: navigating away
              in place would throw away the code the visitor has typed. */}
          <Link
            href={copy.agreement.href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block py-1.5 text-signal underline underline-offset-2"
          >
            {copy.agreement.link}
          </Link>
          .
        </p>
      </form>

      <div className="flex flex-col items-center gap-1">
        <LinkButton onClick={() => setWaitlistOpen(true)}>
          {copy.footer.waitlist}
        </LinkButton>
        <p className="m-0 text-center text-sm text-fg-muted">
          {copy.footer.haveAccount}{' '}
          <Link href={copy.footer.signInHref} className="font-bold text-signal">
            {copy.footer.signIn}
          </Link>
        </p>
      </div>

      <WaitlistModal
        open={waitlistOpen}
        onClose={() => setWaitlistOpen(false)}
      />
    </AuthPage>
  );
}
