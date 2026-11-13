'use client';

// The app chrome around the offline page (B+ `bp-s-offline_empty_m`): the
// header with the Offline pill, and the bottom nav.
//
// Drawn here rather than reusing AppHeader and BottomNav, on purpose: those
// pull in Clerk, React Query and the account-menu provider, and this page is
// the service worker's precached fallback, shown precisely when none of them
// can reach the network. So this is the same look with nothing live in it:
//
//  - the nav tabs are plain links (they hit the service worker's cache or this
//    fallback again), with Browse marked as the board draws it;
//  - the account slot is a neutral, non-interactive circle, there to keep the
//    board's five-slot rhythm (no initial: who is signed in needs Clerk);
//  - no search button: the palette searches over the network.

import Link from 'next/link';
import { CCMark } from '@/components/brand/cc-mark';
import { STATIC_TABS } from '@/components/consumer/bottom-nav/tabs';
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy';
import { OfflinePill } from './OfflinePill';

const NAV_COPY = CONSUMER_COPY.bottomNav.nav;
const BRAND = CONSUMER_COPY.appHeader.brand;

export const OfflineChrome = () => (
  <>
    <header
      data-testid="offline-header"
      className="flex h-14 items-center justify-between gap-3 px-4"
    >
      <Link href="/" className="flex shrink-0 items-center gap-2.5">
        <span
          aria-hidden
          className="h-8 w-8 shrink-0 overflow-hidden rounded-[7px]"
        >
          <CCMark size={32} />
        </span>
        <span
          className="text-[17px] font-extrabold tracking-[-0.02em] text-fg"
          style={{ fontFamily: 'var(--font-ui)' }}
        >
          {BRAND.name}
          <span className="text-accent">{BRAND.accent}</span>
        </span>
      </Link>
      <OfflinePill />
    </header>
    <nav
      data-testid="offline-nav"
      aria-label={NAV_COPY.ariaLabel}
      className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-around border-t border-border bg-bg-elevated sm:hidden"
      style={{
        height: 'calc(52px + env(safe-area-inset-bottom, 0px))',
        paddingBottom: 'env(safe-area-inset-bottom, 2px)',
      }}
    >
      {STATIC_TABS.map((tab, index) => {
        const active = index === 0;
        return (
          <Link
            key={tab.key}
            href={tab.href}
            aria-current={active ? 'page' : undefined}
            className="relative flex flex-col items-center justify-center gap-[3px]"
            style={{
              minWidth: 56,
              minHeight: 44,
              color: active ? 'var(--signal)' : 'var(--fg-subtle)',
            }}
          >
            {active && (
              <span
                aria-hidden="true"
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
                fontWeight: active ? 700 : 500,
              }}
            >
              {tab.label}
            </span>
          </Link>
        );
      })}
      <span
        aria-hidden="true"
        data-testid="offline-account-disc"
        className="flex items-center justify-center"
        style={{ width: 56, minHeight: 44 }}
      >
        <span
          style={{
            width: 28,
            height: 28,
            borderRadius: '50%',
            background: 'var(--surface-2)',
            border: '1.5px solid var(--border-strong)',
            boxSizing: 'border-box',
          }}
        />
      </span>
    </nav>
  </>
);
