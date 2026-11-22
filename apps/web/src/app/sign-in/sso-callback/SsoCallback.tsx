'use client';

import { useClerk, useSignIn, useSignUp } from '@clerk/nextjs';
import * as Sentry from '@sentry/nextjs';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { AuthErrorLine } from '@/components/auth/flow/AuthField';
import { AuthHeading, AuthPage } from '@/components/auth/flow/AuthPage';
import {
  GoogleButton,
  LinkButton,
  PrimaryButton,
} from '@/components/auth/flow/AuthButtons';
import { ConsentCheck, LegalLink } from '@/components/auth/flow/ConsentCheck';
import { AUTH_FLOW_COPY } from '@/components/auth/flow/definitions/copy';
import { LegalSheet } from '@/components/auth/flow/LegalSheet';
import { decideCallback, type GoogleNotice } from '@/lib/auth/sso';
import { AuthLoadingState } from '@/app/sign-in/AuthLoadingState';
import { SIGN_IN_COPY } from '@/app/sign-in/definitions/copy';
import { SIGN_UP_COPY } from '@/app/sign-up/definitions/copy';
import type { ReactNode } from 'react';

const COPY = SIGN_IN_COPY.googleConsent;
const FLOW = AUTH_FLOW_COPY;

interface SsoCallbackProps {
  /** The sanitized return path: where a finished sign-in or sign-up goes. */
  returnTo: string;
  /** The legal pages' bodies, for the consent fallback's sheet. */
  legal: { terms: ReactNode; privacy: ReactNode };
}

/**
 * Where Google sends the visitor back to. It does NOT render Clerk's
 * `<HandleSSOCallback />`, whose job includes carrying a sign-in for an
 * unknown Google account on into a sign-up: that would make an account without
 * an invite. This reads what Clerk holds and decides once (`decideCallback`),
 * failing closed: anything it does not recognise goes back to the start screen
 * with a note, never on into an account.
 */
