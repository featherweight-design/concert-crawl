'use client'

// The tier picker surface — the `tier-picker-on-tap` locked surface from
// @concert-crawl/entitlements, rendered in the shared ModalShell (bottom
// sheet <640px, centered modal above). Desktop shows a row of cards;
// mobile shows the collapsed-summary accordion (one row expanded).
// Gifted / role-comped users get the GiftedThankYou panel instead of
// cards. Selecting a paid tier from the free state swaps the content to
// the embedded Stripe checkout; dismissing mid-checkout fires the
// best-effort abandon call (eng infra spec Part 2 §1.3).

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@clerk/nextjs'
import type { PlanState, PickerEntry, PaymentFlow } from '@concert-crawl/types'
import { track } from '@/lib/analytics'
import { appendPendingTier } from '@/lib/auth/intent'
import { ModalShell } from '@/components/consumer/modal-shell'
import { useFounderWindow } from '@/lib/queries/use-founder-window'
import { createCheckoutSession, abandonCheckout } from '@/lib/billing'
import { navigateToPortalSession } from '@/lib/portal-navigation'
import { TIER_PICKER_COPY } from './definitions/copy'
import { visibleTiers, defaultExpandedTier } from './lib/visible-tiers'
import { beginPaymentFlow } from './lib/payment-flow-signal'
import { scarcityRailData } from './lib/scarcity'
import { TierCardDesktop } from './TierCardDesktop'
import { TierRowMobile } from './TierRowMobile'
import { GiftedThankYou } from './GiftedThankYou'
import { CheckoutPanel } from './CheckoutPanel'
import { FounderClaimTakeover } from './FounderClaimTakeover'
import { failureDialogProps } from './FailureSurface'
import { challengeDialogProps } from './ChallengeMount'
import {
  CHALLENGE_DESKTOP_WIDTH,
  FAILURE_DESKTOP_WIDTH,
} from './definitions/constants'
import type {
  CheckoutSurface,
  PickerState,
  TierCta,
  TierKey,
} from './definitions/types'

const HEADER_COPY = TIER_PICKER_COPY.header

interface HeaderVariant {
  eyebrow: string
  title: string
  sub: string
}

// One surface serving several reaches, on both sides of auth. Signed out, an
// entry without its own variant falls back to the Watching wording; signed in
// it falls back to the generic "Pick a lane", which is what an account-menu
// open should read as. Resolved in ONE place so the eyebrow, the title and the
// sub can never be drawn from three different variants.
function headerFor(entry: PickerEntry, loggedOut: boolean): HeaderVariant {
  const variants: Partial<Record<PickerEntry, HeaderVariant>> = loggedOut
    ? HEADER_COPY.loggedOut
    : HEADER_COPY.signedIn
  return (
    variants[entry] ?? (loggedOut ? HEADER_COPY.loggedOut.default : HEADER_COPY)
  )
}

export interface TierPickerSheetProps {
  open: boolean
  onClose: () => void
  planState: PlanState
  // Server-resolved SCA-region boolean (spec §1.7) — forwarded to the
  // checkout panel's legal block.
  scaRegion: boolean
  // Where the picker was opened from — the `entry` dimension on the
  // monetization_picker_viewed funnel event (spec §8).
  entry: PickerEntry
  /**
   * Where the free tier's Sign up CTA goes. Defaults to bare `/sign-up`; a
   * caller with a pending action passes a URL that carries it through auth so
   * the tour can hand it back afterwards (#794).
   */
  signUpHref?: string | undefined
  /**
   * Which tier's card opens expanded, overriding the plan-derived default.
   * Set when reopening on the tier a visitor picked before signing up (#1284);
   * ignored when that tier is not among the visible ones.
   */
  initialTier?: TierKey | null | undefined
}

interface CheckoutContext {
  tierKey: Exclude<TierKey, 'free'>
  clientSecret: string
  subscriptionId: string
  // Seat reserved by the incomplete founder subscription (null for
  // non-founder tiers) — drives the post-claim reveal (#781 §3.3).
  founderSeatNumber: number | null
}

