import { createHash } from 'node:crypto';

// Per-run collector of the pages a crawl fetched (admin redesign 1a). Metadata
// only: the body is hashed and measured, never kept. A run's fetchers record
// into it and insertCrawlRun flushes it beside the run row.

export type FetchMode = 'browser' | 'http' | 'api';

export interface FetchLogEntry {
  url: string;
  finalUrl: string | null;
  httpStatus: number | null;
  fetchMode: FetchMode;
  bytes: number | null;
  contentHash: string | null;
  fetchedAt: Date;
}

/** A run keeps its first this-many pages, plus its failed requests. */
export const MAX_FETCH_LOG_ENTRIES = 50;

/**
 * Failed requests are kept past the page cap, since they explain a run, but
 * only up to this many: a crawl that hits hundreds of 404s or timeouts must not
 * grow the log, and the one insert that flushes it, without bound.
 */
export const MAX_FETCH_LOG_FAILURES = 200;

export interface FetchRecord {
  url: string;
  finalUrl?: string;
  httpStatus?: number;
  mode: FetchMode;
  /** The body as read. Omit when the request failed before one was read. */
  body?: string;
}

export class FetchLog {
  private readonly items: FetchLogEntry[] = [];
  private failures = 0;

  record(page: FetchRecord): void {
    // The page cap bounds the successful pages. A failed request is kept past
    // it, since it is the page that explains the run (a run that fails late
    // would otherwise show 50 healthy pages and no cause), up to its own cap.
    const failed = page.httpStatus === undefined || page.httpStatus >= 400;
    if (failed) {
      if (this.failures >= MAX_FETCH_LOG_FAILURES) return;
      this.failures += 1;
    } else if (this.items.length - this.failures >= MAX_FETCH_LOG_ENTRIES) {
      return;
    }
    this.items.push({
      url: page.url,
      finalUrl: page.finalUrl ?? null,
      httpStatus: page.httpStatus ?? null,
      fetchMode: page.mode,
      bytes: page.body === undefined ? null : Buffer.byteLength(page.body),
      contentHash:
        page.body === undefined
          ? null
          : createHash('sha256').update(page.body).digest('hex'),
      fetchedAt: new Date(),
    });
  }

  get entries(): readonly FetchLogEntry[] {
    return this.items;
  }
}
