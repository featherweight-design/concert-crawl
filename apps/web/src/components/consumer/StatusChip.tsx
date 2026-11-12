import { RowMetaChip, type ChipTone } from './event-row/RowMetaChip';

/** Every show status B+ draws a chip for (`04-genre-and-vibe/bp-chips-all`). */
export type ShowStatusChip =
  'soldout' | 'postponed' | 'cancelled' | 'available' | 'removed';

// B+ rule 3: one fixed color per status, so a status chip never borrows a
// genre's color and never reads as one.
const STATUS_TONE: Record<ShowStatusChip, ChipTone> = {
  soldout: 'accent',
  postponed: 'warn',
  cancelled: 'danger',
  available: 'success',
  removed: 'neutral',
};

// The token behind each tone, for the places a status colors something other
// than its chip (a carded row's left edge and wash). Read through
// `statusColor` so the chip and the edge can never disagree.
const TONE_TOKEN: Record<ChipTone, string> = {
  neutral: 'var(--border-strong)',
  strong: 'var(--border-strong)',
  warn: 'var(--warning)',
  signal: 'var(--signal)',
  accent: 'var(--accent)',
  danger: 'var(--danger)',
  success: 'var(--success)',
};

/** The rule 3 color for a status, as a CSS value. */
export const statusColor = (status: ShowStatusChip): string =>
  TONE_TOKEN[STATUS_TONE[status]];

interface StatusChipProps {
  status: ShowStatusChip;
  label: string;
  srLabel?: string | undefined;
  /** Still waiting on confirms: dashed until it is confirmed. */
  pending?: boolean | undefined;
}

/**
 * A show status as a chip: solid once confirmed, dashed while pending. No
 * longer listed is always dashed, since nothing will ever confirm it.
 */
export const StatusChip = ({
  status,
  label,
  srLabel,
  pending,
}: StatusChipProps) => (
  <RowMetaChip
    label={label}
    srLabel={srLabel}
    tone={STATUS_TONE[status]}
    dashed={pending || status === 'removed'}
  />
);
