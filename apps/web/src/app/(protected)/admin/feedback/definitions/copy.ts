// Shown on the admin feedback inbox page (/admin/feedback) — filter chips and panel titles

export const FEEDBACK_PAGE_COPY = {
  eyebrow: 'operations · users',
  title: 'Feedback',
  subtitle:
    'Inbox for in-app feedback (and Sentry, soon email). Triage: mark read, flag for investigation, open a GH issue, or archive.',
  unreadBadgeSuffix: 'unread',
  statusChips: {
    all: 'All',
    unread: 'Unread',
    flagged: 'Flagged',
    issue_opened: 'Issue opened',
    resolved: 'Resolved',
    archived: 'Archived',
  },
  panelTitle: {
    all: 'Active feedback',
    unread: 'Unread feedback',
    flagged: 'Flagged feedback',
    issue_opened: 'Issues opened',
    resolved: 'Resolved feedback',
    archived: 'Archived feedback',
    read: 'Read feedback',
  },
  statCards: {
    lastSevenDays: 'Last 7 days',
    unread: 'Unread',
    flagged: 'Flagged',
    flaggedHint: 'awaiting investigation',
    issuesOpened: 'Issues opened',
    issuesOpenedHint: 'this month',
  },
  itemsCountSuffix: 'items',
  markAllRead: 'Mark all read',
  loadingState: 'Loading…',
  emptyState: 'No feedback in this category',
} as const
