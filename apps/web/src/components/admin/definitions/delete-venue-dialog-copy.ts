// Shown when deleting a venue from the admin venues page — confirmation dialog

export const DELETE_VENUE_DIALOG_COPY = {
  trigger: 'Delete…',
  header: {
    dangerLabel: 'danger · permanent',
    titlePrefix: 'Delete',
  },
  body: {
    description:
      'This will permanently delete the venue and detach all events that reference it. This cannot be undone.',
    consequences: {
      venueDeleted: 'deleted from',
      venueTable: 'venues',
      tableSuffix: 'table.',
      eventsNulled: 'will have their',
      venueIdField: 'venue_id',
      nulledSuffix: 'nulled. Events remain published.',
      crawlsStop: 'All scheduled crawls for this venue stop immediately.',
      publicPagePrefix: 'Public page at',
      publicPagePath: 'concertcrawl.app/v/…',
      publicPageSuffix: 'will 404.',
    },
  },
  confirmInput: {
    labelPrefix: 'Type',
    labelSuffix: 'to confirm',
    matchMessage: 'Match — delete is now enabled.',
    mismatchPrefix: "Doesn't match",
    mismatchSuffix: '. Type exactly, including capitalization.',
  },
  footer: {
    escCancel: 'cancel',
    cancelButton: 'Cancel',
    deleteButtonIdle: 'Delete venue',
    deleteButtonPending: 'Deleting…',
  },
  errors: {
    deleteFailed: 'Delete failed. Please try again.',
  },
} as const
