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
import type { PlanState } from '@concert-crawl/types'
import { ModalShell } from '@/components/consumer/modal-shell'
import { useFounderWindow } from '@/lib/queries/use-founder-window'
import { createCheckoutSession, abandonCheckout } from '@/lib/billing'
import { navigateToPortalSession } from '@/lib/portal-navigation'
import { TIER_PICKER_COPY } from './definitions/copy'
import { visibleTiers, defaultExpandedTier } from './lib/visible-tiers'
import { scarcityRailData } from './lib/scarcity'
import { TierCardDesktop } from './TierCardDesktop'
import { TierRowMobile } from './TierRowMobile'
import { GiftedThankYou } from './GiftedThankYou'
import { CheckoutPanel } from './CheckoutPanel'
import type { PickerState, TierCta, TierKey } from './definitions/types'

const HEADER_COPY = TIER_PICKER_COPY.header

interface TierPickerSheetProps {
  open: boolean
  onClose: () => void
  planState: PlanState
  // Server-resolved SCA-region boolean (spec §1.7) — forwarded to the
  // checkout panel's legal block.
  scaRegion: boolean
}

interface CheckoutContext {
  tierKey: Exclude<TierKey, 'free'>
  clientSecret: string
  subscriptionId: string
}

const pickerStateFrom = (planState: PlanState): PickerState =>
  planState.roleComped || planState.plan === 'gifted'
    ? 'gifted'
    : planState.plan

const isPaidTier = (key: TierKey): key is Exclude<TierKey, 'free'> =>
  key !== 'free'

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
}: TierPickerSheetProps) => {
  const router = useRouter()
  const { getToken } = useAuth()
  const state = pickerStateFrom(planState)
  const gifted = state === 'gifted'
  const loggedOut = state === 'logged-out'

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
    if (open)
      setExpandedTier(
        defaultExpandedTier(visibleTiers(windowView.state, state), state),
      )
    // Reset the accordion each time the sheet opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const [checkout, setCheckout] = useState<CheckoutContext | null>(null)
  const [pendingTier, setPendingTier] = useState<TierKey | null>(null)
  const [errorText, setErrorText] = useState<string | null>(null)

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
    setErrorText(null)
    setPendingTier(null)
    onClose()
  }, [checkout, abandonSubscription, onClose])

  const backToTiers = useCallback(() => {
    if (checkout !== null) abandonSubscription(checkout.subscriptionId)
    setCheckout(null)
  }, [checkout, abandonSubscription])

  const selectTier = useCallback(
    (tierKey: TierKey, cta: TierCta) => {
      setErrorText(null)
      if (cta.action === 'sign-up') {
        router.push('/sign-up')
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
    [getToken, router, abandonSubscription],
  )

  const completeCheckout = useCallback(() => {
    setCheckout(null)
    onClose()
    // Webhooks drive PlanState; a refresh picks up the new plan.
    router.refresh()
  }, [onClose, router])

  const eyebrow = gifted
    ? TIER_PICKER_COPY.gifted.eyebrow
    : checkout !== null
      ? TIER_PICKER_COPY.checkout.eyebrow
      : loggedOut
        ? HEADER_COPY.loggedOutEyebrow
        : HEADER_COPY.eyebrow
  const code = gifted
    ? TIER_PICKER_COPY.gifted.code
    : HEADER_COPY.tiersCode(tiers.length)
  const tone = loggedOut || gifted ? 'var(--accent)' : 'var(--signal)'

  return (
    <ModalShell
      open={open}
      onClose={close}
      ariaLabel={TIER_PICKER_COPY.entry.ariaLabel}
      header={<RailHeader eyebrow={eyebrow} code={code} tone={tone} />}
      desktopWidth={
        gifted || checkout !== null ? 560 : tiers.length === 4 ? 1000 : 780
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
          onBack={backToTiers}
          onSuccess={completeCheckout}
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
                {loggedOut ? HEADER_COPY.loggedOutTitle : HEADER_COPY.title}
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
                {loggedOut ? HEADER_COPY.loggedOutSub : HEADER_COPY.sub}
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
                />
              ))}
            </div>
          )}
        </div>
      )}
    </ModalShell>
  )
}
