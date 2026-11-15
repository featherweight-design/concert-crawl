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
  type AddShowErrorCode,
} from '@concert-crawl/types';
import { canonicalizeTitle } from '@concert-crawl/crawler-core/canonical-title';
import { deriveTicketLinks } from '@concert-crawl/crawler-core/ticket-links';
import { idSchema } from '../../../lib/id-schema.js';
import { httpUrl } from '../../../lib/url-schema.js';
import { todayInDenver } from '../../../lib/time.js';

// Admin 4a-3b: Add a show by hand (POST /v1/admin/events), its duplicate
// warning (GET /v1/admin/events/duplicate) and the lineup save
// (PUT /v1/admin/events/:id/lineup). Plan:
// docs/superpowers/plans/2026-11-13-admin-4a-events-data.md.
//
// Every field error is a 400 in the shared ZodError body, with the issue's
// `message` set to one of ADD_SHOW_ERROR_CODES (`@concert-crawl/types`, shared
// with the web form) and its `path` naming the field, so the web maps a code
// to its line of copy (B+ addendum 5 `04/add-show-errors-d`).

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
const TITLE_MAX = 300;
const NAME_MAX = 200;
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

/**
 * A real calendar day as YYYY-MM-DD. The shape alone lets 2026-02-30 through,
 * which Postgres then refuses with a 500; a round trip through Date does not.
 */
export const isCalendarDate = (value: string): boolean => {
  if (!DATE_REGEX.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return (
    !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value
  );
};

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
 * that name exists. A name the crawl's canonicaliser reduces to nothing (only
 * combining marks, say) is refused: it could never be the show's key or link.
 */
export const lineupEntrySchema = z.object({
  name: z
    .string({ error: 'lineup_name_required' })
    .trim()
    .min(1, { error: 'lineup_name_required' })
    .max(NAME_MAX, { error: 'lineup_name_too_long' })
    .refine((name) => canonicalizeArtist(name) !== '', {
      error: 'lineup_name_invalid',
    }),
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
      .max(TITLE_MAX, { error: 'title_too_long' }),
    // One code per date: a blank, malformed or impossible date is only
    // `date_required`; `date_past` is checked on a real date alone. The day
    // is read per request, since the Denver day turns over while the API runs.
    date: z.string({ error: 'date_required' }).superRefine((value, ctx) => {
      if (!isCalendarDate(value)) {
        ctx.addIssue({ code: 'custom', message: 'date_required' });
      } else if (value < todayInDenver()) {
        ctx.addIssue({ code: 'custom', message: 'date_past' });
      }
    }),
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
        { error: 'ticket_url_invalid' },
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
  date: z.string().refine(isCalendarDate, { error: 'date_required' }),
  title: z.string().trim().max(TITLE_MAX).optional(),
});

/** The four artist arrays, written together as the crawl writes them. */
export interface Bill {
  headliners: string[];
  supportingArtists: string[];
  canonicalHeadliners: string[];
  canonicalSupporting: string[];
}

type Executor = Parameters<typeof syncEventArtists>[0];

/** A lineup entry after a picked artist's stored name replaced the typed one. */
interface ResolvedEntry {
  name: string;
  role: EventArtistRole;
}

/**
 * Resolve the lineup's picked artists to their stored names, so a picked
 * artist always links (its name canonicalises to its own row). Returns the
 * lineup both the bill and the crawl key are built from, or the issues for
 * ids that match no artist.
 */
const resolveLineup = async (
  executor: Executor,
  lineup: readonly LineupEntry[],
): Promise<{ lineup: ResolvedEntry[] } | { issues: FieldIssue[] }> => {
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
  const resolved = lineup.map((entry, index): ResolvedEntry => {
    if (entry.artistId === undefined) {
      return { name: entry.name, role: entry.role };
    }
    const stored = nameById.get(entry.artistId);
    if (stored === undefined || canonicalizeArtist(stored) === '') {
      issues.push(
        fieldIssue(['lineup', index, 'artistId'], 'artist_not_found'),
      );
      return { name: entry.name, role: entry.role };
    }
    return { name: stored, role: entry.role };
  });
  return issues.length > 0 ? { issues } : { lineup: resolved };
};

