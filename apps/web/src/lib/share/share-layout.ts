import {
  bucketForGenre,
  type EventStatus,
  type GenreBucket,
} from '@concert-crawl/types';
import type { ShareRatio } from '@/components/consumer/share/definitions/ratios';
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy';
import { formatShowTime } from '@/components/consumer/definitions/lib';
import { localDateString } from '@/lib/time';

// The B+ share card's layout rules (more-r3-share_shapes), kept out of the
// satori component so each one is a plain function with a table of cases.

const MS_PER_DAY = 86_400_000;
const COUNTDOWN_COPY = CONSUMER_COPY.share.countdown;

/**
 * The footer countdown: "4 DAYS AWAY", "TOMORROW", "TODAY". Null for a past
 * show (the boards draw none) and for a cancelled or postponed one, whose date
 * is in doubt. `today` is the venue's own `YYYY-MM-DD`, never the server's.
 */
export const shareCountdown = (
  date: string,
  today: string,
  status: EventStatus | undefined,
): string | null => {
  if (status === 'cancelled' || status === 'postponed') return null;
  const days = Math.round(
    (Date.parse(`${date}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) /
      MS_PER_DAY,
  );
  if (Number.isNaN(days) || days < 0) return null;
  const label =
    days === 0
      ? COUNTDOWN_COPY.today
      : days === 1
        ? COUNTDOWN_COPY.tomorrow
        : COUNTDOWN_COPY.daysAway(days);
  return label.toUpperCase();
};

export interface ShareDateParts {
  /** `FRI` */
  weekday: string;
  /** `NOV` */
  month: string;
  /** `13` */
  day: string;
}

/** The square card's date block, and the head of every meta line. */
export const shareDateParts = (
  date: string,
  timezone: string,
): ShareDateParts => {
  // Noon UTC so the instant lands on the same calendar day in any zone.
  const at = new Date(`${date}T12:00:00Z`);
  const part = (options: Intl.DateTimeFormatOptions): string =>
    new Intl.DateTimeFormat('en-US', { timeZone: timezone, ...options })
      .format(at)
      .toUpperCase();
  return {
    weekday: part({ weekday: 'short' }),
    month: part({ month: 'short' }),
    day: part({ day: 'numeric' }),
  };
};

export interface ShareMetaSource {
  date: ShareDateParts;
  /** `9:00 PM`, or null when the venue never published a time. */
  showTime: string | null;
  venue: string;
  city: string;
}

/**
 * The mono meta. Story and Wide draw two lines (date and time, then venue and
 * city); Square runs all four on one line. An unknown time drops out rather
 * than printing a placeholder.
 */
export const shareMetaLines = (
  source: ShareMetaSource,
  ratio: ShareRatio,
): string[] => {
  const { weekday, month, day } = source.date;
  const when = [`${weekday} ${month} ${day}`, source.showTime].filter(
    (part): part is string => part !== null,
  );
  const where = [source.venue, source.city];
  const lines = ratio === 'square' ? [[...when, ...where]] : [when, where];
  return lines.map((parts) => parts.join(' · ').toUpperCase());
};

/**
 * Each Vibe bucket's genre colour as a literal hex: satori cannot resolve
 * `var(--genre-*)`. Mirrors the dark-ground values in `globals.css`, which a
 * test pins, because the card is theme-independent and always dark.
 */
export const SHARE_GENRE_HEX: Record<GenreBucket, string> = {
  electronic: '#7ae6ff',
  'hip-hop': '#ffe36b',
  pop: '#ff7bd4',
  indie: '#b7a6ff',
  rock: '#ff8838',
  metal: '#a075ff',
  punk: '#ff6b8a',
  folk: '#c9f26e',
  country: '#e8c48a',
  jazz: '#5dd4d6',
  latin: '#ff9a5c',
  reggae: '#6ee7a0',
  jam: '#9ee6c9',
  world: '#f2a3ff',
  classical: '#d9e2f2',
  comedy: '#f7f08a',
};

export interface ShareChip {
  label: string;
  /** The dot's colour; an unbucketed genre gets the neutral `--fg-subtle`. */
  dot: string;
  /** Only a bucketed genre's dot glows, as on every B+ genre chip. */
  glow: boolean;
}

const NEUTRAL_DOT = '#5a6788';

/** The lead genre's chip, or null when the show has no genre: no chip drawn. */
export const shareChip = (
  genres: readonly string[] | null | undefined,
): ShareChip | null => {
  const lead = genres?.find((genre) => genre.trim() !== '');
  if (lead === undefined) return null;
  const bucket = bucketForGenre(lead);
  return {
    label: lead.trim().toUpperCase(),
    dot: bucket !== null ? SHARE_GENRE_HEX[bucket] : NEUTRAL_DOT,
    glow: bucket !== null,
  };
};

/**
 * The photo chain, in the order every event surface uses: the event's own
 * artwork, then the headliner's portrait. Empty means IdentityArt draws.
 */
export const sharePhotoSources = (source: {
  imageUrl?: string | null;
  artistPhotoUrl?: string | null;
}): string[] =>
  [source.imageUrl, source.artistPhotoUrl].filter(
    (url): url is string => typeof url === 'string' && url !== '',
  );

/** Everything the B+ card draws, and nothing else (no price, state or handle). */
export interface ShareCard extends ShareMetaSource {
  artist: string;
  chip: ShareChip | null;
  countdown: string | null;
}

/** The API fields the card reads. Any `EventDetailResponse` satisfies it. */
export interface ShareCardSource {
  artist: string;
  date: string;
  showTime: string | null;
  venue: { name: string; city: string; timezone: string };
  genre?: string[] | null;
  status?: EventStatus;
}

/** The venue's calendar date (`YYYY-MM-DD`) at the instant `now`. */
export const venueDateOf = (now: Date, timezone: string): string =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);

export const toShareCard = (
  event: ShareCardSource,
  today: string = localDateString(event.venue.timezone),
): ShareCard => ({
  artist: event.artist,
  date: shareDateParts(event.date, event.venue.timezone),
  showTime: formatShowTime(event.showTime),
  venue: event.venue.name,
  city: event.venue.city,
  chip: shareChip(event.genre),
  countdown: shareCountdown(event.date, today, event.status),
});

/**
 * Mean advance of a mixed-case Inter 900 glyph at the card's -0.03em
 * tracking, as a fraction of the size. Conservative: guessing small costs a
 * few points, guessing large clips the name.
 */
const NAME_ADVANCE_RATIO = 0.7;

/**
 * Story wraps the name over two lines at a fixed size. A single word too wide
 * for the line breaks where its case turns (the board's `TOKi` / `MONSTA`)
 * rather than at whichever letter overflows; a word with no such turn is left
 * to the renderer's own break.
 */
export const storyNameText = (
  name: string,
  size: number,
  width: number,
): string =>
  name
    .split(' ')
    .map((word) =>
      word.length * NAME_ADVANCE_RATIO * size > width
        ? word.replace(/(\p{Ll})(\p{Lu})/gu, '$1 $2')
        : word,
    )
    .join(' ');

/**
 * Square and Wide set the name on one line, shrinking a long one to fit down
 * to `floor`; below that it ellipsises. Satori cannot measure text, so the
 * size is estimated from the character count.
 */
export const fitLineSize = (
  name: string,
  base: number,
  width: number,
  floor: number,
): number => {
  const length = name.trim().length;
  if (length === 0) return base;
  const fitting = width / (length * NAME_ADVANCE_RATIO);
  return Math.floor(Math.max(floor, Math.min(base, fitting)));
};

/** The estimated set width of `text` at `size`, on the same ratio as fitting. */
export const estimatedLineWidth = (text: string, size: number): number =>
  text.length * NAME_ADVANCE_RATIO * size;

/**
 * The one-line name as drawn: its size, and its text cut to fit with a `…`
 * when even the floor size overflows. Cut here rather than by satori's
 * `textOverflow`, which clipped the ellipsis's last dot at the box edge.
 */
export const fitLine = (
  name: string,
  base: number,
  width: number,
  floor: number,
): { size: number; text: string } => {
  const text = name.trim();
  const size = fitLineSize(text, base, width, floor);
  if (estimatedLineWidth(text, size) <= width) return { size, text };
  const keep = Math.max(1, Math.floor(width / (NAME_ADVANCE_RATIO * size)) - 1);
  return { size, text: `${text.slice(0, keep).trimEnd()}…` };
};
