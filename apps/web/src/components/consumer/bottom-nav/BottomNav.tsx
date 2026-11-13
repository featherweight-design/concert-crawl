'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { useQueryClient } from '@tanstack/react-query';
import { fetchMeShared } from '@/lib/queries/use-me';
import { isTabActive } from '@/lib/nav-tab-active';
import { useFeatureFlag } from '@/lib/queries/use-feature-flags';
import type { AvatarColor } from '@concert-crawl/types';
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy';
import { AnonDisc } from '@/components/consumer/app-header/AnonDisc';
import { useAccountMenu } from '@/components/consumer/user-menu/account-menu-context';
import { NotifPip } from '@/components/consumer/notifications/NotifPip';
import { STATIC_TABS } from './tabs';

const COPY = CONSUMER_COPY.bottomNav;
const MENU_LABELS = CONSUMER_COPY.userMenu.ariaLabels;

interface MeAvatarProps {
  handle: string;
  avatarColor: AvatarColor | null;
}

function MeAvatar({ handle, avatarColor }: MeAvatarProps) {
  const letter = handle.charAt(0).toUpperCase();
  const tone = avatarColor ?? 'signal';
  const tintBg = `color-mix(in oklch, var(--${tone}) 22%, var(--surface-1))`;

  return (
    <div
      aria-hidden="true"
      data-testid="me-avatar"
      data-avatar-edge="solid"
      style={{
        width: 28,
        height: 28,
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        background: tintBg,
        color: `var(--${tone})`,
        fontSize: 12,
        fontWeight: 800,
        fontFamily: 'var(--font-ui)',
        userSelect: 'none',
        // B+ draws the 28px disc with a full-colour 1.5px edge on every
        // board, active or not (browse-320, notif-shows-m).
        border: `1.5px solid var(--${tone})`,
        boxSizing: 'border-box',
      }}
    >
      {letter}
    </div>
  );
}

function MeAvatarSkeleton() {
  return (
    <div
      aria-hidden="true"
      data-testid="me-avatar-skeleton"
      style={{
        width: 28,
        height: 28,
        borderRadius: '50%',
        flexShrink: 0,
        background: 'var(--surface-2)',
      }}
    />
  );
}

// A resolved profile with no handle yet. A neutral disc, never a person glyph:
// the glyph used to flash in for the instant before the avatar arrived.
function MeAvatarPlaceholder() {
  return (
    <div
      aria-hidden="true"
      data-testid="me-avatar-placeholder"
      style={{
        width: 28,
        height: 28,
        borderRadius: '50%',
        flexShrink: 0,
        background: 'var(--surface-2)',
        border: '1px dashed var(--border-strong)',
        boxSizing: 'border-box',
      }}
    />
  );
}

