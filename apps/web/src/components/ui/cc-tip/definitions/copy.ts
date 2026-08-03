// The CCTip content registry. Keys are stable; product copy lives here so it
// can be reviewed in one place and reused across surfaces.
//
// Ported from design_handoff_event_detail_cta_tooltip/cc-tip.jsx.

import type { TipContent } from './types'

export const TIP_CONTENT = {
  // Event Detail: the CTA pair. Going is gated behind Concert History and
  // Watching is free, and this is the last thing a Free user reads before
  // tapping Going, so it says so plainly, once, without becoming a paywall.
  'going-vs-watch': {
    label: 'Going vs. Watching',
    variant: 'defs',
    intro: 'Two different promises.',
    rows: [
      {
        tone: 'good',
        title: 'Watching: free',
        body: 'Keeps an eye on the price. We ping you on drops and sold-outs. Nothing else.',
      },
      {
        tone: 'neutral',
        title: 'Going: part of Concert History',
        body: "Saves the night to your history after the show. It's a paid feature. You can watch this show either way.",
      },
    ],
  },
  // Event Detail: what Concert History is (the locked-Going pitch).
  'concert-history': {
    label: 'Concert History',
    variant: 'titled',
    title: 'Your gig log, kept for you.',
    body: "Mark the shows you're going to and they stack into a history: what you saw, where, who opened, what you paid. Part of the paid tier. Watching a price is free and always will be.",
  },
  // Event Detail: price provenance.
  'who-set-this-price': {
    label: 'Where this price came from',
    variant: 'titled',
    title: 'A fan put it there.',
    body: 'Most prices here are submitted by people who actually checked. Box-office prices come from someone who bought a ticket at the window. No API, no guessing.',
  },
  // Browse / Venue list header: one tip for the whole list, never per row.
  'watching-on-browse': {
    label: 'Watching',
    variant: 'titled',
    title: 'Keep an eye on a show.',
    body: "Tap the eye and we'll track the price for you: pings on drops and sold-outs. It doesn't say you're going; that lives on the show's page.",
  },
  // Admin: first-timer guide chip states.
  'chip-states': {
    label: 'Chip state indicators',
    variant: 'defs',
    intro: 'Every chip on a guide is in one of three states.',
    rows: [
      {
        tone: 'neutral',
        title: 'Blank',
        body: 'No content yet. Optional chips stay hidden on the venue page, never shown empty.',
      },
      {
        tone: 'good',
        title: 'Authored',
        body: 'A concert-goer-voice line the admin wrote and voice-passed. This is what ships to display.',
      },
      {
        tone: 'warn',
        title: 'Honest placeholder',
        body: 'Accessibility only. Satisfies the publish gate without faking content: shows “not documented yet, call the venue.”',
      },
    ],
  },
  // Admin: how to publish.
  'publish-gate': {
    label: 'How publishing works',
    variant: 'steps',
    steps: [
      "Write the insider tip, the thing you'd text a friend who's never been.",
      'Fill Accessibility, or flip “Can’t document yet” for the honest placeholder.',
      'Add any chips you actually know. Leave the rest blank.',
      'Publish. Blank chips stay hidden on the venue page.',
    ],
    footer:
      'Publish stays blocked until Accessibility is answered one way or the other.',
  },
  // Admin: voice rules.
  'guide-voice': {
    label: 'Writing in concert-goer voice',
    variant: 'example',
    rows: [
      {
        title: 'Be specific',
        body: 'Numbers, street names, times. A regular would know them.',
        say: '$15 cash, Blake St. lot',
        not: 'Paid parking available',
      },
      {
        title: 'Be honest',
        body: "If you can't say it like a regular, leave it blank.",
        say: "Line's brutal after 8:30, come early",
        not: 'Arrive early for best experience',
      },
    ],
  },
  // Admin: chip content rules.
  'chip-dos': {
    label: 'Chip content rules',
    variant: 'dos',
    dos: [
      'One thought per chip, texted-to-a-friend length.',
      'Name the thing: bar, balcony, north door.',
      'Say when it’s true (“after 8:30”, “weeknights”).',
    ],
    donts: [
      'Marketing voice, hype, or exclamation points.',
      'Filling a chip just to fill it.',
      "Promising anything we can't verify.",
    ],
  },
} as const satisfies Record<string, TipContent>

export type TipKey = keyof typeof TIP_CONTENT

// Chrome the renderer supplies itself rather than reading off a tip record.
export const TIP_CHROME_COPY = {
  do: 'Do',
  dont: "Don't",
} as const
