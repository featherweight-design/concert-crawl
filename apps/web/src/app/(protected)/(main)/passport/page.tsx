import { headers } from 'next/headers';
import type { VenuePublic } from '@concert-crawl/types';
import { apiClient } from '@/lib/api';
import { auth } from '@/lib/auth';
import { fetchHistory } from '@/lib/history';
import { fetchMe } from '@/lib/users';
import { isScaRegion } from '@/lib/sca-region';
import { passportYear } from '@/lib/passport/passport-request';
import { DENVER_TIME_ZONE, localDateString } from '@/lib/time';
import { PassportContent } from '@/components/consumer/passport/PassportContent';

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
    apiClient
      .get<VenuePublic[]>('/v1/venues', token)
      .catch((): VenuePublic[] => []),
  ]);

  const requestHeaders = await headers();
  const scaRegion = isScaRegion(requestHeaders.get('x-vercel-ip-country'));

  return (
    <PassportContent
      past={data?.past ?? []}
      upcoming={data?.upcoming ?? []}
      activeVenues={venues.map((venue) => ({
        slug: venue.slug,
        name: venue.name,
      }))}
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
