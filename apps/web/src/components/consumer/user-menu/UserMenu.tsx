'use client';

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  createContext,
  useContext,
} from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import {
  ArrowDownLeft,
  CornerUpRight,
  Eye,
  QrCode,
  Tag,
  Users,
} from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth, useUser, useClerk } from '@clerk/nextjs';
import { Avatar } from '@/components/settings/Avatar';
import { AvatarRing } from '@/components/settings/AvatarRing';
import { ThemeSwatch } from '@/theme/ThemeSwatch';
import { THEMES, THEME_META, THEME_NAMES } from '@/theme/themes';
import { MiniMark } from '@/theme/MiniMark';
import { useTheme } from '@/theme';
import { patchMe } from '@/lib/users';
import { fetchMeShared } from '@/lib/queries/use-me';
import { useQueryClient } from '@tanstack/react-query';
import type { ThemeName } from '@/theme/themes';
import type { AvatarColor } from '@concert-crawl/types';
import { UserMenuVersionFooter } from '@/components/consumer/release-notes/UserMenuVersionFooter';
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy';
import { AnonDisc } from '@/components/consumer/app-header/AnonDisc';
import { InboxStrip } from '@/components/consumer/notifications/InboxStrip';
import { NotifMenuPanel } from '@/components/consumer/notifications/NotifMenuPanel';
import { NotifPanelEdge } from '@/components/consumer/notifications/NotifPanelEdge';
import { NotifPip } from '@/components/consumer/notifications/NotifPip';
import { NOTIFICATIONS_COPY } from '@/components/consumer/notifications/definitions/copy';
import {
  useNotifications,
  unreadCountOf,
  hasUnseen as hasUnseenNotifications,
} from '@/lib/queries/use-notifications';
import { ShareAppSheet } from '@/components/consumer/share-app/lazy';
import { isPublicBrowseEnabled } from '@/lib/launch-mode';
import { GetInCard } from './GetInCard';
import { AccountMenuContext, useAccountMenu } from './account-menu-context';
import type { AccountMenuState } from './account-menu-context';
import { useFocusTrap } from '@/lib/hooks/useFocusTrap';
import { useSheetDrag } from '@/lib/hooks/useSheetDrag';
import { useBodyScrollLock } from '@/lib/hooks/useBodyScrollLock';
import {
  markCameFromMenu,
  takeMenuReopen,
  NOTIFICATIONS_PAGE_HREF,
} from './menu-return';
import type { SheetDragZone } from '@/lib/hooks/useSheetDrag';

const APP_VERSION = process.env['NEXT_PUBLIC_APP_VERSION'] ?? 'dev';

const AVATAR_CACHE_KEY = 'cc-avatar';
const AVATAR_COLORS: readonly AvatarColor[] = [
  'signal',
  'accent',
  'success',
  'warning',
];

// bp-account: the popover edge runs left to right, signal blue to accent pink,
// along the rounded top and fades down the sides into the ordinary border.
// Four border-box layers, top first: the surface fill, a fade from clear to the
// border colour over the top 40px, the horizontal gradient confined to those
// 40px, and the border colour everywhere else.
const POPOVER_EDGE_BACKGROUND = [
  'linear-gradient(var(--bg-elevated), var(--bg-elevated)) padding-box',
  'linear-gradient(180deg, color-mix(in oklch, var(--border-strong) 0%, transparent), var(--border-strong)) border-box top / 100% 40px no-repeat',
  'linear-gradient(90deg, var(--signal), var(--accent)) border-box top / 100% 40px no-repeat',
  'linear-gradient(var(--border-strong), var(--border-strong)) border-box',
].join(', ');

