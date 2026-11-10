import { eq, sql, type SQL } from 'drizzle-orm';
import { artists } from '@concert-crawl/db';

// The auto-matched bucket, defined once so the admin list, its counts and the
// per-row flag cannot drift (the same reason artist-exhaustion.ts exists). A
// best-effort pick (artists.auto_matched_at) is listed under Auto-matched until
// a human answers it, and Matched lists only confirmed matches.

export const isAutoMatchedExpr = (): SQL<boolean> =>
  sql`${eq(artists.matchStatus, 'matched')} and ${artists.autoMatchedAt} is not null`;

export const isConfirmedMatchExpr = (): SQL<boolean> =>
  sql`${eq(artists.matchStatus, 'matched')} and ${artists.autoMatchedAt} is null`;
