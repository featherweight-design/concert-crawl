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
