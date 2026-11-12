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

/** A run that fetches more pages than this keeps the first ones. */
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
    if (this.items.length >= MAX_FETCH_LOG_ENTRIES) return;
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
