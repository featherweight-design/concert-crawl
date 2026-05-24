// Shown in the price submission modal, accessible from event detail and watching pages

export const copy = {
  modal: {
    ariaLabel: 'Submit price',
    closeAriaLabel: 'Close',
    checkingLabel: 'Checking…',
  },
  header: {
    eyebrow: {
      error: 'Hmm · stalled',
      success: 'Got it · submitted',
      alreadySubmitted: 'Already submitted',
      open: 'Community prices · open',
    },
    code: {
      error: 'ERR',
      success: 'SENT',
      alreadySubmitted: 'DONE',
      open: 'OPEN',
    },
  },
  form: {
    contextEyebrow: 'Submit a price',
    antiabuseNotice:
      'Prices are capped at $2000. Submissions stay pending until 2 fans confirm.',
    floorLabel: 'Floor',
    floorPlaceholder: '35',
    ceilingLabel: 'Ceiling',
    ceilingPlaceholder: '75',
    tierLabel: 'Tier *',
    vendorLabel: "Where it's listed *",
    howFoundLabel: 'How you found out *',
    footerNote: 'Anonymous to other fans. Rate-limited at 1 per show per 24h.',
    submitButton: 'Submit price',
  },
  statusRail: {
    errorLabel: "Didn't save · price channel",
    errorCode: 'ERR · 503',
  },
  success: {
    heading: 'Got it.',
    body: 'Your price is pending — two more fans confirming it moves it out of pending.',
    backButton: 'Back to show',
  },
  error: {
    heading: "Didn't go through.",
    networkWithdrawError:
      'Couldn’t reach the server — check your connection and try again.',
    apiWithdrawError:
      'Something went wrong withdrawing your submission. Try again or come back later.',
    defaultError:
      'Couldn’t reach the server — your inputs are still here. Try again or come back later.',
    tryAgainButton: 'Try again',
    closeButton: 'Close',
  },
  alreadySubmitted: {
    heading: 'Already in.',
    limitNote: 'You can submit one price per show every 24h.',
    editButton: 'Edit submission',
    withdrawButton: 'Withdraw',
  },
} as const
