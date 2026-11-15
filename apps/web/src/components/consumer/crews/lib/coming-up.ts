// What the crew page's Coming up row says about a show (addendum 6 item 41,
// board 41/crew-coming-up). Pure, so the six states are testable without a DOM.

import type { CrewMemberPreview, CrewShow } from '@concert-crawl/types';

import { stubDate } from './format';

/** Today's `YYYY-MM-DD` in Mountain Time, the zone every show date is read in. */
export const todayMt = (now: Date = new Date()): string =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Denver' }).format(now);

export const isTonight = (iso: string, now: Date = new Date()): boolean =>
  iso === todayMt(now);

export interface TileParts {
  weekday: string;
  day: string;
  month: string;
}

/** "FRI" / "6" / "MAR" from `YYYY-MM-DD`, on the same anchored date as the stub. */
export const tileParts = (iso: string): TileParts => {
  const { month, day } = stubDate(iso);
  const anchored = new Date(`${iso}T12:00:00Z`);
  const weekday = Number.isNaN(anchored.getTime())
    ? ''
    : new Intl.DateTimeFormat('en-US', {
        weekday: 'short',
        timeZone: 'UTC',
      })
        .format(anchored)
        .toUpperCase();
  return { weekday, day, month };
};

/** Names on the going line: you first, then whoever else, at most this many. */
const MAX_NAMES = 2;
/** Faces drawn before the count carries the rest. */
const MAX_FACES = 3;

export interface GoingSummary {
  /** Whether the viewer is among the people going. */
  youGoing: boolean;
  /** Up to three, the viewer first. */
  faces: CrewMemberPreview[];
  /** Up to two display names, the viewer first as `youLabel`. */
  names: string[];
  /** How many going are not named in `names`. */
  more: number;
}

/**
 * The going line's parts. The viewer is named first ("YOU, MIRA +2"); a member
 * with no handle is counted and drawn but never given an invented name, so
 * they land in `more`.
 */
export const summariseGoing = (
  show: CrewShow,
  viewerId: string | null,
  youLabel: string,
): GoingSummary => {
  const mine = show.going.filter((member) => member.userId === viewerId);
  const others = show.going.filter((member) => member.userId !== viewerId);
  const youGoing = mine.length > 0;

  const otherNames = others.flatMap((member) =>
    member.handle === null || member.handle === ''
      ? []
      : [member.handle.toUpperCase()],
  );
  const names = [...(youGoing ? [youLabel] : []), ...otherNames].slice(
    0,
    MAX_NAMES,
  );

  return {
    youGoing,
    faces: [...mine, ...others].slice(0, MAX_FACES),
    names,
    more: Math.max(0, show.goingCount - names.length),
  };
};

/** "4 GOING · YOU, MIRA +2": the count first, then who, then how many more. */
export const goingLine = (
  count: number,
  summary: GoingSummary,
  going: string,
): string => {
  const head = `${count} ${going}`;
  if (summary.names.length === 0) return head;
  const more = summary.more > 0 ? ` +${summary.more}` : '';
  return `${head} · ${summary.names.join(', ')}${more}`;
};
