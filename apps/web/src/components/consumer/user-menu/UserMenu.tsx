'use client'

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  createContext,
  useContext,
} from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth, useUser, useClerk } from '@clerk/nextjs'
import { Avatar } from '@/components/settings/Avatar'
import { ThemeSwatch } from '@/theme/ThemeSwatch'
import { THEMES, THEME_META, THEME_NAMES } from '@/theme/themes'
import { MiniMark } from '@/theme/MiniMark'
import { useTheme } from '@/theme'
import { fetchMe, patchMe } from '@/lib/users'
import type { ThemeName } from '@/theme/themes'
import type { AvatarColor } from '@concert-crawl/types'
import { UserMenuVersionFooter } from '@/components/consumer/release-notes/UserMenuVersionFooter'
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy'
import { AnonDisc } from '@/components/consumer/app-header/AnonDisc'
import { InboxStrip } from '@/components/consumer/notifications/InboxStrip'
import { NotifMenuPanel } from '@/components/consumer/notifications/NotifMenuPanel'
import { NotifPip } from '@/components/consumer/notifications/NotifPip'
import { NOTIFICATIONS_COPY } from '@/components/consumer/notifications/definitions/copy'
import {
  useNotifications,
  unreadCountOf,
  hasUnseen as hasUnseenNotifications,
} from '@/lib/queries/use-notifications'
import { GetInCard } from './GetInCard'
import { AccountMenuContext, useAccountMenu } from './account-menu-context'
import type { AccountMenuState } from './account-menu-context'
import { useFocusTrap } from './use-focus-trap'

const APP_VERSION = process.env['NEXT_PUBLIC_APP_VERSION'] ?? 'dev'

const AVATAR_CACHE_KEY = 'cc-avatar'
const AVATAR_COLORS: readonly AvatarColor[] = [
  'signal',
  'accent',
  'success',
  'warning',
]

interface CachedAvatar {
  handle: string | null
  avatarColor: AvatarColor | null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isCachedAvatar(value: unknown): value is CachedAvatar {
  if (!isRecord(value)) return false
  const { handle, avatarColor } = value
  const handleOk = handle === null || typeof handle === 'string'
  const colorOk =
    avatarColor === null || AVATAR_COLORS.some((color) => color === avatarColor)
  return handleOk && colorOk
}

// Scope the cache per Clerk user so a different account signing in on a shared
// device never briefly sees the previous user's handle/color.
function avatarCacheKey(userId: string): string {
  return `${AVATAR_CACHE_KEY}:${userId}`
}

function readAvatarCache(userId: string): CachedAvatar | null {
  try {
    const raw = window.localStorage.getItem(avatarCacheKey(userId))
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    return isCachedAvatar(parsed) ? parsed : null
  } catch (err) {
    console.warn('UserMenu: could not read avatar cache', err)
    return null
  }
}

function writeAvatarCache(userId: string, value: CachedAvatar): void {
  try {
    window.localStorage.setItem(avatarCacheKey(userId), JSON.stringify(value))
  } catch (err) {
    // Non-fatal: caching is a progressive enhancement.
    console.warn('UserMenu: could not write avatar cache', err)
  }
}

// The menu body is shared by the desktop popover (anchored inside `UserMenu`)
// and the mobile sheet (rendered by the provider, since the desktop bar that
// hosts `UserMenu` is `display: none` below sm). Both read the same props from
// here so exactly one body exists per open menu.
const AccountMenuBodyContext = createContext<MenuBodyProps | null>(null)

/**
 * Which body the one shell is showing. `'notifications'` swaps NotifBody in
 * place of MenuBody INSIDE the same popover/sheet — see NotifMenuPanel for why
 * this is a mode rather than a second surface.
 */
export type AccountMenuMode = 'menu' | 'notifications'

/**
 * The desktop popover's panel height (the mobile sheet grows to its content).
 *
 * 340, not the 520 that `NotifDropdown` defaults to: 520 is the STANDALONE
 * dropdown's budget, and this panel is nested inside a 360px-wide account menu
 * that carries the identity card above it. The handoff's nested-menu component
 * takes `panelMaxHeight = 340` for exactly that reason.
 */
const PANEL_MAX_HEIGHT = 340

/**
 * Owns the account menu's open state for every trigger in the app — the
 * desktop avatar, the mobile header disc, and bottom-nav slot 4. Two triggers
 * driving one state is what keeps a mobile tap from stacking two sheets.
 */
export function AccountMenuProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const { getToken, sessionClaims, isLoaded, isSignedIn } = useAuth()
  const { user } = useUser()
  const { signOut } = useClerk()
  const router = useRouter()
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<AccountMenuMode>('menu')
  const [isMobile, setIsMobile] = useState(false)
  const [submissionCount, setSubmissionCount] = useState(0)
  const [avatarHandle, setAvatarHandle] = useState<string | null>(null)
  const [avatarColor, setAvatarColor] = useState<AvatarColor | null>(null)
  const [avatarLoaded, setAvatarLoaded] = useState(false)
  const surfaceRef = useRef<HTMLDivElement>(null)
  // The element that opened the menu, so dismiss can hand focus back to it.
  const triggerRef = useRef<HTMLElement | null>(null)
  // Set only by the `‹ Menu` back row, so the focus move below can't fire on
  // an ordinary open (where the shell's own trap already places focus).
  const returningToMenu = useRef(false)

