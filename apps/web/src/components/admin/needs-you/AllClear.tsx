'use client';

import Link from 'next/link';
import { Activity, Check } from 'lucide-react';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';

const COPY = ADMIN_COPY.needsYou.allClear;

/**
 * `02/all-clear`: a green check in a tile, "All clear", what you handled today
 * and the way out to Health. The board's crawl facts card (last night's crawl,
 * next crawl, snoozed venues) needs numbers the queue API does not serve, so it
 * is left to a later piece rather than made up here.
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
          'color-mix(in srgb, var(--success) 14%, var(--bg-elevated))',
        border: '1px solid color-mix(in srgb, var(--success) 45%, transparent)',
      }}
    >
      <Check size={30} />
    </span>
    <h2
      style={{ margin: 0, fontSize: 26, fontWeight: 800, color: 'var(--fg)' }}
    >
      {COPY.title}
    </h2>
    <p
      style={{
        margin: 0,
        maxWidth: 320,
        fontSize: 15,
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
        height: 38,
        padding: '0 16px',
        borderRadius: 12,
        border: '1px solid var(--border-strong)',
        background: 'var(--surface-1)',
        color: 'var(--fg)',
        fontWeight: 600,
        fontSize: 14,
        textDecoration: 'none',
      }}
    >
      <Activity size={15} aria-hidden />
      {COPY.openHealth}
    </Link>
  </div>
);
