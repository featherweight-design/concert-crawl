export const SETTINGS_COPY = {
  anonymousLabel: 'anonymous fan',
  anonymousExplainer:
    "You're browsing as an anonymous fan. Pick a handle to get credit for your price submissions (it applies retroactively).",
  goingAnonymousWarning:
    'Clearing your handle makes you anonymous again. Your past submissions will no longer show your name.',
  handlePlaceholder: 'lowercase_handle',
  handleHint: 'Lowercase letters, numbers, underscores. 3–20 characters.',
  handleErrors: {
    tooShort: 'Handle must be at least 3 characters.',
    invalidChars: 'Only lowercase letters, numbers, and underscores.',
    reserved: 'That handle is reserved.',
    taken: 'That handle is taken.',
  },
  cityPlaceholder: 'Denver',
  cityHint: 'Never shown publicly.',
  planCard: {
    founder: {
      badge: 'Founder',
      yourPlanLabel: 'Your plan',
      tagline: 'Free for life.',
      body: 'You showed up during the private beta — you keep Concert Crawl free, forever. No card needed.',
      subline: '— Yes, even when we charge new users.',
    },
    paid: {
      badge: 'Supporter',
      tagline: 'Supporting Concert Crawl.',
      subline: 'Thank you.',
    },
    trial: {
      badge: 'Trial',
      tagline: 'days remaining',
      subline: 'Upgrade to keep your access.',
    },
    pastDue: {
      badge: 'Past due',
      tagline: 'Payment failed.',
      cta: 'Update billing →',
    },
  },
  dangerZone: {
    signOut: 'Sign out',
    signOutSubtitle: "Burn your tokens. We'll remember you.",
    deleteAccount: 'Delete account',
    deleteAccountSubtitle:
      'Permanently remove your handle, profile, and history.',
    deleteCardBody:
      "This is permanent. Your handle, email, and plan are gone. Price submissions stay on the public record — your name is removed from them. You can't undo it.",
    deleteAccountCta: 'Delete my account',
    deleteSheetTitle: 'Delete account permanently',
    deleteSheetBody:
      "Your handle and profile will be gone. Price submissions you made will stay (they're part of the public record), but your name will be removed from them. Other fans' confirmations belong to them.",
    deleteConfirmPlaceholder: 'Type DELETE to enable',
    deleteButtonArmed: 'Delete my account permanently',
    deleteButtonDisabled: 'Type DELETE to enable',
  },
  planSection: 'Your plan',
  appearanceSection: 'Appearance',
  accountSection: 'Account',
  submissionsSection: 'My submissions',
  listsSection: 'Lists',
  dangerSection: 'Danger zone',
  seeAllSubmissions: (submissionCount: number) =>
    `See all ${submissionCount} →`,
  emailRow: 'Email',
  connectedAccountRow: 'Connected Account',
  passwordRow: 'Password',
  clerkLinkLabel: 'Manage via Clerk →',
  watchlistRow: 'Saved shows',
  watchlistComingSoon: 'Coming soon',
}
