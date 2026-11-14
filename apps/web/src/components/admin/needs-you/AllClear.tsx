'use client';

import Link from 'next/link';
import { Activity, Check } from 'lucide-react';
import type { AllClearFacts } from '@concert-crawl/types';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import { nextCrawlWhen } from './needs-you-rules';

const COPY = ADMIN_COPY.needsYou.allClear;

/**
 * `02/all-clear`: a green check in a tile, "All clear", what you handled today,
 * the facts card (last night's crawl, next crawl, snoozed venues) and the way
 * out to Health. The facts load after the card draws; a row whose number is
 * unknown (no nightly yet, nothing snoozed) is left out rather than made up.
 */
export const AllClear = ({
  handledToday,
  facts,
  now,
}: {
  handledToday: number;
  facts: AllClearFacts | null;
  now: Date;
}) => {
  const rows: [string, string][] = [];
  if (facts?.lastCrawl)
    rows.push([
      COPY.facts.lastCrawl,
      COPY.facts.lastCrawlValue(facts.lastCrawl.ok, facts.lastCrawl.total),
    ]);
  // No row where no daily crawl runs (outside production).
  const next =
    facts === null || facts.nextCrawlAt === null
      ? null
      : nextCrawlWhen(facts.nextCrawlAt, now);
  if (next) rows.push([COPY.facts.nextCrawl, next]);
  if (facts && facts.snoozedVenues > 0)
    rows.push([
      COPY.facts.snoozed,
      COPY.facts.snoozedValue(facts.snoozedVenues),
    ]);
  return (
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
          border:
            '1px solid color-mix(in srgb, var(--success) 40%, transparent)',
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
      {rows.length > 0 && (
        <dl
          data-testid="needs-you-facts"
          style={{
            margin: 0,
            width: '100%',
            maxWidth: 380,
            boxSizing: 'border-box',
            display: 'grid',
            gap: 6,
            padding: '12px 16px',
            borderRadius: 12,
            border: '1px solid var(--border)',
            background: 'var(--surface-1)',
            textAlign: 'left',
          }}
        >
          {rows.map(([label, value]) => (
            <div
              key={label}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: 16,
                fontSize: 14,
              }}
            >
              <dt style={{ color: 'var(--fg-muted)' }}>{label}</dt>
              <dd style={{ margin: 0, color: 'var(--fg)', textAlign: 'right' }}>
                {value}
              </dd>
            </div>
          ))}
        </dl>
      )}
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
};
