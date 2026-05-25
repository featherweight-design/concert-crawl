// Shown in the waitlist modal on the public landing page
export const COPY = {
  closeButtonAriaLabel: 'Close',
  success: {
    heading: "You're on the list.",
    body: "We'll email you the moment a beta slot opens up. Thanks for caring about live music.",
    closeButton: 'Close',
  },
  form: {
    eyebrow: 'Waitlist',
    heading: 'Get on the list',
    body: "We're letting people in slowly. Drop your email — we'll ping you when there's room.",
    errorMessage: 'Something went wrong. Try again.',
    emailLabel: 'Email',
    emailPlaceholder: 'you@email.com',
    submittingButton: 'Adding you…',
    submitButton: 'Add me to the list',
    footerNote: "No spam. We'll only email when there's beta access.",
  },
} as const
