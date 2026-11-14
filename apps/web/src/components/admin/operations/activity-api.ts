/**
 * The Activity log's read (`GET /v1/admin/audit-log`), from the browser with
 * the Clerk token, through the invite-codes admin's `callEnvelope`. Each row
 * is checked with a guard, so a shape drift fails into Couldn't load.
 */
import {
  AUDIT_AREAS,
  type AuditArea,
  type AuditLogItem,
  type AuditTarget,
} from '@concert-crawl/types';
import {
  callEnvelope,
  isRecord,
  isText,
  isTextOrNull,
  type GetToken,
} from '../invite-codes/codes-api';

/** The API's largest page. */
export const LOG_PAGE_SIZE = 100;
/** The most rows one day's read walks to (Design item 37: no Load more). */
export const LOG_ROW_CAP = 1000;

export interface LogQuery {
  /** The day, as UTC instants: `since` inclusive, `until` exclusive. */
  since: number;
  until: number;
  actorHandle?: string;
  area?: AuditArea;
}

const isArea = (value: unknown): value is AuditArea =>
  AUDIT_AREAS.some((area) => area === value);

const isTarget = (value: unknown): value is AuditTarget =>
  isRecord(value) &&
  isText(value['kind']) &&
  isTextOrNull(value['name']) &&
  isTextOrNull(value['href']);

const isItem = (value: unknown): value is AuditLogItem =>
  isRecord(value) &&
  isText(value['id']) &&
  isText(value['actor']) &&
  (value['actorKind'] === 'system' || value['actorKind'] === 'admin') &&
  isText(value['action']) &&
  (value['area'] === null || isArea(value['area'])) &&
  isTextOrNull(value['targetId']) &&
  (value['target'] === null || isTarget(value['target'])) &&
  (value['metadata'] === null || isRecord(value['metadata'])) &&
  isText(value['createdAt']) &&
  !Number.isNaN(Date.parse(value['createdAt']));

/** The most pages one walk asks for: the cap, at the largest page. */
const LOG_PAGE_CAP = LOG_ROW_CAP / LOG_PAGE_SIZE;

export interface LogDay {
  /** Newest first, at most `LOG_ROW_CAP`. */
  rows: AuditLogItem[];
  /** The day had more rows than the walk read. */
  truncated: boolean;
}

/**
 * Every row of the day, newest first: the cursor walked at the largest page
 * until it runs out, a page comes back empty, or it reaches the cap (in rows
 * or pages). At the cap the first rows are kept, the cut is logged and
 * `truncated` is set so the page can say so. A failed page throws, so the
 * rows read before it are dropped: the log is all or nothing for a day, on
 * purpose, rather than a partial day that looks whole. `signal` stops the
 * walk mid-page (an unmount); that throws an `AbortError`.
 */
export const readLogDay = async (
  getToken: GetToken,
  query: LogQuery,
  signal?: AbortSignal,
): Promise<LogDay> => {
  const rows: AuditLogItem[] = [];
  let cursor: string | null = null;
  let pages = 0;
  do {
    const params = new URLSearchParams({
      since: new Date(query.since).toISOString(),
      until: new Date(query.until).toISOString(),
      limit: String(LOG_PAGE_SIZE),
    });
    if (query.actorHandle) params.set('actorHandle', query.actorHandle);
    if (query.area) params.set('area', query.area);
    if (cursor) params.set('cursor', cursor);
    const body = await callEnvelope(
      getToken,
      `/v1/admin/audit-log?${params}`,
      signal ? { signal } : {},
    );
    pages += 1;
    const data = body['data'];
    const next = body['nextCursor'];
    if (!Array.isArray(data) || !data.every(isItem) || !isTextOrNull(next))
      throw new Error('audit-log');
    rows.push(...data);
    // An empty page ends the walk even with a cursor: it would loop forever.
    cursor = data.length === 0 ? null : next;
  } while (
    cursor !== null &&
    rows.length < LOG_ROW_CAP &&
    pages < LOG_PAGE_CAP
  );
  const truncated = cursor !== null || rows.length > LOG_ROW_CAP;
  if (truncated) {
    console.warn(
      `[admin] Activity log: the day passed ${LOG_ROW_CAP} rows; showing the first ${LOG_ROW_CAP}.`,
    );
  }
  return { rows: rows.slice(0, LOG_ROW_CAP), truncated };
};
