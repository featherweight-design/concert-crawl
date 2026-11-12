import type { EventStatus } from '@concert-crawl/types';
import { formatEventDate } from '@/components/consumer/definitions/lib';
import { EVENT_STAGE_COPY } from '../definitions/copy';

const dateLabel = (date: string, timezone: string): string => {
  const weekday = formatEventDate(date, timezone, { weekday: 'short' });
  const monthDay = formatEventDate(date, timezone, {
    month: 'short',
    day: 'numeric',
  });
  return `${weekday} ${monthDay}`;
};

/**
 * "Fri Nov 13 · The Church Nightclub", in the venue's own zone. Built from two
 * formats rather than one so the weekday carries no comma, as drawn; the line
 * renders in mono caps.
 */
export const stageMetaLine = (
  date: string,
  timezone: string,
  venueName: string,
): string => EVENT_STAGE_COPY.meta(dateLabel(date, timezone), venueName);

/**
 * The meta line in two pieces, so a postponed show can strike its old date and
 * carry on with "New date TBA · Cervantes'" (more-st-ev_post_m). Every other
 * status keeps the whole line in `text` and strikes nothing.
 */
export const stageMetaParts = (
  date: string,
  timezone: string,
  venueName: string,
  status: EventStatus,
): { struck: string | null; text: string } =>
  status === 'postponed'
    ? {
        struck: dateLabel(date, timezone),
        text: EVENT_STAGE_COPY.meta(EVENT_STAGE_COPY.newDateTba, venueName),
      }
    : { struck: null, text: stageMetaLine(date, timezone, venueName) };
