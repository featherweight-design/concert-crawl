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
  founderNote?: string
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
    headline: 'Community pricing is here. Help each other know what to pay.',
    spotlight: {
      title: 'Submit a price. Help the next fan.',
      tagline: 'Community-sourced ticket prices, right on the event page.',
      hero: 'price',
      cta: 'Try it on an event',
      ctaHref: '/events',
      steps: [
        {
          caption:
            "Open any event. If we don't have a price yet, you can submit what you paid.",
        },
        {
          caption:
            'Submitted prices get a trust mark — venue-official, resale, or community-verified.',
        },
        {
          caption: 'Prices expire automatically. Fresh data only.',
        },
      ],
      founderNote:
        "I built this after paying $90 for a show I thought was $20. The venue site had no price listed. We're fixing that, one show at a time.",
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
      { kind: 'fixed', text: 'Watching list no longer flashes empty on cold start.' },
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
