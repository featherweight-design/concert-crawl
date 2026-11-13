import type { AuditLogItem } from '@concert-crawl/types';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';

const copy = ADMIN_COPY.health.doneForYou;

export type DoneKind =
  'price' | 'pause' | 'block' | 'merge' | 'cancel' | 'match';

export interface DoneRow {
  key: string;
  kind: DoneKind;
  text: string;
  /** The newest instant behind the row, ISO. */
  at: string;
}

/** The audit read's page size (the API's maximum). A full page may be cut short. */
export const DONE_AUDIT_LIMIT = 100;

/** The boards draw four rows; a longer night still reads at a glance. */
export const DONE_ROW_LIMIT = 6;

const text = (value: unknown): string | null =>
  typeof value === 'string' && value.trim() !== '' ? value.trim() : null;

const whole = (value: unknown): number | null =>
  typeof value === 'number' && Number.isInteger(value) && value > 0
    ? value
    : null;

// Actions that write one audit row per record, which read as one line each
// night ("Marked 14 shows cancelled"), not 14.
const GROUPED: Record<
  string,
  { kind: DoneKind; line: (count: number, atLeast: boolean) => string }
> = {
  'price.promoted': { kind: 'price', line: copy.published },
  'event.auto_cancel.stale': { kind: 'cancel', line: copy.cancelled },
  'artist.match.auto': { kind: 'match', line: copy.matched },
};

/**
 * What the system did, as Done for you reads it: the `system:*` audit rows,
 * newest first. Per-record actions collapse into one counted line; per-venue
 * actions keep their own. An action this list does not know is left out rather
 * than described by guesswork: a new system action shows here once it is named.
 * Rows come newest first, as `GET /v1/admin/audit-log` returns them.
 */
export const doneForYouRows = (
  items: readonly AuditLogItem[],
  /** The read was a full page, so a counted line may be short of the truth. */
  truncated = false,
): DoneRow[] => {
  const rows: DoneRow[] = [];
  const groups = new Map<string, { count: number; row: DoneRow }>();

  for (const item of items) {
    if (item.actorKind !== 'system') continue;
    const grouped = GROUPED[item.action];
    if (grouped) {
      const seen = groups.get(item.action);
      if (seen) {
        seen.count += 1;
      } else {
        const row: DoneRow = {
          key: item.id,
          kind: grouped.kind,
          text: '',
          at: item.createdAt,
        };
        groups.set(item.action, { count: 1, row });
        rows.push(row);
      }
      continue;
    }
    const venue = text(item.metadata?.venueName);
    if (venue === null) continue;
    if (item.action === 'venue.crawl_auto_paused') {
      const failures = whole(item.metadata?.consecutiveFailures) ?? 3;
      rows.push({
        key: item.id,
        kind: 'pause',
        text: copy.paused(venue, failures),
        at: item.createdAt,
      });
    } else if (item.action === 'venue.crawl_blocked') {
      rows.push({
        key: item.id,
        kind: 'block',
        text: copy.blocked(venue),
        at: item.createdAt,
      });
    } else if (item.action === 'event.drift_duplicates_merged') {
      const merged = whole(item.metadata?.merged);
      if (merged === null) continue;
      rows.push({
        key: item.id,
        kind: 'merge',
        text: copy.merged(venue, merged),
        at: item.createdAt,
      });
    }
  }

  for (const [action, { count, row }] of groups) {
    const grouped = GROUPED[action];
    if (grouped) row.text = grouped.line(count, truncated);
  }
  return rows.slice(0, DONE_ROW_LIMIT);
};
