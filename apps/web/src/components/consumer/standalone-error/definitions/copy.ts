import { CONSUMER_COPY } from '@/components/consumer/definitions/copy';

// The standalone "Something went wrong" page (B+ `12-error-page`). It reuses
// the live error strings and the Tell us tab's rail and result strings, so
// those are referenced rather than restated. The strings written here were
// added after the 2026-11-11 copy review and still need one.

const live = CONSUMER_COPY.error;
const tellUs = CONSUMER_COPY.feedback;

export const DOING_LABELS = {
  browsing: 'Browsing shows',
  searching: 'Searching',
  opening: 'Opening a show',
  myShows: 'My shows',
  price: 'Submitting a price',
  other: 'Something else',
} as const;

export const STANDALONE_ERROR_COPY = {
  eyebrow: 'Error',
  heading: live.errorHeading,
  body: live.errorBody,
  signedOutBody: 'An error occurred loading this page. Try again in a moment.',
  tryAgain: live.tryAgainButton,
  signOut: live.signOutButton,
  goHome: 'Go home',
  homeLinkLabel: 'Concert Crawl home',
  errorIdLabel: 'Error ID',
  copyErrorId: 'Copy error ID',
  copiedErrorId: 'Error ID copied',

  card: {
    rail: {
      prompt: tellUs.edgeTab.label,
      sent: tellUs.modal.headerRail.success,
      failed: tellUs.modal.statusRail.errorLabel,
    },
    code: {
      prompt: 'OPTIONAL',
      form: tellUs.modal.headerRail.codeForm,
      sending: 'SENDING',
      sent: tellUs.modal.headerRail.codeSuccess,
      failed: tellUs.modal.headerRail.codeError,
    },
    heading: 'What were you doing?',
    sub: "One tap is enough. We'll send the error ID with it.",
    doing: DOING_LABELS,
    note: 'Anything else? (optional)',
    attachHeading: "We'll attach these",
    attachErrorId: 'Error ID',
    attachPage: 'Page',
    attachDevice: tellUs.modal.contextDisclosure.fields.device,
    cancel: tellUs.modal.footer.cancel,
    send: tellUs.modal.footer.submit,
    sending: tellUs.modal.footer.submitting,
    sentHeading: tellUs.modal.success.heading,
    sentBody: tellUs.modal.success.body,
    sentLabel: tellUs.modal.headerRail.codeSuccess,
    sentSummary: (doing: string | undefined, errorId: string) =>
      doing === undefined
        ? `With error ${errorId}`
        : `${doing} · with error ${errorId}`,
    failedHeading: tellUs.modal.error.heading,
    failedBody:
      "We couldn't send that just now. It's saved on this device, and we'll send it the next time Concert Crawl opens.",
    // A refusal the server would repeat: nothing is saved, so no promise.
    rejectedBody: "We couldn't send that one.",
    savedLabel: 'Saved on this device',
    sendAgain: 'Send again',
    edit: 'Edit',
  },
} as const;
