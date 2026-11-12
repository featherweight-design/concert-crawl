'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { isTabActive } from '@/lib/nav-tab-active';
import { useFeatureFlag } from '@/lib/queries/use-feature-flags';
import { CCMark } from '@/components/brand/cc-mark';
import { UserMenu } from '../user-menu';
import { useSearchPalette } from '../search-palette/search-palette-context';
import { AuthCtaPair } from './AuthCtaPair';
import { SignInRail } from './SignInRail';
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy';

const copy = CONSUMER_COPY.appHeader;

// The active tab's edge runs full-strength from the signal through the accent
// and tails off into the ordinary border colour (header-900, header-640).
const ACTIVE_TAB_STYLE = {
  background:
    'linear-gradient(var(--surface-2), var(--surface-2)) padding-box, linear-gradient(135deg, var(--signal), var(--accent) 50%, var(--border)) border-box',
} as const;

// The desktop bar is a translucent wash over the page glow, not a solid.
const DESKTOP_BAR_STYLE = {
  background: 'color-mix(in oklch, var(--bg-elevated) 60%, transparent)',
} as const;

interface AppHeaderProps {
  /**
   * Top-right chrome slot. Callers pass components that live to the left of
   * the search action on mobile and to the left of the user menu on desktop —
   * currently used for the PWA install slot (#969) and offline pill (#970).
   */
  rightSlots?: React.ReactNode;
}

export function AppHeader({ rightSlots }: AppHeaderProps = {}) {
  const pathname = usePathname();
  // The palette and its ⌘K listener live in the layout provider, so the
  // "find artists" row in the page body can open the same one.
  const palette = useSearchPalette();
  const { enabled: crewsEnabled } = useFeatureFlag('crews');
  const tabs = copy.nav.tabs.filter(
    // These entries carry no `key` field, unlike the bottom nav's, so the
    // href is the only stable discriminator.
    (tab) => crewsEnabled || tab.href !== '/crews',
  );

  return (
    <header className="w-full">
      {/* ── Mobile bar (hidden sm+) ─────────────────────── */}
      {/* No fill: the page glow shows through the phone header. */}
      <div
        data-testid="header-mobile"
        className="flex items-center justify-between px-4 pb-2.5 pt-4 sm:hidden"
      >
        <Link href="/events" className="flex shrink-0 items-center gap-2">
          <div
            data-testid="header-mark-tile"
            className="h-7 w-7 shrink-0 overflow-hidden rounded-[7px] border border-border-strong"
          >
            <CCMark size={26} />
          </div>
          <span
            className="text-[17px] font-extrabold tracking-[-0.02em] text-fg"
            style={{ fontFamily: 'var(--font-ui)' }}
          >
            {copy.brand.name}
            <span className="text-accent">{copy.brand.accent}</span>
          </span>
        </Link>
        <div className="flex min-w-0 items-center gap-2">
          {rightSlots}
          <AuthCtaPair />
          <button
            onClick={() => palette?.open()}
            aria-label={copy.search.ariaLabel}
            className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full border border-border-strong"
          >
            <Search size={16} className="text-fg-muted" strokeWidth={1.5} />
          </button>
        </div>
      </div>

      {/* Sign in drops out of the 320px header row and lands here */}
      <SignInRail />

      {/* ── Desktop TopNav (shown sm+) ──────────────────── */}
      <div
        data-testid="header-desktop"
        className="sticky top-0 z-40 hidden h-16 w-full items-center justify-between gap-3 border-b border-border px-4 sm:flex md:gap-5 md:px-6 lg:px-8"
        style={DESKTOP_BAR_STYLE}
      >
        {/* Left: logo + nav tabs */}
        <div className="flex min-w-0 items-center gap-3 md:gap-5 lg:gap-8">
          <Link href="/events" className="flex shrink-0 items-center gap-2.5">
            <div
              data-testid="header-mark-tile"
              // header-640 draws the bare mark; 900 and up add the 1px frame.
              className="h-8 w-8 shrink-0 overflow-hidden rounded-[7px] border border-transparent md:border-border"
            >
              <CCMark size={30} />
            </div>
            {/* 640-767 shows the mark alone (addendum-3 rule 1). */}
            <span
              data-testid="header-wordmark"
              className="hidden text-[17px] font-extrabold tracking-[-0.02em] text-fg md:inline"
              style={{ fontFamily: 'var(--font-ui)' }}
            >
              {copy.brand.name}
              <span className="text-accent">{copy.brand.accent}</span>
            </span>
          </Link>

          <nav className="flex min-w-0 gap-0.5 overflow-x-auto md:gap-1.5">
            {tabs.map((tab) => {
              const isActive = isTabActive(tab, pathname);
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  aria-current={isActive ? 'page' : undefined}
                  className={cn(
                    'shrink-0 whitespace-nowrap rounded-[10px] border border-transparent px-[10px] py-[8px] text-[14px] md:px-[14px] tracking-[-0.01em]',
                    // The boards draw every tab at 14px, weight 600.
                    isActive
                      ? 'font-semibold text-fg'
                      : 'bg-transparent font-semibold text-fg-muted transition-colors hover:bg-surface-1 hover:text-fg',
                  )}
                  // B+ draws the active tab as a bordered pill whose edge runs
                  // from the signal to the accent. Every tab carries the same
                  // transparent border so the row never shifts; the active tab
                  // only swaps its background to show the gradient through it.
                  style={isActive ? ACTIVE_TAB_STYLE : undefined}
                >
                  {tab.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right: search bar + user avatar */}
        <div className="flex shrink-0 items-center gap-3">
          {/* Addendum-3 header-640/900/1100 draw search first, then the
              Offline pill, then the avatar. On the phone bar the slots stay
              left of the search circle. */}
          <button
            onClick={() => palette?.open()}
            aria-label={copy.search.ariaLabel}
            data-testid="header-search-desktop"
            className="flex h-[38px] w-[38px] cursor-pointer items-center justify-center gap-2.5 rounded-[10px] border border-border bg-[color-mix(in_oklch,var(--bg-elevated)_70%,transparent)] px-3 text-fg-subtle lg:w-[280px] lg:justify-start"
          >
            <Search size={14} strokeWidth={1.5} className="shrink-0" />
            <span className="hidden flex-1 text-[13px] lg:block">
              {copy.search.placeholder}
            </span>
            <span
              className="hidden rounded border border-border-strong px-1.5 py-0.5 text-[10px] text-fg-subtle lg:block"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              {copy.search.keyboardShortcut}
            </span>
          </button>
          {rightSlots}

          {/* Not passed through rightSlots — that prop is the PWA slot host and
              the auth pair's position in the bar is fixed, not caller-chosen. */}
          <AuthCtaPair />
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
