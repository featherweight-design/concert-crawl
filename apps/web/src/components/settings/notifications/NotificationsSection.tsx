'use client'

// #1063 Settings ▸ Notifications section — master push toggle + Watch updates
// / Price drops sub-toggles, wired to /v1/me/notification-preferences and the
// push-client subscribe flow (#763 PR 9 shipped push-client itself; this
// consumes it).

import { useCallback, useEffect, useId, useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { nfLocked } from '@concert-crawl/entitlements'
import {
  getPushDeviceState,
  subscribeToPush,
  unsubscribeFromPush,
  type PushDeviceState,
} from '@/lib/push/client'
import { isIosSafari, isStandalone } from '@/lib/pwa/beforeinstallprompt'
import { TierPickerSheet } from '@/components/consumer/tier-picker/TierPickerSheet'
import { LOGGED_OUT_PLAN_STATE } from '@/components/consumer/tier-picker/definitions/constants'
import {
  useNotificationPreferences,
  usePatchNotificationPreferences,
  type NotificationPreferences,
} from '@/lib/queries/use-notification-preferences'
import { usePlanState } from '@/lib/queries/use-plan-state'
import { useSpotifyConnection } from '@/lib/queries/use-spotify-connection'
import { ToggleSwitch } from '../connections/ToggleSwitch'
import { CrewActivityBlock } from './CrewActivityBlock'
import { NOTIFICATIONS_COPY } from './definitions/copy'

const ARTISTS_COPY = NOTIFICATIONS_COPY.artists
const PRODUCT_EMAIL_COPY = NOTIFICATIONS_COPY.productEmail

/**
 * A sub-group label inside the section. `h3`, not `h2`: "Notifications" is the
 * section's own `h2` and labels it via `aria-labelledby`, so a sibling `h2`
 * here would flatten the outline and claim these rows sit beside the section
 * rather than inside it. CrewActivityBlock, the shipped sub-group in this same
 * section, is an `h3` for the same reason.
 */
const GroupHeading = ({ text }: { text: string }) => (
  <h3
    className="pt-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-fg-subtle"
    style={{ fontFamily: 'var(--font-mono)' }}
  >
    {text}
  </h3>
)

const LockGlyph = () => (
  <svg
    width="15"
    height="15"
    viewBox="0 0 15 15"
    fill="none"
    aria-hidden
    focusable="false"
  >
    <rect
      x="2.75"
      y="6.5"
      width="9.5"
      height="6.75"
      rx="1.75"
      stroke="currentColor"
      strokeWidth="1.4"
    />
    <path
      d="M5 6.5V4.75a2.5 2.5 0 1 1 5 0V6.5"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
    />
  </svg>
)

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
  /**
   * Server-resolved SCA-region boolean, forwarded to the TierPickerSheet the
   * locked artist card opens. Both settings shells already hold it for
   * PlanPanel, so it is passed down rather than re-resolved here.
   */
  scaRegion?: boolean
}

