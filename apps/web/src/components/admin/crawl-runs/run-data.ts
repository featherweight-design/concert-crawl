import { z } from 'zod';
import {
  RUN_REASONS,
  RUN_STATUSES,
  parseRows,
} from '@/components/admin/venues/overview/overview-data';

/**
 * The boundary checks on a venue's runs and a run's pages, keeping only the
 * fields the list and the run detail read. A body that isn't a list is null
 * (Couldn't load); a row this build can't read is dropped on its own.
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

/** `GET /v1/admin/crawl/runs/:id`: one run, with the venue it belongs to. */
const inspectRunSchema = runRowSchema.extend({ venueId: z.string() });
export type InspectRun = z.infer<typeof inspectRunSchema>;

/** One run, or null when the body isn't one. */
export const parseRun = (raw: unknown): InspectRun | null => {
  const parsed = inspectRunSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
};

/** `GET /v1/admin/crawl/runs/:id/pages`, oldest first: what the run detail reads. */
const runPageSchema = z.object({
  id: z.string(),
  url: z.string(),
  finalUrl: z.string().nullable(),
  httpStatus: z.number().nullable(),
  bytes: z.number().nullable(),
  // 'browser' | 'http' | 'api'. Kept as a string so a new mode never drops
  // the row; Inspect only asks whether it is 'api' (a feed).
  fetchMode: z.string().optional(),
});
export type RunPage = z.infer<typeof runPageSchema>;

export const parseRunPages = parseRows(runPageSchema);

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
