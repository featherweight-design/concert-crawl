'use client'

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import { encodeIntent } from '@/lib/auth/intent'
import { Eye, Loader2 } from 'lucide-react'
import { useWatching } from '@/lib/queries/use-watching'
import { useWatchToggle } from '@/lib/queries/use-watch-toggle'
import {
  useNotificationPreferences,
  usePatchNotificationPreferences,
} from '@/lib/queries/use-notification-preferences'
import {
  getPushSupport,
  subscribeToPush,
  unsubscribeFromPush,
} from '@/lib/push/client'
import {
  hasDismissedPostWatchAsk,
  markPostWatchAskDismissed,
} from '@/lib/pwa/post-watch-dismissal'
import { PostWatchSheet } from '@/components/pwa/PostWatchSheet'
import { IosHowToSheet } from '@/components/pwa/IosHowToSheet'
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy'
import { LOGGED_OUT_PLAN_STATE } from '@/components/consumer/tier-picker/definitions/constants'
import { TierPickerSheet } from '@/components/consumer/tier-picker/lazy'

interface WatchShowButtonProps {
  eventId: string
  initialWatching?: boolean
  /** Headliner name, used only to build the signed-out accessible name. */
  artist?: string | undefined
  /**
   * `icon` is the 28px square every card renders. `strip` is row 1 of the
   * event-detail watch strip: the same control widened so the status line sits
   * inside the hit area instead of orphaned beside it. Both share this
   * component so the signed-out picker routing and the post-watch ask can't
   * diverge between the two shapes.
   */
  variant?: 'icon' | 'strip'
}

