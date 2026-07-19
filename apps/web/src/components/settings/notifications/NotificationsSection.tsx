'use client'

// #1063 Settings ▸ Notifications section — master push toggle + Watch updates
// / Price drops sub-toggles, wired to /v1/me/notification-preferences and the
// push-client subscribe flow (#763 PR 9 shipped push-client itself; this
// consumes it).

import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import {
  getPushDeviceState,
  subscribeToPush,
  unsubscribeFromPush,
  type PushDeviceState,
} from '@/lib/push/client'
import { isIosSafari, isStandalone } from '@/lib/pwa/beforeinstallprompt'
import {
  useNotificationPreferences,
  usePatchNotificationPreferences,
} from '@/lib/queries/use-notification-preferences'
import { ToggleSwitch } from '../connections/ToggleSwitch'
import { NOTIFICATIONS_COPY } from './definitions/copy'

// Detail line under the master switch: shows "On" only when BOTH the server
// preference has push enabled AND this device holds a live subscription. The
// two are separately mutable — a user may flip master off on one device
// (server pref goes false) while a stale subscription still exists on
// another — so we AND them here to reflect the ground-truth "will this
// device receive push?" answer.
const detailForMaster = (
  master: boolean,
  deviceState: PushDeviceState | null,
): string => {
  if (!master) return NOTIFICATIONS_COPY.masterOffDetail
  if (deviceState?.subscribed) return NOTIFICATIONS_COPY.masterOnDetail
  return NOTIFICATIONS_COPY.masterOffDetail
}

interface NotificationsSectionProps {
  /**
   * Optional visual variant — the desktop shell renders the section inside a
   * bordered panel; the mobile scroll renders it inline. Wrapper markup for
   * both lives at the mount site, so the component stays layout-neutral.
   */
  variant?: 'mobile' | 'desktop'
}