export function SsoCallback({ returnTo, legal }: SsoCallbackProps) {
  const clerk = useClerk();
  const { signIn } = useSignIn();
  const { signUp } = useSignUp();
  const router = useRouter();
  const ran = useRef(false);
  const [consent, setConsent] = useState<{ email: string | null } | null>(null);
  const [agreed, setAgreed] = useState(false);
  const [consentError, setConsentError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [doc, setDoc] = useState<'terms' | 'privacy' | null>(null);
  const consentRef = useRef<HTMLInputElement>(null);

  const startHref = (notice: GoogleNotice) =>
    `/sign-in?${new URLSearchParams({ google: notice, redirect_url: returnTo }).toString()}`;

  async function finalize(which: 'signIn' | 'signUp'): Promise<boolean> {
    const navigate = async ({
      session,
      decorateUrl,
    }: {
      session: { currentTask?: { key: string } | null } | null;
      decorateUrl: (url: string) => string;
    }) => {
      const task = session?.currentTask;
      if (task) {
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- the task page needs a full load, not a client transition
        window.location.assign(`/sign-in/tasks/${task.key}`);
        return;
      }
      const url = decorateUrl(returnTo);
      if (url.startsWith('http')) window.location.assign(url);
      else router.replace(url);
    };
    try {
      const { error } = await (which === 'signIn'
        ? signIn.finalize({ navigate })
        : signUp.finalize({ navigate }));
      return !error;
    } catch {
      return false;
    }
  }

  useEffect(() => {
    if (!clerk.loaded || ran.current) return;
    ran.current = true;

    async function run() {
      // Resolve a pending bot check first, as `<HandleSSOCallback />` does. If
      // Clerk no longer has the function or it throws, fail closed.
      const resolve = clerk.__internal_resolvePendingProtectCheck;
      if (!resolve) {
        Sentry.captureException(new Error('sso-callback-protect-missing'), {
          tags: { site: 'sso-callback-protect-missing' },
        });
        router.replace(startHref('failed'));
        return;
      }
      try {
        // Google may have been started from either page: settle both flows.
        await resolve('signIn');
        await resolve('signUp');
      } catch {
        Sentry.captureException(new Error('sso-callback-protect-failed'), {
          tags: { site: 'sso-callback-protect-failed' },
        });
        router.replace(startHref('failed'));
        return;
      }

      const outcome = decideCallback({
        signInStatus: signIn.status,
        transferable: signIn.isTransferable,
        signUpStatus: signUp.status,
        signUpMissing: signUp.missingFields,
        signUpTransferable: signUp.isTransferable,
      });

      if (outcome === 'signInTransfer') {
        // Started from the sign-up page by someone who already has an account:
        // it becomes the sign-in it should have been. Never the other way.
        try {
          const { error } = await signIn.create({ transfer: true });
          if (
            !error &&
            signIn.status === 'complete' &&
            (await finalize('signIn'))
          ) {
            return;
          }
        } catch {
          // Falls to the failed note below.
        }
        router.replace(startHref('failed'));
        return;
      }
      if (outcome === 'signedIn' || outcome === 'signedUp') {
        if (!(await finalize(outcome === 'signedIn' ? 'signIn' : 'signUp'))) {
          router.replace(startHref('failed'));
        }
        return;
      }
      if (outcome === 'consent') {
        setConsent({ email: signUp.emailAddress ?? null });
        return;
      }
      router.replace(startHref(outcome));
    }

    run().catch(() => router.replace(startHref('failed')));
    // Runs once, when Clerk has loaded: the effect is guarded by `ran`.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one decision per arrival, not per render
  }, [clerk.loaded]);

  async function onConsent() {
    if (busy) return;
    if (!agreed) {
      setConsentError(true);
      consentRef.current?.focus();
      return;
    }
    setBusy(true);
    setFailed(false);
    try {
      const { error } = await signUp.update({ legalAccepted: true });
      if (
        !error &&
        signUp.status === 'complete' &&
        (await finalize('signUp'))
      ) {
        return;
      }
    } catch {
      // Falls to the failed line below.
    }
    setFailed(true);
    setBusy(false);
  }

  if (!clerk.loaded) return <AuthLoadingState />;

  if (consent) {
    return (
      <AuthPage>
        <AuthHeading
          eyebrow={COPY.eyebrow}
          title={COPY.title}
          sub={consent.email ? COPY.body(consent.email) : COPY.bodyNoEmail}
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
          <LegalLink href="/legal/terms" onClick={() => setDoc('terms')}>
            {FLOW.consent.terms}
          </LegalLink>
          {FLOW.consent.and}
          <LegalLink href="/legal/privacy" onClick={() => setDoc('privacy')}>
            {FLOW.consent.privacy}
          </LegalLink>
          {FLOW.consent.end}
        </ConsentCheck>
        <div aria-live="polite">
          {failed ? (
            <AuthErrorLine>{SIGN_IN_COPY.google.failed}</AuthErrorLine>
          ) : null}
        </div>
        <PrimaryButton type="button" busy={busy} onClick={onConsent}>
          {COPY.submit}
        </PrimaryButton>
        <LinkButton onClick={() => router.replace(startHref('cancelled'))}>
          {COPY.cancel}
        </LinkButton>
        <LegalSheet
          open={doc !== null}
          onClose={() => setDoc(null)}
          title={
            doc === 'privacy'
              ? SIGN_UP_COPY.legal.privacy
              : SIGN_UP_COPY.legal.terms
          }
        >
          {doc ? legal[doc] : null}
        </LegalSheet>
      </AuthPage>
    );
  }

  return (
    <AuthPage>
      <AuthHeading
        title={SIGN_IN_COPY.google.returnTitle}
        sub={SIGN_IN_COPY.google.returnBody}
      />
      <GoogleButton busy />
    </AuthPage>
  );
}
