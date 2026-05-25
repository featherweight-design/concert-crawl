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
