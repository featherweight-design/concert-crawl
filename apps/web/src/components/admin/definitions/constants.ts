import type { AdminFeedbackStatus } from '@concert-crawl/types';
import type { StatusKind } from '@/components/admin/primitives/utils';

// Single source of truth for the feedback status → badge-kind mapping, shared
// by the inbox row (FeedbackRow) and the user-detail feedback history so the
// two views can't drift when a status is added or recoloured. Exhaustive over
// AdminFeedbackStatus — the compiler flags any new status that lacks a kind.
export const FEEDBACK_STATUS_KIND: Record<AdminFeedbackStatus, StatusKind> = {
  unread: 'signal',
  read: 'neutral',
  flagged: 'warning',
  issue_opened: 'danger',
  resolved: 'success',
  archived: 'neutral',
};

// The venue crawlWaitUntil values, in the order the admin toggle shows them.
export const WAIT_UNTIL_VALUES = [
  'networkidle',
  'load',
  'domcontentloaded',
] as const;
