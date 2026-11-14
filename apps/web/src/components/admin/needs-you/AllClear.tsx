'use client';

import Link from 'next/link';
import { Activity, Check } from 'lucide-react';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';

const COPY = ADMIN_COPY.needsYou.allClear;

/**
 * `02/all-clear`: a green check in a tile, "All clear", what you handled today
 * and the way out to Health. The board's crawl facts card (last night's crawl,
 * next crawl, snoozed venues) needs numbers the queue API does not serve; it
 * lands with that API in its own PR.
 */
export const AllClear = ({ handledToday }: { handledToday: number }) => (
  <div
    data-testid="needs-you-all-clear"
    style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 14,
      padding: '56px 16px',
      textAlign: 'center',
    }}
  >
    <span
      aria-hidden
      style={{
        width: 64,
        height: 64,
        borderRadius: 18,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--success)',
        background:
          'color-mix(in srgb, var(--success) 10%, var(--bg-elevated))',
        border: '1px solid color-mix(in srgb, var(--success) 40%, transparent)',
      }}
    >
      <Check size={30} />
    </span>
    <h2
      style={{
        margin: 0,
        fontSize: 22,
        fontWeight: 800,
        letterSpacing: '-0.02em',
        color: 'var(--fg)',
      }}
    >
      {COPY.title}
    </h2>
    <p
      style={{
        margin: 0,
        maxWidth: 280,
        fontSize: 14,
        lineHeight: 1.5,
        color: 'var(--fg-muted)',
      }}
    >
      {COPY.body(handledToday)}
    </p>
    <Link
      href="/admin"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        height: 36,
        padding: '0 14px',
        borderRadius: 9,
        border: '1px solid var(--border-strong)',
        background: 'var(--surface-2)',
        color: 'var(--fg)',
        fontWeight: 600,
        fontSize: 13,
        textDecoration: 'none',
      }}
    >
      <Activity size={15} aria-hidden />
      {COPY.openHealth}
    </Link>
  </div>
);
