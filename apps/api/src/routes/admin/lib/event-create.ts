import { and, asc, desc, eq, inArray, ne, sql } from 'drizzle-orm';
import { z } from 'zod';
import {
  artists,
  db,
  events,
  syncEventArtists,
  venues,
  type EventArtistRole,
} from '@concert-crawl/db';
import {
  canonicalizeArtist,
  canonicalizeSupporting,
} from '@concert-crawl/types';
import { canonicalizeTitle } from '@concert-crawl/crawler-core/canonical-title';
import { idSchema } from '../../../lib/id-schema.js';
import { httpUrl } from '../../../lib/url-schema.js';
import { todayInDenver } from '../../../lib/time.js';

// Admin 4a-3b: Add a show by hand (POST /v1/admin/events), its duplicate
// warning (GET /v1/admin/events/duplicate) and the lineup save
// (PUT /v1/admin/events/:id/lineup). Plan:
// docs/superpowers/plans/2026-11-13-admin-4a-events-data.md.
//
// Every field error is a 400 in the shared ZodError body, with the issue's
// `message` set to one of ADD_SHOW_ERROR_CODES and its `path` naming the
// field, so the web maps a code to its line of copy
// (B+ addendum 5 `04/add-show-errors-d`).

export const ADD_SHOW_ERROR_CODES = [
  'title_required',
  'venue_required',
  'venue_not_found',
  'date_required',
  'date_past',
  'time_invalid',
  'show_before_doors',
  'ticket_url_invalid',
  'headliner_required',
  'lineup_name_required',
  'lineup_role_invalid',
  'lineup_too_long',
  'artist_not_found',
] as const;

export type AddShowErrorCode = (typeof ADD_SHOW_ERROR_CODES)[number];

/** One issue in the shape the validation hook writes, for a refusal found after parsing. */
export interface FieldIssue {
  code: 'custom';
  path: (string | number)[];
  message: AddShowErrorCode;
}

const fieldIssue = (
  path: (string | number)[],
  message: AddShowErrorCode,
): FieldIssue => ({ code: 'custom', path, message });

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;
const LINEUP_MAX = 50;
// `EVENT_ARTIST_ROLES`, spelled out: a schema built at import time must not
// read a runtime value from `@concert-crawl/db`, which route unit tests mock.
// `satisfies` keeps the two in step.
const LINEUP_ROLES = [
  'headliner',
  'support',
] as const satisfies readonly EventArtistRole[];
const TICKET_URL_MAX = 2048;
const ticketUrlSchema = httpUrl(TICKET_URL_MAX);

/** `HH:MM` and `HH:MM:SS` compare as the same time. */
const timeKey = (value: string): string => value.padEnd(8, ':00');

const timeField = z
  .string({ error: 'time_invalid' })
  .regex(TIME_REGEX, { error: 'time_invalid' })
  .nullable()
  .optional();

/**
 * One act on the bill. `artistId` is set when the admin picked an artist from
 * Artists; without it the name is kept as typed and links once an artist by
 * that name exists.
 */
export const lineupEntrySchema = z.object({
  name: z
    .string({ error: 'lineup_name_required' })
    .trim()
    .min(1, { error: 'lineup_name_required' })
    .max(200, { error: 'lineup_name_required' }),
  role: z.enum(LINEUP_ROLES, { error: 'lineup_role_invalid' }),
  artistId: idSchema.optional(),
});

export type LineupEntry = z.infer<typeof lineupEntrySchema>;

/** The bill in display order. At least one headliner. */
export const lineupSchema = z
  .array(lineupEntrySchema, { error: 'headliner_required' })
  .max(LINEUP_MAX, { error: 'lineup_too_long' })
  .refine((entries) => entries.some((entry) => entry.role === 'headliner'), {
    error: 'headliner_required',
  });

export const lineupBodySchema = z.object({ lineup: lineupSchema });