  const userId = user?.id

  // Hydrate the avatar from a local cache before fetchMe resolves so the
  // trigger renders filled on repeat loads instead of flashing empty→filled.
  useEffect(() => {
    // Reset per-user state whenever the signed-in user changes (or signs out),
    // so a previous account's cached handle/color or submission count can't
    // linger on a shared device until fetchMe resolves.
    setSubmissionCount(0)
    if (!userId) {
      // Signed-out: there's nothing to fetch, so resolve the loading state
      // immediately. Otherwise loading={!avatarLoaded} stays true forever and
      // the trigger shows the neutral disc instead of the anonymous avatar.
      setAvatarHandle(null)
      setAvatarColor(null)
      setAvatarLoaded(true)
      return
    }
    const cached = readAvatarCache(userId)
    if (cached) {
      setAvatarHandle(cached.handle)
      setAvatarColor(cached.avatarColor)
      setAvatarLoaded(true)
    } else {
      setAvatarHandle(null)
      setAvatarColor(null)
      setAvatarLoaded(false)
    }
  }, [userId])

  useEffect(() => {
    const mql = window.matchMedia('(max-width: 639px)')
    setIsMobile(mql.matches)
    const handler = (ev: MediaQueryListEvent) => setIsMobile(ev.matches)
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [])

  // ONE query subscription for the whole chrome. React Query dedupes the two
  // other call sites (the strip, the panel) onto this same cache entry, and the
  // query is itself `enabled: !!isSignedIn` — but the pip is guarded a second
  // time below, because a stale cache entry surviving a sign-out must not put a
  // pip on an anonymous visitor's disc.
  const notifications = useNotifications()
  const unreadCount =
    isSignedIn === true ? unreadCountOf(notifications.data) : 0
  // SEEN ≠ READ. The dot is the unseen question — it drops the moment the
  // panel is opened (which advances the watermark), while the spoken count
  // stays UNREAD, because unread is what is actually waiting inside.
  const hasUnseen =
    isSignedIn === true && hasUnseenNotifications(notifications.data)

  const close = useCallback(() => {
    setOpen(false)
    // Closing always returns to the menu body: reopening into the panel would
    // strand someone who dismissed from notifications and expected the menu.
    setMode('menu')
    triggerRef.current?.focus()
  }, [])

  const openFrom = useCallback((trigger: HTMLElement | null) => {
    triggerRef.current = trigger
    setMode('menu')
    setOpen(true)
  }, [])

  const toggleFrom = useCallback(
    (trigger: HTMLElement | null) => {
      if (open) {
        close()
        return
      }
      openFrom(trigger)
    },
    [close, open, openFrom],
  )

  // Rows that navigate within the same layout (the version footer's push to
  // /changelog) would otherwise leave the menu open on top of the destination.
  // No focus restore: the trigger the menu came from may not exist on the new
  // page, and stealing focus back from a fresh page is worse than leaving it.
  useEffect(() => {
    setOpen(false)
    setMode('menu')
  }, [pathname])

  // Returning from the panel unmounts the element focus was sitting on (the
  // panel surface), which drops focus to <body> while the dialog is still
  // open — a keyboard user is then stranded outside the surface they are
  // looking at. Mirrors NotifMenuPanel's entry focus, in the other direction.
  // Escape needs no equivalent: it closes the shell and restores the trigger.
  useEffect(() => {
    if (mode !== 'menu' || !returningToMenu.current) return
    returningToMenu.current = false
    surfaceRef.current?.focus()
  }, [mode])

  // Close on Escape key
  useEffect(() => {
    if (!open) return
    const handleKeyDown = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') close()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [close, open])

  // Close on click-outside (only registered when open). The trigger is excluded
  // as well as the surface — otherwise a click on the trigger would close here
  // and immediately reopen in the trigger's own handler.
  useEffect(() => {
    if (!open) return
    const handleClickOutside = (ev: MouseEvent) => {
      const target = ev.target
      if (!(target instanceof Node)) return
      if (surfaceRef.current?.contains(target)) return
      if (triggerRef.current?.contains(target)) return
      close()
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [close, open])

  useEffect(() => {
    // Wait for Clerk before treating a null token as "nothing to fetch" —
    // otherwise a transient pre-hydration null would strand the effect for the
    // rest of the session, leaving submissionCount at 0 and the avatar cache
    // unrefreshed. The effect re-runs once isLoaded flips true.
    if (!isLoaded) return
    if (!userId) return
    let cancelled = false
    void (async () => {
      const token = await getToken()
      if (cancelled) return
      if (!token) {
        // Clerk is loaded but this user has no token: nothing to fetch. Keep any
        // cached handle/color already seeded for this userId and just resolve
        // the loading disc so the trigger shows its resolved state.
        setAvatarLoaded(true)
        return
      }
      try {
        const profile = await fetchMe(token)
        if (!cancelled) {
          setAvatarHandle(profile.handle)
          setAvatarColor(profile.avatarColor)
          setSubmissionCount(profile.submissionCount)
          writeAvatarCache(userId, {
            handle: profile.handle,
            avatarColor: profile.avatarColor,
          })
        }
      } catch (err) {
        console.warn('UserMenu: could not load profile', err)
      } finally {
        // Always resolve the loading state so a failed fetch never leaves the
        // avatar stuck in the neutral loading disc.
        if (!cancelled) setAvatarLoaded(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [getToken, isLoaded, userId])

  const handleSignOut = useCallback(() => {
    void signOut().catch((err: unknown) =>
      console.error('Sign out failed', err),
    )
  }, [signOut])

  // Derive user display values
  const email = user?.emailAddresses[0]?.emailAddress ?? ''

  // CustomJwtSessionClaims is augmented in apps/web/src/types/clerk.d.ts — no cast needed
  const isAdmin = sessionClaims?.metadata?.role === 'admin'

  // Build version display: "v0.4.2-beta · abc1234" or just "dev"
  const buildParts = APP_VERSION.split(' · ')
  const buildLabel = buildParts[0] ?? APP_VERSION

  const bodyProps: MenuBodyProps = {
    email,
    isAdmin,
    buildLabel,
    submissionCount,
    avatarHandle,
    avatarColor,
    isSignedIn: isSignedIn === true,
    surfaceRef,
    open,
    mode,
    onOpenNotifications: () => setMode('notifications'),
    onBackToMenu: () => {
      returningToMenu.current = true
      setMode('menu')
    },
    onNavigateAway: () => {
      // Same reasoning as onSettings: focus stays with the destination page.
      setOpen(false)
      setMode('menu')
    },
    onDismiss: close,
    onSettings: () => {
      // Deliberately not close(): this navigates away, so returning focus to a
      // trigger that is about to unmount would fight the destination page for it.
      setOpen(false)
      setMode('menu')
      void router.push('/me')
    },
    onSignOut: handleSignOut,
  }

  const menuState: AccountMenuState = {
    open,
    isSignedIn: isSignedIn === true,
    avatarHandle,
    avatarColor,
    avatarLoaded,
    unreadCount,
    hasUnseen,
    openFrom,
    toggleFrom,
    close,
  }

  return (
    <AccountMenuContext.Provider value={menuState}>
      <AccountMenuBodyContext.Provider value={bodyProps}>
        {children}
        {/* One polite region for the whole app: the pip is aria-hidden, so an
            arrival while the page is open would otherwise be silent. */}
        <span className="sr-only" role="status" aria-live="polite">
          {/* Gated on the SAME rule as the pip — UNSEEN, not unread — so the
              announcement and the dot can never disagree, and so marking a row
              read never re-reads a count the user already heard. The number
              inside stays the unread one, matching the trigger's name. */}
          {hasUnseen
            ? CONSUMER_COPY.userMenu.ariaLabels.unreadAnnouncement(unreadCount)
            : ''}
        </span>
        {/* Mobile sheet lives here, not in `UserMenu`: the desktop bar that
            hosts the avatar trigger is `display: none` below sm, so a sheet
            rendered inside it could never be seen. */}
        {open && isMobile && (
          <>
            <div
              style={{
                position: 'fixed',
                inset: 0,
                zIndex: 90,
                background: 'var(--scrim)',
              }}
              onClick={close}
            />
            <UserMenuSheet {...bodyProps} />
          </>
        )}
      </AccountMenuBodyContext.Provider>
    </AccountMenuContext.Provider>
  )
}

/**
 * The desktop account trigger and its anchored popover. Signed out it shows the
 * anonymous disc and opens the same menu the signed-in avatar does — the
 * trigger, its position and its behavior are identical; only the accessible
 * name and the menu body differ.
 */
export function UserMenu() {
  const {
    open,
    isSignedIn,
    avatarHandle,
    avatarColor,
    avatarLoaded,
    unreadCount,
    hasUnseen,
    toggleFrom,
  } = useAccountMenu()
  const bodyProps = useContext(AccountMenuBodyContext)
  const [isMobile, setIsMobile] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const mql = window.matchMedia('(max-width: 639px)')
    setIsMobile(mql.matches)
    const handler = (ev: MediaQueryListEvent) => setIsMobile(ev.matches)
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [])

  // The pip is signed-in-only, twice over: `hasUnseen` is already false for
  // anonymous visitors in the provider, and this second read makes the rule
  // local to the render that draws the dot.
  //
  // UNSEEN drives the dot, UNREAD drives the words. The dot only says
  // "something arrived since you last looked" — opening the panel clears it —
  // while the accessible name announces what is still waiting inside.
  const piped = isSignedIn && hasUnseen
  // Deliberately NOT `piped`. Sighted users keep the unread rows in view after
  // the dot clears; gating the label on the dot would delete that standing
  // information for screen-reader users at the exact moment they opened the
  // panel to find it.
  const announcesUnread = isSignedIn && unreadCount > 0

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => toggleFrom(triggerRef.current)}
        aria-label={
          !isSignedIn
            ? CONSUMER_COPY.userMenu.ariaLabels.accountMenuSignedOut
            : announcesUnread
              ? CONSUMER_COPY.userMenu.ariaLabels.accountMenuUnread(unreadCount)
              : CONSUMER_COPY.userMenu.ariaLabels.accountMenu
        }
        aria-expanded={open}
        aria-haspopup="dialog"
        className="relative shrink-0 cursor-pointer rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--signal)]"
      >
        {isSignedIn ? (
          <Avatar
            handle={avatarHandle}
            avatarColor={avatarColor}
            size={36}
            loading={!avatarLoaded}
          />
        ) : (
          <AnonDisc size={36} />
        )}
        {piped && (
          <NotifPip
            ring="var(--bg-elevated)"
            style={{ position: 'absolute', top: -1, right: -1 }}
          />
        )}
      </button>

      {open && !isMobile && bodyProps !== null && (
        <UserMenuPopover {...bodyProps} />
      )}
    </div>
  )
}

// ── Shared props ──────────────────────────────────────────────────────────

interface MenuBodyProps {
  email: string
  isAdmin: boolean
  buildLabel: string
  onSettings: () => void
  onSignOut: () => void
  onDismiss: () => void
  submissionCount: number
  avatarHandle: string | null
  avatarColor: AvatarColor | null
  isSignedIn: boolean
  open: boolean
  mode: AccountMenuMode
  onOpenNotifications: () => void
  onBackToMenu: () => void
  onNavigateAway: () => void
  surfaceRef: React.RefObject<HTMLDivElement | null>
}

/**
 * Notifications mode is signed-in-only, and every reader of the mode must
 * agree on that. Both the body picker and the dialog's accessible name go
 * through here so a shell can never label itself one thing and render another.
 */
const isNotifMode = (props: MenuBodyProps): boolean =>
  props.mode === 'notifications' && props.isSignedIn

/**
 * The dialog's accessible name has to follow the body it is showing. Both
 * shells swap NotifBody in place, so a shell that always announces "Account"
 * would tell a screen-reader user nothing changed when "See all" replaced the
 * entire surface — the one moment the name is load-bearing.
 */
const shellLabelOf = (props: MenuBodyProps): string =>
  isNotifMode(props)
    ? NOTIFICATIONS_COPY.panelTitle
    : CONSUMER_COPY.userMenu.ariaLabels.menuTitle

/**
 * The one place the mode switch happens. Both shells call it, so the popover
 * and the sheet cannot drift on which body they show or how the panel is
 * bounded. Signed-out never reaches notifications mode — there is nothing to
 * show and no account to show it for.
 */
function MenuShellContent({
  props,
  panelMaxHeight,
  panelClosable = false,
}: {
  props: MenuBodyProps
  panelMaxHeight?: number
  /** See NotifMenuPanel's `onClose` — the sheet sets it, the popover does not. */
  panelClosable?: boolean
}) {
  if (isNotifMode(props)) {
    return (
      <NotifMenuPanel
        onBack={props.onBackToMenu}
        onNavigate={props.onNavigateAway}
        {...(panelClosable ? { onClose: props.onDismiss } : {})}
        {...(panelMaxHeight === undefined ? {} : { maxHeight: panelMaxHeight })}
      />
    )
  }
  return <MenuBody {...props} />
}

// ── Theme row with inline swatch grid ────────────────────────────────────

function ThemeMenuRow() {
  const { theme, setTheme } = useTheme()
  const { getToken } = useAuth()
  const [pickerOpen, setPickerOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const activeTokens = THEMES[theme]
  const activeMeta = THEME_META[theme]

  // Persist to the server (mirrors settings ThemePickerInline). Without this
  // the browse-page picker only set theme locally, so ThemeSync reverted it to
  // the server value on the next /me visit and the choice never stuck.
  const selectTheme = async (name: ThemeName) => {
    if (name === theme || isSaving) return
    const previous = theme
    setTheme(name)
    setPickerOpen(false)
    setIsSaving(true)
    try {
      const token = await getToken()
      // Signed-out users have no server record to persist to, and no ThemeSync
      // runs to revert the localStorage write setTheme just made — the local
      // choice sticks on its own. Only signed-in users need the server round-trip.
      if (token) {
        await patchMe(token, { theme: name })
      }
    } catch (err) {
      console.warn('UserMenu: could not persist theme', err)
      setTheme(previous)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <>
      <button
        type="button"
        aria-expanded={pickerOpen}
        onClick={() => setPickerOpen((prev) => !prev)}
        style={{
          all: 'unset',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '12px 14px',
          borderBottom: pickerOpen ? 'none' : '1px solid var(--border)',
          width: '100%',
          boxSizing: 'border-box',
          transition: 'background 120ms',
        }}
        className="bg-transparent hover:bg-[var(--overlay-hover)]"
      >
        <span
          style={{
            flex: 1,
            fontFamily: 'var(--font-ui)',
            fontSize: 13.5,
            fontWeight: 600,
            color: 'var(--fg)',
            letterSpacing: '-0.005em',
          }}
        >
          {CONSUMER_COPY.userMenu.rows.theme}
        </span>
        <span
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            flexShrink: 0,
          }}
        >
          <MiniMark tokens={activeTokens} size={18} />
          <span
            style={{
              fontFamily: 'var(--font-ui)',
              fontSize: 12,
              fontWeight: 700,
              color: 'var(--fg-muted)',
              letterSpacing: '-0.005em',
            }}
          >
            {activeMeta.label}
          </span>
          <ChevronIcon open={pickerOpen} />
        </span>
      </button>

      {pickerOpen && (
        <div
          style={{
            padding: '10px 14px 12px',
            borderBottom: '1px solid var(--border)',
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 8,
          }}
        >
          {THEME_NAMES.map((name) => (
            <ThemeSwatch
              key={name}
              name={name}
              active={theme === name}
              disabled={isSaving}
              onClick={() => void selectTheme(name)}
            />
          ))}
        </div>
      )}
    </>
  )
}

// ── Menu body (shared between popover and sheet) ──────────────────────────

function MenuBody({
  email,
  isAdmin,
  buildLabel,
  onSettings,
  onSignOut,
  onDismiss,
  submissionCount,
  avatarHandle,
  avatarColor,
  isSignedIn,
  onOpenNotifications,
}: MenuBodyProps) {
  if (!isSignedIn) {
    return (
      <>
        <GetInCard onNavigate={onDismiss} />

        <SectionLabel>{CONSUMER_COPY.userMenu.sections.app}</SectionLabel>
        <ThemeMenuRow />
        <MenuRow
          label={CONSUMER_COPY.userMenu.signedOut.howItWorks}
          href={CONSUMER_COPY.userMenu.signedOut.howItWorksHref}
        />
        {/* Terms and Privacy are reachable through Settings signed in, so this
            is the only body that needs explicit rows for them. */}
        <MenuRow
          label={CONSUMER_COPY.userMenu.signedOut.terms}
          href={CONSUMER_COPY.userMenu.signedOut.termsHref}
        />
        <MenuRow
          label={CONSUMER_COPY.userMenu.signedOut.privacy}
          href={CONSUMER_COPY.userMenu.signedOut.privacyHref}
          last
        />

        <UserMenuVersionFooter build={buildLabel} />
      </>
    )
  }

  return (
    <>
      {/* Identity card */}
      <div
        style={{
          padding: '14px 14px 12px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          borderBottom: '1px solid var(--border)',
        }}
      >
        <Avatar handle={avatarHandle} avatarColor={avatarColor} size={42} />
        <div
          style={{
            flex: 1,
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
          }}
        >
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              fontWeight: 700,
              color: 'var(--accent)',
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
            }}
          >
            {CONSUMER_COPY.userMenu.identity.badge}
          </span>
          <span
            style={{
              fontFamily: 'var(--font-ui)',
              fontSize: 14,
              fontWeight: 700,
              color: 'var(--fg)',
              letterSpacing: '-0.005em',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {email}
          </span>
        </div>
        <span
          aria-hidden="true"
          style={{
            width: 28,
            height: 28,
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--fg-muted)',
            border: '1px solid var(--border)',
            flexShrink: 0,
          }}
        >
          <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
            <path
              d="M3 4.5l3 3 3-3"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </div>

      {/* #737 inbox strip — directly under the identity card, so the pip's
          promise is paid out at the first tap rather than the second. Signed
          out there is no strip at all. */}
      <InboxStrip onSeeAll={onOpenNotifications} />

      {/* You section */}
      <SectionLabel>{CONSUMER_COPY.userMenu.sections.you}</SectionLabel>
      <MenuRow
        label={CONSUMER_COPY.userMenu.rows.submittedPrices}
        href="/me?section=submissions"
        {...(submissionCount > 0
          ? {
              meta: CONSUMER_COPY.userMenu.rows.submittedPricesMeta(
                submissionCount,
              ),
            }
          : {})}
        kbd="P"
        last
      />

      {/* App section */}
      <SectionLabel>{CONSUMER_COPY.userMenu.sections.app}</SectionLabel>
      <ThemeMenuRow />
      <MenuRow
        label={CONSUMER_COPY.userMenu.rows.settings}
        onClick={onSettings}
        last
      />

      {/* Admin section */}
      {isAdmin && (
        <>
          <SectionLabel>
            {CONSUMER_COPY.userMenu.sections.operations}
          </SectionLabel>
          <MenuRow
            label={CONSUMER_COPY.userMenu.rows.admin}
            href="/admin"
            last
            leading={
              <span
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 6,
                  background: 'var(--surface-2)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--signal)',
                  flexShrink: 0,
                }}
              >
                <ShieldIcon />
              </span>
            }
          />
        </>
      )}

      {/* Sign out */}
      <div style={{ borderTop: '1px solid var(--border)' }} />
      <MenuRow
        label={CONSUMER_COPY.userMenu.rows.signOut}
        danger
        last
        onClick={onSignOut}
      />

      {/* Status footer — routes to /changelog, shows unread dot */}
      <UserMenuVersionFooter build={buildLabel} />
    </>
  )
}

// ── Popover (desktop) ─────────────────────────────────────────────────────

function UserMenuPopover(props: MenuBodyProps) {
  useFocusTrap(props.surfaceRef, props.open)
  return (
    <div
      ref={props.surfaceRef}
      role="dialog"
      // No aria-modal: the desktop popover has no scrim and leaves the rest of
      // the page interactive, so claiming modality would misdescribe it. Only
      // the mobile sheet, which does render a scrim, is genuinely modal.
      aria-label={shellLabelOf(props)}
      tabIndex={-1}
      style={{
        position: 'absolute',
        right: 0,
        top: 'calc(100% + 8px)',
        zIndex: 100,
        width: 360,
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border-strong)',
        borderRadius: 14,
        boxShadow: '0 24px 64px rgba(0,0,0,0.45), 0 4px 12px rgba(0,0,0,0.2)',
        overflow: 'hidden',
        fontFamily: 'var(--font-ui)',
        color: 'var(--fg)',
      }}
    >
      <MenuShellContent props={props} panelMaxHeight={PANEL_MAX_HEIGHT} />
    </div>
  )
}

// ── Bottom sheet (mobile) ─────────────────────────────────────────────────

function UserMenuSheet(props: MenuBodyProps) {
  useFocusTrap(props.surfaceRef, props.open)
  return (
    <div
      ref={props.surfaceRef}
      role="dialog"
      aria-modal="true"
      aria-label={shellLabelOf(props)}
      tabIndex={-1}
      style={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 100,
        background: 'var(--bg-elevated)',
        borderTopLeftRadius: 22,
        borderTopRightRadius: 22,
        border: '1px solid var(--border)',
        borderBottom: 'none',
        boxShadow: '0 -16px 48px rgba(0,0,0,0.45)',
        overflow: 'hidden',
        fontFamily: 'var(--font-ui)',
        color: 'var(--fg)',
        // The menu body grows to its content — it is a short, known list. The
        // notifications panel does not: it is a backfill you scroll, so it
        // takes the handoff's fixed 88% and scrolls inside itself. Growing to
        // content there gives a six-row account a card that ends mid-screen
        // with the page showing beneath it, and a fifty-row account a sheet
        // that runs off the top with nothing to scroll.
        //
        // `svh`, not `vh`: on iOS `vh` is the tallest viewport, so a sheet
        // pinned to the bottom would sit partly behind the URL bar.
        ...(isNotifMode(props)
          ? { height: '88svh', display: 'flex', flexDirection: 'column' }
          : {}),
      }}
    >
      {/* Drag handle */}
      <div
        style={{
          height: 18,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            width: 36,
            height: 4,
            borderRadius: 2,
            background: 'var(--border-strong)',
          }}
        />
      </div>
      {/* No maxHeight: the sheet is bottom-anchored and grows to its content,
          where the popover has to be bounded against the viewport. */}
      <MenuShellContent props={props} panelClosable />
    </div>
  )
}

// ── Primitives ────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        padding: '10px 14px 4px',
        fontFamily: 'var(--font-mono)',
        fontSize: 10,
        fontWeight: 700,
        color: 'var(--fg-subtle)',
        letterSpacing: '0.14em',
        textTransform: 'uppercase',
      }}
    >
      {children}
    </div>
  )
}

