import { formatEventDate } from '@/components/consumer/definitions/lib';
import { EVENT_STAGE_COPY } from '../definitions/copy';

/**
 * "Fri Nov 13 · The Church Nightclub", in the venue's own zone. Built from two
 * formats rather than one so the weekday carries no comma, as drawn; the line
 * renders in mono caps.
 */
export const stageMetaLine = (
  date: string,
  timezone: string,
  venueName: string,
): string => {
  const weekday = formatEventDate(date, timezone, { weekday: 'short' });
  const monthDay = formatEventDate(date, timezone, {
    month: 'short',
    day: 'numeric',
  });
  return EVENT_STAGE_COPY.meta(`${weekday} ${monthDay}`, venueName);
};