export function WatchShowButton({
  eventId,
  initialWatching = false,
  artist,
  variant = 'icon',
}: WatchShowButtonProps) {
  const { isSignedIn, getToken } = useAuth()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { data: watchedShows } = useWatching()
  const toggle = useWatchToggle()
  // #1062 gate — subscribe to the server-side notification preference so we
  // don't ask the user to opt in a second time on a fresh device after
  // they've already flipped master on somewhere else.
  const { data: prefs } = useNotificationPreferences()
  // #1130 fix — the sheet's Turn On CTA must PATCH masterEnabled=true after
  // subscribeToPush succeeds. Prior code only subscribed the browser +
  // wrote the push_subscriptions row server-side; the master preference
  // stayed false, so sendPushForNotification gated pushes off and the
  // Settings surface correctly (but confusingly) rendered "Off".
  const patch = usePatchNotificationPreferences()

  // #1062 sheet state. `promptVariant` is null while dormant; set to
  // 'default' or 'ios' when a successful first watch triggers the ask.
  const [promptVariant, setPromptVariant] = useState<'default' | 'ios' | null>(
    null,
  )
  const [installSheetOpen, setInstallSheetOpen] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  // Separate from `pickerOpen` so the sheet stays mounted once opened: `dynamic`
  // only defers the chunk while the element is unrendered, and unmounting on
  // close would skip ModalShell's exit animation.
  const [pickerMounted, setPickerMounted] = useState(false)
  // Guard against the effect firing again while a pending toggle is in the
  // "just resolved" window — we only want to consider firing the sheet
  // once per component lifetime per successful watch.
  const askedThisSessionRef = useRef(false)
  const scheduledTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Latest known masterEnabled — kept in a ref so the 500ms setTimeout can
  // re-read it at fire time. Without this a fast-tap Watch before the
  // preferences query resolves would slip past the gate and open a sheet
  // on a device where master=true landed a few hundred ms later.
  const masterEnabledRef = useRef<boolean | undefined>(prefs?.masterEnabled)
  useEffect(() => {
    masterEnabledRef.current = prefs?.masterEnabled
  }, [prefs?.masterEnabled])

  const isPending = toggle.isPending

  // The signed-out click carries the watch through auth: Clerk lands on the
  // tour, which hands the intent back to this page, which replays it. The
  // button itself never fires the mutation while signed out.
  const signUpHref = useMemo(() => {
    // The query is part of where they were — `?tab=prices` is a different view
    // of the page — so the hand-back returns them to the state they left, not
    // just to the route.
    const search = searchParams.toString()
    const tour = new URLSearchParams({
      intent: encodeIntent({ action: 'watch', eventId }),
      return: search ? `${pathname}?${search}` : pathname,
    })
    if (artist) tour.set('label', artist)
    return `/sign-up?redirect_url=${encodeURIComponent(`/onboarding?${tour.toString()}`)}`
  }, [eventId, pathname, searchParams, artist])

  // Derive watching state from the cache when available. If the cache hasn't
  // loaded yet but a mutation is in-flight, apply a local optimistic override
  // by flipping initialWatching — this prevents the button from staying in the
  // wrong state (or showing only a spinner with no label) while the watching
  // query is still fetching on first render.
  const cacheIsReady = watchedShows !== undefined
  const cacheWatching = cacheIsReady
    ? watchedShows.some((show) => show.eventId === eventId)
    : initialWatching
  const isWatching =
    isPending && !cacheIsReady ? !initialWatching : cacheWatching

  // What actually gets drawn. `enabled: !!isSignedIn` stops useWatching from
  // refetching after sign-out but React Query keeps the cached rows, so within
  // one SPA session a signed-out visitor would otherwise see the previous
  // user's shows still marked Watching — per-user state surviving sign-out.
  // Signed out the eye is always at-rest; the gate is announced, not drawn.
  const renderedWatching = !!isSignedIn && isWatching

  // Decide whether the post-watch permission ask should surface after a
  // successful commit. Gates (all must hold):
  //   1. This session hasn't already asked (via askedThisSessionRef)
  //   2. The user hasn't dismissed the ask on this device before
  //   3. They aren't already opted in globally (server prefs master=true)
  //   4. Push is either supported by this browser OR the user is on iOS
  //      Safari outside standalone (the install-first variant applies)
  const shouldPromptAfterWatch = useCallback((): 'default' | 'ios' | null => {
    if (askedThisSessionRef.current) return null
    if (hasDismissedPostWatchAsk()) return null
    if (prefs?.masterEnabled === true) return null
    const support = getPushSupport()
    // iOS Safari outside standalone can't receive push — we still ask, but
    // the install-first variant redirects to IosHowToSheet instead of the
    // browser prompt. Detect this before the general "unsupported" bail so
    // an iOS user still gets the actionable install path.
    if (support === 'ios-needs-install') return 'ios'
    // Non-iOS unsupported browsers (very rare) would show a Turn On CTA
    // that could never succeed. Silent bail is the honest option.
    if (support !== 'supported') return null
    return 'default'
  }, [prefs?.masterEnabled])

  const handleToggle = () => {
    if (isPending) return
    // Signed out this was a silent no-op: a visitor tapped a full-strength eye
    // and nothing happened at all. Route to the tier picker instead — Watching
    // is free, it just needs an account to save to.
    if (!isSignedIn) {
      setPickerMounted(true)
      setPickerOpen(true)
      return
    }
    // Snapshot the pre-toggle state so a stale-cache read on the effect side
    // doesn't fire the sheet after an UN-watch. The mutation optimistically
    // updates the cache to the flipped state, so reading `isWatching` after
    // the click would already show the target state.
    const wasWatching = cacheWatching
    // If the user is un-watching within the 500ms sheet-delay window, cancel
    // any pending timer so we don't open the ask for a show they just
    // stopped watching. Also reset the session guard so a subsequent
    // re-watch still qualifies.
    if (wasWatching && scheduledTimerRef.current !== null) {
      clearTimeout(scheduledTimerRef.current)
      scheduledTimerRef.current = null
      askedThisSessionRef.current = false
    }
    toggle.mutate(eventId, {
      onSuccess: () => {
        // Only fire the sheet on watch (not unwatch), and only when a variant
        // is warranted. 500ms delay per the design brief so the button state
        // transition finishes first — hitting the user with a sheet in the
        // same frame as the click reads as jarring.
        if (wasWatching) return
        const variant = shouldPromptAfterWatch()
        if (!variant) return
        // Mark asked here so a rapid double-tap in the delay window can't
        // schedule two timers. The fire-time gate below still gets to bail
        // without opening the sheet — if it bails, we DON'T unwind
        // askedThisSessionRef because the query may just be racing us and
        // the user shouldn't get spammed on the next Watch either.
        askedThisSessionRef.current = true
        scheduledTimerRef.current = setTimeout(() => {
          scheduledTimerRef.current = null
          // Re-check master enable at fire time. A fast tap before the
          // useNotificationPreferences GET resolves would have seen
          // masterEnabled=undefined at scheduling; the ref update above
          // gives us the latest value 500ms later, which is usually
          // enough for the query to have resolved. Bail only on strict
          // true — per the #1062 spec, both `undefined` (unknown) and
          // `false` are qualifying states. If it turns out the fresh
          // device did have master=true globally, subscribeToPush is
          // idempotent on the server side and a click "Turn on" would
          // just re-attach this device to their existing subscription.
          if (masterEnabledRef.current === true) return
          setPromptVariant(variant)
        }, 500)
      },
    })
  }

  useEffect(
    () => () => {
      if (scheduledTimerRef.current !== null) {
        clearTimeout(scheduledTimerRef.current)
      }
    },
    [],
  )

  const closeSheet = () => {
    setPromptVariant(null)
    // Any dismissal (Not now, Escape, scrim tap) records the dismissal so
    // the sheet never returns automatically. Re-enable path is Settings →
    // Notifications.
    markPostWatchAskDismissed()
  }

  const onTurnOn = async () => {
    if (promptVariant === 'ios') {
      // iOS variant hands off to the install how-to. Recording dismissal
      // here would suppress the ask forever — better to keep it available
      // until the user actually opts in (once installed and back in
      // standalone, the default variant path takes over).
      setPromptVariant(null)
      setInstallSheetOpen(true)
      return
    }
    setPromptVariant(null)
    markPostWatchAskDismissed()
    try {
      const token = await getToken()
      if (!token) return
      // #1130 fix — mirror the Settings toggle flow so the full opt-in
      // actually lands: subscribe on the device, then PATCH master=true
      // on the server. Without the PATCH the push_subscriptions row
      // exists but sendPushForNotification's master gate stays off,
      // producing the confusing "Push notifications off" reading in
      // Settings after a user opted in via the sheet.
      const result = await subscribeToPush(token)
      if (result.status !== 'subscribed') {
        // Browser refused (permission denied/unsupported/error). The
        // sheet has already been dismissed above; no further state
        // to record — Settings is the manual retry path.
        return
      }
      try {
        await patch.mutateAsync({ masterEnabled: true })
      } catch (patchErr) {
        // Subscribe landed but the preference PATCH failed. Roll back
        // the subscription so the user isn't left in a half-committed
        // state (browser subscribed, server prefs off). Pass the id so
        // unsubscribe can DELETE without another round-trip.
        console.warn(
          'post-watch: prefs patch failed after subscribe; rolling back',
          patchErr,
        )
        await unsubscribeFromPush(token, result.id).catch((rollbackErr) => {
          console.warn('post-watch: rollback unsubscribe failed', rollbackErr)
        })
      }
    } catch (subscribeErr) {
      console.warn('post-watch: subscribe failed', subscribeErr)
    }
  }

  const baseBtn: React.CSSProperties = {
    all: 'unset',
    cursor: isPending ? 'default' : 'pointer',
    boxSizing: 'border-box',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    // Square: the eye is the whole gesture on every breakpoint, so there is no
    // label to make room for and a pill would read as a truncated button.
    height: 28,
    width: 28,
    borderRadius: 7,
    fontFamily: 'var(--font-ui)',
    fontWeight: 600,
    fontSize: 12,
    letterSpacing: '-0.005em',
    opacity: isPending ? 0.6 : 1,
    transition: 'opacity 0.15s',
  }

  const watchingStyle: React.CSSProperties = {
    ...baseBtn,
    background: 'color-mix(in oklab, var(--accent) 12%, transparent)',
    color: 'var(--accent)',
    border: '1px solid var(--accent)',
  }

  // Truthiness, not a default parameter: an empty-string artist would otherwise
  // render "Watch  — sign up…" with a doubled space.
  const who = artist || CONSUMER_COPY.watchShowButton.button.thisShowFallback

  const unwatchedStyle: React.CSSProperties = {
    ...baseBtn,
    background: 'transparent',
    color: 'var(--fg)',
    border: '1px solid var(--border-strong)',
  }

  const glyph = isPending ? (
    <Loader2
      size={variant === 'strip' ? 16 : 10}
      aria-hidden
      style={{ animation: 'fbSpin 0.7s linear infinite' }}
    />
  ) : (
    // One affordance at every breakpoint. A desktop-only "+ Watch this
    // show" label made the eye a mobile shorthand rather than the
    // gesture itself; state is carried by the fill, and the accessible
    // name carries it for screen readers.
    <Eye
      size={variant === 'strip' ? 20 : 14}
      aria-hidden
      style={{ flexShrink: 0 }}
    />
  )

  const statusLineId = useId()

  const controlProps = {
    type: 'button' as const,
    onClick: handleToggle,
    disabled: isPending,
    // Signed out the eye is a dialog trigger, not a toggle, so it must
    // NOT claim a pressed state — `aria-pressed` is omitted entirely
    // rather than set to false, which would announce an off switch.
    'aria-pressed': isSignedIn ? renderedWatching : undefined,
    'aria-haspopup': isSignedIn ? undefined : ('dialog' as const),
    'aria-expanded': isSignedIn ? undefined : pickerOpen,
    'aria-label': !isSignedIn
      ? CONSUMER_COPY.watchShowButton.button.ariaWatchSignedOut(who)
      : renderedWatching
        ? CONSUMER_COPY.watchShowButton.button.ariaWatching
        : CONSUMER_COPY.watchShowButton.button.ariaWatch,
  }

  return (
    <>
      {variant === 'strip' ? (
        <button
          {...controlProps}
          // `aria-label` above wins the accessible name, so without this the
          // status line would be sighted-only copy.
          aria-describedby={statusLineId}
          // The status line is inside the button, so the whole row is the
          // target rather than a bare 28px square with text beside it.
          // No ring of its own: the strip container draws one on
          // `focus-within`, outside the clip that would crop this one.
          className="flex w-full min-h-[50px] cursor-pointer items-center gap-3 border-0 bg-transparent px-[10px] py-2 text-left focus-visible:outline-none disabled:cursor-default disabled:opacity-60 sm:min-h-[52px]"
        >
          <span
            aria-hidden
            className="inline-flex h-[34px] w-[34px] flex-shrink-0 items-center justify-center rounded-lg"
            style={{
              color: renderedWatching ? 'var(--accent)' : 'var(--fg-muted)',
              background: renderedWatching
                ? 'color-mix(in oklab, var(--accent) 16%, transparent)'
                : 'transparent',
            }}
          >
            {glyph}
          </span>
          <span
            id={statusLineId}
            className="min-w-0 text-[11px] font-semibold leading-[1.45] tracking-[0.03em]"
            style={{
              fontFamily: 'var(--font-mono)',
              color: renderedWatching ? 'var(--accent)' : 'var(--fg-subtle)',
              textWrap: 'pretty',
            }}
          >
            {renderedWatching
              ? CONSUMER_COPY.watchers.watchStatusOn
              : CONSUMER_COPY.watchers.watchHint}
          </span>
        </button>
      ) : (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            flexWrap: 'wrap',
          }}
        >
          <button
            {...controlProps}
            style={renderedWatching ? watchingStyle : unwatchedStyle}
          >
            {glyph}
          </button>
        </div>
      )}
      <PostWatchSheet
        open={promptVariant !== null}
        onClose={closeSheet}
        onTurnOn={onTurnOn}
        variant={promptVariant ?? 'default'}
      />
      <IosHowToSheet
        open={installSheetOpen}
        onClose={() => setInstallSheetOpen(false)}
      />
      {pickerMounted && (
        <TierPickerSheet
          open={pickerOpen}
          onClose={() => setPickerOpen(false)}
          planState={LOGGED_OUT_PLAN_STATE}
          // Unreachable from here: a logged-out tier selection routes to
          // /sign-up, never to a payment element, so no SCA challenge can
          // occur before an account exists. `true` is the fail-safe value (it
          // only adds legal copy), matching FilterBar's default, and this
          // button renders across the browse grid where no request header is
          // in scope.
          scaRegion
          entry="logged-out-watch"
          signUpHref={signUpHref}
        />
      )}
    </>
  )
}
