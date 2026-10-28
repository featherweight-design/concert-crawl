// In-page copy for the legal pages (/legal/terms, /legal/privacy,
// /legal/beta). The three pages share the back-link, the contact email, and
// the cross-links, so they live together in one file with per-page
// sub-objects. Page `metadata.title` exports are deliberately not here: they
// are browser-tab titles following one repo-wide pattern, not page copy.

export const LEGAL_COPY = {
  shared: {
    backLink: 'Concert Crawl',
    supportEmail: 'hugh@featherweight.design',
    privacyLink: 'Privacy Policy →',
    termsLink: 'Terms of Service →',
    bulletGlyph: '—',
    // The beta agreement's date. Bumped when the documents were rewritten to
    // describe what the product actually does (Gate A); the original date was
    // the day private beta opened. Terms and Privacy carry their own, so one
    // document's revision never re-dates the others.
    effectiveDate: 'Effective date: August 13, 2026',
  },

  terms: {
    heading: 'Terms of Service',
    // Revised to name Featherweight Design, LLC and to state that deleting an
    // account ends a paid plan at once without a refund.
    effectiveDate: 'Effective date: October 28, 2026',

    acceptance: {
      title: '1. Acceptance',
      body1:
        "Concert Crawl (“the Service”) is operated by Featherweight Design, LLC, a Colorado limited liability company (“we” or “us”). By creating an account or using the Service, you agree to these Terms of Service. If you don't agree, don't use the Service.",
      body2:
        "We may update these terms. When we do, we'll notify you by email and update the “Effective date” above. Continued use after notice constitutes acceptance.",
    },

    service: {
      title: '2. The Service',
      body1:
        'Concert Crawl aggregates live music event information from Denver venue websites and third-party ticketing platforms. We do not sell tickets. All ticket links redirect to the venue or an official ticketing partner.',
      body2:
        'Event data is sourced by automated crawlers and user contributions. We make reasonable efforts to keep it accurate, but we make no guarantees. Always verify show details directly with the venue before purchasing tickets.',
      // Split around the link so the destination reads as part of the sentence
      // rather than a trailing "learn more". The label names where it goes, so
      // it still says something in a screen reader's list of links.
      crawlerPrefix:
        'For what our crawler reads, and how a venue blocks it, see ',
      crawlerLinkLabel: 'our crawler page',
      crawlerSuffix: '.',
      crawlerHref: '/bot',
    },

    accounts: {
      title: '3. Accounts',
      body1:
        'You must create an account to watch shows, submit prices, or use social features. You are responsible for maintaining the security of your account and all activity that occurs under it.',
      body2:
        'You must be at least 13 years old to use the Service. Accounts are personal and may not be transferred.',
    },

    userContent: {
      title: '4. User content',
      body1:
        'You may submit price information and feedback through the Service. By submitting content, you grant Concert Crawl a non-exclusive, worldwide, royalty-free license to use, display, and distribute that content in connection with operating the Service.',
      body2:
        'You agree not to submit false, misleading, or malicious content. We may remove any content at our discretion.',
    },

    prohibited: {
      title: '5. Prohibited conduct',
      intro: 'You agree not to:',
      items: [
        'Attempt to reverse-engineer, decompile, or extract our source code',
        'Use the Service to send spam or harass other users',
        'Circumvent invite codes, rate limits, or access controls',
        'Impersonate another person or misrepresent your identity',
      ],
    },

    intellectualProperty: {
      title: '6. Intellectual property',
      body: 'The Concert Crawl name, logo, and design are owned by Featherweight Design, LLC. Event data sourced from venues remains the property of those venues. Generative artwork displayed on the Service is produced by our systems and is owned by Featherweight Design, LLC.',
    },

    subscriptions: {
      title: '7. Subscriptions and payments',
      body1:
        'Paid tiers are billed monthly through Stripe, our payment processor. We never see or store your card details. Subscriptions auto-renew each month until cancelled.',
      body2:
        'You can cancel anytime from your settings page. Cancelling stops future charges; your paid features keep working until the end of the period you already paid for. Deleting your account is different: it cancels your subscription immediately, paid features end at once, and the unused part of that period is not refunded.',
      body3:
        'The price you subscribe at is the price you keep. If we raise prices for new subscribers, your existing subscription is not affected.',
      refundsTitle: 'Refunds',
      refundsBodyPrefix:
        "Monthly charges are generally not refunded when you cancel. You keep access through the end of the billing period instead. If something went wrong (a duplicate charge, a billing bug, a charge you didn't expect), email us at",
      refundsBodySuffix:
        "and we'll make it right. Nothing here limits any refund rights you have under applicable law.",
    },

    disclaimers: {
      title: '8. Disclaimers',
      body: 'The Service is provided “as is” and “as available.” We make no warranties, express or implied, including but not limited to merchantability, fitness for a particular purpose, or accuracy of event information.',
    },

    liability: {
      title: '9. Limitation of liability',
      body: 'To the fullest extent permitted by law, Concert Crawl is not liable for any indirect, incidental, or consequential damages arising from your use of the Service, including missed shows, purchased tickets for cancelled events, or data loss.',
    },

    termination: {
      title: '10. Termination',
      body: 'We may suspend or terminate your account at any time for violation of these terms. You may delete your account at any time from your settings page.',
    },

    governingLaw: {
      title: '11. Governing law',
      body: 'These terms are governed by the laws of the State of Colorado, without regard to conflict of law principles.',
    },

    contact: {
      title: '12. Contact',
      intro: 'Questions about these terms:',
    },
  },

  privacy: {
    heading: 'Privacy Policy',
    // Revised to disclose the Spotify player on artist pages.
    effectiveDate: 'Effective date: October 28, 2026',
    collect: {
      title: 'What we collect',
      intro: "We collect only what's necessary to run the Service:",
      items: [
        'Email address: for account creation and transactional emails (via Clerk)',
        'Shows you watch and shows you mark yourself going to: to power your Watching and Concerts lists',
        'Price information you submit: used to improve data quality for everyone',
        'Feedback you send: stored to help us prioritize improvements',
        'Your username and avatar: shown on your profile',
        'Artists you follow: to tell you when they announce a Denver show',
        'Crews you join: the crew name and the fact you are a member',
        'Push notification subscriptions: only if you turn push on',
        'Your Spotify display name and the artists you follow there: only if you connect Spotify',
        'Theme preference: stored in localStorage on your device',
      ],
    },

    dontDo: {
      title: "What we don't do",
      body1: 'We do not sell your data. We do not use it for advertising.',
      body2:
        'We do not build behavioral profiles. We do not share your personal information with third parties except the service providers listed below, who are necessary to operate the product.',
    },

    providers: {
      title: 'Service providers',
      intro:
        'We use the following third-party services to operate Concert Crawl:',
      items: [
        'Clerk: authentication and account management',
        'Neon: database hosting',
        'Vercel: web application hosting',
        'Render: API and crawler hosting',
        'Sentry: error tracking (diagnostic data such as stack traces)',
        'Resend: transactional email delivery',
        'Stripe: payment processing',
        'Spotify: only if you connect a Spotify account, and only to read the artists you follow',
        "Spotify's player: an artist page we have matched to Spotify embeds it, and it loads from Spotify as you scroll to it",
      ],
      outro:
        'Each provider handles your data under their own privacy policies. We select providers that meet reasonable data protection standards.',
    },

    cookies: {
      title: 'Cookies and local storage',
      bodyPrefix:
        "We store your theme preference in your browser's localStorage. We use session cookies set by Clerk for authentication. During the private beta, we also set a short-lived cookie (",
      cookieName: 'invite_verified',
      bodySuffix:
        ") after a valid invite code is entered. It expires after 1 hour and is used only to allow access to the sign-up flow. We don't set tracking cookies or run third-party analytics scripts. The Spotify player on some artist pages is separate: it is served by Spotify, which may set its own cookies under its own privacy policy.",
    },

    retention: {
      title: 'Data retention',
      body: "Your account data is kept as long as your account is active. When you delete your account, we remove your profile, the shows you're watching, the artists you follow, your crew memberships, your notification settings, your push subscriptions, and your Spotify connection. Price submissions and feedback you've sent are anonymized rather than deleted, so the prices other people rely on stay corroborated. If you run a crew, it passes to its longest-standing remaining member; a crew with nobody else in it is deleted with your account. Billing records are kept as long as tax and accounting rules require, and administrative security logs are kept as a record of who changed what.",
    },

    rights: {
      title: 'Your rights',
      intro: 'You can:',
      items: [
        'Edit your profile at any time from Settings',
        'Delete your account from the Settings page',
        'Download everything we store on you from Settings → Account',
        'Turn off product email in Settings → Notifications, or with the one-click link in any product email. Receipts and billing notices still come through.',
      ],
    },

    children: {
      title: 'Children',
      body: 'Concert Crawl is not directed at children under 13. We do not knowingly collect information from anyone under 13.',
    },

    changes: {
      title: 'Changes to this policy',
      body: "When we make material changes to this policy, we'll notify you by email and update the “Effective date” above.",
    },

    contact: {
      title: 'Contact',
      intro: 'Privacy questions:',
    },
  },

  beta: {
    heading: 'Private Beta Agreement',

    innerCircle: {
      title: "You're in the inner circle",
      body1:
        "Concert Crawl is in private beta. That means you're one of a small group of people with early access, and we're trusting you to keep it that way.",
      body2:
        "Please don't share your invite code, post screenshots publicly, or write about the product in a way that could spread access beyond the people we've invited. We want to get things right before opening up.",
    },

    expect: {
      title: 'What to expect',
      items: [
        "Things will break. Data may disappear. Features will change. That's normal for a beta: your feedback is what fixes it.",
        "Concert data is sourced by automated crawlers. It's pretty good, but always verify show details directly with the venue before buying tickets.",
        "We don't sell tickets. Every “get tickets” link goes to the venue or an official ticketing partner.",
      ],
    },

    data: {
      title: 'Your data',
      body1:
        "We collect only what we need to run the product: your email address, the shows you watch, and the price information you optionally contribute. We don't sell your data or use it for advertising.",
      body2:
        "During the beta period, the shows you watch and your profile may be reset as we migrate the database schema. We'll give advance notice if that's coming.",
    },

    prices: {
      title: 'Price information',
      body: "Ticket prices shown on Concert Crawl are sourced from venue sites, ticketing platforms, and community submissions from beta users. They're our best estimate, not a guarantee. Prices change, and we may be behind.",
    },

    feedback: {
      title: 'Feedback',
      body: 'Use the in-app feedback button. We read every submission. This is the fastest way to get something fixed or built.',
    },

    fullTerms: {
      title: 'Beta ends, full terms begin',
      body: "When Concert Crawl opens to the public, a full Terms of Service and Privacy Policy will replace this document. We'll notify you before that happens and give you a chance to review before anything changes.",
    },

    contact: {
      intro: 'Questions?',
      emailLink: 'Email Hugh directly.',
    },
  },
} as const
