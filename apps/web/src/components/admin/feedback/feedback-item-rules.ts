import {
  ADMIN_FEEDBACK_VIEW_STATUSES,
  type AdminFeedbackItem,
} from '@concert-crawl/types';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import {
  pageNameOf,
  pagePathOf,
} from '@/components/admin/needs-you/needs-you-rules';
import { deviceSummary } from '@/components/consumer/error-report/lib/report-context';
import { formatISODate } from '@/lib/time';
import { firstLine, kindOf, shortDay } from './feedback-list-rules';
import { metaString } from './github-issue';

const COPY = ADMIN_COPY.feedback.item;
const ROW = ADMIN_COPY.feedback.row;
const MT = 'America/Denver';

/** A Done item: resolved, archived, or moved there by an opened issue. */
export const isDoneItem = (item: AdminFeedbackItem): boolean =>
  ADMIN_FEEDBACK_VIEW_STATUSES.done.some((status) => status === item.status);

/** "Nov 7 · 9:02 PM", in Mountain Time. */
export const whenLine = (iso: string): string =>
  COPY.when(
    shortDay(iso),
    formatISODate(iso, MT, { hour: 'numeric', minute: '2-digit' }),
  );

/** The page by the nav's name ("Event"), or its path when it has none. */
export const pageLabel = (pageUrl: string): string =>
  pageNameOf(pageUrl) ?? pagePathOf(pageUrl);

/**
 * The title and the quote under it. A bug or idea is titled by its first
 * line and quotes the rest (none when it was one line); an error report and a
 * venue suggestion carry a set title and quote the whole message (addendum 7).
 */
export const headOf = (
  item: AdminFeedbackItem,
): { title: string; quote: string | null } => {
  const kind = kindOf(item);
  if (kind === 'errorReport')
    return {
      title: COPY.errorTitle(pageLabel(item.pageUrl)),
      quote: item.message.trim() || null,
    };
  if (kind === 'venueSuggestion')
    return { title: COPY.venueTitle, quote: item.message.trim() || null };
  const title = firstLine(item.message);
  const lines = item.message.split(/\r?\n/);
  const at = lines.findIndex((line) => line.trim() !== '');
  const rest = lines
    .slice(at + 1)
    .join('\n')
    .trim();
  return { title, quote: rest || null };
};

/** Who sent it: the handle, Sentry for an error report with no user (4a's rule), else nothing. */
export const fromOf = (item: AdminFeedbackItem): string | null =>
  item.submittedBy
    ? ROW.handle(item.submittedBy)
    : item.category === 'error_report' && item.userId === null
      ? ROW.sentry
      : null;

/** The device the reporter's widget named, or one read from its user agent. */
const deviceOf = (item: AdminFeedbackItem): string | undefined => {
  const named = metaString(item, 'device');
  if (named) return named;
  const agent = metaString(item, 'userAgent');
  return agent ? deviceSummary(agent) : undefined;
};

export type FieldKey = keyof typeof COPY.fields;

export interface Field {
  key: FieldKey;
  value: string;
  /** Page and Sent from link to the page; From to the person. */
  href?: string;
  /** Error ID and Sentry event: mono, with Copy. */
  mono?: boolean;
}

/**
 * The item's field lines, in each board's order; a line with no value is
 * left out (addendum 7). `personHref` is the From line's link, when the
 * reporter is still a person the admin can open.
 */
export const fieldsOf = (
  item: AdminFeedbackItem,
  personHref: string | null,
): Field[] => {
  const kind = kindOf(item);
  const from = fromOf(item);
  const fromField: Field[] = from
    ? [
        {
          key: 'from',
          value: from,
          ...(item.submittedBy && personHref ? { href: personHref } : {}),
        },
      ]
    : [];
  const page: Field = {
    key: 'page',
    value: pageLabel(item.pageUrl),
    href: item.pageUrl,
  };
  const optional = (
    key: FieldKey,
    value: string | undefined,
    mono = false,
  ): Field[] => (value ? [{ key, value, ...(mono ? { mono } : {}) }] : []);

  if (kind === 'venueSuggestion')
    return [...fromField, { ...page, key: 'sentFrom' }];
  if (kind === 'errorReport')
    return [
      page,
      ...optional('doing', metaString(item, 'doing')),
      ...optional('build', metaString(item, 'build')),
      ...optional('device', deviceOf(item)),
      ...optional('errorId', metaString(item, 'digest'), true),
      ...optional('sentryEvent', metaString(item, 'sentryEventId'), true),
      ...fromField,
    ];
  return [
    page,
    ...optional('device', deviceOf(item)),
    ...optional('build', metaString(item, 'build')),
    ...fromField,
  ];
};

/** The screenshot sent with a bug, when one was. */
export const screenshotOf = (item: AdminFeedbackItem): string | undefined =>
  metaString(item, 'screenshot') ?? metaString(item, 'screenshotDataUrl');

/** Reply is drawn for a bug or an idea still to read, with a person behind it. */
export const showsReply = (item: AdminFeedbackItem): boolean => {
  const kind = kindOf(item);
  return (
    !isDoneItem(item) &&
    item.userId !== null &&
    (kind === 'bug' || kind === 'idea')
  );
};