/**
 * The arrays for a lineup, headliners then supports, each in the order given.
 * A name billed twice keeps its first headliner place (an act on the bill
 * twice is one act), and no name is ever dropped for having no artist row.
 * The canonical pair goes through the crawl's own canonicaliser. Every name
 * here canonicalises to something (the schema refuses one that doesn't).
 */
export const billFromLineup = (lineup: readonly ResolvedEntry[]): Bill => {
  const seen = new Set<string>();
  const pick = (role: EventArtistRole): string[] =>
    lineup
      .filter((entry) => entry.role === role)
      .map((entry) => entry.name)
      .filter((name) => {
        const key = canonicalizeArtist(name);
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

/** The partial unique key the crawl upserts on, for one show. */
export interface CrawlKey {
  venueId: string;
  date: string;
  canonicalArtist: string;
  showTime: string | null;
}

/**
 * The one builder of a manual show's `artist` and crawl key, so the insert and
 * the 409's key-holder lookup can never disagree. `artist` is the first
 * headliner, and its key the crawl's own `canonicalizeArtist(artist)`, as a
 * crawled row's is.
 */
const crawlIdentity = (
  body: CreateEventBody,
  bill: Bill,
): { artist: string; key: CrawlKey } => {
  const artist = bill.headliners[0];
  // The schema requires a headliner whose name canonicalises to something,
  // and billFromLineup always keeps the first one.
  if (artist === undefined) throw new Error('crawlIdentity: no headliner');
  return {
    artist,
    key: {
      venueId: body.venueId,
      date: body.date,
      canonicalArtist: canonicalizeArtist(artist),
      showTime: body.showTime ?? null,
    },
  };
};

/** The upcoming row holding a crawl key, or null. */
const findKeyHolder = async (
  executor: Executor,
  key: CrawlKey,
): Promise<string | null> => {
  const [row] = await executor
    .select({ id: events.id })
    .from(events)
    .where(
      and(
        eq(events.venueId, key.venueId),
        eq(events.date, key.date),
        eq(events.status, 'upcoming'),
        eq(events.canonicalArtist, key.canonicalArtist),
        key.showTime === null
          ? sql`${events.showTime} IS NULL`
          : sql`${events.showTime} = ${key.showTime}::time`,
      ),
    )
    .limit(1);
  return row?.id ?? null;
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
 * An event's lineup as stored: every name in the display arrays, headliners
 * then supports, none left out (a lineup save sends back what this shows, so
 * a name missing here would be erased). The canonical arrays are never shown:
 * they are lowercased match keys, not names. Each name is matched on Artists
 * by canonical name, as `syncEventArtists` matches it, so a show hidden from
 * fans (which has no `event_artists` rows) still shows its links.
 */
export const readLineup = async (
  executor: Executor,
  row: { headliners: string[] | null; supportingArtists: string[] | null },
): Promise<LineupItem[]> => {
  const slots = [
    ...(row.headliners ?? []).map((name) => ({
      name,
      role: 'headliner' as const,
    })),
    ...(row.supportingArtists ?? []).map((name) => ({
      name,
      role: 'support' as const,
    })),
  ].map((slot) => ({ ...slot, canonical: canonicalizeArtist(slot.name) }));
  if (slots.length === 0) return [];

  const canonicals = [
    ...new Set(slots.map((slot) => slot.canonical).filter(Boolean)),
  ];
  const matched =
    canonicals.length === 0
      ? []
      : await executor
          .select({
            id: artists.id,
            slug: artists.slug,
            canonicalName: artists.canonicalName,
          })
          .from(artists)
          .where(inArray(artists.canonicalName, canonicals));
  const byCanonical = new Map(
    matched.map((artist) => [artist.canonicalName, artist]),
  );
  return slots.map((slot, position) => {
    const artist =
      slot.canonical === '' ? undefined : byCanonical.get(slot.canonical);
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
  | { kind: 'created'; id: string }
  | { kind: 'duplicate'; existingId: string }
  | { kind: 'invalid'; issues: FieldIssue[] };

// A key holder that vanishes between the conflict and the lookup (deleted or
// cancelled by a concurrent request) frees the key, so the insert is retried.
const KEY_ATTEMPTS = 3;

/**
 * Insert a show added by hand and link its lineup, in one transaction with
 * the venue row share-locked (so it cannot be deleted under the insert). The
 * row takes the crawl's own key (venue, date, canonical headliner, show time),
 * so a later crawl that lists the show lands on this row instead of adding a
 * second one. When an upcoming row already holds that exact key, nothing is
 * inserted and the holder's id comes back for the 409.
 */
export const createManualEvent = async (
  body: CreateEventBody,
  actorId: string,
): Promise<CreateResult> =>
  db.transaction(async (tx): Promise<CreateResult> => {
    const [venue] = await tx
      .select({
        websiteUrl: venues.websiteUrl,
        ticketVendor: venues.ticketVendor,
      })
      .from(venues)
      .where(eq(venues.id, body.venueId))
      .for('share');
    if (!venue) {
      return {
        kind: 'invalid',
        issues: [fieldIssue(['venueId'], 'venue_not_found')],
      };
    }
    const resolved = await resolveLineup(tx, body.lineup);
    if ('issues' in resolved) {
      return { kind: 'invalid', issues: resolved.issues };
    }
    const bill = billFromLineup(resolved.lineup);
    const { artist, key } = crawlIdentity(body, bill);
    const now = new Date();

    for (let attempt = 0; attempt < KEY_ATTEMPTS; attempt += 1) {
      const [inserted] = await tx
        .insert(events)
        .values({
          venueId: body.venueId,
          title: body.title,
          artist,
          canonicalArtist: key.canonicalArtist,
          canonicalTitle: canonicalizeTitle(body.title),
          date: body.date,
          doorsTime: body.doorsTime ?? null,
          showTime: key.showTime,
          ticketUrl: body.ticketUrl,
          // The same links a crawled row with this URL gets.
          ticketLinks: deriveTicketLinks(body.ticketUrl, venue),
          ...bill,
          status: 'upcoming',
          verified: true,
          manual: true,
          createdBy: actorId,
          lineupEditedAt: now,
          lastSeenAt: now,
        })
        // The crawl's conflict target: the partial unique index on
        // (venue_id, date, canonical_artist, show_time) WHERE upcoming.
        .onConflictDoNothing({
          target: [
            events.venueId,
            events.date,
            events.canonicalArtist,
            events.showTime,
          ],
          where: eq(events.status, 'upcoming'),
        })
        .returning({ id: events.id });
      if (inserted) {
        await syncEventArtists(tx, [inserted.id]);
        return { kind: 'created', id: inserted.id };
      }
      const existingId = await findKeyHolder(tx, key);
      if (existingId !== null) return { kind: 'duplicate', existingId };
    }
    throw new Error('createManualEvent: crawl key stayed contended');
  });

/** A lineup as the audit records it. */
export interface BillNames {
  headliners: string[] | null;
  supportingArtists: string[] | null;
}

export type LineupSaveResult =
  | { kind: 'saved'; before: BillNames; after: BillNames }
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
  db.transaction(async (tx): Promise<LineupSaveResult> => {
    const [row] = await tx
      .select({
        headliners: events.headliners,
        supportingArtists: events.supportingArtists,
      })
      .from(events)
      .where(eq(events.id, id))
      .for('update');
    if (!row) return { kind: 'not_found' };
    const resolved = await resolveLineup(tx, lineup);
    if ('issues' in resolved) {
      return { kind: 'invalid', issues: resolved.issues };
    }
    const bill = billFromLineup(resolved.lineup);
    const now = new Date();
    await tx
      .update(events)
      .set({ ...bill, lineupEditedAt: now, updatedAt: now })
      .where(eq(events.id, id));
    await syncEventArtists(tx, [id]);
    return {
      kind: 'saved',
      before: row,
      after: {
        headliners: bill.headliners,
        supportingArtists: bill.supportingArtists,
      },
    };
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
  // With no title there is no likeliest match, so the sort skips the term:
  // Postgres refuses a bare constant (`false`) in ORDER BY.
  const likely =
    typed === ''
      ? []
      : [
          desc(
            sql<boolean>`(${events.canonicalTitle} = ${canonicalizeTitle(typed)} OR ${events.canonicalArtist} = ${canonicalizeArtist(typed)})`,
          ),
        ];
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
    .orderBy(...likely, sql`${events.showTime} NULLS LAST`, asc(events.title))
    .limit(DUPLICATE_LIMIT);
};
