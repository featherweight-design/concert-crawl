import LandingClientShell from './_components/LandingClientShell';
import { publicApiClient, ApiError } from '@/lib/api';
import { denverTodayUtcMs } from '@/lib/time';
import type { EventsListResponse, VenuePublic } from '@concert-crawl/types';
import { posterVenues } from '@/lib/poster/poster-rule';
import type {
  InviteShow,
  InviteVenue,
} from './_components/invite-landing/definitions/types';
import type { LandingShow } from '@/components/brand/landing-poster/LandingPoster';

const MONTHS = [
  'JAN',
  'FEB',
  'MAR',
  'APR',
  'MAY',
  'JUN',
  'JUL',
  'AUG',
  'SEP',
  'OCT',
  'NOV',
  'DEC',
] as const;

function formatShowTime(time: string | null | undefined): string {
  if (!time) return '';
  const parts = time.split(':');
  const hoursStr = parts[0] ?? '0';
  const minutesStr = parts[1] ?? '00';
  const hours = parseInt(hoursStr, 10);
  const minutes = parseInt(minutesStr, 10);
  const period = hours >= 12 ? 'pm' : 'am';
  const displayHours = hours % 12 || 12;
  return minutes === 0
    ? `${displayHours}${period}`
    : `${displayHours}:${minutesStr}${period}`;
}

function formatDateShort(date: string): string {
  const dd = new Date(date + 'T12:00:00');
  const month = MONTHS[dd.getMonth()];
  return `${month} ${dd.getDate().toString().padStart(2, '0')}`;
}

// Counts from Denver's today, the calendar event dates are written in; on a
// Denver evening UTC's today is already tomorrow. The arithmetic then runs on
// that date pinned to UTC midnight, so the runtime's own timezone and DST
// never shift the YYYY-MM-DD and skew the "this week" count.
function futureDateString(daysFromNow: number): string {
  const dd = new Date(denverTodayUtcMs());
  dd.setUTCDate(dd.getUTCDate() + daysFromNow);
  return dd.toISOString().slice(0, 10);
}

function makeFallbackShows(): LandingShow[] {
  const dateAt = (offset: number) => futureDateString(offset);
  return [
    {
      id: 'fallback-1',
      artist: 'Amyl and The Sniffers',
      venue: 'Ogden Theatre',
      city: 'Denver, CO',
      date: dateAt(1),
      dateShort: formatDateShort(dateAt(1)),
      showTime: '8pm',
      opener: 'C.O.F.F.I.N.',
      state: null,
    },
    {
      id: 'fallback-2',
      artist: 'Wednesday',
      venue: 'Globe Hall',
      city: 'Denver, CO',
      date: dateAt(3),
      dateShort: formatDateShort(dateAt(3)),
      showTime: '9pm',
      opener: 'Truth Club',
      state: null,
    },
    {
      id: 'fallback-3',
      artist: 'Geese',
      venue: 'Larimer Lounge',
      city: 'Denver, CO',
      date: dateAt(5),
      dateShort: formatDateShort(dateAt(5)),
      showTime: '8pm',
      opener: null,
      state: null,
    },
    {
      id: 'fallback-4',
      artist: 'Mannequin Pussy',
      venue: 'Marquis Theater',
      city: 'Denver, CO',
      date: dateAt(7),
      dateShort: formatDateShort(dateAt(7)),
      showTime: '7pm',
      opener: 'Soul Glo',
      state: null,
    },
  ];
}

interface LandingShows {
  posters: LandingShow[];
  invite: InviteShow[];
}

// One fetch feeds both pages: the public landing's posters take the first
// four, and the private-beta landing's card fan and ticker take up to ten.
async function fetchLandingShows(): Promise<LandingShows> {
  try {
    const result = await publicApiClient.get<EventsListResponse>(
      '/v1/events?limit=10',
    );
    if (!result?.data?.length)
      return { posters: makeFallbackShows(), invite: [] };

    const today = futureDateString(0);
    const posters = result.data.slice(0, 4).map((row) => ({
      id: row.id,
      artist: row.artist,
      venue: row.venue.name,
      city: row.venue.city,
      date: row.date,
      dateShort: formatDateShort(row.date),
      showTime: formatShowTime(row.showTime),
      opener: null,
      state: null,
      href: `/events/${row.id}`,
    }));
    // The ticker is labelled "this week", so it carries only the next seven
    // days, the same window the see-all count uses.
    const weekEnd = futureDateString(6);
    const invite = result.data
      .filter((row) => row.date <= weekEnd)
      .map((row) => ({
        id: row.id,
        artist: row.artist,
        venue: row.venue.name,
        tonight: row.date === today,
        dateShort: formatDateShort(row.date),
        showTime: formatShowTime(row.showTime),
        genre: row.genre?.[0] ?? null,
        imageUrl: row.imageUrl,
        artistPhotoUrl: row.artistPhotoUrl ?? null,
      }));

    return {
      posters: posters.length >= 2 ? posters : makeFallbackShows(),
      invite,
    };
  } catch (err) {
    console.error(
      '[landing] failed to fetch hero shows:',
      err instanceof ApiError ? `HTTP ${err.status} ${err.message}` : err,
    );
    return { posters: makeFallbackShows(), invite: [] };
  }
}

// The venues the private-beta landing shows as icons and counts: the same
// "has upcoming shows" rule the invite poster uses, so the two never disagree.
// Null on failure, and the page drops the row rather than show a wrong count.
async function fetchInviteVenues(): Promise<InviteVenue[] | null> {
  try {
    const venues = await publicApiClient.get<VenuePublic[]>('/v1/venues');
    return posterVenues(venues).map(({ slug, name }) => ({ slug, name }));
  } catch (err) {
    console.error(
      '[landing] failed to fetch venues:',
      err instanceof ApiError ? `HTTP ${err.status} ${err.message}` : err,
    );
    return null;
  }
}

// The see-all rail says "this week", so the count has to mean that too — a
// separate `to`-bounded probe rather than the unbounded hero fetch's total.
// Returns null on any failure so the rail ships its countless variant instead
// of a wrong number.
async function fetchWeekCount(): Promise<number | null> {
  try {
    const result = await publicApiClient.get<EventsListResponse>(
      `/v1/events?limit=1&to=${futureDateString(6)}`,
    );
    return typeof result?.total === 'number' ? result.total : null;
  } catch (err) {
    console.error(
      '[landing] failed to fetch this-week count:',
      err instanceof ApiError ? `HTTP ${err.status} ${err.message}` : err,
    );
    return null;
  }
}

// ISR window: 5 minutes (#842). A crawl that inserts events also asks for a
// revalidation (#847); this window is the fallback when that call is skipped.
// The logged-in redirect to /events lives in proxy.ts — keeping it out of this server component is
// what makes the page ISR-eligible (calling auth() / cookies() here would force
// Next.js to render dynamically on every request). If a future change adds
// user-personalized rendering, split it into an ISR shell + a Client Component
// island rather than dropping ISR entirely.
export const revalidate = 300;

export default async function LandingPage() {
  const [shows, weekCount, venues] = await Promise.all([
    fetchLandingShows(),
    fetchWeekCount(),
    fetchInviteVenues(),
  ]);
  return (
    <LandingClientShell
      shows={shows.posters}
      showCount={weekCount}
      inviteShows={shows.invite}
      inviteVenues={venues}
    />
  );
}
