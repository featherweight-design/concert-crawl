import { RowMetaChip, toneColor, type ChipTone } from './event-row/RowMetaChip';

/**
 * Every show status B+ draws a chip for (`04-genre-and-vibe/bp-chips-all`),
 * plus the two admin's Events list adds (admin rule 3, 4b#8 and 4b#21):
 * Played, for a past show that went ahead, and the Hidden chip that sits
 * beside a hidden show's status. Both are muted.
 */
export type ShowStatusChip =
  | 'soldout'
  | 'postponed'
  | 'cancelled'
  | 'available'
  | 'removed'
  | 'played'
  | 'hidden';

// B+ rule 3: one fixed color per status, so a status chip never borrows a
// genre's color and never reads as one.
const STATUS_TONE: Record<ShowStatusChip, ChipTone> = {
  soldout: 'accent',
  postponed: 'warn',
  cancelled: 'danger',
  available: 'success',
  removed: 'neutral',
  played: 'neutral',
  hidden: 'neutral',
};

/**
 * The rule 3 color for a status, as a CSS value, for the places a status
 * colors something other than its chip (a carded row's left edge and wash).
 * Read from the chip's own tone table, so the chip and the edge cannot
 * disagree.
 */
export const statusColor = (status: ShowStatusChip): string =>
  toneColor(STATUS_TONE[status]);

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
