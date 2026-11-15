import type { AdminFeedbackItem, FeedbackCategory } from '@concert-crawl/types';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';

const REPO = 'featherweight-design/concert-crawl';
const CATEGORY_LABEL = ADMIN_COPY.feedback.row.categoryLabel;

/**
 * The issue's `type:` label, from the repo's own set (bug, feature, polish,
 * chore, design). There is no venue label, so a suggestion is a feature.
 */
export const ISSUE_TYPE: Record<FeedbackCategory, string> = {
  bug: 'type: bug',
  error_report: 'type: bug',
  idea: 'type: feature',
  venue_suggestion: 'type: feature',
  praise: 'type: polish',
  other: 'type: polish',
};

/** A metadata field as a string, or nothing: the jsonb is free-form. */
export const metaString = (
  item: AdminFeedbackItem,
  key: string,
): string | undefined => {
  const value = item.metadata?.[key];
  return typeof value === 'string' && value.trim() !== '' ? value : undefined;
};

/**
 * The GitHub button's target: a new issue staged from the feedback's words
 * and context, labelled for triage. A linked issue opens instead.
 */
export const buildGitHubIssueUrl = (item: AdminFeedbackItem): string => {
  const route = (() => {
    try {
      return new URL(item.pageUrl).pathname;
    } catch {
      return item.pageUrl;
    }
  })();
  const device = metaString(item, 'userAgent') ?? metaString(item, 'device');
  const title = `[${CATEGORY_LABEL[item.category]}] ${item.message.slice(0, 72)}`;
  const body = [
    `**User feedback:**`,
    item.message,
    ``,
    `**Context:**`,
    `- Route: ${route}`,
    metaString(item, 'theme') ? `- Theme: ${metaString(item, 'theme')}` : null,
    metaString(item, 'build') ? `- Build: ${metaString(item, 'build')}` : null,
    metaString(item, 'doing')
      ? `- Was doing: ${metaString(item, 'doing')}`
      : null,
    metaString(item, 'digest')
      ? `- Error ID: ${metaString(item, 'digest')}`
      : null,
    metaString(item, 'sentryEventId')
      ? `- Sentry event: ${metaString(item, 'sentryEventId')}`
      : null,
    device ? `- Device: ${device}` : null,
    // The repo is public: the handle, never the Clerk id.
    item.submittedBy ? `- From: @${item.submittedBy}` : null,
    `- Submitted: ${new Date(item.createdAt).toISOString()}`,
  ]
    .filter(Boolean)
    .join('\n');
  const labels = [
    ISSUE_TYPE[item.category],
    'source: beta-feedback',
    'phase: beta',
    'priority: normal',
  ].join(',');

  return `https://github.com/${REPO}/issues/new?title=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}&labels=${encodeURIComponent(labels)}`;
};

/** Where GitHub goes: the linked issue when there is one, else a new one. */
export const githubHref = (item: AdminFeedbackItem): string =>
  item.issueUrl ?? buildGitHubIssueUrl(item);