export const createEventSchema = z
  .object({
    venueId: z.guid({ error: 'venue_required' }),
    title: z
      .string({ error: 'title_required' })
      .trim()
      .min(1, { error: 'title_required' })
      .max(300, { error: 'title_required' }),
    date: z
      .string({ error: 'date_required' })
      .regex(DATE_REGEX, { error: 'date_required' })
      // Read per request: the Denver day turns over while the API runs.
      .refine((value) => value >= todayInDenver(), { error: 'date_past' }),
    doorsTime: timeField,
    showTime: timeField,
    // Blank means no link. A link goes through httpUrl(), the one guard
    // against stored javascript: and data: URLs.
    ticketUrl: z
      .string({ error: 'ticket_url_invalid' })
      .trim()
      .nullable()
      .optional()
      .transform((value) => (value ? value : null))
      .refine(
        (value) => value === null || ticketUrlSchema.safeParse(value).success,
        {
          error: 'ticket_url_invalid',
        },
      ),
    lineup: lineupSchema,
  })
  .superRefine((body, ctx) => {
    if (
      body.doorsTime &&
      body.showTime &&
      timeKey(body.showTime) < timeKey(body.doorsTime)
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['showTime'],
        message: 'show_before_doors',
      });
    }
  });

export type CreateEventBody = z.infer<typeof createEventSchema>;

export const duplicateQuerySchema = z.object({
  venueId: idSchema,
  date: z.string().regex(DATE_REGEX, 'date must be YYYY-MM-DD'),
  title: z.string().trim().max(300).optional(),
});

/** The four artist arrays, written together as the crawl writes them. */
export interface Bill {
  headliners: string[];
  supportingArtists: string[];
  canonicalHeadliners: string[];
  canonicalSupporting: string[];
}

type Executor = Parameters<typeof syncEventArtists>[0];

/**
 * Resolve the lineup's picked artists to their stored names, so a picked
 * artist always links (its name canonicalises to its own row). Returns the
 * names in entry order, or the issues for ids that match no artist.
 */
const resolveLineupNames = async (
  executor: Executor,
  lineup: readonly LineupEntry[],
  pathPrefix: (string | number)[],
): Promise<{ names: string[] } | { issues: FieldIssue[] }> => {
  const ids = [
    ...new Set(
      lineup.flatMap((entry) =>
        entry.artistId === undefined ? [] : [entry.artistId],
      ),
    ),
  ];
  const nameById = new Map<string, string>();
  if (ids.length > 0) {
    const found = await executor
      .select({ id: artists.id, name: artists.name })
      .from(artists)
      .where(inArray(artists.id, ids));
    for (const artist of found) nameById.set(artist.id, artist.name);
  }
  const issues: FieldIssue[] = [];
  const names = lineup.map((entry, index) => {
    if (entry.artistId === undefined) return entry.name;
    const stored = nameById.get(entry.artistId);
    if (stored === undefined) {
      issues.push(
        fieldIssue([...pathPrefix, index, 'artistId'], 'artist_not_found'),
      );
      return entry.name;
    }
    return stored;
  });
  return issues.length > 0 ? { issues } : { names };
};

/**
 * The arrays for a lineup, headliners then supports, each in the order given.
 * A name billed twice keeps its first headliner place (an act on the bill
 * twice is one act), and no name is ever dropped for having no artist row.
 * The canonical pair goes through the crawl's own canonicaliser.
 */
