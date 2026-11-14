import type { AuditArea, AuditLogItem } from '@concert-crawl/types';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import { DENVER_TIME_ZONE } from '@/lib/time';

const COPY = ADMIN_COPY.operations.log;
const NAV = ADMIN_COPY.shell.nav;

type Sentences = typeof COPY.sentences;
export type KnownAction = keyof Sentences;

const isKnown = (action: string): action is KnownAction =>
  Object.hasOwn(COPY.sentences, action);

/** Every action key the log has a sentence for. */
export const KNOWN_ACTIONS: KnownAction[] = Object.keys(COPY.sentences).filter(
  isKnown,
);

/** A row's sentence: the lead, then the bold target name, then the tail. */
export interface Sentence {
  lead: string;
  /** Null: the action names no target. */
  name: string | null;
  tail: string;
}

const text = (value: unknown): string | null =>
  typeof value === 'string' && value.trim() !== '' ? value.trim() : null;

const money = (value: unknown): string | null =>
  typeof value === 'number' && Number.isFinite(value)
    ? `$${value.toLocaleString('en-US')}`
    : null;

/** `2026-04-01` (or an instant) as "Apr 1", read in Mountain Time. */
const shortDay = (value: unknown): string | null => {
  const raw = text(value);
  if (raw === null) return null;
  const at = /^\d{4}-\d{2}-\d{2}$/.test(raw)
    ? Date.parse(`${raw}T12:00:00Z`)
    : Date.parse(raw);
  if (Number.isNaN(at)) return null;
  return new Intl.DateTimeFormat('en-US', {
    timeZone: /^\d{4}-\d{2}-\d{2}$/.test(raw) ? 'UTC' : DENVER_TIME_ZONE,
    month: 'short',
    day: 'numeric',
  }).format(new Date(at));
};

const priceRange = (meta: Record<string, unknown> | null): string | null => {
  const after = meta?.['after'];
  if (typeof after !== 'object' || after === null) return null;
  const low = money(Reflect.get(after, 'priceMin'));
  const high = money(Reflect.get(after, 'priceMax'));
  if (low === null) return null;
  return high === null || high === low ? low : `${low}–${high}`;
};

const flagOf = (meta: Record<string, unknown> | null): boolean | null => {
  for (const key of ['enabled', 'hidden', 'isTest']) {
    const value = meta?.[key];
    if (typeof value === 'boolean') return value;
  }
  return null;
};

/**
 * A row in plain words, from its action key, its target's name and the
 * metadata the writer kept. An action this build has no sentence for reads as
 * its key made readable ("venue.thing_done" → "Venue thing done").
 */
export const sentenceFor = (item: AuditLogItem): Sentence => {
  const meta = item.metadata;
  const entry = isKnown(item.action) ? COPY.sentences[item.action] : null;
  const [lead, tail] =
    entry === null
      ? COPY.unknown(item.action.replace(/[._]+/g, ' '))
      : typeof entry === 'function'
        ? entry({
            on: flagOf(meta),
            until: shortDay(meta?.['resumeOn']),
            range: priceRange(meta),
            role: text(meta?.['role']),
          })
        : entry;
  if (item.target === null) return { lead: lead.trimEnd(), name: null, tail };
  return { lead, name: item.target.name ?? COPY.gone, tail };
};

/** The WHERE column: the admin page an action belongs to. */
export const AREA_LABELS: Record<AuditArea, string> = {
  'needs-you': NAV.needsYou,
  health: NAV.health,
  venues: NAV.venues,
  events: NAV.events,
  artists: NAV.artists,
  prices: NAV.prices,
  people: NAV.people,
  'feature-flags': NAV.featureFlags,
  'crawl-runs': NAV.crawlRuns,
  operations: NAV.operations,
};

/** "@hugh", or "System" for the crawler and the crons. */
export const actorLabel = (item: AuditLogItem): string =>
  item.actorKind === 'system'
    ? COPY.system
    : // The API's fallback for a profile with no handle is words, not a handle.
      item.actor.includes(' ')
      ? item.actor
      : `@${item.actor}`;

/** "9:41 PM", Mountain Time. */
export const logTime = (iso: string): string =>
  new Intl.DateTimeFormat('en-US', {
    timeZone: DENVER_TIME_ZONE,
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(iso));
