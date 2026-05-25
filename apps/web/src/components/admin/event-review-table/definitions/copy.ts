// Shown on the admin review page — event review table

export const COPY = {
  empty: 'No events pending review. All extractions have been verified.',
  columns: {
    event: 'Event',
    date: 'Date',
    flags: 'Flags',
    source: 'Source',
    actions: 'Actions',
  },
  source: {
    viewSource: 'View source',
  },
  actions: {
    approvePending: 'Saving…',
    approve: 'Approve',
    reject: 'Reject',
    approveAriaLabel: (title: string) => `Approve ${title}`,
    rejectAriaLabel: (title: string) => `Reject ${title}`,
  },
  errors: {
    approveFailed: 'Failed to approve event. Please try again.',
    deleteFailed: 'Failed to delete event. Please try again.',
  },
  confirms: {
    deleteEvent: 'Delete this event? This cannot be undone.',
  },
} as const
