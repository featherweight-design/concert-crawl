export const REPORTING_COPY = {
  // ── ReportFooterLink ─────────────────────────────────────────────
  reportFooterLink: {
    eyebrow: 'Spot something off?',
    title: 'Report a status change',
    subtitle: 'Sold out, cancelled, postponed — or back on.',
    bottomNote:
      'Reports are reviewed by the community. Good-faith reports help everyone.',
  },

  // ── ReportSheet ──────────────────────────────────────────────────
  reportSheet: {
    eyebrow: 'Report',
    eyebrowContext: 'Status report',
    cancelButton: 'Cancel',
    heading: 'What happened?',
    headingContext: 'What changed?',
    subtitleByStatus: {
      'sold-out':
        "This show is currently marked as sold out. Tell us what you saw — we'll route it to other fans to confirm.",
      cancelled:
        "This show is currently marked as cancelled. Tell us what you saw — we'll route it to other fans to confirm.",
      postponed:
        "This show is currently marked as postponed. Tell us what you saw — we'll route it to other fans to confirm.",
    } as Record<string, string>,
    currentlyShowingAs: 'Currently showing as:',

    options: {
      soldOut: {
        title: 'Sold out',
        subtitle: 'Tickets are no longer available',
      },
      postponed: {
        title: 'Postponed',
        subtitle: 'Show date has been pushed back',
      },
      cancelled: {
        title: 'Cancelled',
        subtitle: 'Show has been called off',
      },
      available: {
        title: 'Tickets available',
        subtitle: 'Tickets are back on sale',
      },
    },

    continueButton: 'Continue',
  },

  // ── EvidenceForm ─────────────────────────────────────────────────
  evidenceForm: {
    eyebrow: 'Evidence',
    cancelButton: 'Cancel',
    heading: 'How do you know?',

    evidenceOptions: {
      gotEmail: {
        label: 'Got an email',
        description: 'From the venue or ticketing service',
      },
      sawSocial: {
        label: 'Saw it on social',
        description: 'Twitter, Instagram, Facebook announcement',
      },
      venuePosted: {
        label: 'Venue posted it',
        description: 'On their website or calendar',
      },
      wasThere: {
        label: 'I was at / called the venue',
        description: 'First-hand knowledge',
      },
      somethingElse: {
        label: 'Something else',
        description: 'Other information',
      },
    },

    sourceLinkLabel: 'Source link (optional)',
    sourceLinkPlaceholder: 'https://',
    notesLabel: 'Notes (optional)',
    notesPlaceholder: 'Any other context…',
    charCountSuffix: (current: number, max: number) => `${current} / ${max}`,

    imminentWarning: (daysUntil: number) =>
      `This show is in ${daysUntil} days — reports need 3 confirms instead of 2.`,

    submitButton: 'Submit report',
  },

  // ── ReportTypeMark ───────────────────────────────────────────────
  reportTypeMark: {
    pendingDot: '·',
  },

  // ── ConfirmReportSheet ───────────────────────────────────────────
  confirmReportSheet: {
    eyebrow: 'Confirm report',
    cancelButton: 'Cancel',
    heading: 'Is this right?',
    subtitle: 'Confirm what you know about this event.',
    recapCard: {
      anonymousLabel: 'Anonymous',
    },
    verifyOptions: {
      sawSameSource: {
        label: 'I saw the same source',
        description: 'Same announcement or listing',
      },
      ownEvidence: {
        label: 'I have my own evidence',
        description: 'Different source, same conclusion',
      },
      heardFromVenue: {
        label: 'I heard from someone at the venue',
        description: 'Word of mouth, venue staff',
      },
    },
    cautionNote: 'False confirms affect your community standing.',
    confirmButton: 'Confirm',
    counterReportLink: "This isn't right — file a counter-report.",
  },

  // ── LiveReportBanner ─────────────────────────────────────────────
  liveReportBanner: {
    headlines: {
      'sold-out': 'This show is sold out.',
      cancelled: 'This show has been cancelled.',
      postponed: 'This show has been postponed.',
    },
    confirmsAndTime: (confirmCount: number, timeAgo: string) =>
      `${confirmCount} confirms · ${timeAgo}`,
  },

  // ── PendingSoldOutCard ───────────────────────────────────────────
  pendingSoldOutCard: {
    stripBadge: 'Sold out · pending',
    confirmsProgress: (confirms: number, needed: number) =>
      `${confirms}/${needed} confirms`,
    soldOutPill: 'Sold out',
    reportedBy: (handle: string) => `Reported by @${handle}`,
    reportedAnonymously: 'Reported anonymously',
    footerQuestion: 'Tickets still available?',
    confirmButton: 'Confirm sold out',
    yourReportLabel: 'Your report',
    addEvidenceButton: 'Add evidence',
    withdrawButton: 'Withdraw',
    viewLink: 'View',
  },

  // ── PendingReportBanner ──────────────────────────────────────────
  pendingReportBanner: {
    cancelledBadge: 'Cancelled · pending',
    postponedBadge: 'Postponed · pending',
    confirmsProgress: (confirms: number, needed: number) =>
      `${confirms}/${needed} confirms`,
    confirmsToGo: 'to go',
    cancelledLead: 'A fan reports the show is cancelled.',
    postponedLead: 'A fan reports the show is being rescheduled.',
    footerQuestion: 'Saw something different?',
    confirmButton: 'Confirm',
    yourReportLabel: 'Your report',
    addEvidenceButton: 'Add evidence',
    withdrawButton: 'Withdraw',
    waitingForConfirms: 'Waiting for confirms',
    reportedBy: (handle: string) => `@${handle}`,
    reportedAnonymously: 'Anonymous',
  },
} as const
