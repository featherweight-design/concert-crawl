// Shown in the floating feedback tab and modal, accessible from all consumer pages

export const copy = {
  edgeTab: {
    ariaLabel: 'Send feedback',
    label: 'Tell us · beta',
  },
  modal: {
    ariaLabel: 'Feedback',
    closeAriaLabel: 'Close feedback',
    form: {
      heading: 'Holler at us.',
      subheading:
        'Bug, idea, or praise. We read all of it — usually within a couple days.',
      categoryEyebrow: 'What kind?',
      messageEyebrow: "What's up?",
      messagePlaceholder:
        'What did you see? What did you expect? Anything that helps us reproduce it.',
      screenshotEyebrow: 'Proof (optional)',
      screenshotAttachLabel: 'Attach a screenshot',
      screenshotAttachSublabel: 'Optional · helps a lot',
      screenshotRemoveAriaLabel: 'Remove screenshot',
    },
    categories: {
      bug: 'Bug',
      idea: 'Idea',
      praise: 'Praise',
      other: 'Other',
    },
    errors: {
      categoryRequired: 'Pick a feedback category.',
      messageRequired: "Don't leave us hanging — give us a sentence.",
    },
    footer: {
      cancel: 'Cancel',
      submit: 'Send →',
      submitting: 'Sending…',
    },
    success: {
      heading: 'Loud and clear.',
      body: "Thanks for the feedback! We'll reach out if we need more information.",
      primaryAction: 'Back to the show',
      secondaryAction: 'Send another',
    },
    error: {
      heading: 'Signal lost.',
      body: "We couldn't push that to the queue just now. Your message is saved on this device — try again in a sec, or send it later.",
      primaryAction: 'Try again',
      secondaryAction: 'Save and come back',
    },
    contextDisclosure: {
      toggleLabel: "Auto-attached · what we'll send",
      fieldCount: '5 fields',
      fields: {
        route: 'Route',
        theme: 'Theme',
        build: 'Build',
        device: 'Device',
        user: 'User',
      },
    },
    headerRail: {
      form: 'Beta channel · always open',
      success: 'Got it · beta channel',
      error: 'Beta channel · stalled',
      codeForm: 'OPEN',
      codeSuccess: 'SENT',
      codeError: 'ERR',
    },
    statusRail: {
      successLabel: 'Got it · beta channel',
      errorLabel: "Didn't send · beta channel",
      successCode: '200 · OK',
      errorCode: 'ERR · 503',
    },
  },
} as const
