import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';

// Per-run collector of the pages a crawl fetched (admin redesign 1a, 1e). Each
// body is hashed and measured; with CRAWL_PAGE_BODIES=on a successful page's
// body is also kept gzipped for the retention window, so an admin can inspect
// what the crawler saw. A run's fetchers record into it and insertCrawlRun
// flushes it beside the run row.

export type FetchMode = 'browser' | 'http' | 'api';

export interface FetchLogEntry {
  url: string;
  finalUrl: string | null;
  httpStatus: number | null;
  fetchMode: FetchMode;
  bytes: number | null;
  contentHash: string | null;
  fetchedAt: Date;
  /** The gzipped body, only while body storage is on. */
  htmlGz: Buffer | null;
  /** When the sweep may drop the body: fetchedAt plus the retention window. */
  bodyExpiresAt: Date | null;
  /** The body was over the size cap and was not kept. */
  bodyTruncated: boolean;
}

/** How long a stored body is kept before the daily sweep nulls it. */
export const PAGE_BODY_RETENTION_DAYS = 14;

/** A body over this many bytes (uncompressed) is not stored. */
export const MAX_PAGE_BODY_BYTES = 2 * 1024 * 1024;

/** Body storage is off unless the crawler is started with CRAWL_PAGE_BODIES=on. */
export const pageBodiesEnabled = (): boolean =>
  process.env['CRAWL_PAGE_BODIES'] === 'on';

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
  private readonly keepBodies: boolean;

  constructor(options: { keepBodies?: boolean } = {}) {
    this.keepBodies = options.keepBodies ?? pageBodiesEnabled();
  }

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
    const fetchedAt = new Date();
    const bytes = page.body === undefined ? null : Buffer.byteLength(page.body);
    // Only a page that answered keeps a body (a failure page's body is an
    // error page, not what the venue publishes), and only up to the size cap.
    const keptBody = this.keepBodies && !failed ? page.body : undefined;
    const tooBig =
      keptBody !== undefined &&
      Buffer.byteLength(keptBody) > MAX_PAGE_BODY_BYTES;
    const htmlGz =
      keptBody !== undefined && !tooBig ? gzipSync(keptBody) : null;
    this.items.push({
      url: page.url,
      finalUrl: page.finalUrl ?? null,
      httpStatus: page.httpStatus ?? null,
      fetchMode: page.mode,
      bytes,
      contentHash:
        page.body === undefined
          ? null
          : createHash('sha256').update(page.body).digest('hex'),
      fetchedAt,
      htmlGz,
      bodyExpiresAt:
        htmlGz !== null
          ? new Date(
              fetchedAt.getTime() +
                PAGE_BODY_RETENTION_DAYS * 24 * 60 * 60 * 1000,
            )
          : null,
      bodyTruncated: tooBig,
    });
  }

  get entries(): readonly FetchLogEntry[] {
    return this.items;
  }
}
