// welcome_paid — one template family, three tier variants (#783). Copy voice:
// slight cheek + honesty rail + warmth. Tier data locked in #781.

import { escapeHtml, renderEmailShell, renderTextShell } from '../layout.js'
import {
  EMAIL_ACCENT_FOUNDER,
  EMAIL_ACCENT_PREMIUM,
  EMAIL_ACCENT_SUPPORTER,
  EMAIL_TEXT_MUTED,
} from '../palette.js'
import type { EmailTemplateVars, TemplateRenderer } from '../types.js'
import { planPageUrl } from './format.js'
import { PREMIUM_UNLOCKS } from './unlocks.js'

type PaidTier = EmailTemplateVars['welcome_paid']['tier']

interface TierCopy {
  accent: string
  subject: string
  preheader: string
  headline: string
  intro: string
  unlocks: string[]
  outro: string
}

const TIER_COPY: Record<PaidTier, TierCopy> = {
  premium: {
    accent: EMAIL_ACCENT_PREMIUM,
    subject: "You're in — Premium is live on your account",
    preheader:
      "Concert history, calendar export, artist alerts — here's everything you just unlocked.",
    headline: 'Welcome to Premium — $5/month',
    intro: 'Everything below is live on your account right now. Go poke at it.',
    unlocks: PREMIUM_UNLOCKS,
    outro:
      'Thanks for backing the crawl. This is what keeps the lights on and the crawlers crawling.',
  },
  supporter: {
    accent: EMAIL_ACCENT_SUPPORTER,
    subject: "You're in — Supporter status, officially",
    preheader:
      "No new features, just our sincere gratitude — exactly as promised. Here's your badge.",
    headline: 'Welcome, Supporter — $2/month',
    intro:
      'You knew there were no premium features behind this door, and you walked through anyway. Respect.',
    unlocks: [
      'Everything in Free',
      'Supporter badge on your profile',
      'The warm, smug glow of keeping us alive',
    ],
    outro:
      'That $2 covers the stuff we can run without scaling. It matters more than it looks. Thank you.',
  },
  founder: {
    accent: EMAIL_ACCENT_FOUNDER,
    subject: "You're in — Founder status, locked forever",
    preheader:
      'Your $3/month rate never goes up, ever. Every Premium unlock is live right now.',
    headline: 'Welcome, Founder — $3/month, forever',
    intro:
      'That rate never goes up. Ever. Everything in Premium is yours, plus proof you were here first.',
    unlocks: [...PREMIUM_UNLOCKS, 'Founder badge — first 100 only'],
    outro:
      'Thanks for betting on the crawl this early. We take that seriously.',
  },
}

const FOUNDER_BADGE_FALLBACK = 'Founder — one of the first 100'

const founderBadgeLine = (founderSeatNumber: number | undefined): string =>
  founderSeatNumber === undefined
    ? FOUNDER_BADGE_FALLBACK
    : `Founder #${founderSeatNumber} of 100`

export const renderWelcomePaid: TemplateRenderer<
  EmailTemplateVars['welcome_paid']
> = ({ tier, founderSeatNumber }) => {
  const copy = TIER_COPY[tier]
  const badgeLine =
    tier === 'founder' ? founderBadgeLine(founderSeatNumber) : null

  const badgeHtml =
    badgeLine === null
      ? ''
      : `<p style="margin: 0 0 8px; font-size: 13px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: ${copy.accent};">${escapeHtml(badgeLine)}</p>`

  const unlockItemsHtml = copy.unlocks
    .map((unlock) => `<li style="margin: 0 0 8px;">${escapeHtml(unlock)}</li>`)
    .join('\n')

  const bodyHtml = `${badgeHtml}<h1 style="margin: 0 0 16px; font-size: 24px; line-height: 1.3; color: ${copy.accent};">${escapeHtml(copy.headline)}</h1>
<p style="margin: 0 0 16px;">${escapeHtml(copy.intro)}</p>
<ul style="margin: 0 0 16px; padding-left: 20px;">
${unlockItemsHtml}
</ul>
<p style="margin: 0 0 16px;">${escapeHtml(copy.outro)}</p>
<p style="margin: 0; font-size: 14px; color: ${EMAIL_TEXT_MUTED};">Manage your plan any time: <a href="${escapeHtml(planPageUrl())}" style="color: ${copy.accent};">your plan page</a>.</p>`

  const textLines = [
    ...(badgeLine === null ? [] : [badgeLine, '']),
    copy.headline,
    '',
    copy.intro,
    '',
    ...copy.unlocks.map((unlock) => `- ${unlock}`),
    '',
    copy.outro,
    '',
    `Manage your plan any time: ${planPageUrl()}`,
  ]

  return {
    subject: copy.subject,
    preheader: copy.preheader,
    html: renderEmailShell({ preheader: copy.preheader, bodyHtml }),
    text: renderTextShell(textLines.join('\n')),
  }
}