export const NotificationsSection = ({
  variant = 'mobile',
  scaRegion = false,
}: NotificationsSectionProps) => {
  // Per-instance, because `/me` mounts this section twice: the mobile shell and
  // the desktop one are both in the DOM with one CSS-hidden. A fixed id would
  // appear twice, and a switch could resolve its description to the hidden copy.
  const idPrefix = useId()
  const headingId = `${idPrefix}-heading`
  const rowIds = {
    alerts: `${idPrefix}-artist-alerts-detail`,
    autoWatch: `${idPrefix}-artist-auto-watch-detail`,
    digest: `${idPrefix}-weekly-digest-detail`,
    productEmail: `${idPrefix}-product-email-detail`,
  }

  const { getToken } = useAuth()
  const { data: prefs, isLoading, isError } = useNotificationPreferences()
  const patch = usePatchNotificationPreferences()
  const { data: planState, isPending: planPending } = usePlanState()
  const { data: spotify } = useSpotifyConnection()
  const [pickerOpen, setPickerOpen] = useState(false)
  const [deviceState, setDeviceState] = useState<PushDeviceState | null>(null)
  // #1130 fix — surface a visible error when the toggle pipeline fails
  // (subscribe returns error, or PATCH throws). Previously the click just
  // logged and the toggle stayed off, which read as "clicking does
  // nothing." Cleared on every fresh toggle attempt.
  const [toggleError, setToggleError] = useState<string | null>(null)

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
  const artistAlertsOn = prefs?.artistAlertsEnabled ?? true
  const artistAutoWatchOn = prefs?.artistAutoWatch ?? false
  const weeklyDigestOn = prefs?.weeklyDigestEnabled ?? true
  const productEmailsOn = prefs?.productEmailsEnabled ?? true

  // ONE gate for the whole artist group, asked through nfLocked rather than by
  // testing a tier string — design R2 leaked a live Follow control to Supporter
  // on six surfaces doing exactly that. Fails closed: a plan state that never
  // arrives renders the locked card, which offers an upgrade, rather than live
  // switches the API would then reject.
  const artistsLocked = planState === undefined || nfLocked(planState)
  const spotifyConnected = spotify?.status === 'connected'

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
      // Clear any prior error banner as a fresh attempt starts.
      setToggleError(null)
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
              setToggleError(NOTIFICATIONS_COPY.toggleError.patch)
            }
          } else if (result.status === 'error') {
            // Subscribe hit the server (or the browser) and came back with a
            // generic error — most commonly a 503 from the API when VAPID
            // isn't configured, or a serviceWorker failure. #1130 makes this
            // visible: prior code silently swallowed it and the toggle
            // appeared inert.
            setToggleError(NOTIFICATIONS_COPY.toggleError.subscribe)
          } else if (result.status === 'permission-denied') {
            // Not really an "error" — the device-state effect below will
            // re-read Notification.permission and the denied banner takes
            // over on next render. No inline error needed.
          }
          // status === 'unsupported' → the toggle was disabled to begin with
          // and shouldn't have been clickable; nothing to surface.
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
        setToggleError(NOTIFICATIONS_COPY.toggleError.generic)
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
    (updates: Partial<NotificationPreferences>) => {
      // Sub-toggle changes don't refresh device state (they only affect the
      // server preference). Use mutate() so the mutation's onError has a
      // chance to log — plain unhandled rejections from `void mutateAsync`
      // surface as noisy console errors.
      setToggleError(null)
      patch.mutate(updates, {
        onError: (subToggleErr) => {
          console.warn(
            'notifications: sub-toggle patch failed',
            updates,
            subToggleErr,
          )
          // Previously log-only, which read to the user as a switch that
          // snapped back for no reason. The banner above the rows is the one
          // place a settings failure can be told.
          setToggleError(NOTIFICATIONS_COPY.toggleError.preference)
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
  // The push half's states are rendered INSIDE the section rather than
  // early-returned from it, so the crew block below survives them (#1226
  // PR-7): a push preferences outage has nothing to do with crew activity,
  // which is bell-only, and returning early would take the only mute control
  // off the page with it.
  const heading = (
    <h2
      id={headingId}
      className={
        variant === 'desktop'
          ? 'text-lg font-extrabold text-fg'
          : 'text-[10px] font-bold uppercase tracking-[0.14em] text-fg-subtle'
      }
      style={variant === 'mobile' ? { fontFamily: 'var(--font-mono)' } : {}}
    >
      {NOTIFICATIONS_COPY.heading}
    </h2>
  )

  if (isError) {
    return (
      <section aria-labelledby={headingId} className="flex flex-col gap-4">
        {heading}
        <p role="alert" className="text-xs text-fg-muted">
          {NOTIFICATIONS_COPY.loadError}
        </p>
        <CrewActivityBlock />
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
      <section aria-labelledby={headingId} className="flex flex-col gap-4">
        {heading}
        <div aria-busy="true" className="flex flex-col gap-2">
          <div className="h-4 w-32 rounded bg-surface-2" />
          <div className="h-10 rounded-lg bg-surface-1" />
        </div>
        <CrewActivityBlock />
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
    <section className="flex flex-col gap-4" aria-labelledby={headingId}>
      {heading}

      {isIosNeedsInstall && (
        <p className="text-xs text-fg-muted">
          {NOTIFICATIONS_COPY.iosNeedsInstallHint}
        </p>
      )}

      {isIosInstalled && !masterOn && (
        <p className="text-xs text-fg-muted">{NOTIFICATIONS_COPY.iosHint}</p>
      )}

      {toggleError !== null && (
        <div
          role="alert"
          className="rounded-lg border border-border bg-surface-1 p-3 text-xs text-fg"
        >
          {toggleError}
        </div>
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
        </>
      )}

      {/* ── Email from us (#1572) ────────────────────────────────────────
          Outside the push master AND outside the entitlement gate the artist
          group sits behind. It governs an email family, not a push, and it is
          an opt-out we are obliged to offer, so it cannot be hidden under a
          switch most users leave off or behind an upgrade card. The signed
          one-click link in the footer of those emails writes the same column,
          so this row is the in-app view of that same state. */}
      <div className="flex flex-col gap-2">
        <GroupHeading text={PRODUCT_EMAIL_COPY.heading} />
        <div className="flex min-h-[44px] items-center justify-between gap-3 rounded-lg border border-border bg-surface-1 px-4 py-3">
          <div className="flex min-w-0 flex-col">
            <span className="text-sm font-semibold text-fg">
              {PRODUCT_EMAIL_COPY.label}
            </span>
            <span id={rowIds.productEmail} className="text-xs text-fg-muted">
              {productEmailsOn
                ? PRODUCT_EMAIL_COPY.onDetail
                : PRODUCT_EMAIL_COPY.offDetail}
            </span>
          </div>
          <ToggleSwitch
            checked={productEmailsOn}
            onChange={(next) => onToggleSub({ productEmailsEnabled: next })}
            ariaLabel={PRODUCT_EMAIL_COPY.label}
            ariaDescribedBy={rowIds.productEmail}
            disabled={patch.isPending}
          />
        </div>
        {/* Prose, not a row: billing mail has no switch, and giving it a row
            shape would imply one exists. */}
        <p className="text-xs text-fg-muted">
          {PRODUCT_EMAIL_COPY.billingFootnote}
        </p>
      </div>

      {/* ── Artists you follow ───────────────────────────────────────────
          Above the watch group on purpose: an artist announcement is the
          earliest signal in the chain, so reading top-down feels like the
          funnel does (artist announces → you watch it → the price moves).

          Rendered outside the denied/empty/master branches above, because the
          weekly digest is an EMAIL. Same reasoning as CrewActivityBlock: a
          channel that push does not carry must not have its only off-switch
          hidden behind the push master. The two push rows inside still do
          gate on it, because those two really are pushes. */}
      {planPending ? (
        <div aria-busy="true" className="flex flex-col gap-2">
          <div className="h-4 w-32 rounded bg-surface-2" />
          <div className="h-10 rounded-lg bg-surface-1" />
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <GroupHeading text={ARTISTS_COPY.heading} />

          {artistsLocked ? (
            // ONE locked card for the whole group, never three dead switches.
            // A switch that does nothing is the worst version of this screen,
            // and the card is the only place the upgrade gets offered here.
            <div className="flex flex-col gap-3 rounded-xl border border-border-strong bg-surface-1 p-4">
              <div className="flex items-start gap-3">
                <span aria-hidden className="mt-0.5 shrink-0 text-signal">
                  <LockGlyph />
                </span>
                <div className="flex min-w-0 flex-col">
                  <span className="text-sm font-semibold text-fg">
                    {ARTISTS_COPY.locked.title}
                  </span>
                  <span className="mt-1 text-xs text-fg-muted">
                    {ARTISTS_COPY.locked.detail}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPickerOpen(true)}
                className="inline-flex min-h-[44px] w-fit items-center justify-center rounded-md border border-border-strong px-4 py-2 text-sm font-semibold text-fg"
              >
                {ARTISTS_COPY.locked.cta}
              </button>
            </div>
          ) : (
            <>
              {masterOn && (
                <div className="overflow-hidden rounded-lg border border-border bg-surface-1">
                  <div className="flex min-h-[44px] items-center justify-between gap-3 px-4 py-3">
                    <div className="flex min-w-0 flex-col">
                      {/* No New badge here, unlike the digest row below: the
                          label already opens with the word "New", and the two
                          together read as one confused phrase. */}
                      <span className="text-sm font-semibold text-fg">
                        {ARTISTS_COPY.alerts.label}
                      </span>
                      <span
                        id={rowIds.alerts}
                        className="text-xs text-fg-muted"
                      >
                        {ARTISTS_COPY.alerts.detail}
                      </span>
                    </div>
                    <ToggleSwitch
                      checked={artistAlertsOn}
                      onChange={(next) =>
                        onToggleSub({ artistAlertsEnabled: next })
                      }
                      ariaLabel={ARTISTS_COPY.alerts.label}
                      ariaDescribedBy={rowIds.alerts}
                      disabled={patch.isPending}
                    />
                  </div>
                  {/* Indented sub-row of the above, not a sibling: it only
                      means anything while the alert it modifies is on. */}
                  <div className="flex min-h-[44px] items-center justify-between gap-3 border-t border-border py-3 pl-[34px] pr-4">
                    <div className="flex min-w-0 flex-col">
                      <span className="text-sm font-semibold text-fg">
                        {ARTISTS_COPY.autoWatch.label}
                      </span>
                      <span
                        id={rowIds.autoWatch}
                        className="text-xs text-fg-muted"
                      >
                        {ARTISTS_COPY.autoWatch.detail}
                      </span>
                    </div>
                    <ToggleSwitch
                      checked={artistAutoWatchOn}
                      onChange={(next) =>
                        onToggleSub({ artistAutoWatch: next })
                      }
                      ariaLabel={ARTISTS_COPY.autoWatch.label}
                      ariaDescribedBy={rowIds.autoWatch}
                      disabled={patch.isPending}
                    />
                  </div>
                </div>
              )}

              <div className="flex min-h-[44px] items-center justify-between gap-3 rounded-lg border border-border bg-surface-1 px-4 py-3">
                <div className="flex min-w-0 flex-col">
                  <span className="flex flex-wrap items-center gap-2 text-sm font-semibold text-fg">
                    {ARTISTS_COPY.digest.label}
                    <span className="rounded border border-signal px-1.5 py-px text-[9px] font-bold uppercase tracking-[0.12em] text-signal">
                      {ARTISTS_COPY.newBadge}
                    </span>
                  </span>
                  <span id={rowIds.digest} className="text-xs text-fg-muted">
                    {ARTISTS_COPY.digest.detail}
                  </span>
                </div>
                <ToggleSwitch
                  checked={weeklyDigestOn}
                  onChange={(next) =>
                    onToggleSub({ weeklyDigestEnabled: next })
                  }
                  ariaLabel={ARTISTS_COPY.digest.label}
                  ariaDescribedBy={rowIds.digest}
                  disabled={patch.isPending}
                />
              </div>

              {/* One set of switches whatever filled the list — without this
                  a Spotify user goes hunting for a second set in Connections. */}
              {spotifyConnected && (
                <p className="text-xs text-fg-muted">
                  {ARTISTS_COPY.spotifyNote}
                </p>
              )}
            </>
          )}
        </div>
      )}

      {/* ── Shows you're watching ──────────────────────────────────────── */}
      {masterOn && (
        <div className="flex flex-col gap-2">
          <GroupHeading text={NOTIFICATIONS_COPY.watching.heading} />
          {NOTIFICATIONS_COPY.subs.map((sub) => {
            const checked = sub.key === 'watch' ? watchUpdatesOn : priceDropsOn
            const detailId = `${idPrefix}-sub-${sub.key}-detail`
            return (
              <div
                key={sub.key}
                className="flex min-h-[44px] items-center justify-between gap-3 rounded-lg border border-border bg-surface-1 px-4 py-3"
              >
                <div className="flex min-w-0 flex-col">
                  <span className="text-sm font-semibold text-fg">
                    {sub.label}
                  </span>
                  <span id={detailId} className="text-xs text-fg-muted">
                    {sub.detail}
                  </span>
                </div>
                <ToggleSwitch
                  checked={checked}
                  onChange={(next) =>
                    onToggleSub(
                      sub.key === 'watch'
                        ? { watchUpdatesEnabled: next }
                        : { priceDropsEnabled: next },
                    )
                  }
                  ariaLabel={sub.label}
                  ariaDescribedBy={detailId}
                  disabled={patch.isPending}
                />
              </div>
            )
          })}
        </div>
      )}

      {/* Outside every push branch above, including the empty and denied
          states: crew activity is bell-only and stays controllable with push
          switched fully off. */}
      <CrewActivityBlock />

      <TierPickerSheet
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        planState={planState ?? LOGGED_OUT_PLAN_STATE}
        scaRegion={scaRegion}
        // No 'follow' entry value exists yet — PR 10 adds it with the
        // FOLLOW_ANCHOR copy. Until then this matches the artist page's
        // locked follow tap so both reaches report on one dimension value.
        entry="paywall"
      />
    </section>
  )
}
