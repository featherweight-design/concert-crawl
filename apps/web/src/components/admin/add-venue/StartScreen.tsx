'use client';

/**
 * Start (`05/add-a-venue-start`, `05/start-nobody-asked-yet`): where a new
 * venue begins. The list of venues people asked for is 3c-3's, held with
 * fork 1, so Start ships its empty state: Nobody asked yet, with Start from
 * scratch (plan, 3e-1 row).
 */

import { MapPin } from 'lucide-react';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';

const COPY = ADMIN_COPY.addVenue;

const primaryStyle = (phone: boolean) => ({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  height: phone ? 44 : 36,
  width: phone ? '100%' : undefined,
  padding: '0 12px',
  borderRadius: 9,
  border: '1px solid transparent',
  background:
    'linear-gradient(135deg, var(--signal), var(--cta-end, var(--accent)))',
  color: 'var(--fg-on-accent)',
  fontFamily: 'inherit',
  fontSize: phone ? 14 : 13,
  fontWeight: 700,
  whiteSpace: 'nowrap' as const,
  cursor: 'pointer',
});

export const StartScreen = ({
  phone,
  onStart,
}: {
  phone: boolean;
  onStart: () => void;
}) => (
  <div
    data-testid="add-venue-start"
    style={{ display: 'flex', flexDirection: 'column', gap: phone ? 14 : 18 }}
  >
    <div>
      <h1
        style={{
          margin: 0,
          fontSize: phone ? 22 : 28,
          fontWeight: 800,
          letterSpacing: '-0.02em',
        }}
      >
        {COPY.title}
      </h1>
      <p
        style={{
          margin: '4px 0 0',
          fontSize: phone ? 12.5 : 13.5,
          color: 'var(--fg-muted)',
        }}
      >
        {COPY.start.subtitle}
      </p>
    </div>
    {phone && (
      <div
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 10.5,
          letterSpacing: '0.14em',
          fontWeight: 500,
          textTransform: 'uppercase',
          color: 'var(--fg-subtle)',
        }}
      >
        {COPY.start.askedForLabel}
      </div>
    )}
    <section
      data-testid="add-venue-nobody-asked"
      aria-labelledby="add-venue-nobody-asked-title"
      style={{
        maxWidth: phone ? undefined : 560,
        boxSizing: 'border-box',
        borderRadius: 14,
        border: '1px solid var(--border)',
        background: 'var(--surface-1)',
        padding: phone ? '20px 16px' : '22px 24px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: phone ? 'center' : 'flex-start',
        textAlign: phone ? 'center' : 'left',
        gap: 14,
      }}
    >
      {phone && (
        <div
          aria-hidden
          style={{
            width: 52,
            height: 52,
            borderRadius: 14,
            border: '1px solid var(--border)',
            background: 'var(--surface-2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <MapPin size={22} strokeWidth={1.6} color="var(--fg-muted)" />
        </div>
      )}
      <div>
        <h2
          id="add-venue-nobody-asked-title"
          style={{
            margin: 0,
            fontSize: phone ? 16 : 18,
            fontWeight: 800,
            letterSpacing: '-0.01em',
          }}
        >
          {COPY.start.emptyTitle}
        </h2>
        <p
          style={{
            margin: '4px 0 0',
            fontSize: 13,
            color: 'var(--fg-muted)',
            lineHeight: 1.45,
          }}
        >
          {COPY.start.emptyBody}
        </p>
      </div>
      <button
        type="button"
        onClick={onStart}
        data-testid="add-venue-from-scratch"
        style={primaryStyle(phone)}
      >
        {COPY.start.fromScratch}
      </button>
    </section>
  </div>
);
