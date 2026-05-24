// Shown in the delete venue confirmation dialog on the venue detail page
export const deleteVenueConfirmCopy = {
  trigger: 'Delete venue…',
  header: {
    eyebrow: 'Destructive action',
    description:
      "This can't be undone. The venue config, crawl schedule, and ticketing defaults will be removed.",
  },
  removed: {
    heading: 'What gets removed',
    items: [
      'Venue config (name, slug, source URL, ticketing)',
      'Crawl schedule + extraction strategy + history',
      'About / Capacity / Neighborhood editorial copy',
      'Identity art seed',
    ],
  },
  survives: {
    heading: 'What survives',
    items: [
      'Individual event records (orphaned, can be re-linked or re-deleted manually)',
      'Fan-submitted prices and confirmations on those events',
    ],
  },
  gate: {
    label: 'Type',
    keyword: 'DELETE',
    labelSuffix: 'to confirm.',
    placeholder: 'DELETE',
  },
  actions: {
    keep: 'Keep venue',
    deleting: 'Deleting…',
    deletePermanently: 'Delete permanently',
    typeToEnable: 'Type DELETE to enable',
  },
  errors: {
    deleteFailed: 'Delete failed — please try again',
  },
} as const
