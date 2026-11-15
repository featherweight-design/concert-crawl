import type {
  ArtistDetailResponse,
  EventDetailResponse,
} from '@concert-crawl/types';
import { publicApiClient } from '@/lib/api';

/**
 * What a signed-out visitor was about to do, resolved from the return path they
 * are signing in to reach, for the card on the sign-in and sign-up pages.
 * Names only, and only from public data: a show and an artist come from the
 * same public routes the browse pages use. Anything else, a crew invite
 * included, is `generic` (a crew's name and host are not public to a stranger
 * holding a token: that is a separate ruling).
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
const ARTIST_PATH = /^\/artists\/([a-z0-9][a-z0-9-]{0,127})$/;

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
  const pathname = returnPath.split(/[?#]/)[0] ?? '';

  const page = PAGES[pathname];
  if (page) return { kind: 'page', page };

  try {
    const event = EVENT_PATH.exec(pathname)?.[1];
    if (event) {
      const detail = await publicApiClient.get<EventDetailResponse>(
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

    const slug = ARTIST_PATH.exec(pathname)?.[1];
    if (slug) {
      const detail = await publicApiClient.get<ArtistDetailResponse>(
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
