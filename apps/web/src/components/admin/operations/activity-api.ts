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
  isText(value['createdAt']);

/**
 * Every row of the day, newest first: the cursor walked at the largest page
 * until it runs out or reaches the cap. At the cap the first rows are kept and
 * the cut is logged, since the page has nowhere to say it.
 */
export const readLogDay = async (
  getToken: GetToken,
  query: LogQuery,
): Promise<AuditLogItem[]> => {
  const rows: AuditLogItem[] = [];
  let cursor: string | null = null;
  do {
    const params = new URLSearchParams({
      since: new Date(query.since).toISOString(),
      until: new Date(query.until).toISOString(),
      limit: String(LOG_PAGE_SIZE),
    });
    if (query.actorHandle) params.set('actorHandle', query.actorHandle);
    if (query.area) params.set('area', query.area);
    if (cursor) params.set('cursor', cursor);
    const body = await callEnvelope(getToken, `/v1/admin/audit-log?${params}`);
    const data = body['data'];
    const next = body['nextCursor'];
    if (!Array.isArray(data) || !data.every(isItem) || !isTextOrNull(next))
      throw new Error('audit-log');
    rows.push(...data);
    cursor = next;
  } while (cursor !== null && rows.length < LOG_ROW_CAP);
  if (cursor !== null) {
    console.warn(
      `[admin] Activity log: the day passed ${LOG_ROW_CAP} rows; showing the first ${LOG_ROW_CAP}.`,
    );
  }
  return rows.slice(0, LOG_ROW_CAP);
};
