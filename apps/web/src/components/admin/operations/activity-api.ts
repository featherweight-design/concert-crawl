/**
 * The Activity log's reads (`GET /v1/admin/audit-log`, `/days`, `/actors`), from
 * the browser with the Clerk token, through the invite-codes admin's
 * `callEnvelope`. Each row is checked with a guard, so a shape drift fails
 * into Couldn't load.
 */
import {
  AUDIT_AREAS,
  AVATAR_COLORS,
  type AuditArea,
  type AuditLogActor,
  type AuditLogItem,
  type AuditTarget,
  type AvatarColor,
} from '@concert-crawl/types';
import {
  callEnvelope,
  isRecord,
  isText,
  isTextOrNull,
  type GetToken,
} from '../invite-codes/codes-api';
import { actionsMatching, SEARCH_MAX_LENGTH } from './log-search';

/** One page of a day: past it, Load more (README §37: past 50 changes). */
export const LOG_PAGE_SIZE = 50;

export interface LogQuery {
  /** The day, as UTC instants: `since` inclusive, `until` exclusive. */
  since: number;
  until: number;
  actorHandle?: string;
  area?: AuditArea;
  /** "Search the log", trimmed; left out when blank. */
  search?: string;
}

/** The filters every read takes: person, page and search. */
export type LogFilters = Pick<LogQuery, 'actorHandle' | 'area' | 'search'>;

/**
 * Sets the person, page and search on a read's params. A search also sends
 * the action keys whose sentences hold its words, which only the web has.
 */
const setFilters = (params: URLSearchParams, filters: LogFilters) => {
  if (filters.actorHandle) params.set('actorHandle', filters.actorHandle);
  if (filters.area) params.set('area', filters.area);
  const search = filters.search?.trim().slice(0, SEARCH_MAX_LENGTH);
  if (search) {
    params.set('search', search);
    const actions = actionsMatching(search);
    if (actions.length > 0) params.set('actions', actions.join(','));
  }
};

const isArea = (value: unknown): value is AuditArea =>
  AUDIT_AREAS.some((area) => area === value);

const isTarget = (value: unknown): value is AuditTarget =>
  isRecord(value) &&
  isText(value['kind']) &&
  isTextOrNull(value['name']) &&
  isTextOrNull(value['href']);

const isColorOrNull = (value: unknown): value is AvatarColor | null =>
  value === null || AVATAR_COLORS.some((color) => color === value);

const isActorAvatar = (value: unknown): value is AuditLogItem['actorAvatar'] =>
  value === null ||
  (isRecord(value) &&
    isColorOrNull(value['avatarColor']) &&
    isColorOrNull(value['avatarSecondColor']));

const isItem = (value: unknown): value is AuditLogItem =>
  isRecord(value) &&
  isText(value['id']) &&
  isText(value['actor']) &&
  (value['actorKind'] === 'system' || value['actorKind'] === 'admin') &&
  isActorAvatar(value['actorAvatar']) &&
  isText(value['action']) &&
  (value['area'] === null || isArea(value['area'])) &&
  isTextOrNull(value['targetId']) &&
  (value['target'] === null || isTarget(value['target'])) &&
  (value['metadata'] === null || isRecord(value['metadata'])) &&
  isText(value['createdAt']) &&
  !Number.isNaN(Date.parse(value['createdAt']));

export interface LogPage {
  /** Newest first, at most `LOG_PAGE_SIZE`. */
  rows: AuditLogItem[];
  /** Where Load more reads from; null at the end of the day. */
  nextCursor: string | null;
}

/**
 * One page of the day, newest first, from `cursor` (null for the first).
 * `signal` stops the read (an unmount, or a newer day); that throws an
 * `AbortError`.
 */
export const readLogPage = async (
  getToken: GetToken,
  query: LogQuery,
  cursor: string | null,
  signal?: AbortSignal,
): Promise<LogPage> => {
  const params = new URLSearchParams({
    since: new Date(query.since).toISOString(),
    until: new Date(query.until).toISOString(),
    limit: String(LOG_PAGE_SIZE),
  });
  setFilters(params, query);
  if (cursor) params.set('cursor', cursor);
  const body = await callEnvelope(
    getToken,
    `/v1/admin/audit-log?${params}`,
    signal ? { signal } : {},
  );
  const data = body['data'];
  const next = body['nextCursor'];
  if (!Array.isArray(data) || !data.every(isItem) || !isTextOrNull(next))
    throw new Error('audit-log');
  // An empty page ends the day even with a cursor: it would loop forever.
  return { rows: data, nextCursor: data.length === 0 ? null : next };
};

const DAY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * The Mountain Time days in `month` (`YYYY-MM`) with any change, for the
 * picker's dots. Takes the log's own filters, so a dot never leads to an
 * empty day.
 */
export const readLogDays = async (
  getToken: GetToken,
  month: string,
  filters: LogFilters,
  signal?: AbortSignal,
): Promise<Set<string>> => {
  const params = new URLSearchParams({ month });
  setFilters(params, filters);
  const body = await callEnvelope(
    getToken,
    `/v1/admin/audit-log/days?${params}`,
    signal ? { signal } : {},
  );
  const data = body['data'];
  if (
    !Array.isArray(data) ||
    !data.every((day) => typeof day === 'string' && DAY.test(day))
  )
    throw new Error('audit-log-days');
  return new Set(data);
};

const isActor = (value: unknown): value is AuditLogActor =>
  isRecord(value) &&
  isText(value['handle']) &&
  isColorOrNull(value['avatarColor']) &&
  isColorOrNull(value['avatarSecondColor']) &&
  typeof value['count'] === 'number' &&
  typeof value['you'] === 'boolean' &&
  (value['role'] === 'admin' ||
    value['role'] === 'sub_admin' ||
    value['role'] === null);

/**
 * The Anyone menu's people (`37/log-filter-menus`): every admin and
 * sub-admin, with their changes on `day`, you first. Takes the page filter
 * and the search, so a count matches the rows that pick would show.
 */
export const readLogActors = async (
  getToken: GetToken,
  day: string,
  filters: Omit<LogFilters, 'actorHandle'>,
  signal?: AbortSignal,
): Promise<AuditLogActor[]> => {
  const params = new URLSearchParams({ day });
  setFilters(params, filters);
  const body = await callEnvelope(
    getToken,
    `/v1/admin/audit-log/actors?${params}`,
    signal ? { signal } : {},
  );
  const data = body['data'];
  if (!Array.isArray(data) || !data.every(isActor))
    throw new Error('audit-log-actors');
  return data;
};
