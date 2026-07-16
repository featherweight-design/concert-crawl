// winback — post-cancel nudge (#783 brand pass). BASIC SHAPE ONLY: one hero,
// one "what you'd get back" callout, one signal CTA. NOT multi-stage, and —
// critically — NO discount / percent-off / coupon of any kind: winback pricing
// matches the locked tier prices, no special offers, no countdown.

import {
  button,
  callout,
  featureList,
  footerRow,
  headerRow,
  ledeRow,
  monoEyebrow,
  row,
} from '../atoms.js'
import {
  EMAIL_MONO,
  ME,
  planUrl,
  renderEmailShell,
  renderTextShell,
} from '../layout.js'
import type { EmailTemplateVars, TemplateRenderer } from '../types.js'
import { WINBACK_FEATURES } from './unlocks.js'

const SUBJECT = "Denver's been busy since you left."
const PREHEADER =
  "Here's what Premium would hand back. No pressure, no countdown."

const CONTENT_PAD = '18px 26px 0'

export const renderWinback: TemplateRenderer<
  EmailTemplateVars['winback']
> = () => {
  const title = "Denver's been busy."
  const sub =
    "Since you switched back to Free, Premium's quietly picked up a few things. Whenever you want them back, they're one tap away — no countdown, no discount gimmick. Just here when you are."

  const calloutInner =
    monoEyebrow({
      text: "What you'd get back",
      color: ME.signal,
      marginBottom: 12,
    }) + featureList({ items: WINBACK_FEATURES, accent: ME.signal })

  const microcopy = `<div style="font-family: ${EMAIL_MONO}; font-size: 9px; letter-spacing: 0.1em; text-transform: uppercase; color: ${ME.subtle};">Still $5/mo · cancel any time · no hard sell</div>`

  const bodyRows = [
    headerRow('Concert Crawl'),
    ledeRow({ eyebrow: 'Whenever you want', title, sub, titleSize: 27 }),
    row(CONTENT_PAD, callout({ inner: calloutInner, accent: ME.signal })),
    row(
      '20px 26px 6px',
      button({
        label: 'Turn Premium back on',
        tone: 'signal',
        href: planUrl(),
      }),
    ),
    row('10px 26px 4px', microcopy),
    footerRow({ family: 'product', showManage: false }),
  ].join('\n')

  const text = [
    title,
    '',
    sub,
    '',
    "What you'd get back:",
    ...WINBACK_FEATURES.map(
      (item) => `  - ${typeof item === 'string' ? item : item.text}`,
    ),
    '',
    'Still $5/mo · cancel any time · no hard sell',
    '',
    `Turn Premium back on: ${planUrl()}`,
  ].join('\n')

  return {
    subject: SUBJECT,
    preheader: PREHEADER,
    html: renderEmailShell({ preheader: PREHEADER, bodyRows }),
    text: renderTextShell({ body: text, family: 'product', showManage: false }),
  }
}
