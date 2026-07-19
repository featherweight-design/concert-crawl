export interface ReleaseItem {
  kind: 'added' | 'fixed' | 'changed' | 'removed'
  text: string
}

export interface ReleaseSpotlight {
  title: string
  tagline: string
  /** Which animated hero to render inside SpotlightHero. Only 'map' exists today. */
  hero: string
  cta?: string
  ctaHref?: string
  steps: Array<{ caption: string }>
  founderNote?: string | [string] | [string, string] | [string, string, string]
  founderEyebrow?: string
  founderSign?: string
}

export interface Release {
  version: string
  date: string
  headline?: string | null
  items: ReleaseItem[]
  spotlight?: ReleaseSpotlight
}

export const RELEASES: Release[] = [
  {
    version: 'v0.10.0-beta',
    date: 'Jul 19, 2026',
    headline: 'Link Spotify and your artists light up as you browse.',
    items: [
      {
        kind: 'added',
        text: 'Connect Spotify in Settings → Connections and we pull the artists you follow and play most — read-only, unlink anytime, we never see your password.',
      },
      {
        kind: 'added',
        text: 'Shows from your artists now wear a “Following” badge as you browse, and the event page tells you exactly who on the bill you follow. No more scrolling past your own favorites.',
      },
    ],
    spotlight: {
      title: 'Your taste, on the calendar.',
      tagline: 'Link Spotify once — your artists stand out everywhere.',
      hero: 'spotify',
      cta: 'Connect Spotify',
      ctaHref: '/settings',
      steps: [
        {
          caption:
            'Head to Settings → Connections and tap Connect Spotify. You log in on Spotify’s own page — we just get a yes, plus a read-only look at your top and followed artists.',
        },
        {
          caption:
            'From then on, any Denver show featuring one of your artists gets a “Following” badge as you browse — headliners and openers both count.',
        },
        {
          caption:
            'Changed your mind? Disconnect wipes the link and the highlights on the spot. Anything you were already watching stays yours.',
        },
      ],
    },
  },
  {
    version: 'v0.9.1-beta',
    date: 'Jul 19, 2026',
    headline: 'Offline mode looks like it means it now.',
    items: [
      {
        kind: 'changed',
        text: 'The offline signal is a tiny pill in the header, not a bar across the page. Lose signal deep in the app and you land on a real page — with everything you already loaded still browsable, and honest about what needs a connection.',
      },
    ],
  },
  {
    version: 'v0.9.0-beta',
    date: 'Jul 19, 2026',
    headline: 'The install nudge grew up.',
    items: [
      {
        kind: 'changed',
        text: "Install lives in the top corner now — quiet, always there when you want it, gone when you don't. On iPhone, it walks you through the Share → Add to Home Screen tap-dance in three steps.",
      },
    ],
  },
  {
    version: 'v0.8.8-beta',
    date: 'Jul 18, 2026',
    headline: 'Wandered off into next month? One tap snaps you back to today.',
    items: [
      {
        kind: 'added',
        text: 'Once you page the calendar away from today, a small “Today” button appears next to the week arrows — tap it to jump straight back to this week with today selected. It disappears the moment today’s back in view.',
      },
    ],
  },
  {
    version: 'v0.8.7-beta',
    date: 'Jul 17, 2026',
    headline: 'Put Concert Crawl on your home screen — and take it offline.',
    items: [
      {
        kind: 'added',
        text: 'Install Concert Crawl to your home screen — Android and desktop get a one-tap install prompt, and iPhone gets a quick “Share → Add to Home Screen” nudge so it opens like a real app.',
      },
      {
        kind: 'added',
        text: 'Lose signal at the venue? Shows and venue pages you’ve already loaded stay browsable offline, with a banner up top so you know you’re looking at the last-loaded lineup.',
      },
    ],
  },
  {
    version: 'v0.8.6-beta',
    date: 'Jul 17, 2026',
    headline: 'Openers get their own line — and tours get a proper billing.',
    items: [
      {
        kind: 'changed',
        text: 'Supporting acts now read as their own line under the headliner — “with Hotline TNT · MJ Lenderman” — instead of getting mashed into one long run-on title.',
      },
      {
        kind: 'added',
        text: 'Tour names ride above the headliner as a kicker, so “Rat Saw God Tour” shows up as the tour it is, not buried in the show name.',
      },
      {
        kind: 'changed',
        text: 'Long opener lineups on a card trim to a clean “+3 more,” while the full roster still reads aloud in order for screen readers.',
      },
    ],
  },
  {
    version: 'v0.8.5-beta',
    date: 'Jul 16, 2026',
    headline:
      'Jump straight to any date on the calendar — no more clicking through weeks.',
    items: [
      {
        kind: 'added',
        text: 'Tap the month above the day strip to pop open a mini calendar and jump to any date in one move — a weekend three months out is now one tap, not a dozen.',
      },
      {
        kind: 'added',
        text: 'Dots on the mini calendar show which days already have shows on sale, so you can spot a busy night before you even pick it.',
      },
    ],
  },
  {
    version: 'v0.8.4-beta',
    date: 'Jul 12, 2026',
    headline: 'Every price tier you submit sticks around — and stays clear.',
    items: [
      {
        kind: 'fixed',
        text: 'Submit three or more tiers at once and they all stay put on reload — the third one no longer vanishes when the page refreshes.',
      },
      {
        kind: 'fixed',
        text: 'A “submit another price” card now sits under your pending submissions for good, so you can add a tier any time — not just in the seconds right after you submit.',
      },
      {
        kind: 'fixed',
        text: 'Shows coming up fast now wear a “Days away” tag — tap it to see why they need an extra confirmation before a price goes live.',
      },
    ],
  },
  {
    version: 'v0.8.3-beta',
    date: 'Jul 11, 2026',
    headline:
      'Change your plan, cancel, or come back — all without leaving Settings.',
    items: [
      {
        kind: 'added',
        text: 'Manage subscription grew up — one sheet now handles changing plans, updating your card, and cancelling, with a clear read on what happens and when.',
      },
      {
        kind: 'added',
        text: 'Switching tiers shows the real math before you commit — upgrades bill the prorated difference today, downgrades bank the credit toward next month.',
      },
      {
        kind: 'added',
        text: 'Cancelled but changed your mind? Resubscribe with one tap any time before your paid days run out — no new checkout, nothing lost.',
      },
    ],
  },
  {
    version: 'v0.8.2-beta',
    date: 'Jul 11, 2026',
    headline: 'Trials end. We’ll say so — once — and get out of the way.',
    items: [
      {
        kind: 'added',
        text: 'Day-13 heads-up — a thin banner on your last trial day, in case you want to lock Premium in before it lapses. One tap dismisses it for good.',
      },
      {
        kind: 'added',
        text: 'When the trial wraps, your next visit gets a single pick-a-lane screen with the full plan lineup. Choose one or keep browsing on Free — we won’t show it twice.',
      },
    ],
  },
  {
    version: 'v0.8.1-beta',
    date: 'Jul 11, 2026',
    headline: 'Settings finally tells you what plan you’re on. In detail.',
    items: [
      {
        kind: 'changed',
        text: 'The plan card in Settings got a full redesign — it now knows exactly where you stand: active plan, trial countdown, winding-down after a cancel, even a payment-failed heads-up with a one-tap card fix.',
      },
      {
        kind: 'added',
        text: 'Manage subscription — paid plans get a button that drops you straight into billing management (update card, cancel, the works).',
      },
    ],
  },
  {
    version: 'v0.8.0-beta',
    date: 'Jul 11, 2026',
    headline: 'Plans exist now. Beta folks: yours is already paid for.',
    items: [
      {
        kind: 'added',
        text: 'Compare plans — a new tier picker in Settings lays out Free, Supporter, Premium, and the 100-seat Founder deal side by side. Whatever you pay, you pay; we won’t raise it on you.',
      },
      {
        kind: 'added',
        text: 'Checkout happens right in the picker — card form and all, no redirect to a Stripe-branded page and back.',
      },
      {
        kind: 'added',
        text: 'Beta members get lifetime Premium on us. Open the picker and it says as much — nothing to buy, nothing to cancel.',
      },
    ],
  },
  {
    version: 'v0.7.0-beta',
    date: 'Jul 10, 2026',
    headline: 'Standing at the box office? Submit every tier you can see.',
    items: [
      {
        kind: 'added',
        text: 'Multi-tier price submission — hit "Add another tier" in the submit form to send GA, VIP, and friends in one go. Each tier still gets its own trust mark and its own fan confirmations.',
      },
    ],
  },
  {
    version: 'v0.6.1-beta',
    date: 'Jun 26, 2026',
    headline: 'The site got faster — landing page and sign-in both.',
    items: [
      {
        kind: 'changed',
        text: 'Denver landing page now serves a cached snapshot that refreshes every five minutes — first paint is near-instant, even on a cold visit.',
      },
      {
        kind: 'changed',
        text: 'Sign-in redirects now happen at the edge instead of bouncing through a server function. Cold-start protected pages should feel noticeably snappier when you (or anyone) lands on one without being signed in.',
      },
    ],
  },
  {
    version: 'v0.6.0-beta',
    date: 'Jun 24, 2026',
    headline: "Resale isn't face value — and now we make that obvious.",
    items: [
      {
        kind: 'changed',
        text: "Sold-out and resale-only events now spell out what resale actually means. No more guessing whether that $180 'price' is the box office or a markup.",
      },
      {
        kind: 'added',
        text: 'Multi-tier breakdowns on event pages — GA, Reserved, and VIP each get their own row instead of collapsing into a single number.',
      },
      {
        kind: 'added',
        text: 'Browse cards flag resale-only events with a coral tag, so you can spot the markups before you tap in.',
      },
      {
        kind: 'changed',
        text: "Submit-a-price form now leads with where the price came from (box office, resale, the venue's site) instead of how you found it.",
      },
      {
        kind: 'fixed',
        text: "When two fans disagree on a price, the contest button points you to the live counter instead of letting you start a second one you'd lose.",
      },
    ],
  },
  {
    version: 'v0.5.0-beta',
    date: 'May 8, 2026',
    headline:
      'Community Pricing is here. Grass roots price transparency, baby.',
    spotlight: {
      title: 'Submit a price. Help the next fan.',
      tagline: 'Community-sourced ticket prices, right on the event page.',
      hero: 'price',
      cta: 'Try it on an event',
      ctaHref: '/events',
      steps: [
        {
          caption:
            "Open any event. If we don't have a price yet, you can visit the ticket link and submit what you saw/paid.",
        },
        {
          caption:
            'We give each price a trust mark. This shows you if it’s from the box office, resale, or community-verified. For a community price to get the verified trust mark, two other fans need to confirm that it’s accurate.',
        },
        {
          caption:
            'As much as we want to keep prices up to date, they do go stale with price fluctuations. We expire prices after a week, and we’ll show you when a price is old. You can submit a new price to keep things fresh.',
        },
      ],
      founderNote: [
        `So, this feature was born partly out of frustration and partly out of wanting to build a community. The big ticket vendors hide pricing and there’s almost no way for me to access it in a "good" way. But, even so, price transparency was something I really wanted for the app. Plenty of apps will tell you who is coming and when, but you always have to dig into the vendor's website to see the price.`,
        `With Community Pricing, we try to get around that by having users do a little bit of legwork. Hell, I even try to add some prices myself when I can. And, the big idea we have with Community Pricing is driving concert goers to the box office. Sure, you have to drive/walk to the venue, but you cut out the corporate middlemen, skip the fees, and maybe get to know Joe-schmoe down at The Ogden.`,
        `Down with the fees, up with the vibes. Grass roots concert revolution, baby!`,
      ],
      founderSign: '— Hugh',
    },
    items: [
      {
        kind: 'added',
        text: 'Price submission — tap any event to submit what you paid. Helps everyone who comes after.',
      },
      {
        kind: 'added',
        text: 'Trust marks on prices — venue-official, resale platform, or community-submitted.',
      },
      {
        kind: 'added',
        text: 'Price expiry — submitted prices auto-expire after 7 days. No stale data.',
      },
      {
        kind: 'fixed',
        text: 'Watching list no longer flashes empty on cold start.',
      },
      { kind: 'fixed', text: 'Filter chips stay readable in light theme.' },
    ],
  },
  {
    version: 'v0.4.1-beta',
    date: 'Apr 24, 2026',
    headline: null,
    items: [
      {
        kind: 'added',
        text: 'Identity art for artists and venues — generative, deterministic, never the same twice.',
      },
      {
        kind: 'fixed',
        text: "Empty calendar view no longer shows yesterday's shows for a frame.",
      },
      {
        kind: 'changed',
        text: 'Filter sheet remembers your last selection within a session.',
      },
    ],
  },
  {
    version: 'v0.4.0-beta',
    date: 'Apr 15, 2026',
    headline: 'First build you can actually use end-to-end.',
    items: [
      {
        kind: 'added',
        text: 'Browse page with date picker, price filter, and venue filter.',
      },
      {
        kind: 'added',
        text: 'Event detail page with venue map and show times.',
      },
      { kind: 'added', text: 'Watching list — save shows you care about.' },
      { kind: 'added', text: 'Search across events and venues.' },
    ],
  },
]