interface FounderClaim {
  seatNumber: number
  seatsTotal: number
}

const pickerStateFrom = (planState: PlanState): PickerState => {
  if (planState.roleComped || planState.plan === 'gifted') return 'gifted'
  // Checked before plan: a trial derives plan 'premium', and treating it as
  // the current plan would offer "Manage subscription" — a portal call that
  // 404s with no_customer, because a card-less trial has no Stripe customer.
  if (planState.onTrial) return 'trial'
  return planState.plan
}

const isPaidTier = (key: TierKey): key is Exclude<TierKey, 'free'> =>
  key !== 'free'

// Acquisition flow for the payment funnel (spec §8): a live trial converting,
// an existing paid plan upgrading, or a brand-new subscription.
const paymentFlowFrom = (planState: PlanState): PaymentFlow => {
  if (planState.onTrial) return 'trial-conversion'
  if (
    planState.plan === 'supporter' ||
    planState.plan === 'premium' ||
    planState.plan === 'founder'
  )
    return 'upgrade'
  return 'new'
}

const MonoRail = ({ text, isMobile }: { text: string; isMobile: boolean }) => (
  <div
    style={{
      textAlign: 'center',
      fontFamily: 'var(--font-mono)',
      fontSize: isMobile ? 9.5 : 10,
      color: 'var(--fg-subtle)',
      letterSpacing: isMobile ? '0.12em' : '0.14em',
      textTransform: 'uppercase',
    }}
  >
    {text}
  </div>
)

const SignInLink = ({ size }: { size: number }) => (
  <span
    style={{
      fontWeight: 600,
      fontSize: size,
      color: 'var(--fg-muted)',
      letterSpacing: '-0.005em',
    }}
  >
    {TIER_PICKER_COPY.signIn.prompt}{' '}
    <Link href="/sign-in" style={{ color: 'var(--signal)', fontWeight: 700 }}>
      {TIER_PICKER_COPY.signIn.link}
    </Link>
  </span>
)

const RailHeader = ({
  eyebrow,
  code,
  tone,
}: {
  eyebrow: string
  code: string
  tone: string
}) => (
  <div
    style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%' }}
  >
    <span
      aria-hidden
      style={{
        width: 6,
        height: 6,
        borderRadius: 6,
        background: tone,
        flexShrink: 0,
        boxShadow: `0 0 8px ${tone}`,
      }}
    />
    <span
      style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 10,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.16em',
        color: tone,
      }}
    >
      {eyebrow}
    </span>
    <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
    <span
      style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 10,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.14em',
        color: 'var(--fg-subtle)',
      }}
    >
      {code}
    </span>
  </div>
)