interface CachedAvatar {
  handle: string | null;
  avatarColor: AvatarColor | null;
  avatarSecondColor: AvatarColor | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isAvatarColorOrNull(value: unknown): value is AvatarColor | null {
  return value === null || AVATAR_COLORS.some((color) => color === value);
}

// Entries written before the ring pair was cached lack avatarSecondColor; they
// stay valid and read as no second colour.
function parseCachedAvatar(value: unknown): CachedAvatar | null {
  if (!isRecord(value)) return null;
  const { handle, avatarColor, avatarSecondColor } = value;
  if (!(handle === null || typeof handle === 'string')) return null;
  if (!isAvatarColorOrNull(avatarColor)) return null;
  if (
    avatarSecondColor !== undefined &&
    !isAvatarColorOrNull(avatarSecondColor)
  )
    return null;
  return {
    handle,
    avatarColor,
    avatarSecondColor: avatarSecondColor ?? null,
  };
}

// Scope the cache per Clerk user so a different account signing in on a shared
// device never briefly sees the previous user's handle/color.
function avatarCacheKey(userId: string): string {
  return `${AVATAR_CACHE_KEY}:${userId}`;
}

function readAvatarCache(userId: string): CachedAvatar | null {
  try {
    const raw = window.localStorage.getItem(avatarCacheKey(userId));
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return parseCachedAvatar(parsed);
  } catch (err) {
    console.warn('UserMenu: could not read avatar cache', err);
    return null;
  }
}

function writeAvatarCache(userId: string, value: CachedAvatar): void {
  try {
    window.localStorage.setItem(avatarCacheKey(userId), JSON.stringify(value));
  } catch (err) {
    // Non-fatal: caching is a progressive enhancement.
    console.warn('UserMenu: could not write avatar cache', err);
  }
}

// The menu body is shared by the desktop popover (anchored inside `UserMenu`)
// and the mobile sheet (rendered by the provider, since the desktop bar that
// hosts `UserMenu` is `display: none` below sm). Both read the same props from
// here so exactly one body exists per open menu.
const AccountMenuBodyContext = createContext<MenuBodyProps | null>(null);

/**
 * Which body the one shell is showing. `'notifications'` swaps NotifBody in
 * place of MenuBody INSIDE the same popover/sheet — see NotifMenuPanel for why
 * this is a mode rather than a second surface.
 */
export type AccountMenuMode = 'menu' | 'notifications';

/**
 * The desktop popover in notifications mode (addendum 2, item 16): the account
 * panel swaps to What you missed, 390 wide under the avatar, and the whole
 * panel (back row, header, tabs, list) is bounded at 700 tall, clamped to the
 * viewport (88px = header + gap + breathing room), with the list scrolling
 * inside it. The mobile sheet grows to its content instead.
 */
const PANEL_MAX_HEIGHT = 'min(700px, calc(100dvh - 88px))';
const PANEL_WIDTH = 390;
const IDENTITY_RING_SIZE = 46;
/** `notifications-panel-d`: inset ring plus the deep drop shadow. */
const NOTIF_PANEL_SHADOW =
  '0 0 0 1px rgba(255,255,255,0.04) inset, 0 30px 80px rgba(0,0,0,0.6)'; // fwd-allow-hex: board art colour

/**
 * Owns the account menu's open state for every trigger in the app — the
 * desktop avatar, the mobile header disc, and bottom-nav slot 4. Two triggers
 * driving one state is what keeps a mobile tap from stacking two sheets.
 */
export function AccountMenuProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { getToken, sessionClaims, isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();
  const queryClient = useQueryClient();
  const { signOut } = useClerk();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<AccountMenuMode>('menu');
  const [isMobile, setIsMobile] = useState(false);
  // Share Concert Crawl's sheet lives here, not in the menu body: the body
  // unmounts when the menu closes, and the sheet has to outlive that.
  const [shareOpen, setShareOpen] = useState(false);
  // Stable: BottomSheet's focus effect depends on onClose.
  const closeShare = useCallback(() => setShareOpen(false), []);
  const [liveSubmissionCount, setLiveSubmissionCount] = useState(0);
  const [avatarHandle, setAvatarHandle] = useState<string | null>(null);
  const [avatarColor, setAvatarColor] = useState<AvatarColor | null>(null);
  const [avatarSecondColor, setAvatarSecondColor] =
    useState<AvatarColor | null>(null);
  const [avatarLoaded, setAvatarLoaded] = useState(false);
  const surfaceRef = useRef<HTMLDivElement>(null);
  // The element that opened the menu, so dismiss can hand focus back to it.
  const triggerRef = useRef<HTMLElement | null>(null);
  // Set only by the `‹ Menu` back row, so the focus move below can't fire on
  // an ordinary open (where the shell's own trap already places focus).
  const returningToMenu = useRef(false);

  const userId = user?.id;

  // Hydrate the avatar from a local cache before fetchMe resolves so the
  // trigger renders filled on repeat loads instead of flashing empty→filled.
  useEffect(() => {
    // Reset per-user state whenever the signed-in user changes (or signs out),
    // so a previous account's cached handle/color or submission count can't
    // linger on a shared device until fetchMe resolves.
    setLiveSubmissionCount(0);
    setAvatarSecondColor(null);
    if (!userId) {
      // Signed-out: there's nothing to fetch, so resolve the loading state
      // immediately. Otherwise loading={!avatarLoaded} stays true forever and
      // the trigger shows the neutral disc instead of the anonymous avatar.
      setAvatarHandle(null);
      setAvatarColor(null);
      setAvatarLoaded(true);
      return;
    }
    const cached = readAvatarCache(userId);
    if (cached) {
      setAvatarHandle(cached.handle);
      setAvatarColor(cached.avatarColor);
      setAvatarSecondColor(cached.avatarSecondColor);
      setAvatarLoaded(true);
    } else {
      setAvatarHandle(null);
      setAvatarColor(null);
      setAvatarLoaded(false);
    }
  }, [userId]);

  useEffect(() => {
    const mql = window.matchMedia('(max-width: 639px)');
    setIsMobile(mql.matches);
    const handler = (ev: MediaQueryListEvent) => setIsMobile(ev.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  // ONE query subscription for the whole chrome. React Query dedupes the two
  // other call sites (the strip, the panel) onto this same cache entry, and the
  // query is itself `enabled: !!isSignedIn` — but the pip is guarded a second
  // time below, because a stale cache entry surviving a sign-out must not put a
  // pip on an anonymous visitor's disc.
  const notifications = useNotifications();
  const unreadCount =
    isSignedIn === true ? unreadCountOf(notifications.data) : 0;
  // SEEN ≠ READ. The dot is the unseen question — it drops the moment the
  // panel is opened (which advances the watermark), while the spoken count
  // stays UNREAD, because unread is what is actually waiting inside.
  const hasUnseen =
    isSignedIn === true && hasUnseenNotifications(notifications.data);

  const close = useCallback(() => {
    setOpen(false);
    // Closing always returns to the menu body: reopening into the panel would
    // strand someone who dismissed from notifications and expected the menu.
    setMode('menu');
    triggerRef.current?.focus();
  }, []);

  const openFrom = useCallback((trigger: HTMLElement | null) => {
    triggerRef.current = trigger;
    setMode('menu');
    setOpen(true);
  }, []);

  const toggleFrom = useCallback(
    (trigger: HTMLElement | null) => {
      if (open) {
        close();
        return;
      }
      openFrom(trigger);
    },
    [close, open, openFrom],
  );

  // Rows that navigate within the same layout (the version footer's push to
  // /whats-new) would otherwise leave the menu open on top of the destination.
  // No focus restore: the trigger the menu came from may not exist on the new
  // page, and stealing focus back from a fresh page is worse than leaving it.
  useEffect(() => {
    setOpen(false);
    setMode('menu');
  }, [pathname]);

  // The Notifications page's `‹ Menu` lands here asking for the menu back,
  // open. Declared after the effect above so, in the same commit, it wins.
  useEffect(() => {
    if (isSignedIn !== true || pathname === NOTIFICATIONS_PAGE_HREF) return;
    if (takeMenuReopen()) openFrom(null);
  }, [pathname, isSignedIn, openFrom]);

  // Returning from the panel unmounts the element focus was sitting on (the
  // panel surface), which drops focus to <body> while the dialog is still
  // open — a keyboard user is then stranded outside the surface they are
  // looking at. Mirrors NotifMenuPanel's entry focus, in the other direction.
  // Escape needs no equivalent: it closes the shell and restores the trigger.
  useEffect(() => {
    if (mode !== 'menu' || !returningToMenu.current) return;
    returningToMenu.current = false;
    surfaceRef.current?.focus();
  }, [mode]);

  // Close on Escape key
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') close();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [close, open]);

  // Close on click-outside (only registered when open). The trigger is excluded
  // as well as the surface — otherwise a click on the trigger would close here
  // and immediately reopen in the trigger's own handler.
  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (ev: MouseEvent) => {
      const target = ev.target;
      if (!(target instanceof Node)) return;
      if (surfaceRef.current?.contains(target)) return;
      if (triggerRef.current?.contains(target)) return;
      close();
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [close, open]);

  useEffect(() => {
    // Wait for Clerk before treating a null token as "nothing to fetch" —
    // otherwise a transient pre-hydration null would strand the effect for the
    // rest of the session, leaving liveSubmissionCount at 0 and the avatar cache
    // unrefreshed. The effect re-runs once isLoaded flips true.
    if (!isLoaded) return;
    if (!userId) return;
    let cancelled = false;
    void (async () => {
      try {
        const token = await getToken();
        if (cancelled) return;
        if (!token) {
          // Clerk is loaded but this user has no token: nothing to fetch. Keep
          // any cached handle/color already seeded for this userId; the finally
          // below resolves the loading disc.
          return;
        }
        // Shared with the other mount-time readers of /v1/users/me.
        const profile = await fetchMeShared(queryClient, userId, getToken);
        if (!cancelled) {
          setAvatarHandle(profile.handle);
          setAvatarColor(profile.avatarColor);
          setAvatarSecondColor(profile.avatarSecondColor);
          // The menu's meta reads "N live", so it takes the live count, not the
          // total the delete sheet needs.
          // Optional chaining: web and API deploy separately, and a cached
          // /me from before the API shipped the breakdown has no such field.
          setLiveSubmissionCount(profile.submissionCounts?.live ?? 0);
          writeAvatarCache(userId, {
            handle: profile.handle,
            avatarColor: profile.avatarColor,
            avatarSecondColor: profile.avatarSecondColor,
          });
        }
      } catch (err) {
        console.warn('UserMenu: could not load profile', err);
      } finally {
        // Always resolve the loading state so a failed fetch never leaves the
        // avatar stuck in the neutral loading disc.
        if (!cancelled) setAvatarLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [getToken, isLoaded, userId, queryClient]);

  const handleSignOut = useCallback(() => {
    void signOut().catch((err: unknown) =>
      console.error('Sign out failed', err),
    );
  }, [signOut]);

  // Derive user display values
  // Addendum 2 item 25: @handle, else the display name. With neither, the row
  // shows the email, as it does on main.
  const identityLabel = avatarHandle
    ? `@${avatarHandle}`
    : user?.fullName?.trim() ||
      user?.firstName?.trim() ||
      user?.emailAddresses[0]?.emailAddress ||
      '';

  // CustomJwtSessionClaims is augmented in apps/web/src/types/clerk.d.ts — no cast needed
  const isAdmin = sessionClaims?.metadata?.role === 'admin';

  // Build version display: "v0.4.2-beta · abc1234" or just "dev"
  const buildParts = APP_VERSION.split(' · ');
  const buildLabel = buildParts[0] ?? APP_VERSION;

  const bodyProps: MenuBodyProps = {
    identityLabel,
    isAdmin,
    buildLabel,
    liveSubmissionCount,
    avatarHandle,
    avatarColor,
    avatarSecondColor,
    isSignedIn: isSignedIn === true,
    surfaceRef,
    open,
    mode,
    // The phone gets a page of its own (`bp-s-notif_empty_m`); the desktop
    // popover swaps into its notifications mode in place.
    onOpenNotifications: () => {
      if (!isMobile) {
        setMode('notifications');
        return;
      }
      markCameFromMenu();
      setOpen(false);
      setMode('menu');
      router.push(NOTIFICATIONS_PAGE_HREF);
    },
    onBackToMenu: () => {
      returningToMenu.current = true;
      setMode('menu');
    },
    onNavigateAway: () => {
      // Same reasoning as onSettings: focus stays with the destination page.
      setOpen(false);
      setMode('menu');
    },
    onDismiss: close,
    // `close` hands focus back to the trigger first, so the sheet's own
    // return-focus lands there rather than on the row that just unmounted.
    onShareApp: () => {
      close();
      setShareOpen(true);
    },
    onSettings: () => {
      // Deliberately not close(): this navigates away, so returning focus to a
      // trigger that is about to unmount would fight the destination page for it.
      setOpen(false);
      setMode('menu');
      void router.push('/me');
    },
    onSignOut: handleSignOut,
  };

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
  };

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
        <ShareAppSheet
          open={shareOpen}
          onClose={closeShare}
          mode={isPublicBrowseEnabled() ? 'open' : 'invite'}
        />
      </AccountMenuBodyContext.Provider>
    </AccountMenuContext.Provider>
  );
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
  } = useAccountMenu();
  const bodyProps = useContext(AccountMenuBodyContext);
  const [isMobile, setIsMobile] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const mql = window.matchMedia('(max-width: 639px)');
    setIsMobile(mql.matches);
    const handler = (ev: MediaQueryListEvent) => setIsMobile(ev.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  // The pip is signed-in-only, twice over: `hasUnseen` is already false for
  // anonymous visitors in the provider, and this second read makes the rule
  // local to the render that draws the dot.
  //
  // UNSEEN drives the dot, UNREAD drives the words. The dot only says
  // "something arrived since you last looked" — opening the panel clears it —
  // while the accessible name announces what is still waiting inside.
  const piped = isSignedIn && hasUnseen;
  // Deliberately NOT `piped`. Sighted users keep the unread rows in view after
  // the dot clears; gating the label on the dot would delete that standing
  // information for screen-reader users at the exact moment they opened the
  // panel to find it.
  const announcesUnread = isSignedIn && unreadCount > 0;

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
        aria-busy={isSignedIn && !avatarLoaded ? true : undefined}
        className="relative shrink-0 cursor-pointer rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--signal)]"
      >
        {isSignedIn ? (
          <Avatar
            handle={avatarHandle}
            avatarColor={avatarColor}
            size={36}
            edge="solid"
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
        <>
          {/* bp-account dims the page behind the popover. The popover lives in
              the sticky header's stacking context (z-40), so the dim sits just
              under it (z-30): the page dims, the header and the popover stay
              lit. Portalled so no ancestor can clip it; a click on it lands on
              the document, where the click-outside handler closes. */}
          {createPortal(
            <div
              aria-hidden
              data-testid="account-menu-scrim"
              style={{
                position: 'fixed',
                inset: 0,
                zIndex: 30,
                background: 'var(--scrim)',
              }}
            />,
            document.body,
          )}
          <UserMenuPopover {...bodyProps} />
        </>
      )}
    </div>
  );
}

// ── Shared props ──────────────────────────────────────────────────────────

interface MenuBodyProps {
  identityLabel: string;
  isAdmin: boolean;
  buildLabel: string;
  onSettings: () => void;
  onSignOut: () => void;
  onDismiss: () => void;
  /** Closes the menu and opens the Share Concert Crawl sheet. */
  onShareApp: () => void;
  liveSubmissionCount: number;
  avatarHandle: string | null;
  avatarColor: AvatarColor | null;
  /** The second colour of the user's pair; drawn by the identity card only. */
  avatarSecondColor: AvatarColor | null;
  isSignedIn: boolean;
  open: boolean;
  mode: AccountMenuMode;
  onOpenNotifications: () => void;
  onBackToMenu: () => void;
  onNavigateAway: () => void;
  surfaceRef: React.RefObject<HTMLDivElement | null>;
  /**
   * The phone sheet's drag-down grab zone for the identity card. The board
   * draws no handle on this sheet, so the card is what you pull. The desktop
   * popover passes nothing.
   */
  dragZone?: SheetDragZone;
}

/**
 * Notifications mode is signed-in-only, and every reader of the mode must
 * agree on that. Both the body picker and the dialog's accessible name go
 * through here so a shell can never label itself one thing and render another.
 */
const isNotifMode = (props: MenuBodyProps): boolean =>
  props.mode === 'notifications' && props.isSignedIn;

/**
 * The dialog's accessible name has to follow the body it is showing. Both
 * shells swap NotifBody in place, so a shell that always announces "Account"
 * would tell a screen-reader user nothing changed when "See all" replaced the
 * entire surface — the one moment the name is load-bearing.
 */
const shellLabelOf = (props: MenuBodyProps): string =>
  isNotifMode(props)
    ? NOTIFICATIONS_COPY.panelTitle
    : CONSUMER_COPY.userMenu.ariaLabels.menuTitle;

/**
 * The one place the mode switch happens. Both shells call it, so the popover
 * and the sheet cannot drift on which body they show or how the panel is
 * bounded. Signed-out never reaches notifications mode — there is nothing to
 * show and no account to show it for.
 */
function MenuShellContent({
  props,
  panelMaxHeight,
}: {
  props: MenuBodyProps;
  panelMaxHeight?: number | string;
}) {
  if (isNotifMode(props)) {
    return (
      <NotifMenuPanel
        onBack={props.onBackToMenu}
        onNavigate={props.onNavigateAway}
        {...(panelMaxHeight === undefined ? {} : { maxHeight: panelMaxHeight })}
      />
    );
  }
  return <MenuBody {...props} />;
}

// ── Theme row with inline swatch grid ────────────────────────────────────

function ThemeMenuRow() {
  const { theme, setTheme } = useTheme();
  const { getToken } = useAuth();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const activeTokens = THEMES[theme];
  const activeMeta = THEME_META[theme];

  // Persist to the server (mirrors settings ThemePickerInline). Without this
  // the browse-page picker only set theme locally, so ThemeSync reverted it to
  // the server value on the next /me visit and the choice never stuck.
  const selectTheme = async (name: ThemeName) => {
    if (name === theme || isSaving) return;
    const previous = theme;
    setTheme(name);
    setPickerOpen(false);
    setIsSaving(true);
    try {
      const token = await getToken();
      // Signed-out users have no server record to persist to, and no ThemeSync
      // runs to revert the localStorage write setTheme just made — the local
      // choice sticks on its own. Only signed-in users need the server round-trip.
      if (token) {
        await patchMe(token, { theme: name });
      }
    } catch (err) {
      console.warn('UserMenu: could not persist theme', err);
      setTheme(previous);
    } finally {
      setIsSaving(false);
    }
  };

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
          gap: 12,
          padding: '10px 16px',
          borderBottom: pickerOpen ? 'none' : '1px solid var(--border)',
          width: '100%',
          boxSizing: 'border-box',
          transition: 'background 120ms',
        }}
        className="bg-transparent hover:bg-[var(--overlay-hover)]"
      >
        <RowTile tint="var(--accent)">
          <Eye {...TILE_ICON_PROPS} />
        </RowTile>
        <span
          style={{
            flex: 1,
            fontFamily: 'var(--font-ui)',
            fontSize: 14.5,
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
  );
}

// ── Share Concert Crawl row ──────────────────────────────────────────────

// The same row in both bodies: the QR tile in accent, no meta text.
function ShareAppRow({
  onClick,
  last = false,
}: {
  onClick: () => void;
  last?: boolean;
}) {
  return (
    <MenuRow
      label={CONSUMER_COPY.userMenu.rows.shareApp}
      onClick={onClick}
      last={last}
      leading={
        <RowTile tint="var(--accent)">
          <QrCode {...TILE_ICON_PROPS} />
        </RowTile>
      }
    />
  );
}

// ── Menu body (shared between popover and sheet) ──────────────────────────

function MenuBody({
  identityLabel,
  isAdmin,
  buildLabel,
  onSettings,
  onSignOut,
  onDismiss,
  onShareApp,
  liveSubmissionCount,
  avatarHandle,
  avatarColor,
  avatarSecondColor,
  isSignedIn,
  onOpenNotifications,
  dragZone,
}: MenuBodyProps) {
  if (!isSignedIn) {
    return (
      <>
        <GetInCard onNavigate={onDismiss} />

        <SectionLabel>{CONSUMER_COPY.userMenu.sections.app}</SectionLabel>
        {/* A guest can share only once the app is open: before launch a link
            to it is a link to the waitlist, and the invite code is a member's
            own. */}
        {isPublicBrowseEnabled() && <ShareAppRow onClick={onShareApp} />}
        <ThemeMenuRow />
        <MenuRow
          label={CONSUMER_COPY.userMenu.signedOut.howItWorks}
          href={CONSUMER_COPY.userMenu.signedOut.howItWorksHref}
        />
        {/* When signed in these rows are dropped, and Settings ▸ Account
            carries the equivalent pair (LegalLinksCard). Both stay wired. */}
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
    );
  }

  return (
    <>
      {/* Identity card */}
      <div
        {...dragZone}
        style={{
          ...dragZone?.style,
          padding: '14px 14px 12px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          borderBottom: '1px solid var(--border)',
        }}
      >
        {/* bp-account: the board's ring measures 92px on a 780px (@2x) shot,
            so 46px, in the user's two-colour pair. */}
        <AvatarRing
          handle={avatarHandle}
          avatarColor={avatarColor}
          avatarSecondColor={avatarSecondColor}
          size={IDENTITY_RING_SIZE}
        />
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
            {identityLabel}
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
        {...(liveSubmissionCount > 0
          ? {
              meta: CONSUMER_COPY.userMenu.rows.submittedPricesMeta(
                liveSubmissionCount,
              ),
            }
          : {})}
        kbd="P"
        leading={
          <RowTile tint="var(--success)">
            <Tag {...TILE_ICON_PROPS} />
          </RowTile>
        }
      />
      <ShareAppRow onClick={onShareApp} last />

      {/* App section */}
      <SectionLabel>{CONSUMER_COPY.userMenu.sections.app}</SectionLabel>
      <ThemeMenuRow />
      {/* The tour is post-sign-up now, so this is the only way back into it
          for an account that has already been through — or skipped it. */}
      <MenuRow
        label={CONSUMER_COPY.userMenu.rows.howItWorks}
        href={CONSUMER_COPY.userMenu.rows.howItWorksHref}
        leading={
          <RowTile>
            <CornerUpRight {...TILE_ICON_PROPS} />
          </RowTile>
        }
      />
      <MenuRow
        label={CONSUMER_COPY.userMenu.rows.settings}
        onClick={onSettings}
        last
        leading={
          <RowTile>
            <Users {...TILE_ICON_PROPS} />
          </RowTile>
        }
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
              <RowTile tint="var(--signal)">
                <ShieldIcon />
              </RowTile>
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
        leading={
          <RowTile tint="var(--warning)">
            {/* bp-account draws a plain diagonal arrow, not the door glyph. */}
            <ArrowDownLeft {...TILE_ICON_PROPS} />
          </RowTile>
        }
      />

      {/* Status footer: routes to the /whats-new feature page, shows unread dot */}
      <UserMenuVersionFooter build={buildLabel} />
    </>
  );
}

// ── Popover (desktop) ─────────────────────────────────────────────────────

function UserMenuPopover(props: MenuBodyProps) {
  useFocusTrap(props.surfaceRef, props.open);
  // The popover always renders over the full-viewport dim (bp-account), so
  // the page behind holds still just as it does under the phone sheet.
  useBodyScrollLock(props.open);
  return (
    <div
      ref={props.surfaceRef}
      role="dialog"
      // No aria-modal: the dim behind the desktop popover is visual only (a
      // click on it closes the menu), and the page stays reachable by keyboard
      // and screen reader, so claiming modality would misdescribe it. Only the
      // mobile sheet is genuinely modal.
      aria-label={shellLabelOf(props)}
      tabIndex={-1}
      style={{
        position: 'absolute',
        right: 0,
        top: 'calc(100% + 8px)',
        zIndex: 100,
        ...(isNotifMode(props)
          ? {
              width: PANEL_WIDTH,
              // `notifications-panel-d`: surface-2 fill, hairline border,
              // radius 18, inset ring; the gradient top edge is the child.
              background: 'var(--surface-2)',
              border: '1px solid var(--border)',
              borderRadius: 18,
              boxShadow: NOTIF_PANEL_SHADOW,
            }
          : {
              width: 380,
              // Lifted surface with a gradient edge (B+ `bp-account`): the
              // border is a signal-to-accent gradient that fades to the
              // ordinary hairline.
              border: '1.5px solid transparent',
              background: POPOVER_EDGE_BACKGROUND,
              borderRadius: 16,
            }),
        ...(isNotifMode(props)
          ? {}
          : {
              boxShadow:
                '0 24px 64px rgba(0,0,0,0.45), 0 4px 12px rgba(0,0,0,0.2)',
            }),
        overflow: 'hidden',
        fontFamily: 'var(--font-ui)',
        color: 'var(--fg)',
      }}
    >
      {isNotifMode(props) && <NotifPanelEdge />}
      <MenuShellContent props={props} panelMaxHeight={PANEL_MAX_HEIGHT} />
    </div>
  );
}

// ── Bottom sheet (mobile) ─────────────────────────────────────────────────

function UserMenuSheet(props: MenuBodyProps) {
  useFocusTrap(props.surfaceRef, props.open);
  // The page behind holds still; the desktop popover takes the same lock.
  useBodyScrollLock(props.open);
  const drag = useSheetDrag(props.onDismiss);
  return (
    <div
      ref={props.surfaceRef}
      onTransitionEnd={drag.onSheetTransitionEnd}
      role="dialog"
      aria-modal="true"
      aria-label={shellLabelOf(props)}
      tabIndex={-1}
      className="sheet-edge [--sheet-bg:var(--bg-elevated)]"
      style={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 100,
        borderTopLeftRadius: 22,
        borderTopRightRadius: 22,
        boxShadow: '0 -16px 48px rgba(0,0,0,0.45)',
        overflow: 'hidden',
        fontFamily: 'var(--font-ui)',
        color: 'var(--fg)',
        // The menu grows to its content — it is a short, known list — but
        // never past the screen: on a short phone (320x568) its rows scroll
        // above the version footer instead of the footer covering Sign out.
        // (Notifications are a page of their own on the phone, not a mode of
        // this sheet.)
        //
        // `svh`, not `vh`: on iOS `vh` is the tallest viewport, so a sheet
        // pinned to the bottom would sit partly behind the URL bar.
        maxHeight: '92svh',
        display: 'flex',
        flexDirection: 'column',
        ...drag.sheetStyle,
      }}
    >
      {/* Drag handle: the grab zone for the shared drag-down dismiss. */}
      <div
        {...drag.zoneProps}
        style={{
          ...drag.zoneProps.style,
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
      {/* The menu body scrolls inside the sheet's own max height (above). */}
      <div style={{ overflowY: 'auto', minHeight: 0, flex: '1 1 auto' }}>
        <MenuShellContent props={{ ...props, dragZone: drag.zoneProps }} />
      </div>
    </div>
  );
}

// ── Primitives ────────────────────────────────────────────────────────────

// The 30px rounded tile that leads a menu row (B+ `bp-account`): a quiet
// elevated square with a tinted line glyph. Decorative; the label names the row.
function RowTile({
  children,
  tint = 'var(--fg-muted)',
}: {
  children: React.ReactNode;
  tint?: string;
}) {
  return (
    <span
      aria-hidden="true"
      style={{
        width: 30,
        height: 30,
        borderRadius: 9,
        background: 'var(--surface-2)',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: tint,
        flexShrink: 0,
      }}
    >
      {children}
    </span>
  );
}

const TILE_ICON_PROPS = { size: 15, strokeWidth: 1.75 } as const;

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        padding: '14px 16px 6px',
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
  );
}

interface MenuRowProps {
  label: string;
  meta?: string;
  kbd?: string;
  hot?: boolean;
  danger?: boolean;
  last?: boolean;
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
  href?: string;
  onClick?: () => void;
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
  const color = danger ? 'var(--warning)' : 'var(--fg)';
  const rowStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '10px 16px',
    borderBottom: last ? 'none' : '1px solid var(--border)',
    cursor: 'pointer',
    width: '100%',
    boxSizing: 'border-box',
    textDecoration: 'none',
    textAlign: 'left',
    color,
  };
  const rowClass = hot
    ? 'bg-[var(--overlay-hover)]'
    : 'bg-transparent transition-colors hover:bg-[var(--overlay-hover)]';

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
          fontSize: 14.5,
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
            padding: '3px 7px',
            borderRadius: 5,
            border: '1px solid var(--border-strong)',
            background: 'var(--surface-1)',
            letterSpacing: '0.08em',
          }}
        >
          {kbd}
        </span>
      )}
    </>
  );

  if (href) {
    return (
      <Link href={href} style={rowStyle} className={rowClass}>
        {inner}
      </Link>
    );
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
    );
  }
  return (
    <div style={rowStyle} className={rowClass}>
      {inner}
    </div>
  );
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
  );
}

function ShieldIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
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
  );
}
