export const REPORTING_COPY = {
  // ── ReportFooterLink ─────────────────────────────────────────────
  reportFooterLink: {
    eyebrow: 'Spot something off?',
    title: 'Report a status change',
    titleHasStatus: 'Tickets still available?',
    subtitle: 'Sold out, cancelled, or postponed? Let fans know.',
    subtitleHasStatus: (statusLabel: string) =>
      `A fan reported this show as ${statusLabel}. If there's new information, let the people know!`,
    bottomNote:
      'Reports are reviewed by the community. Good-faith reports help everyone.',
    // The gate is announced, not drawn (#1247): signed out the row looks
    // identical and only the accessible name carries the invitation.
    ariaSignedOut: 'Report a status change: sign up to report',
    ariaSignedOutHasStatus: 'Tickets still available? Sign up to report',
  },

  // ── ReportSheet ──────────────────────────────────────────────────
  reportSheet: {
    // Radiogroup wrapping the status options
    typeGroupAriaLabel: 'Report type',
    eyebrow: 'Status report',
    eyebrowContext: 'Status report',
    cancelButton: 'Cancel',
    heading: 'What happened?',
    headingContext: 'What changed?',
    subtitle:
      'We surface this to other fans so they can confirm. Pick the closest match. You can add detail on the next step.',
    subtitleByStatus: {
      'sold-out':
        "This show is currently marked as sold out. Tell us what you saw. We'll route it to other fans to confirm.",
      cancelled:
        "This show is currently marked as cancelled. Tell us what you saw. We'll route it to other fans to confirm.",
      postponed:
        "This show is currently marked as postponed. Tell us what you saw. We'll route it to other fans to confirm.",
    } as Record<string, string>,
    currentlyLive: 'Currently live',

    options: {
      soldOut: {
        title: 'Sold out',
        subtitle: 'Tickets are no longer available from the primary vendor.',
      },
      postponed: {
        title: 'Postponed',
        subtitle:
          "Show is rescheduled to a later date. We'll keep the page up.",
      },
      cancelled: {
        title: 'Cancelled',
        subtitle: 'Show is off entirely. Removes it from upcoming.',
      },
      available: {
        title: 'Tickets available',
        subtitle: 'Tickets are back. The sold-out flag is wrong or stale.',
      },
    },

    footnote:
      "We'll ask how you know on the next step. An email from the venue, an artist's social post, or a venue announcement all count: anything we can point other fans at.",

    continueButton: 'Continue →',
    continueHint: 'Pick what changed to continue',
  },

  // ── EvidenceForm ─────────────────────────────────────────────────
  evidenceForm: {
    // Radiogroup wrapping the evidence options
    methodGroupAriaLabel: 'Evidence method',
    // Footnote explaining what happens after the report is filed
    // The count is the one the API applies to this show (ER_POLICY).
    promotionNote: (confirmsNeeded: number) =>
      `Live after ${confirmsNeeded} fan confirms · or admin promotion`,
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
        label: 'I was there or called the venue',
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

    imminentWarning: (
      daysUntil: number,
      confirmsNeeded: number,
      usualConfirms: number,
    ) =>
      `This show is in ${daysUntil} days, so reports need ${confirmsNeeded} confirms instead of ${usualConfirms}.`,

    submitButton: 'File report',
  },

  // ── ReportTypeMark ───────────────────────────────────────────────
  reportTypeMark: {
    pendingLabel: 'pending',
    pendingDot: '·',
  },

  // ── ConfirmReportSheet ───────────────────────────────────────────
  confirmReportSheet: {
    // Radiogroup wrapping the verify options
    methodGroupAriaLabel: 'Confirmation method',
    eyebrow: 'Confirm report',
    cancelButton: 'Cancel',
    heading: 'Is this right?',
    subtitle: 'Only what you know firsthand.',
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
    counterReportLink: "This isn't right. File a counter-report.",
  },

  // ── LiveReportBanner ─────────────────────────────────────────────
  liveReportBanner: {
    headlines: {
      'sold-out': 'This show is sold out.',
      cancelled: 'This show has been cancelled.',
      postponed: 'This show has been postponed.',
    },
    reportedBy: (handle: string, confirmCount: number, timeAgo: string) =>
      `Reported by @${handle} · ${confirmCount} confirms · ${timeAgo}`,
    reportedAnonymous: (confirmCount: number, timeAgo: string) =>
      `${confirmCount} confirms · ${timeAgo}`,
  },

  // ── PendingSoldOutCard ───────────────────────────────────────────
  pendingSoldOutCard: {
    stripBadge: 'Sold out · pending',
    confirmsProgress: (confirms: number, needed: number) =>
      `${confirms} of ${needed}`,
    soldOutPill: 'Sold out',
    reportedBy: (handle: string) => `Reported by @${handle}`,
    reportedAnonymously: 'Reported anonymously',
    footerQuestion: 'Tickets still available?',
    confirmButton: 'Confirm sold out',
    yourReportLabel: 'Your report',
    addEvidenceButton: 'Edit',
    withdrawButton: 'Withdraw',
    viewLink: 'View',
  },

  // ── PendingReportBanner ──────────────────────────────────────────
  pendingReportBanner: {
    confirmProgress: (confirms: number, needed: number) =>
      `${confirms} of ${needed}`,
    cancelledBadge: 'Cancelled · pending',
    postponedBadge: 'Postponed · pending',
    cancelledLead: 'A fan reports the show is cancelled.',
    postponedLead: 'A fan reports the show is being rescheduled.',
    footerQuestion: 'Saw something different?',
    confirmButton: 'Confirm',
    yourReportLabel: 'Your report',
    addEvidenceButton: 'Add evidence',
    withdrawButton: 'Withdraw',
    waitingForConfirms: 'Waiting for confirms',
    // Link out to the evidence URL attached to a report
    viewEvidenceLink: 'VIEW',
    attributionPrefix: 'Reported by',
    attributionSelf: 'you',
    reportedBy: (handle: string) => `@${handle}`,
    reportedAnonymously: 'Anonymous',
  },
} as const
