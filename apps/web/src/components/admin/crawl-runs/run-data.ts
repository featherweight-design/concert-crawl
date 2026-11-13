import { z } from 'zod';
import {
  RUN_REASONS,
  RUN_STATUSES,
  parseRows,
} from '@/components/admin/venues/overview/overview-data';

/**
 * The boundary check on a venue's runs, keeping only the fields the list
 * reads. A body that isn't a list is null (Couldn't load); a row this build
 * can't read is dropped on its own.
 */

/** `GET /v1/admin/crawl/runs?venueId=&limit=`, newest first. */
const runRowSchema = z.object({
  id: z.string(),
  status: z.enum(RUN_STATUSES),
  // A reason this build doesn't know yet reads as none, not a lost row.
  reason: z.enum(RUN_REASONS).nullable().catch(null),
  eventsFound: z.number(),
  eventsInserted: z.number(),
  durationMs: z.number().nullable(),
  llmCostUsd: z.number().nullable().optional(),
  errorMessage: z.string().nullable(),
  createdAt: z.string(),
});
export type RunRow = z.infer<typeof runRowSchema>;

export const parseRunRows = parseRows(runRowSchema);

/**
 * A page of runs: the rows this build can read, and how many the API sent.
 * Load more decides on `returned`, so dropped rows never hide it.
 */
export interface RunsPage {
  rows: RunRow[];
  returned: number;
}

export const parseRunsPage = (raw: unknown): RunsPage | null => {
  const rows = parseRunRows(raw);
  if (rows === null) return null;
  return { rows, returned: Array.isArray(raw) ? raw.length : rows.length };
};