export const NotificationsSection = ({
  variant = 'mobile',
}: NotificationsSectionProps) => {
  const { getToken } = useAuth()
  const { data: prefs, isLoading, isError } = useNotificationPreferences()
  const patch = usePatchNotificationPreferences()
  const [deviceState, setDeviceState] = useState<PushDeviceState | null>(null)

  useEffect(() => {
    let cancelled = false
    const refresh = async () => {
      const state = await getPushDeviceState()
      if (!cancelled) setDeviceState(state)
    }
    void refresh()
    // Re-read device state on tab-focus and visibilitychange — the common
    // path is the "denied → user unblocks in browser site settings → returns
    // to the tab" flow. Without these listeners the section would stay
    // stuck in the Blocked state until a full refresh.
    const onFocus = () => {
      void refresh()
    }
    const onVisibility = () => {
      if (document.visibilityState === 'visible') void refresh()
    }
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      cancelled = true
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])

  const masterOn = prefs?.masterEnabled ?? false
  const watchUpdatesOn = prefs?.watchUpdatesEnabled ?? true
  const priceDropsOn = prefs?.priceDropsEnabled ?? true

  const refreshDeviceState = useCallback(async () => {
    const state = await getPushDeviceState()
    setDeviceState(state)
  }, [])

  const onToggleMaster = useCallback(
    async (next: boolean) => {
      const token = await getToken()
      if (!token) {
        // Should be rare on this page (settings is auth-gated), but a token
        // gap without any signal makes debugging session edge cases painful.
        // Match the log convention used elsewhere in this file.
        console.warn(
          'notifications: master toggle skipped — no auth token available',
        )
        return
      }
      try {
        if (next) {
          // Fire browser permission (if undecided) → subscribe → POST server row.
          const result = await subscribeToPush(token)
          if (result.status === 'subscribed') {
            try {
              await patch.mutateAsync({ masterEnabled: true })
            } catch (patchErr) {
              // The subscription landed server-side but the preference PATCH
              // failed — roll back so we don't strand a live push_subscription
              // row without a matching preference (the send pipeline would
              // skip these because master=false, so no spam, but it's dead
              // state and better cleaned up). Pass the row id so unsubscribe
              // can DELETE directly without an extra upsert to re-derive it.
              console.warn(
                'notifications: prefs patch failed after subscribe; rolling back',
                patchErr,
              )
              await unsubscribeFromPush(token, result.id).catch(
                (rollbackErr) => {
                  console.warn(
                    'notifications: rollback unsubscribe failed',
                    rollbackErr,
                  )
                },
              )
            }
          }
          // permission-denied / unsupported / error → the device state effect
          // below refreshes and the UI renders the appropriate denied/
          // unsupported state on next render.
        } else {
          // Master OFF: PATCH the preference first, then unsubscribe the
          // device. If the PATCH fails, don't unsubscribe — leaving both in
          // the "on" state keeps the user's opt-in intact and lets them
          // retry. If the PATCH succeeds but unsubscribe fails, the device
          // stays subscribed but the send pipeline reads master=false and
          // won't push anyway, so no spam. Best-effort log covers it.
          await patch.mutateAsync({ masterEnabled: false })
          await unsubscribeFromPush(token).catch((unsubErr) => {
            console.warn(
              'notifications: unsubscribe after master OFF failed; send pipeline still gated by prefs',
              unsubErr,
            )
          })
        }
      } catch (toggleErr) {
        // Any unexpected failure (e.g. subscribeToPush throws, permission
        // API rejects) is caught here so the click handler never leaks an
        // unhandled rejection to React.
        console.warn('notifications: master toggle failed', toggleErr)
      }
      await refreshDeviceState()
    },
    [getToken, patch, refreshDeviceState],
  )

  // Multi-device activation: user already flipped master ON on another
  // device (server pref = true) and lands here on a fresh device with no
  // local subscription. Without this we'd render the master switch as ON
  // + detail "Off", with no path to enable push on this device short of
  // toggling master off then on again (which would nuke other devices'
  // subscriptions). Fire subscribeToPush without touching the server
  // preference.
  const subscribeThisDevice = useCallback(async () => {
    const token = await getToken()
    if (!token) {
      console.warn(
        'notifications: enable-on-device skipped — no auth token available',
      )
      return
    }
    try {
      await subscribeToPush(token)
    } catch (subscribeErr) {
      console.warn(
        'notifications: enable-on-device subscribe failed',
        subscribeErr,
      )
    }
    await refreshDeviceState()
  }, [getToken, refreshDeviceState])

  const onToggleSub = useCallback(
    (key: 'watch' | 'price', next: boolean) => {
      // Sub-toggle changes don't refresh device state (they only affect the
      // server preference). Use mutate() so the mutation's onError has a
      // chance to log — plain unhandled rejections from `void mutateAsync`
      // surface as noisy console errors.
      const updates =
        key === 'watch'
          ? { watchUpdatesEnabled: next }
          : { priceDropsEnabled: next }
      patch.mutate(updates, {
        onError: (subToggleErr) => {
          console.warn(
            'notifications: sub-toggle patch failed',
            { key, next },
            subToggleErr,
          )
        },
      })
    },
    [patch],
  )

  // Query-error gate. If the preferences fetch fails (token gap, transient
  // API error), rendering the empty/toggle UI would show defaulted prefs
  // and a subscribe click could trigger a browser permission prompt on
  // state we don't actually own. Render a dedicated error state instead.
  // Checked before the loading gate so the error is reached even when
  // the device-state effect hasn't settled.
  if (isError) {
    return (
      <section
        role="alert"
        aria-labelledby="notifications-heading"
        className="flex flex-col gap-2"
      >
        <h2
          id="notifications-heading"
          className={
            variant === 'desktop'
              ? 'text-lg font-extrabold text-fg'
              : 'text-[10px] font-bold uppercase tracking-[0.14em] text-fg-subtle'
          }
          style={variant === 'mobile' ? { fontFamily: 'var(--font-mono)' } : {}}
        >
          {NOTIFICATIONS_COPY.heading}
        </h2>
        <p className="text-xs text-fg-muted">{NOTIFICATIONS_COPY.loadError}</p>
      </section>
    )
  }

  // Loading placeholder — match the neighboring skeleton density so the
  // section doesn't collapse-and-expand as the query settles. Gate on BOTH
  // the preferences query AND the device-state effect: without the second
  // gate we'd flash the empty-state CTA before the device-state effect
  // resolved (Copilot #1098 R1) and briefly enable it on unsupported
  // devices.
  if (isLoading || deviceState === null) {
    return (
      <section aria-busy="true" className="flex flex-col gap-2">
        <div className="h-4 w-32 rounded bg-surface-2" />
        <div className="h-10 rounded-lg bg-surface-1" />
      </section>
    )
  }

  const { support, permission } = deviceState

  // Empty state — never opted in yet on this device: master off on the server
  // AND no subscription live locally. Both gates matter: a user who's opted
  // in on another device but has master enabled shouldn't see the empty CTA;
  // a user whose local subscription outlives a master-off patch shouldn't
  // either.
  const isEmpty = !masterOn && !deviceState.subscribed
  const isDenied = permission === 'denied'
  const isIosNeedsInstall = support === 'ios-needs-install'
  const isIosInstalled = isIosSafari() && isStandalone()

  return (
    <section
      className="flex flex-col gap-4"
      aria-labelledby="notifications-heading"
    >
      <h2
        id="notifications-heading"
        className={
          variant === 'desktop'
            ? 'text-lg font-extrabold text-fg'
            : 'text-[10px] font-bold uppercase tracking-[0.14em] text-fg-subtle'
        }
        style={variant === 'mobile' ? { fontFamily: 'var(--font-mono)' } : {}}
      >
        {NOTIFICATIONS_COPY.heading}
      </h2>

      {isIosNeedsInstall && (
        <p className="text-xs text-fg-muted">
          {NOTIFICATIONS_COPY.iosNeedsInstallHint}
        </p>
      )}

      {isIosInstalled && !masterOn && (
        <p className="text-xs text-fg-muted">{NOTIFICATIONS_COPY.iosHint}</p>
      )}

      {isDenied ? (
        <div className="flex flex-col gap-2 rounded-lg border border-border bg-surface-1 p-4">
          <div className="flex items-center gap-2">
            <span className="rounded-full border border-border bg-surface-2 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-fg-muted">
              {NOTIFICATIONS_COPY.denied.badge}
            </span>
            <span className="text-sm font-semibold text-fg">
              {NOTIFICATIONS_COPY.denied.title}
            </span>
          </div>
          <p className="text-xs text-fg-muted">
            {NOTIFICATIONS_COPY.denied.sub}
          </p>
          <a
            href={NOTIFICATIONS_COPY.denied.linkHref}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-semibold text-accent underline"
          >
            {NOTIFICATIONS_COPY.denied.link}
          </a>
        </div>
      ) : isEmpty ? (
        <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface-1 p-4">
          <p className="text-sm font-semibold text-fg">
            {NOTIFICATIONS_COPY.empty.title}
          </p>
          <p className="text-xs text-fg-muted">
            {NOTIFICATIONS_COPY.empty.sub}
          </p>
          <button
            type="button"
            onClick={() => void onToggleMaster(true)}
            // Disable whenever push isn't in the actionable-supported state.
            // `ios-needs-install` and `unsupported` both cause subscribeToPush
            // to return {status:'unsupported'}, so a live button here would
            // be a dead tap on iOS Safari outside standalone mode.
            disabled={support !== 'supported'}
            className="inline-flex min-h-[44px] w-fit items-center justify-center rounded-md bg-accent px-4 py-2 text-sm font-semibold text-fg-on-accent disabled:opacity-60"
          >
            {NOTIFICATIONS_COPY.empty.cta}
          </button>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between rounded-lg border border-border bg-surface-1 px-4 py-3">
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-fg">
                {NOTIFICATIONS_COPY.master}
              </span>
              <span className="text-xs text-fg-muted">
                {detailForMaster(masterOn, deviceState)}
              </span>
            </div>
            <ToggleSwitch
              checked={masterOn}
              onChange={(next) => void onToggleMaster(next)}
              ariaLabel={NOTIFICATIONS_COPY.master}
              // Disable while a preference PATCH is already in-flight so
              // rapid clicks can't queue overlapping subscribe/unsubscribe
              // + PATCH flows and leave server prefs out of sync with
              // device state. Matches the sub-toggle gate below.
              disabled={support !== 'supported' || patch.isPending}
            />
          </div>

          {/* Multi-device activation CTA: master is ON at the server but
              this device holds no subscription — render an explicit
              "Enable on this device" affordance so the user can subscribe
              without toggling master off/on globally. */}
          {masterOn && !deviceState.subscribed && support === 'supported' && (
            <div className="flex flex-col gap-2 rounded-lg border border-border bg-surface-1 p-4">
              <p className="text-xs text-fg-muted">
                {NOTIFICATIONS_COPY.enableOnDevice.sub}
              </p>
              <button
                type="button"
                onClick={() => void subscribeThisDevice()}
                disabled={patch.isPending}
                className="inline-flex min-h-[44px] w-fit items-center justify-center rounded-md bg-accent px-4 py-2 text-sm font-semibold text-fg-on-accent disabled:opacity-60"
              >
                {NOTIFICATIONS_COPY.enableOnDevice.cta}
              </button>
            </div>
          )}

          {masterOn && (
            <div className="flex flex-col gap-2">
              {NOTIFICATIONS_COPY.subs.map((sub) => {
                const checked =
                  sub.key === 'watch' ? watchUpdatesOn : priceDropsOn
                return (
                  <div
                    key={sub.key}
                    className="flex items-center justify-between rounded-lg border border-border bg-surface-1 px-4 py-3"
                  >
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-fg">
                        {sub.label}
                      </span>
                      <span className="text-xs text-fg-muted">
                        {sub.detail}
                      </span>
                    </div>
                    <ToggleSwitch
                      checked={checked}
                      onChange={(next) => onToggleSub(sub.key, next)}
                      ariaLabel={sub.label}
                      disabled={patch.isPending}
                    />
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}
    </section>
  )
}
