'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { Eye, Loader2 } from 'lucide-react'
import { useWatching } from '@/lib/queries/use-watching'
import { useWatchToggle } from '@/lib/queries/use-watch-toggle'
import { useNotificationPreferences } from '@/lib/queries/use-notification-preferences'
import { getPushSupport, subscribeToPush } from '@/lib/push/client'
import {
  hasDismissedPostWatchAsk,
  markPostWatchAskDismissed,
} from '@/lib/pwa/post-watch-dismissal'
import { PostWatchSheet } from '@/components/pwa/PostWatchSheet'
import { IosHowToSheet } from '@/components/pwa/IosHowToSheet'
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy'

interface WatchShowButtonProps {
  eventId: string
  initialWatching?: boolean
  watchingCount?: number
}

export function WatchShowButton({
  eventId,
  initialWatching = false,
  watchingCount = 0,
}: WatchShowButtonProps) {
  const { isSignedIn, getToken } = useAuth()
  const { data: watchedShows } = useWatching()
  const toggle = useWatchToggle()
  // #1062 gate — subscribe to the server-side notification preference so we
  // don't ask the user to opt in a second time on a fresh device after
  // they've already flipped master on somewhere else.
  const { data: prefs } = useNotificationPreferences()

  // #1062 sheet state. `promptVariant` is null while dormant; set to
  // 'default' or 'ios' when a successful first watch triggers the ask.
  const [promptVariant, setPromptVariant] = useState<'default' | 'ios' | null>(
    null,
  )
  const [installSheetOpen, setInstallSheetOpen] = useState(false)
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

  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 639px)')
    setIsMobile(mq.matches)
    const handler = (evt: MediaQueryListEvent) => setIsMobile(evt.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  const isPending = toggle.isPending

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
    if (!isSignedIn || isPending) return
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
      // Best-effort — the settings surface handles retries and error
      // reporting. Any failure here logs but doesn't block the flow.
      await subscribeToPush(token)
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
    gap: 6,
    height: 28,
    padding: '0 11px',
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

  const unwatchedStyle: React.CSSProperties = {
    ...baseBtn,
    background: 'transparent',
    color: 'var(--fg)',
    border: '1px solid var(--border-strong)',
  }

  return (
    <>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          flexWrap: 'wrap',
        }}
      >
        <button
          type="button"
          onClick={handleToggle}
          disabled={isPending}
          aria-pressed={isWatching}
          aria-label={
            isWatching
              ? CONSUMER_COPY.watchShowButton.button.ariaWatching
              : CONSUMER_COPY.watchShowButton.button.ariaWatch
          }
          style={isWatching ? watchingStyle : unwatchedStyle}
        >
          {isPending ? (
            <Loader2
              size={10}
              aria-hidden
              style={{ animation: 'fbSpin 0.7s linear infinite' }}
            />
          ) : isMobile ? (
            <Eye size={12} aria-hidden style={{ flexShrink: 0 }} />
          ) : isWatching ? (
            <svg
              width="10"
              height="10"
              viewBox="0 0 12 12"
              fill="none"
              aria-hidden
            >
              <path
                d="M2.5 6.5l2.5 2.5L9.5 4"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          ) : (
            <svg
              width="10"
              height="10"
              viewBox="0 0 12 12"
              fill="none"
              aria-hidden
            >
              <path
                d="M6 2.5v7M2.5 6h7"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          )}
          {!isMobile && (
            <span>
              {isWatching
                ? CONSUMER_COPY.watchShowButton.button.watchingLabel
                : CONSUMER_COPY.watchShowButton.button.watchLabel}
            </span>
          )}
        </button>

        {watchingCount > 0 && (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontFamily: 'var(--font-mono)',
              fontSize: 9.5,
              fontWeight: 700,
              color: 'var(--fg-subtle)',
              letterSpacing: '0.04em',
            }}
          >
            <span
              style={{
                width: 4,
                height: 4,
                borderRadius: 2,
                background: 'var(--accent)',
                flexShrink: 0,
              }}
              aria-hidden
            />
            {watchingCount} {CONSUMER_COPY.watchShowButton.watchingCount.suffix}
            {isWatching
              ? ''
              : CONSUMER_COPY.watchShowButton.watchingCount.alertsSuffix}
          </span>
        )}
      </div>
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
    </>
  )
}
