import type { CSSProperties, ReactNode } from 'react';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import { gradientBorder } from '@/components/admin/artists/artist-styles';
import type { MergeLineupItem, MergeListing } from './merge-api';
import {
  fromLabel,
  mergeDay,
  priceLabel,
  reportsLabel,
  type KeepSide,
} from './merge-rules';

const COPY = ADMIN_COPY.eventEdit.merge;

interface MergeCompareCardProps {
  listing: MergeListing;
  which: KeepSide;
  /** This card is the one kept: the other redirects to it. */
  kept: boolean;
  /** Tapping a card moves KEEP to it. */
  onKeep: () => void;
  /**
   * A3: the two listings differ in venue or day, so each card leads with its
   * own Venue and Day instead of sharing a header.
   */
  showVenueDay: boolean;
  /** The radio group's name, shared by both cards. */
  name: string;
  disabled?: boolean;
}

const CARD: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
  width: '100%',
  padding: 14,
  borderRadius: 12,
  textAlign: 'left',
  color: 'var(--fg)',
  font: 'inherit',
};

const KEEP_MARK: CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: 10,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: 'var(--signal)',
};

const LABEL: CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: 11,
  letterSpacing: '0.04em',
  textTransform: 'uppercase',
  color: 'var(--fg-muted)',
};

const ROW: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '84px 1fr',
  gap: 8,
  fontSize: 13,
  alignItems: 'baseline',
};

const CHIP: CSSProperties = {
  display: 'inline-block',
  padding: '2px 8px',
  borderRadius: 999,
  fontSize: 12,
  border: '1px solid var(--border-strong)',
};

/** Event edit's tint: cyan matched, amber unsure, none for a name with no artist. */
const chipStyle = (item: MergeLineupItem): CSSProperties => {
  if (item.artistId === null && !item.unsure) return CHIP;
  const tone = item.unsure ? 'var(--warning)' : 'var(--signal)';
  return {
    ...CHIP,
    color: tone,
    borderColor: `color-mix(in oklab, ${tone} 35%, transparent)`,
  };
};

const Row = ({ label, children }: { label: string; children: ReactNode }) => (
  <div style={ROW}>
    <dt style={LABEL}>{label}</dt>
    <dd style={{ margin: 0 }}>{children}</dd>
  </div>
);

/**
 * One listing in the compare step (`gap-1/merge-compare`): its title, then
 * Lineup, From, Watching, Price and Reports. A radio in a group the panel
 * owns: the kept card wears the gradient border and the KEEP mark.
 */
export function MergeCompareCard({
  listing,
  which,
  kept,
  onKeep,
  showVenueDay,
  name,
  disabled = false,
}: MergeCompareCardProps) {
  const heading = which === 'first' ? COPY.first : COPY.second;
  return (
    <label
      data-testid={`merge-card-${which}`}
      style={{
        ...CARD,
        ...(kept
          ? gradientBorder('var(--surface-2)')
          : {
              background: 'var(--surface)',
              border: '1px solid var(--border)',
            }),
        cursor: disabled ? 'default' : 'pointer',
      }}
    >
      <span
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: 8,
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* A real radio: arrow keys and one tab stop come with the group. */}
          <input
            type="radio"
            name={name}
            checked={kept}
            disabled={disabled}
            onChange={onKeep}
            style={{ accentColor: 'var(--signal)', margin: 0 }}
          />
          <span style={LABEL}>{heading}</span>
        </span>
        {kept && <span style={KEEP_MARK}>{COPY.keep}</span>}
      </span>
      <span style={{ fontSize: 15, fontWeight: 600 }}>{listing.title}</span>
      <dl style={{ margin: 0, display: 'grid', gap: 6 }}>
        {showVenueDay && (
          <>
            <Row label={COPY.rows.venue}>{listing.venueName ?? ''}</Row>
            <Row label={COPY.rows.day}>{mergeDay(listing.date)}</Row>
          </>
        )}
        <Row label={COPY.rows.lineup}>
          {listing.lineup.length === 0 ? (
            COPY.noLineup
          ) : (
            <span style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {listing.lineup.map((item) => (
                <span
                  key={`${item.position}-${item.name}`}
                  style={chipStyle(item)}
                >
                  {item.name}
                </span>
              ))}
            </span>
          )}
        </Row>
        <Row label={COPY.rows.from}>{fromLabel(listing)}</Row>
        <Row label={COPY.rows.watching}>{listing.watchers}</Row>
        <Row label={COPY.rows.price}>{priceLabel(listing.price)}</Row>
        <Row label={COPY.rows.reports}>{reportsLabel(listing.reports)}</Row>
      </dl>
    </label>
  );
}