export function BottomNav() {
  const pathname = usePathname();
  const { getToken, isSignedIn, userId } = useAuth();
  const queryClient = useQueryClient();
  const [avatarHandle, setAvatarHandle] = useState<string | null>(null);
  const [avatarColor, setAvatarColor] = useState<AvatarColor | null>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const wasSignedInRef = useRef(false);
  const {
    open: menuOpen,
    toggleFrom,
    unreadCount,
    hasUnseen,
  } = useAccountMenu();
  const menuTriggerRef = useRef<HTMLButtonElement>(null);
  const { enabled: crewsEnabled } = useFeatureFlag('crews');
  const tabs = STATIC_TABS.filter((tab) => crewsEnabled || tab.key !== 'crews');

  useEffect(() => {
    if (!isSignedIn) {
      wasSignedInRef.current = false;
      setAvatarHandle(null);
      setAvatarColor(null);
      setProfileLoaded(true);
      return;
    }
    let cancelled = false;
    // The signed-out branch above marks the profile loaded. Clerk flipping to
    // signed in must reopen the loading state, or the slot paints its fallback
    // for the whole of the first fetch.
    // Only on the signed-out to signed-in edge: a getToken or queryClient
    // identity change while signed in must not drop a loaded disc back to the
    // skeleton.
    if (!wasSignedInRef.current) {
      wasSignedInRef.current = true;
      setProfileLoaded(false);
    }
    void (async () => {
      try {
        const token = await getToken();
        if (!token || cancelled) return;
        // Shared with the other mount-time readers of /v1/users/me.
        const profile = await fetchMeShared(queryClient, userId, getToken);
        if (!cancelled) {
          setAvatarHandle(profile.handle);
          setAvatarColor(profile.avatarColor);
        }
      } catch (err) {
        console.warn('BottomNav: could not load profile', err);
      } finally {
        if (!cancelled) setProfileLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [getToken, isSignedIn, userId, queryClient]);

  const isMeActive = pathname.startsWith('/me');
  // Signed-in only, and guarded here rather than trusting the provider alone —
  // an anonymous visitor must never see a pip on the account slot.
  //
  // UNSEEN draws the dot (it clears on panel open); UNREAD is still what the
  // accessible name announces, since that is what is waiting inside.
  const piped = isSignedIn === true && hasUnseen;
  // Deliberately NOT `piped` — see the same split on the desktop trigger. The
  // dot is "something arrived"; the label is "something is still waiting".
  const announcesUnread = isSignedIn === true && unreadCount > 0;

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-around border-t border-border bg-bg-elevated sm:hidden"
      style={{
        height: 'calc(52px + env(safe-area-inset-bottom, 0px))',
        paddingBottom: 'env(safe-area-inset-bottom, 2px)',
      }}
      aria-label={COPY.nav.ariaLabel}
    >
      {tabs.map((tab) => {
        const isActive = isTabActive(tab, pathname);
        return (
          <Link
            key={tab.key}
            href={tab.href}
            aria-current={isActive ? 'page' : undefined}
            className="relative flex flex-col items-center justify-center gap-[3px]"
            // No fixed per-slot width: five slots share the bar by flex, so the
            // labels stay whole at 320px instead of being clipped to a budget.
            // 56 is a floor, not a width, and it matches the account trigger
            // beside it; five slots at 56 is 280, inside the 320 budget.
            style={{
              minWidth: 56,
              minHeight: 44,
              color: isActive ? 'var(--signal)' : 'var(--fg-subtle)',
            }}
          >
            {/* B+ marks the current tab with a short gradient bar on the nav's
                top edge, above the icon. */}
            {isActive && (
              <span
                aria-hidden="true"
                data-testid="nav-active-bar"
                className="absolute left-1/2 top-0 h-[2px] w-7 -translate-x-1/2 rounded-b-full"
                style={{
                  background:
                    'linear-gradient(90deg, var(--signal), var(--accent))',
                }}
              />
            )}
            {tab.icon}
            <span
              className="whitespace-nowrap text-[9px] tracking-[0.04em]"
              style={{
                fontFamily: 'var(--font-mono)',
                fontWeight: isActive ? 700 : 500,
              }}
            >
              {tab.label}
            </span>
          </Link>
        );
      })}
      {/* Slot 4 opens the account menu in both auth states. Signed in it used to
          link straight to /me, which skipped past every other destination the
          menu holds; the menu is the nav affordance and Settings is one row in
          it. Signed out it's the same trigger, and an anonymous visitor lands on
          the resolved disc directly rather than transiting the skeleton. */}
      <button
        ref={menuTriggerRef}
        type="button"
        onClick={() => toggleFrom(menuTriggerRef.current)}
        aria-label={
          !isSignedIn
            ? MENU_LABELS.accountMenuSignedOut
            : announcesUnread
              ? MENU_LABELS.accountMenuUnread(unreadCount)
              : MENU_LABELS.accountMenu
        }
        aria-haspopup="dialog"
        aria-expanded={menuOpen}
        aria-busy={isSignedIn && !profileLoaded ? true : undefined}
        data-avatar-state={isSignedIn && !profileLoaded ? 'loading' : 'ready'}
        className="flex cursor-pointer flex-col items-center justify-center gap-[3px]"
        style={{
          width: 56,
          minHeight: 44,
          color:
            isSignedIn && isMeActive ? 'var(--signal)' : 'var(--fg-subtle)',
        }}
      >
        {/* The pip rides the glyph in EVERY branch — skeleton included. An
            avatar that is still loading is not a reason to swallow the one
            signal that says something happened. */}
        <span style={{ position: 'relative', display: 'inline-flex' }}>
          {!isSignedIn ? (
            <AnonDisc size={26} />
          ) : !profileLoaded ? (
            <MeAvatarSkeleton />
          ) : avatarHandle !== null ? (
            <MeAvatar handle={avatarHandle} avatarColor={avatarColor} />
          ) : (
            <MeAvatarPlaceholder />
          )}
          {piped && (
            <NotifPip
              ring="var(--bg-elevated)"
              style={{ position: 'absolute', top: -2, right: -4 }}
            />
          )}
        </span>
      </button>
    </nav>
  );
}
