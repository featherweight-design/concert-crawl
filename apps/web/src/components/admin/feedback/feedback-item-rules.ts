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

/** What `deviceSummary` says of a user agent it can't read. */
const UNREAD_AGENT = deviceSummary('');

/**
 * The device the reporter's widget named, or one read from its user agent;
 * "Unknown device" when neither says (5d#14).
 */
export const deviceOf = (item: AdminFeedbackItem): string => {
  const named = metaString(item, 'device');
  if (named) return named;
  const agent = metaString(item, 'userAgent');
  const summary = agent ? deviceSummary(agent) : UNREAD_AGENT;
  return summary === UNREAD_AGENT ? COPY.unknownDevice : summary;
};

/** Beside the Done pill: "by @hugh, Nov 3", or nothing with no resolver. */
export const doneByOf = (item: AdminFeedbackItem): string | null =>
  item.resolvedBy
    ? COPY.doneBy(
        item.resolvedBy,
        item.resolvedAt ? shortDay(item.resolvedAt) : null,
      )
    : null;

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

  const device: Field = { key: 'device', value: deviceOf(item) };

  if (kind === 'venueSuggestion')
    return [...fromField, { ...page, key: 'sentFrom' }];
  // `12/feedback-reopen-d`: a Done item leads with From, then Page and Device.
  if (isDoneItem(item))
    return [
      ...fromField,
      page,
      device,
      ...optional('doing', metaString(item, 'doing')),
      ...optional('build', metaString(item, 'build')),
      ...optional('errorId', metaString(item, 'digest'), true),
      ...optional('sentryEvent', metaString(item, 'sentryEventId'), true),
    ];
  if (kind === 'errorReport')
    return [
      page,
      ...optional('doing', metaString(item, 'doing')),
      ...optional('build', metaString(item, 'build')),
      device,
      ...optional('errorId', metaString(item, 'digest'), true),
      ...optional('sentryEvent', metaString(item, 'sentryEventId'), true),
      ...fromField,
    ];
  return [
    page,
    device,
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