export const billFromLineup = (
  lineup: readonly { name: string; role: EventArtistRole }[],
): Bill => {
  const seen = new Set<string>();
  const pick = (role: EventArtistRole): string[] =>
    lineup
      .filter((entry) => entry.role === role)
      .map((entry) => entry.name)
      .filter((name) => {
        const key = canonicalizeArtist(name) || name.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  const headliners = pick('headliner');
  const supportingArtists = pick('support');
  return {
    headliners,
    supportingArtists,
    canonicalHeadliners: canonicalizeSupporting(headliners),
    canonicalSupporting: canonicalizeSupporting(supportingArtists),
  };
};

/** One act in the detail payload's lineup. */
export interface LineupItem {
  name: string;
  role: EventArtistRole;
  position: number;
  /** The artist the name matches on Artists, or null while none does. */
  artistId: string | null;
  slug: string | null;
}

/**
 * An event's lineup read off its arrays, in the order and with the positions
 * `syncEventArtists` gives `event_artists` (headliners first, a name billed
 * twice once, NULL `canonical_headliners` meaning no headliners). Each name is
 * matched on Artists by canonical name, as the sync matches it, so a show
 * hidden from fans (which has no `event_artists` rows) still shows its links.
 */
export const readLineup = async (
  executor: Executor,
  row: {
    headliners: string[] | null;
    supportingArtists: string[] | null;
    canonicalHeadliners: string[] | null;
    canonicalSupporting: string[] | null;
  },
): Promise<LineupItem[]> => {
  const headlinerNames =
    row.canonicalHeadliners === null
      ? []
      : (row.headliners ?? row.canonicalHeadliners);
  const supportNames = row.supportingArtists ?? row.canonicalSupporting ?? [];
  const slots: { name: string; canonical: string; role: EventArtistRole }[] =
    [];
  const seen = new Set<string>();
  const add = (names: readonly string[], role: EventArtistRole): void => {
    for (const name of names) {
      const canonical = canonicalizeArtist(name);
      if (canonical === '' || seen.has(canonical)) continue;
      seen.add(canonical);
      slots.push({ name, canonical, role });
    }
  };
  add(headlinerNames, 'headliner');
  add(supportNames, 'support');
  if (slots.length === 0) return [];

  const matched = await executor
    .select({
      id: artists.id,
      slug: artists.slug,
      canonicalName: artists.canonicalName,
    })
    .from(artists)
    .where(
      inArray(
        artists.canonicalName,
        slots.map((slot) => slot.canonical),
      ),
    );
  const byCanonical = new Map(
    matched.map((artist) => [artist.canonicalName, artist]),
  );
  return slots.map((slot, position) => {
    const artist = byCanonical.get(slot.canonical);
    return {
      name: slot.name,
      role: slot.role,
      position,
      artistId: artist?.id ?? null,
      slug: artist?.slug ?? null,
    };
  });
};

export type CreateResult =
  { kind: 'created'; id: string } | { kind: 'invalid'; issues: FieldIssue[] };

/**
 * Insert a show added by hand and link its lineup, in one transaction. The
 * row takes the crawl's own key (venue, date, canonical headliner, show time),
 * so a later crawl that lists the show lands on this row instead of adding a
 * second one. A crawled show already on that exact key makes the insert fail
 * on `events_venue_date_canonical_artist_showtime_idx`; the caller answers it.
 */
export const createManualEvent = async (
  body: CreateEventBody,
  actorId: string,
): Promise<CreateResult> => {
  const [venue] = await db
    .select({ id: venues.id })
    .from(venues)
    .where(eq(venues.id, body.venueId))
    .limit(1);
  if (!venue) {
    return {
      kind: 'invalid',
      issues: [fieldIssue(['venueId'], 'venue_not_found')],
    };
  }

  return db.transaction(async (tx) => {
    const resolved = await resolveLineupNames(tx, body.lineup, ['lineup']);
    if ('issues' in resolved)
      return { kind: 'invalid', issues: resolved.issues };
    const bill = billFromLineup(
      body.lineup.map((entry, index) => ({
        name: resolved.names[index] ?? entry.name,
        role: entry.role,
      })),
    );
    // The refine guarantees a headliner; the title stands in only if every
    // headliner name canonicalised away.
    const artist = bill.headliners[0] ?? body.title;
    const now = new Date();
    const [inserted] = await tx
      .insert(events)
      .values({
        venueId: body.venueId,
        title: body.title,
        artist,
        canonicalArtist:
          canonicalizeArtist(artist) || canonicalizeTitle(body.title),
        canonicalTitle: canonicalizeTitle(body.title),
        date: body.date,
        doorsTime: body.doorsTime ?? null,
        showTime: body.showTime ?? null,
        ticketUrl: body.ticketUrl,
        ...bill,
        status: 'upcoming',
        verified: true,
        manual: true,
        createdBy: actorId,
        lineupEditedAt: now,
        lastSeenAt: now,
      })
      .returning({ id: events.id });
    if (!inserted) throw new Error('createManualEvent: insert returned no row');
    await syncEventArtists(tx, [inserted.id]);
    return { kind: 'created', id: inserted.id };
  });
};

/** The upcoming row holding a show's crawl key, for a 409's `existingId`. */
export const findKeyHolder = async (
  body: CreateEventBody,
): Promise<string | null> => {
  const headliner =
    body.lineup.find((entry) => entry.role === 'headliner')?.name ?? body.title;
  const [row] = await db
    .select({ id: events.id })
    .from(events)
    .where(
      and(
        eq(events.venueId, body.venueId),
        eq(events.date, body.date),
        eq(events.status, 'upcoming'),
        eq(events.canonicalArtist, canonicalizeArtist(headliner)),
        body.showTime
          ? sql`${events.showTime} = ${body.showTime}::time`
          : sql`${events.showTime} IS NULL`,
      ),
    )
    .limit(1);
  return row?.id ?? null;
};

export type LineupSaveResult =
  | { kind: 'saved'; lineup: Bill }
  | { kind: 'not_found' }
  | { kind: 'invalid'; issues: FieldIssue[] };

/**
 * Save a show's lineup: rewrite the four arrays, lock them with
 * `lineup_edited_at` (the crawl, Repair and the duplicate-night fill then
 * keep the admin's bill) and relink `event_artists`, all in one transaction
 * with the row locked. Crawled and past shows are allowed. The event's
 * `artist` and `canonical_artist` stay as they are: they are the crawl's key,
 * and moving them would let the next crawl add the show a second time.
 */
export const saveLineup = async (
  id: string,
  lineup: readonly LineupEntry[],
): Promise<LineupSaveResult> =>
  db.transaction(async (tx) => {
    const [row] = await tx
      .select({ id: events.id })
      .from(events)
      .where(eq(events.id, id))
      .for('update');
    if (!row) return { kind: 'not_found' };
    const resolved = await resolveLineupNames(tx, lineup, ['lineup']);
    if ('issues' in resolved)
      return { kind: 'invalid', issues: resolved.issues };
    const bill = billFromLineup(
      lineup.map((entry, index) => ({
        name: resolved.names[index] ?? entry.name,
        role: entry.role,
      })),
    );
    const now = new Date();
    await tx
      .update(events)
      .set({ ...bill, lineupEditedAt: now, updatedAt: now })
      .where(eq(events.id, id));
    await syncEventArtists(tx, [id]);
    return { kind: 'saved', lineup: bill };
  });

/** A show already at the venue that night, for the amber "Open it" warning. */
export interface DuplicateCandidate {
  id: string;
  title: string;
  showTime: string | null;
  manual: boolean;
  hidden: boolean;
}

const DUPLICATE_LIMIT = 5;

/**
 * Shows at this venue on this date that are not cancelled, the likeliest
 * first: a title or headliner matching what is being typed, then by time. A
 * warning only; nothing here blocks the create.
 */
export const findDuplicates = async (
  query: z.infer<typeof duplicateQuerySchema>,
): Promise<DuplicateCandidate[]> => {
  const typed = query.title ?? '';
  const likely =
    typed === ''
      ? sql<boolean>`false`
      : sql<boolean>`(${events.canonicalTitle} = ${canonicalizeTitle(typed)} OR ${events.canonicalArtist} = ${canonicalizeArtist(typed)})`;
  return db
    .select({
      id: events.id,
      title: events.title,
      showTime: events.showTime,
      manual: events.manual,
      hidden: events.hiddenFromConsumer,
    })
    .from(events)
    .where(
      and(
        eq(events.venueId, query.venueId),
        eq(events.date, query.date),
        ne(events.status, 'cancelled'),
      ),
    )
    .orderBy(
      desc(likely),
      sql`${events.showTime} NULLS LAST`,
      asc(events.title),
    )
    .limit(DUPLICATE_LIMIT);
};
