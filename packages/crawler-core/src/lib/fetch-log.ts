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

/** A run keeps its first this-many pages, plus every failed request. */
export const MAX_FETCH_LOG_ENTRIES = 50;

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

  record(page: FetchRecord): void {
    // The cap bounds the successful pages. A failed request is always kept:
    // it is the page that explains the run, and a run that fails late would
    // otherwise show 50 healthy pages and no cause.
    const failed = page.httpStatus === undefined || page.httpStatus >= 400;
    if (!failed && this.items.length >= MAX_FETCH_LOG_ENTRIES) return;
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
