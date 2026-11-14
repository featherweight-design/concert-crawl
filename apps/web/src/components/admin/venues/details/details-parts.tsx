'use client';

/** The Details tab's building blocks: a labelled field, a two-up row, and the Look and Other cards. */

import type { CSSProperties, ReactNode } from 'react';
import { MapPin } from 'lucide-react';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import { AdminButton, AdminCard as Card } from '@/components/admin/primitives';
import { VenueTile, venueGlyphKey } from '@/components/consumer/venue-glyph';
import { VENUE_HERO_SETTINGS } from '@/components/consumer/venue-glyph/definitions/venue-settings';
import { IdentityArt } from '@/components/consumer/identity-art/IdentityArt';
import { errorStyle, fieldLabel, hintStyle } from '../source/source-parts';
import { capacityTypeLabel } from './details-rules';

const COPY = ADMIN_COPY.venueDetails;

/** A label over its input, then the input's error, else its hint. */
export const Field = ({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  hint?: string | undefined;
  error?: string | undefined;
  children: ReactNode;
}) => (
  <div style={{ minWidth: 0 }}>
    <label htmlFor={id} style={fieldLabel}>
      {label}
    </label>
    {children}
    {error !== undefined ? (
      <div role="alert" style={errorStyle}>
        {error}
      </div>
    ) : (
      hint !== undefined && <div style={hintStyle}>{hint}</div>
    )}
  </div>
);

/** Two fields side by side on desktop (`details-d`), stacked on phone (`details-m`). */
export const Pair = ({
  phone,
  children,
}: {
  phone: boolean;
  children: ReactNode;
}) =>
  phone ? (
    <>{children}</>
  ) : (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
        gap: 10,
        alignItems: 'start',
      }}
    >
      {children}
    </div>
  );

/** The board's small secondary button (`details-d`'s About draft button). */
export const smallButton: CSSProperties = {
  height: 30,
  borderRadius: 9,
  fontSize: 12.5,
  fontWeight: 600,
  background: 'var(--surface-2)',
};

const THUMB = 56;
/** A Look row's 56px thumb box: every thumb shares its size and corners. */
const thumbBox: CSSProperties = {
  width: THUMB,
  height: THUMB,
  flex: 'none',
  borderRadius: 12,
};
/** A thumb with nothing to show yet: a dashed outline. */
const emptyThumb: CSSProperties = {
  ...thumbBox,
  border: '1px dashed var(--border-strong)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

/** One Look row: a 56px thumb, a title over a line, and an action. */
const LookRow = ({
  thumb,
  title,
  line,
  action,
  testId,
}: {
  thumb: ReactNode;
  title: string;
  line: string | null;
  action?: ReactNode;
  testId: string;
}) => (
  <div
    data-testid={testId}
    style={{ display: 'flex', gap: 14, alignItems: 'center' }}
  >
    {thumb}
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 13.5, fontWeight: 600 }}>{title}</div>
      {line !== null && (
        <div style={{ fontSize: 12, color: 'var(--fg-muted)', marginTop: 2 }}>
          {line}
        </div>
      )}
    </div>
    {action}
  </div>
);

const rule = <div style={{ height: 1, background: 'var(--border)' }} />;

/**
 * The Look card (`details-d`, `details-no-icon`): the venue's icon and hero
 * setting as the site draws them today. Both come from code, keyed by slug,
 * until 3c adds their columns; Change, Draw one and Pick one are held (3c, 3e).
 * `details-m` draws it at 16/18 on phone too, so it never takes phone padding.
 */
export const LookCard = ({ slug, name }: { slug: string; name: string }) => {
  const glyph = venueGlyphKey(slug);
  const hero = glyph === null ? null : VENUE_HERO_SETTINGS[glyph];
  return (
    <Card title={COPY.cards.look} phone={false} testId="details-look">
      <LookRow
        testId="details-look-icon"
        thumb={
          glyph === null ? (
            <div style={emptyThumb}>
              <MapPin
                size={22}
                strokeWidth={1.6}
                color="var(--fg-subtle)"
                aria-hidden
              />
            </div>
          ) : (
            <VenueTile slug={slug} name={name} size={THUMB} />
          )
        }
        title={COPY.look.icon}
        line={glyph === null ? COPY.look.iconNone : null}
      />
      {rule}
      <LookRow
        testId="details-look-hero"
        thumb={
          hero === null ? (
            <div style={emptyThumb} />
          ) : (
            <div
              aria-hidden
              style={{
                ...thumbBox,
                border: '1px solid var(--border)',
                background: 'linear-gradient(180deg, var(--border), var(--bg))',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'flex-end',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 16,
                  borderRadius: '4px 4px 0 0',
                  background:
                    'color-mix(in srgb, var(--signal) 35%, transparent)',
                }}
              />
            </div>
          )
        }
        title={COPY.look.hero}
        line={hero === null ? COPY.look.heroNone : capacityTypeLabel(hero)}
      />
    </Card>
  );
};

/**
 * The Other card (ruling g): City, and the fallback art's seed. The seed is
 * a preview: nothing stores it yet. The tab holds the seed, so a roll
 * survives the card remounting across the phone breakpoint.
 */
export const OtherCard = ({
  name,
  seed,
  onRoll,
  children,
}: {
  name: string;
  seed: number;
  onRoll: () => void;
  children: ReactNode;
}) => {
  const artName = seed === 0 ? name : `${name}·${seed}`;
  return (
    <Card title={COPY.cards.other} phone={false} testId="details-other">
      {children}
      {rule}
      <LookRow
        testId="details-fallback-art"
        thumb={
          <div
            style={{
              ...thumbBox,
              border: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
            }}
          >
            <IdentityArt
              name={artName}
              kind="venue"
              scale="tile"
              grain={0.08}
              width={THUMB}
              height={THUMB}
            />
          </div>
        }
        title={COPY.fallbackArt.label}
        line={COPY.fallbackArt.hint}
        action={
          <AdminButton
            type="button"
            variant="outline"
            onClick={onRoll}
            style={smallButton}
          >
            {COPY.fallbackArt.roll}
          </AdminButton>
        }
      />
    </Card>
  );
};
