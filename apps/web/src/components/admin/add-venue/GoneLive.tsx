'use client';

/**
 * Add a venue, after Go live (`05/gone-live`, `phone-addendum` gone-live). The
 * rail and footer are gone: the venue is live and the work is done. Under
 * decision 4 option A the first crawl is what puts shows on the site, so the
 * board's "N shows are on the site now" reads as that crawl.
 */

import type { CSSProperties } from 'react';
import Link from 'next/link';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import {
  AdminButton,
  adminButtonVariantStyle,
} from '@/components/admin/primitives';

const GONE = ADMIN_COPY.addVenue.gone;

const linkStyle = (
  variant: 'gradient' | 'outline',
  phone: boolean,
): CSSProperties => ({
  ...adminButtonVariantStyle(variant),
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  height: phone ? 46 : 38,
  padding: '0 18px',
  borderRadius: 9,
  fontSize: phone ? 15 : 13.5,
  fontWeight: 600,
  fontFamily: "'Inter', sans-serif",
  textDecoration: 'none',
  whiteSpace: 'nowrap',
});

export const GoneLive = ({
  phone,
  id,
  name,
  slug,
  crawlQueued,
  onAddAnother,
}: {
  phone: boolean;
  id: string;
  name: string;
  slug: string;
  crawlQueued: boolean | null;
  onAddAnother: () => void;
}) => (
  <div
    data-testid="add-venue-gone-live"
    style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 14,
      maxWidth: 560,
      margin: phone ? '0' : '48px auto',
      padding: phone ? '24px 0' : 0,
    }}
  >
    <h1 style={{ margin: 0, fontSize: phone ? 22 : 26, fontWeight: 800 }}>
      {GONE.title(name)}
    </h1>
    <p style={{ margin: 0, fontSize: 14, color: 'var(--fg-muted)' }}>
      {crawlQueued === null
        ? GONE.crawlUnknown
        : crawlQueued
          ? GONE.crawlQueued
          : GONE.crawlNotQueued}
    </p>
    <div
      style={{
        display: 'flex',
        flexDirection: phone ? 'column' : 'row',
        gap: 8,
      }}
    >
      <Link
        href={`/admin/venues/${id}`}
        data-testid="add-venue-open-venue"
        style={linkStyle('gradient', phone)}
      >
        {GONE.open}
      </Link>
      <Link
        href={`/v/${slug}`}
        data-testid="add-venue-see-as-fan"
        style={linkStyle('outline', phone)}
      >
        {GONE.fan}
      </Link>
      <AdminButton
        variant="ghost"
        onClick={onAddAnother}
        data-testid="add-venue-add-another"
      >
        {GONE.another}
      </AdminButton>
    </div>
    <p style={{ margin: 0, fontSize: 13, color: 'var(--fg-muted)' }}>
      {GONE.waiting}
    </p>
  </div>
);