export const TierPickerSheet = ({
  open,
  onClose,
  planState,
  scaRegion,
  entry,
  signUpHref = '/sign-up',
  initialTier = null,
}: TierPickerSheetProps) => {
  const router = useRouter()
  const { getToken } = useAuth()
  const state = pickerStateFrom(planState)
  const gifted = state === 'gifted'
  const loggedOut = state === 'logged-out'

  // Funnel entry (spec §8): the picker surface became visible. Fires once per
  // open transition — the ref guard prevents a re-fire (double count) if
  // `entry` or the plan changes (e.g. a refetch) while the sheet stays open.
  const wasOpen = useRef(false)
  useEffect(() => {
    if (open && !wasOpen.current) {
      track('monetization_picker_viewed', { entry, plan: planState.plan })
    }
    wasOpen.current = open
  }, [open, entry, planState.plan])

  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const mql = window.matchMedia('(max-width: 639px)')
    setIsMobile(mql.matches)
    const listener = (ev: MediaQueryListEvent) => setIsMobile(ev.matches)
    mql.addEventListener('change', listener)
    return () => mql.removeEventListener('change', listener)
  }, [])

  const founderWindow = useFounderWindow(open && !gifted)
  // Until the window loads, treat it as pre-launch: the Founder card
  // renders with a disabled CTA rather than flashing in/out.
  const windowView = founderWindow.data ?? {
    state: 'pre-launch' as const,
    seatsTotal: 100,
    closesAt: null,
  }
  const tiers = visibleTiers(windowView.state, state)
  const rail = scarcityRailData(windowView, new Date())

  const [expandedTier, setExpandedTier] = useState<TierKey | null>(null)
  useEffect(() => {
    if (!open) return
    const shown = visibleTiers(windowView.state, state)
    const preselected = shown.some((tier) => tier.key === initialTier)
      ? initialTier
      : null
    setExpandedTier(preselected ?? defaultExpandedTier(shown, state))
    // Reset the accordion each time the sheet opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const [checkout, setCheckout] = useState<CheckoutContext | null>(null)
  const [pendingTier, setPendingTier] = useState<TierKey | null>(null)
  const [errorText, setErrorText] = useState<string | null>(null)
  // Which layout the checkout panel is showing (checkout / failure /
  // challenge) — drives the sheet's rail header + desktop width (PR 4.4).
  const [checkoutSurface, setCheckoutSurface] = useState<CheckoutSurface>({
    kind: 'checkout',
  })

  // While the embedded checkout (card entry) is mounted, mark an active
  // payment flow so the past-due banner suppresses itself (PR 4.3).
  useEffect(() => {
    if (!open || checkout === null) return
    const releasePaymentFlow = beginPaymentFlow()
    return releasePaymentFlow
  }, [open, checkout])

  // Dismissing a failure surface returns focus to the tier CTA that
  // opened checkout (a11y table — focus never falls to the body).
  const [returnFocusTier, setReturnFocusTier] = useState<TierKey | null>(null)

  // Bumped on close to invalidate any createCheckoutSession still in
  // flight — a session resolving after dismissal must be abandoned (the
  // incomplete subscription holds a founder seat), never shown on reopen.
  const checkoutActionRef = useRef(0)

  const abandonSubscription = useCallback(
    (subscriptionId: string) => {
      void (async () => {
        try {
          const token = await getToken()
          if (!token) return
          await abandonCheckout(token, subscriptionId)
        } catch (err) {
          // Best-effort — the webhook path covers clients that vanish.
          console.error('tier-picker: checkout-abandon failed', err)
        }
      })()
    },
    [getToken],
  )

  const close = useCallback(() => {
    checkoutActionRef.current += 1
    if (checkout !== null) abandonSubscription(checkout.subscriptionId)
    setCheckout(null)
    setCheckoutSurface({ kind: 'checkout' })
    setErrorText(null)
    setPendingTier(null)
    setReturnFocusTier(null)
    onClose()
  }, [checkout, abandonSubscription, onClose])

  const backToTiers = useCallback(() => {
    if (checkout !== null) {
      abandonSubscription(checkout.subscriptionId)
      setReturnFocusTier(checkout.tierKey)
    }
    setCheckout(null)
    setCheckoutSurface({ kind: 'checkout' })
  }, [checkout, abandonSubscription])

  const selectTier = useCallback(
    (tierKey: TierKey, cta: TierCta) => {
      setErrorText(null)
      setReturnFocusTier(null)
      if (cta.action === 'sign-up') {
        // A paid choice rides through Clerk so the picker can reopen on it once
        // there is an account to charge (#1284). Free carries nothing: signing
        // up is the whole of what its CTA promises.
        router.push(
          appendPendingTier(signUpHref, isPaidTier(tierKey) ? tierKey : null),
        )
        return
      }
      if (cta.action === 'manage') {
        void (async () => {
          setPendingTier(tierKey)
          try {
            await navigateToPortalSession(getToken)
          } catch (err) {
            console.error('tier-picker: portal-session failed', err)
            setErrorText(TIER_PICKER_COPY.errors.portal)
          } finally {
            setPendingTier(null)
          }
        })()
        return
      }
      if (cta.action === 'checkout' && isPaidTier(tierKey)) {
        // Funnel step (spec §8): a paid tier's CTA was chosen, before the
        // checkout session is created.
        track('monetization_tier_selected', {
          tier: tierKey,
          plan: planState.plan,
        })
        const actionId = (checkoutActionRef.current += 1)
        void (async () => {
          setPendingTier(tierKey)
          try {
            const token = await getToken()
            if (!token) throw new Error('Not authenticated')
            const session = await createCheckoutSession(token, tierKey)
            if (checkoutActionRef.current !== actionId) {
              // Dismissed while the request was in flight — release the
              // seat the incomplete subscription is holding.
              abandonSubscription(session.subscriptionId)
              return
            }
            setCheckout({
              tierKey,
              clientSecret: session.clientSecret,
              subscriptionId: session.subscriptionId,
              founderSeatNumber: session.founderSeatNumber,
            })
          } catch (err) {
            console.error('tier-picker: checkout-session failed', err)
            if (checkoutActionRef.current === actionId)
              setErrorText(TIER_PICKER_COPY.checkout.startError)
          } finally {
            if (checkoutActionRef.current === actionId) setPendingTier(null)
          }
        })()
      }
    },
    [getToken, router, abandonSubscription, planState.plan, signUpHref],
  )

  // Founder post-claim seat reveal (#781 §3.3) — replaces the sheet after
  // a successful founder checkout instead of closing straight away.
  const [claim, setClaim] = useState<FounderClaim | null>(null)

  const completeCheckout = useCallback(() => {
    if (checkout?.tierKey === 'founder' && checkout.founderSeatNumber !== null)
      setClaim({
        seatNumber: checkout.founderSeatNumber,
        seatsTotal: windowView.seatsTotal,
      })
    setCheckout(null)
    setCheckoutSurface({ kind: 'checkout' })
    if (
      checkout?.tierKey !== 'founder' ||
      checkout.founderSeatNumber === null
    ) {
      onClose()
      // Webhooks drive PlanState; a refresh picks up the new plan.
      router.refresh()
    }
  }, [checkout, windowView.seatsTotal, onClose, router])

  const finishClaim = useCallback(() => {
    setClaim(null)
    onClose()
    router.refresh()
  }, [onClose, router])

  // Failure/challenge layouts swap the sheet's rail header (design table
  // PR 4.4: declined rail is muted, secure-check rail is signal-toned).
  const failureRail =
    checkout !== null && checkoutSurface.kind === 'failure'
      ? {
          eyebrow: TIER_PICKER_COPY.failure.railEyebrow,
          code: TIER_PICKER_COPY.failure.categories[checkoutSurface.category]
            .code,
          tone: 'var(--fg-subtle)',
        }
      : null
  const challengeRail =
    checkout !== null && checkoutSurface.kind === 'challenge'
      ? {
          eyebrow:
            TIER_PICKER_COPY.challenge.kinds[checkoutSurface.challenge].eyebrow,
          code: TIER_PICKER_COPY.challenge.kinds[checkoutSurface.challenge]
            .code,
          tone: 'var(--signal)',
        }
      : null
  const surfaceRail = failureRail ?? challengeRail

  const header = headerFor(entry, loggedOut)
  const eyebrow =
    surfaceRail?.eyebrow ??
    (gifted
      ? TIER_PICKER_COPY.gifted.eyebrow
      : checkout !== null
        ? TIER_PICKER_COPY.checkout.eyebrow
        : header.eyebrow)
  const code =
    surfaceRail?.code ??
    (gifted
      ? TIER_PICKER_COPY.gifted.code
      : HEADER_COPY.tiersCode(tiers.length))
  const tone =
    surfaceRail?.tone ??
    (loggedOut || gifted ? 'var(--accent)' : 'var(--signal)')

  const checkoutDesktopWidth =
    checkoutSurface.kind === 'failure'
      ? FAILURE_DESKTOP_WIDTH
      : checkoutSurface.kind === 'challenge'
        ? CHALLENGE_DESKTOP_WIDTH
        : 560

  // The shell is the one modal root in the accessibility tree — failure
  // and challenge surfaces re-role/relabel it rather than nesting a
  // second aria-modal dialog inside.
  const dialogOverrides =
    checkout !== null && checkoutSurface.kind === 'failure'
      ? failureDialogProps(checkoutSurface.category)
      : checkout !== null && checkoutSurface.kind === 'challenge'
        ? challengeDialogProps(checkoutSurface.challenge)
        : {}

  if (claim !== null)
    return (
      <FounderClaimTakeover
        variant={isMobile ? 'mobile' : 'desktop'}
        seatNumber={claim.seatNumber}
        seatsTotal={claim.seatsTotal}
        onDone={finishClaim}
      />
    )

  return (
    <ModalShell
      open={open}
      onClose={close}
      ariaLabel={TIER_PICKER_COPY.entry.ariaLabel}
      {...dialogOverrides}
      header={<RailHeader eyebrow={eyebrow} code={code} tone={tone} />}
      desktopWidth={
        gifted
          ? 560
          : checkout !== null
            ? checkoutDesktopWidth
            : tiers.length === 4
              ? 1000
              : 780
      }
      footer={
        gifted || checkout !== null ? undefined : (
          <MonoRail
            text={
              isMobile
                ? TIER_PICKER_COPY.footer.mobile
                : TIER_PICKER_COPY.footer.desktop
            }
            isMobile={isMobile}
          />
        )
      }
    >
      {gifted ? (
        <GiftedThankYou
          variant={isMobile ? 'mobile' : 'desktop'}
          onDiscover={close}
        />
      ) : checkout !== null ? (
        <CheckoutPanel
          tierKey={checkout.tierKey}
          clientSecret={checkout.clientSecret}
          scaRegion={scaRegion}
          flow={paymentFlowFrom(planState)}
          onBack={backToTiers}
          onSuccess={completeCheckout}
          onSurfaceChange={setCheckoutSurface}
        />
      ) : (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: isMobile ? 12 : 16,
            opacity: pendingTier !== null ? 0.7 : 1,
          }}
        >
          <div
            style={
              isMobile
                ? undefined
                : {
                    display: 'flex',
                    alignItems: 'flex-end',
                    justifyContent: 'space-between',
                    gap: 20,
                    flexWrap: 'wrap',
                  }
            }
          >
            <div
              data-testid="tier-picker-header"
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
                ...(isMobile ? {} : { flex: 1, minWidth: 320 }),
              }}
            >
              <div
                style={{
                  fontWeight: 900,
                  fontSize: isMobile ? 29 : 36,
                  letterSpacing: '-0.035em',
                  lineHeight: isMobile ? 1.06 : 1.02,
                  color: 'var(--fg)',
                }}
              >
                {header.title}
              </div>
              <div
                style={{
                  fontWeight: 500,
                  fontSize: isMobile ? 14 : 14.5,
                  color: 'var(--fg-muted)',
                  letterSpacing: '-0.005em',
                  lineHeight: 1.45,
                  maxWidth: 560,
                }}
              >
                {header.sub}
              </div>
              {loggedOut && isMobile && (
                <span style={{ marginTop: 2 }}>
                  <SignInLink size={12.5} />
                </span>
              )}
            </div>
            {loggedOut && !isMobile && <SignInLink size={13.5} />}
          </div>

          {errorText !== null && (
            <div
              role="alert"
              style={{ fontSize: 13, fontWeight: 600, color: 'var(--danger)' }}
            >
              {errorText}
            </div>
          )}

          {isMobile ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {tiers.map((tier) => (
                <TierRowMobile
                  key={tier.key}
                  tier={tier}
                  state={state}
                  founderWindowState={windowView.state}
                  scarcityRail={rail}
                  expanded={expandedTier === tier.key}
                  onToggle={() =>
                    setExpandedTier(expandedTier === tier.key ? null : tier.key)
                  }
                  onSelect={selectTier}
                  autoFocusCta={returnFocusTier === tier.key}
                />
              ))}
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${tiers.length}, 1fr)`,
                gap: 12,
                alignItems: 'stretch',
              }}
            >
              {tiers.map((tier) => (
                <TierCardDesktop
                  key={tier.key}
                  tier={tier}
                  state={state}
                  founderWindowState={windowView.state}
                  scarcityRail={rail}
                  onSelect={selectTier}
                  autoFocusCta={returnFocusTier === tier.key}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </ModalShell>
  )
}
