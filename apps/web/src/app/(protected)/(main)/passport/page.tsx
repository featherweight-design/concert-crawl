import { headers } from 'next/headers';
import { apiClient } from '@/lib/api';
import { auth } from '@/lib/auth';
import { fetchHistory } from '@/lib/history';
import { fetchMe } from '@/lib/users';
import { isScaRegion } from '@/lib/sca-region';
import { passportYear } from '@/lib/passport/passport-request';
import { DENVER_TIME_ZONE, localDateString } from '@/lib/time';
import { PassportContent } from '@/components/consumer/passport/PassportContent';

interface ActiveVenue {
  slug: string;
  name: string;
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
  return payload
    .filter(isActiveVenue)
    .map((venue) => ({ slug: venue.slug, name: venue.name }));
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
  const [{ data, locked }, profile, venues] = await Promise.all([
    fetchHistory(token),
    fetchMe(token),
    apiClient.get<unknown>('/v1/venues', token).catch((error: unknown) => {
      // Logged rather than swallowed: the page still draws without it, so a
      // failing list would otherwise only show up as a missing grid.
      console.error('Passport active venues fetch failed', error);
      return [];
    }),
  ]);

  const requestHeaders = await headers();
  const scaRegion = isScaRegion(requestHeaders.get('x-vercel-ip-country'));

  return (
    <PassportContent
      past={data?.past ?? []}
      upcoming={data?.upcoming ?? []}
      activeVenues={toActiveVenues(venues)}
      identity={{
        handle: profile.handle,
        city: profile.city,
        avatarColor: profile.avatarColor,
        year: passportYear(),
      }}
      today={localDateString(DENVER_TIME_ZONE)}
      locked={locked}
      scaRegion={scaRegion}
    />
  );
}
