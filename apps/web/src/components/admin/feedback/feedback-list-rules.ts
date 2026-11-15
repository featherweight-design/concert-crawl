import { z } from 'zod';
import {
  ADMIN_FEEDBACK_STATUSES,
  FEEDBACK_CATEGORIES,
  type AdminFeedbackCounts,
  type AdminFeedbackItem,
  type AdminFeedbackKind,
  type FeedbackCategory,
} from '@concert-crawl/types';
import type { Kind } from '@/components/admin/primitives';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import { formatISODate } from '@/lib/time';

const COPY = ADMIN_COPY.feedback.row;
const MT = 'America/Denver';

/** The list's chips (`07/feedback`): the To read view, a kind inside it, or Done. */
export type FeedbackChip = 'to_read' | AdminFeedbackKind | 'done';

/** The kind chips, in the board's order; the phone draws no Venues. */
export const KIND_CHIPS = ['bugs', 'ideas', 'venues'] as const;
export const PHONE_KIND_CHIPS = ['bugs', 'ideas'] as const;

/** The list read: the view, the kind inside To read, and Done's search. */
export const listPath = (chip: FeedbackChip, search: string): string => {
  const params = new URLSearchParams({
    view: chip === 'done' ? 'done' : 'to_read',
  });
  if (chip !== 'to_read' && chip !== 'done') params.set('kind', chip);
  const query = search.trim();
  if (chip === 'done' && query) params.set('search', query);
  params.set('limit', '200');
  return `/v1/admin/feedback?${params}`;
};

const itemSchema = z.object({
  id: z.string(),
  userId: z.string().nullable(),
  submittedBy: z.string().nullable(),
  pageUrl: z.string(),
  category: z.enum(FEEDBACK_CATEGORIES),
  message: z.string(),
  metadata: z.record(z.string(), z.unknown()).nullable(),
  status: z.enum(ADMIN_FEEDBACK_STATUSES),
  adminNotes: z.string().nullable(),
  issueUrl: z.string().nullable(),
  createdAt: z.string(),
  resolvedBy: z.string().nullable(),
  resolvedAt: z.string().nullable(),
}) satisfies z.ZodType<AdminFeedbackItem>;

const listSchema = z.object({
  success: z.literal(true),
  data: z.array(itemSchema),
});

const count = z.number().int().nonnegative();
const countsSchema = z.object({
  success: z.literal(true),
  data: z.object({
    unread: count,
    toRead: count,
    done: count,
    kinds: z.object({ bugs: count, ideas: count, venues: count }),
  }),
}) satisfies z.ZodType<{ data: AdminFeedbackCounts }>;

/** `GET /v1/admin/feedback`'s rows, or null when the body isn't that shape. */
export const parseFeedbackList = (raw: unknown): AdminFeedbackItem[] | null => {
  const parsed = listSchema.safeParse(raw);
  return parsed.success ? parsed.data.data : null;
};

const oneSchema = z.object({ success: z.literal(true), data: itemSchema });

/** `GET /v1/admin/feedback/:id`'s item, or null when the body isn't that shape. */
export const parseFeedbackItem = (raw: unknown): AdminFeedbackItem | null => {
  const parsed = oneSchema.safeParse(raw);
  return parsed.success ? parsed.data.data : null;
};

/** `GET /v1/admin/feedback/counts`, or null when the body isn't that shape. */
export const parseFeedbackCounts = (
  raw: unknown,
): AdminFeedbackCounts | null => {
  const parsed = countsSchema.safeParse(raw);
  return parsed.success ? parsed.data.data : null;
};

/**
 * Each category's label. Praise and other have no drawn kind, so they take
 * IDEA's, the nearest: like ideas, they wait here and never reach Needs you.
 */
export const FEEDBACK_KIND: Record<FeedbackCategory, Kind> = {
  bug: 'bug',
  error_report: 'errorReport',
  idea: 'idea',
  venue_suggestion: 'venueSuggestion',
  praise: 'idea',
  other: 'idea',
};

/**
 * The row's kind. The error page's Tell us card stores a bug with
 * `metadata.source = 'error'`, so that reads ERROR REPORT too (addendum 7 §2).
 */
export const kindOf = (item: AdminFeedbackItem): Kind =>
  item.metadata?.['source'] === 'error'
    ? 'errorReport'
    : FEEDBACK_KIND[item.category];

// The API hands out a screenshot only once it has passed the full check
// (admin/feedback.ts sanitisedMetadata), always under `screenshot`, so the
// row's mark needs only the cheap prefix test, not the whole pattern over a
// multi-megabyte string on every render. The <img> keeps the full check.
const hasScreenshot = (item: AdminFeedbackItem): boolean => {
  const screenshot = item.metadata?.['screenshot'];
  return typeof screenshot === 'string' && /^data:image\//i.test(screenshot);
};

/**
 * The row's marks (addendum 7 `04/feedback-hints`): Screenshot when one came
 * with it, then Also in Needs you while Needs you lists it, which is an unread
 * bug (`needs-you/sources.ts` reads the same rule). Empty for most rows.
 */
export const rowHints = (item: AdminFeedbackItem): string[] => [
  ...(hasScreenshot(item) ? [COPY.screenshot] : []),
  ...(item.category === 'bug' && item.status === 'unread'
    ? [COPY.alsoInNeedsYou]
    : []),
];

/** The row's title: the message's first non-empty line. */
export const firstLine = (message: string): string =>
  message
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line.length > 0) ?? '';

/** "Nov 8", in Mountain Time. */
export const shortDay = (iso: string): string =>
  formatISODate(iso, MT, { month: 'short', day: 'numeric' });

/**
 * "@handle · Nov 8": who sent it (Sentry for an error report with no user
 * behind it; a user with no handle is left out) and when. The page label is left out: there is no helper that
 * names a page from its URL yet.
 */
export const metaLine = (item: AdminFeedbackItem): string => {
  const who = item.submittedBy
    ? COPY.handle(item.submittedBy)
    : item.category === 'error_report' && item.userId === null
      ? COPY.sentry
      : null;
  return [who, shortDay(item.createdAt)]
    .filter((part): part is string => part !== null)
    .join(COPY.separator);
};

/**
 * A Done row's right side: "Done by @hugh · Nov 8", "Done · Nov 8" with no
 * recorded admin, and "Done" with neither (ruling 7).
 */
export const doneLine = (item: AdminFeedbackItem): string => {
  const who = item.resolvedBy ? COPY.doneBy(item.resolvedBy) : COPY.done;
  return item.resolvedAt
    ? [who, shortDay(item.resolvedAt)].join(COPY.separator)
    : who;
};
