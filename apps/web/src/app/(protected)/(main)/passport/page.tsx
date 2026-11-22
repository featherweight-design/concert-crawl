import { after } from 'next/server';
import { apiClient } from '@/lib/api';
import { auth } from '@/lib/auth';
import { fetchHistory } from '@/lib/history';
import { fetchMe } from '@/lib/users';
import { passportYear } from '@/lib/passport/passport-request';
import { planPassportCard } from '@/lib/passport/render-card';
import { siteOrigin } from '@/lib/share/site-origin';
import { DENVER_TIME_ZONE, localDateString } from '@/lib/time';
import { PassportContent } from '@/components/consumer/passport/PassportContent';

interface ActiveVenue {
  slug: string;
  name: string;
  shortName: string | null;
}

const isActiveVenue = (candidate: unknown): candidate is ActiveVenue =>
  typeof candidate === 'object' &&
  candidate !== null &&
  'slug' in candidate &&
  'name' in candidate &&
  typeof candidate.slug === 'string' &&
  typeof candidate.name === 'string';

/**
 * The list is optional to this page, so a payload of the wrong shape hides
 * Venues collected instead of failing the render.
 */
const toActiveVenues = (payload: unknown): ActiveVenue[] => {
  if (!Array.isArray(payload)) {
    console.error('Passport active venues payload is not a list');
    return [];
  }
  return payload.filter(isActiveVenue).map((venue) => ({
    slug: venue.slug,
    name: venue.name,
    shortName:
      'shortName' in venue && typeof venue.shortName === 'string'
        ? venue.shortName
        : null,
  }));
};

export const metadata = { title: 'Passport — Concert Crawl' };

export default async function PassportPage() {
  const { getToken } = await auth();
  const token = await getToken();
  if (!token) return null;

  // Fetched together: the booklet needs the handle to draw its identity page
  // and the active venues to count Venues collected, and serialising them
  // would put extra round trips in front of the first paint for nothing. The
  // venue list is the only optional one: if it fails, the booklet still draws
  // and Venues collected stays out rather than claiming "0 of 0".
  const [history, profile, venues] = await Promise.all([
    fetchHistory(token),
    fetchMe(token),
    apiClient.get<unknown>('/v1/venues', token).catch((error: unknown) => {
      // Logged rather than swallowed: the page still draws without it, so a
      // failing list would otherwise only show up as a missing grid.
      console.error('Passport active venues fetch failed', error);
      return [];
    }),
  ]);

  // Warm the share card once the page is on its way: the browser asks for it
  // on mount, and the first render costs several seconds. `after` runs past
  // the response, so the page never waits on it, and planning sits inside it
  // so nothing here can fail the page.
  //
  // Best effort, on two counts. The cache is per instance, so a request that
  // lands elsewhere renders for itself. And the card is keyed on the stored
  // profile theme, while the browser asks with the theme it holds locally: a
  // reader whose two differ renders cold, as before. A repeat view of
  // unchanged contents finds the entry and costs nothing.
  //
  // The origin is our own configured one, never a request header, so a
  // forged Host cannot aim the font fetches elsewhere.
  if (history.past.length > 0) {
    after(async () => {
      try {
        await planPassportCard({
          ratio: 'square',
          userId: profile.id,
          handle: profile.handle,
          profileTheme: profile.theme,
          themeOverride: undefined,
          past: history.past,
        }).render(siteOrigin());
      } catch (err) {
        console.error('[passport] card pre-warm failed', { err });
      }
    });
  }

  return (
    <PassportContent
      past={history.past}
      upcoming={history.upcoming}
      activeVenues={toActiveVenues(venues)}
      identity={{
        handle: profile.handle,
        city: profile.city,
        avatarColor: profile.avatarColor,
        year: passportYear(),
      }}
      today={localDateString(DENVER_TIME_ZONE)}
    />
  );
}
