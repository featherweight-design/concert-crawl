/**
 * Copy for /bot, the public crawler transparency page.
 *
 * The audience is a venue's technical staff who found `ConcertCrawl/1.0` in a
 * log and followed the URL it carries. Every factual claim here is checked
 * against the crawler as it actually runs, not as it was designed to run: a
 * transparency page that overstates our restraint is worse than no page, and it
 * is the first document a venue's lawyer reads. See
 * `design/design_handoff_bot_page/READINESS.md` for the claim-by-claim audit.
 */

/**
 * The exact string every crawl request sends, imported rather than restated so
 * the page cannot publish a user agent the crawler has stopped using.
 */
export { CRAWLER_USER_AGENT as BOT_UA } from '@concert-crawl/types'

/** The two lines an operator lifts off the page to block us outright. */
export const BOT_ROBOTS = ['User-agent: ConcertCrawl', 'Disallow: /']

export const BOT_COPY = {
  eyebrow: 'CRAWLER INFO · /BOT',
  h1: 'This is our crawler.',
  lede: "If you're here, ConcertCrawl/1.0 turned up in your server logs and you followed the URL it left. Good. That's what it's for.",
  who: 'Concert Crawl is a Denver concert listing site. We read public event pages so someone deciding what to see this week can find every show in town in one place, with what a ticket actually costs. When we list your show, the ticket link points at you.',
  whoLink: {
    label: "See what we're building",
    href: '/',
  },
  promise:
    'Everything our crawler does is on this page, including how to make it stop.',

  sections: {
    identity: {
      index: '01',
      title: 'How to recognize us',
      note: "Every request we make carries this string. Nothing we run identifies itself any other way. If you see a different agent claiming to be us, it isn't.",
    },
    robots: {
      index: '02',
      title: 'robots.txt',
      note: 'We read it before we read anything else.',
    },
    rate: {
      index: '03',
      title: 'Rate and schedule',
      note: "We're a small crawler on a slow clock. If we're still costing you more than you want to spend, section 5 is a two-line fix.",
    },
    data: {
      index: '04',
      title: "What we take, and what we don't",
    },
    stop: {
      index: '05',
      title: 'Making us stop',
      note: 'Two ways. The first needs nothing from us.',
    },
  },

  facts: {
    ua: 'User-Agent',
    javascript: {
      label: 'JavaScript',
      value:
        "We render pages in a headless browser (Chromium) because many venue calendars only exist after JavaScript runs. We don't click, submit forms, or log in.",
    },
    disallow: {
      label: 'Disallow',
      value:
        "We check robots.txt before every page and API call we request, obey any Disallow that applies to us under the RFC 9309 rules, and throw away any page a redirect lands on that you disallow. If it returns a server error or doesn't answer, we don't crawl you that day.",
    },
    recheck: {
      label: 'Re-check',
      value:
        "At the start of every pass, so at least once a day. An edit you make this afternoon is in force by tonight's run.",
    },
    crawlDelay: {
      label: 'Crawl-delay',
      value:
        'Honored. Where you state one, we take the longer of your value and our own 3-second default. If you ask for more than 30 seconds, we skip your site that day rather than crawl it faster than you asked.',
    },
    rate: {
      label: 'Request rate',
      // Deliberately a claim about our own pacing, not a per-domain guarantee.
      // The 3-second sleep lives in `fetchPage`, so it holds between requests
      // within one venue's crawl. It is not keyed on hostname, so two venue
      // rows sharing a host each get their own clock, and a hand-queued trigger
      // run can overlap the daily pass. Saying "to the same domain" claimed a
      // coordination we do not have.
      value:
        'We wait at least 3 seconds between requests, plus a random jitter so we never arrive on a fixed beat.',
    },
    perVenue: {
      label: 'Per venue',
      value:
        "That interval is configurable per site. If 3 seconds is still too fast for your box office, name a number and we'll set it for you.",
    },
    fullPass: {
      label: 'Full pass',
      value: 'Once a day at 09:00 UTC.',
    },
    triggers: {
      label: 'Trigger checks',
      value:
        'Between daily passes, the only thing that re-reads your site is one of us queueing your venue by hand. A job picks that queue up every 10 minutes. Nothing re-reads you automatically.',
    },
    weRead: {
      label: 'We read',
      value:
        'Public event pages only: show name, performing artists, date and time, ticket price, the event description and image you publish, and the link back to your own ticketing page.',
    },
    ai: {
      label: 'AI extraction',
      value:
        "When a page has no structured event data, an AI model (Anthropic's Claude) reads the listings from it. If your robots.txt disallows ClaudeBot or sets Content-Signal ai-input=no, we never send it your page text, though show titles and artist names still go to it to tag genres. We don't train any model on your pages.",
    },
    weNever: {
      label: 'We never',
      value:
        "Touch anything behind a login, submit a form, follow a checkout, or collect anything about a person. No customer data, no email addresses, no accounts. We don't have a login to your site and don't want one.",
    },
    retention: {
      label: 'Retention',
      value:
        'We keep a show after the date passes rather than deleting it, so people can look back at what they saw. There is no automatic purge, so assume we hold it until you ask us not to. Section 5 is how you ask.',
    },
    yourPage: {
      label: 'Your page',
      value: "Your venue's listings and price history are visible on one page:",
      link: {
        label: 'concertcrawl.app/venues/your-venue',
        href: '/venues',
      },
      note: 'Venue pages are invite-only during our private beta and open to everyone at launch.',
    },
  },

  stop: {
    robotsTitle: 'Add us to robots.txt',
    robotsNote:
      'In force by the next pass, within 24 hours and usually sooner.',
    orTitle: 'Or tell a person',
    contactBody:
      "A human reads this address, not a queue. Say the word and we'll stop crawling you. We answer within two business days.",
    removalTitle: 'Removing what we already have',
    removalBody:
      "Blocking the crawler stops new reads; it doesn't unpublish what we've already collected. Ask for removal in the same email and we'll take your venue's listings and price history down within 30 days, and write back when it's done. No account, no form, no conditions.",
    closing:
      "We'd rather be the link that sends someone to your box office than a line you have to block.",
  },

  copyButton: {
    idle: 'Copy',
    copied: 'Copied',
    uaLabel: 'Copy the user agent string',
    robotsLabel: 'Copy the robots.txt block',
  },

  footer: {
    updated: 'LAST UPDATED · OCT 2026',
    links: [
      { label: 'Terms', href: '/legal/terms' },
      { label: 'Privacy', href: '/legal/privacy' },
      { label: 'Beta terms', href: '/legal/beta' },
    ],
  },

  contactEmail: 'venues@concertcrawl.app',
} as const
