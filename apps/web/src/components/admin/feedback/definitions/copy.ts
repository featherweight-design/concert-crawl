// Shown on the admin feedback page (/admin/feedback) — feedback inbox rows, filter rail, and expanded detail

export const FEEDBACK_COPY = {
  row: {
    statusLabel: {
      unread: 'Unread',
      flagged: 'Flagged',
      issue_opened: 'Issue opened',
      resolved: 'Resolved',
      read: 'Read',
      archived: 'Archived',
    },
    screenshotBadge: 'screenshot',
  },
  filterRail: {
    viewLabel: 'View',
    sourceLabel: 'Source',
    statusItems: {
      all: 'All',
      unread: 'Unread',
      flagged: 'Flagged',
      issue_opened: 'Issue opened',
      resolved: 'Resolved',
      archived: 'Archived',
    },
    sourceItems: {
      feedback_surface: 'FeedbackSurface',
      sentry: 'Sentry',
      email: 'Email',
    },
    soonBadge: 'soon',
  },
  expanded: {
    sectionLabels: {
      fullBody: 'full body',
      screenshot: 'screenshot',
      adminNotes: 'admin notes',
      context: 'context',
      linkedIssue: 'linked issue',
      createIssue: 'create issue',
    },
    screenshotPlaceholder: 'User-attached screenshot',
    openFullSize: 'Open full size',
    adminNotesPlaceholder: 'Internal note — visible to you, not to the user…',
    createIssuePrompt:
      'Stage a GitHub issue using this feedback’s body + context strip as the description. You can edit before submit.',
    openInGitHub: 'Open in GitHub…',
    copyUrlTitle: 'Copy URL',
    actions: {
      markRead: 'Mark read',
      markUnread: 'Mark unread',
      flag: 'Flag for investigation',
      unflag: 'Unflag',
      openInGitHub: 'Open in GitHub…',
      resolve: 'Resolve',
      archive: 'Archive',
    },
    contextRowLabels: {
      route: 'Route',
      theme: 'Theme',
      build: 'Build',
      device: 'Device',
      submitted: 'Submitted',
      userId: 'User ID',
    },
  },
} as const