interface MenuRowProps {
  label: string
  meta?: string
  kbd?: string
  hot?: boolean
  danger?: boolean
  last?: boolean
  leading?: React.ReactNode
  trailing?: React.ReactNode
  href?: string
  onClick?: () => void
}

function MenuRow({
  label,
  meta,
  kbd,
  hot = false,
  danger = false,
  last = false,
  leading,
  trailing,
  href,
  onClick,
}: MenuRowProps) {
  const color = danger ? 'var(--warning)' : 'var(--fg)'
  const rowStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '12px 14px',
    borderBottom: last ? 'none' : '1px solid var(--border)',
    cursor: 'pointer',
    width: '100%',
    boxSizing: 'border-box',
    textDecoration: 'none',
    textAlign: 'left',
    color,
  }
  const rowClass = hot
    ? 'bg-[var(--overlay-hover)]'
    : 'bg-transparent transition-colors hover:bg-[var(--overlay-hover)]'

  const inner = (
    <>
      {hot && (
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: 6,
            background: 'var(--accent)',
            boxShadow: '0 0 6px var(--accent)',
            animation: 'umPulse 1.6s ease-in-out infinite',
            flexShrink: 0,
          }}
        />
      )}
      {leading}
      <span
        style={{
          flex: 1,
          minWidth: 0,
          fontFamily: 'var(--font-ui)',
          fontSize: 13.5,
          fontWeight: hot ? 800 : 600,
          color,
          letterSpacing: '-0.005em',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {label}
      </span>
      {trailing}
      {meta != null && (
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            fontWeight: 700,
            color: hot ? 'var(--accent)' : 'var(--fg-subtle)',
            letterSpacing: '0.10em',
            textTransform: 'uppercase',
          }}
        >
          {meta}
        </span>
      )}
      {kbd && (
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            fontWeight: 700,
            color: 'var(--fg-subtle)',
            padding: '2px 6px',
            borderRadius: 4,
            border: '1px solid var(--border)',
            background: 'var(--surface-1)',
            letterSpacing: '0.08em',
          }}
        >
          {kbd}
        </span>
      )}
    </>
  )

  if (href) {
    return (
      <Link href={href} style={rowStyle} className={rowClass}>
        {inner}
      </Link>
    )
  }
  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        style={rowStyle}
        className={rowClass}
      >
        {inner}
      </button>
    )
  }
  return (
    <div style={rowStyle} className={rowClass}>
      {inner}
    </div>
  )
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 12 12"
      fill="none"
      aria-hidden="true"
      style={{
        color: 'var(--fg-muted)',
        transition: 'transform 150ms ease',
        transform: open ? 'rotate(90deg)' : 'rotate(0deg)',
        flexShrink: 0,
      }}
    >
      <path
        d="M4.5 3l3 3-3 3"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function ShieldIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 16 16" fill="none">
      <path
        d="M8 1.5l5.5 2v4.2c0 3.4-2.4 6.4-5.5 7.3-3.1-0.9-5.5-3.9-5.5-7.3V3.5L8 1.5z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path
        d="M5.5 8.2l1.8 1.8L10.5 7"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
