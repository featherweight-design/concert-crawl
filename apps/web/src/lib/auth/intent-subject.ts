import type {
  ArtistDetailResponse,
  EventDetailResponse,
} from '@concert-crawl/types';
import { anonymousRequest } from '@/lib/api';
import { decodeIntent, isArtistSlug } from '@/lib/auth/intent';

/**
 * What a signed-out visitor was about to do, resolved from the return path they
 * are signing in to reach, for the card on the sign-in and sign-up pages.
 * Names only, and only from public data, read with no identity at all. A card
 * only promises what will happen: the show card needs the pending Watch the
 * return path carries (`intent=watch:<id>`), because it says "we'll add it to
 * Watching", and the artist card the pending Follow (`intent=follow:<slug>`).
 * Anything else, a crew invite included, is `generic` (a crew's name
 * and host are not public to a stranger holding a token: that is a separate
 * ruling).
 */
export type IntentSubject =
  | { kind: 'show'; title: string; eyebrow: string }
  | { kind: 'artist'; name: string; dates: number }
  | { kind: 'page'; page: PageName }
  | { kind: 'generic' };

/** The signed-in pages the board names, by the label the card shows. */
export type PageName = 'My shows' | 'Settings' | 'Crews' | 'Notifications';

const PAGES: Readonly<Record<string, PageName>> = {
  '/watching': 'My shows',
  '/settings': 'Settings',
  '/crews': 'Crews',
  '/notifications': 'Notifications',
};

const GENERIC: IntentSubject = { kind: 'generic' };
const EVENT_PATH = /^\/events\/([A-Za-z0-9_-]{1,64})$/;
const ARTIST_PATH = /^\/artists\/([^/]+)$/;

/**
 * The data is public and changes slowly, so a card is not worth a fetch per
 * view. A slow API must never hold the sign-in page: the card is a nicety, so a
 * lookup that takes longer than this gives up and the page reads as generic.
 * Built per call, because a signal's clock starts when it is made.
 */
const LOOKUP_TIMEOUT_MS = 1500;
const lookupOptions = (): RequestInit => ({
  next: { revalidate: 300 },
  signal: AbortSignal.timeout(LOOKUP_TIMEOUT_MS),
});

/** "FRI, NOV 14 · MARQUIS": the date is a plain calendar day, so no zone. */
export function showEyebrow(eventDate: string, venueName: string): string {
  const day = new Date(`${eventDate}T12:00:00Z`);
  if (Number.isNaN(day.getTime())) return venueName;
  const when = new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(day);
  return `${when} · ${venueName}`;
}

/**
 * Resolves the (already sanitized) return path. It never throws: a missing
 * subject, a slow API or an unexpected shape all read as the generic card, so
 * the sign-in page always renders.
 */
export async function loadIntentSubject(
  returnPath: string,
): Promise<IntentSubject> {
  const [pathname = '', rest = ''] = returnPath.split('?', 2);
  const query = new URLSearchParams(rest.split('#')[0]);

  const page = PAGES[pathname.split('#')[0] ?? ''];
  if (page) return { kind: 'page', page };

  const path = pathname.split('#')[0] ?? '';
  const intent = decodeIntent(query.get('intent'));
  if (!intent) return GENERIC;

  try {
    // The card names the page's show, so the pending Watch must be for it.
    const event = EVENT_PATH.exec(path)?.[1];
    if (
      event &&
      intent.action === 'watch' &&
      intent.eventId.toLowerCase() === event.toLowerCase()
    ) {
      const detail = await anonymousRequest<EventDetailResponse>(
        `/v1/events/${event}`,
        lookupOptions(),
      );
      const title = detail.title.trim();
      if (!title) return GENERIC;
      return {
        kind: 'show',
        title,
        eyebrow: showEyebrow(detail.date, detail.venue.name),
      };
    }

    // The same for an artist: the pending Follow must be for the page's artist.
    const slug = ARTIST_PATH.exec(path)?.[1];
    if (
      slug &&
      isArtistSlug(slug) &&
      intent.action === 'follow' &&
      intent.artistSlug === slug
    ) {
      const detail = await anonymousRequest<ArtistDetailResponse>(
        `/v1/artists/${slug}`,
        lookupOptions(),
      );
      const name = detail.artist.name.trim();
      if (!name) return GENERIC;
      return { kind: 'artist', name, dates: detail.shows.length };
    }
  } catch {
    return GENERIC;
  }
  return GENERIC;
}
