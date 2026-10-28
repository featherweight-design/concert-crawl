// welcome_paid — one template family, three tier variants (#783 brand pass).
// Voice: slight cheek + honesty rail + warmth. Premium/founder use the signal
// accent + full unlock list; supporter branches to its own shorter unlock
// block (history, export, badge) with an accent CTA. Founder adds the seat stamp when we know the seat number.

import {
  button,
  featureList,
  footerRow,
  headerRow,
  ledeRow,
  monoEyebrow,
  pricePromise,
  pricePromiseText,
  row,
  seatStamp,
  tierBadge,
} from '../atoms.js'
import type { FeatureItem } from '../atoms.js'
import {
  EMAIL_MONO,
  ME,
  appUrl,
  profileUrl,
  renderEmailShell,
  renderTextShell,
} from '../layout.js'
import type { EmailTemplateVars, TemplateRenderer } from '../types.js'
import { PREMIUM_FEATURES, PREMIUM_FEATURES_CORE } from './unlocks.js'

const CONTENT_PAD = '18px 26px 0'
const CTA_PAD = '20px 26px 8px'

const featureTextLines = (items: FeatureItem[]): string[] =>
  items.map((item) => {
    const text = typeof item === 'string' ? item : item.text
    const future = typeof item !== 'string' && item.future
    return `  ${future ? '*' : '-'} ${text}`
  })

const microcopyRow = (text: string): string =>
  `<div style="font-family: ${EMAIL_MONO}; font-size: 9.5px; letter-spacing: 0.1em; text-transform: uppercase; color: ${ME.subtle};">${text}</div>`

const SUPPORTER_FEATURES: FeatureItem[] = [
  'Concerts: every show you attend, logged',
  'Calendar export — Apple + Google, one tap',
  'A Supporter badge on your profile',
]

const FOUNDER_FEATURES: FeatureItem[] = [
  ...PREMIUM_FEATURES_CORE,
  'Founder badge — first 100 only',
]

export const renderWelcomePaid: TemplateRenderer<
  EmailTemplateVars['welcome_paid']
> = ({ tier, founderSeatNumber }) => {
  if (tier === 'supporter') {
    const subject = "You're in, and you're keeping the lights on."
    const preheader = 'Your Concerts, your exports, your badge. All live.'
    const microcopy = 'Both run on servers we already pay for.'
    const title = "You didn't have to. Thanks for backing us."
    const sub =
      "Your Concerts and your calendar exports are switched on, and the badge is live on your profile. You're chipping in so the app stays free for everyone. The glow is real."

    const bodyRows = [
      headerRow('Welcome · supporter'),
      ledeRow({ eyebrow: 'Welcome · Supporter', title, sub }),
      row(CONTENT_PAD, tierBadge({ tier: 'supporter' })),
      row(
        CONTENT_PAD,
        monoEyebrow({ text: 'What backing gets you', marginBottom: 12 }) +
          featureList({ items: SUPPORTER_FEATURES, accent: ME.accent }),
      ),
      row('12px 26px 0', microcopyRow(microcopy)),
      row(CONTENT_PAD, pricePromise({ tier: 'supporter' })),
      row(
        CTA_PAD,
        button({
          label: 'Wear it on your profile',
          tone: 'accent',
          href: profileUrl(),
        }),
      ),
      footerRow({ family: 'billing', showManage: true }),
    ].join('\n')

    const text = [
      title,
      '',
      sub,
      '',
      ...featureTextLines(SUPPORTER_FEATURES),
      '',
      microcopy,
      '',
      pricePromiseText('supporter'),
      '',
      `Wear it on your profile: ${profileUrl()}`,
    ].join('\n')

    return {
      subject,
      preheader,
      html: renderEmailShell({ preheader, bodyRows }),
      text: renderTextShell({
        body: text,
        family: 'billing',
        showManage: true,
      }),
    }
  }

  if (tier === 'founder') {
    const seatLabel =
      founderSeatNumber === undefined
        ? 'a Founder'
        : `Founder #${founderSeatNumber}`
    const subject =
      founderSeatNumber === undefined
        ? "You're a Founder. Locked in at $3, forever."
        : `You're Founder #${founderSeatNumber}. Locked in at $3, forever.`
    const preheader = 'First 100 only. $3/mo never goes up. Here’s your seat.'
    const title = `You're ${seatLabel}.`
    const sub =
      'One of the first hundred people to back Concert Crawl. Your price is locked at $3 a month, and it never moves, no matter what anyone pays later.'

    const bodyRows = [
      headerRow('Welcome · founder'),
      ledeRow({ eyebrow: 'Welcome · Founder', title, sub, titleSize: 27 }),
      row(CONTENT_PAD, tierBadge({ tier: 'founder' })),
      ...(founderSeatNumber === undefined
        ? []
        : [row(CONTENT_PAD, seatStamp(founderSeatNumber))]),
      row(
        CONTENT_PAD,
        monoEyebrow({ text: 'Everything Premium, yours', marginBottom: 12 }) +
          featureList({ items: FOUNDER_FEATURES, accent: ME.signal }),
      ),
      row(CONTENT_PAD, pricePromise({ tier: 'founder' })),
      row(
        CTA_PAD,
        button({ label: 'Open Concert Crawl', tone: 'signal', href: appUrl() }),
      ),
      footerRow({ family: 'billing', showManage: true }),
    ].join('\n')

    const text = [
      title,
      '',
      sub,
      '',
      ...(founderSeatNumber === undefined
        ? []
        : [`Founder #${founderSeatNumber} of 100: $3/mo.`, '']),
      ...featureTextLines(FOUNDER_FEATURES),
      '',
      pricePromiseText('founder'),
      '',
      `Open Concert Crawl: ${appUrl()}`,
    ].join('\n')

    return {
      subject,
      preheader,
      html: renderEmailShell({ preheader, bodyRows }),
      text: renderTextShell({
        body: text,
        family: 'billing',
        showManage: true,
      }),
    }
  }

  // premium
  const subject = "You're in. Premium is live on your account."
  const preheader =
    "Everything Premium, switched on. Here's what you just unlocked."
  const title = "You're in. Premium's switched on."
  const sub =
    'Everything that actually costs us money to run is now yours. No trial asterisks, no upsell wall. Go use it.'

  const bodyRows = [
    headerRow('Welcome · premium'),
    ledeRow({ eyebrow: 'Welcome · Premium', title, sub }),
    row(CONTENT_PAD, tierBadge({ tier: 'premium' })),
    row(
      CONTENT_PAD,
      monoEyebrow({ text: 'Switched on now', marginBottom: 12 }) +
        featureList({ items: PREMIUM_FEATURES, accent: ME.signal }),
    ),
    row(CONTENT_PAD, pricePromise({ tier: 'premium' })),
    row(
      CTA_PAD,
      button({ label: 'Open Concert Crawl', tone: 'signal', href: appUrl() }),
    ),
    footerRow({ family: 'billing', showManage: true }),
  ].join('\n')

  const text = [
    title,
    '',
    sub,
    '',
    ...featureTextLines(PREMIUM_FEATURES),
    '',
    pricePromiseText('premium'),
    '',
    `Open Concert Crawl: ${appUrl()}`,
  ].join('\n')

  return {
    subject,
    preheader,
    html: renderEmailShell({ preheader, bodyRows }),
    text: renderTextShell({ body: text, family: 'billing', showManage: true }),
  }
}
