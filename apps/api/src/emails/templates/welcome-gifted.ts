// welcome_gifted — comped Premium (#783 brand pass reframes this as lifetime,
// on-us access: no tier to pick, no card, nothing to manage). Distinct branch
// from welcome_paid: gifted+beta badge, accent italic gratitude line, a signal
// callout of the four core unlocks, a ghost CTA, and a PRODUCT footer with NO
// manage link (comped — there's no billing relationship to manage).
//
// NOTE: the design copy no longer interpolates gifterName/giftEndsAt (both stay
// in the vars contract for the send pipeline but are unused here — see gap
// report). The gifter + end date now live only in gifting_ending_notice.

import {
  button,
  callout,
  featureList,
  footerRow,
  headerRow,
  ledeRow,
  monoEyebrow,
  row,
  tierBadge,
} from '../atoms.js'
import {
  EMAIL_MONO,
  ME,
  appUrl,
  renderEmailShell,
  renderTextShell,
} from '../layout.js'
import type { EmailTemplateVars, TemplateRenderer } from '../types.js'
import { PREMIUM_FEATURES_CORE } from './unlocks.js'

const SUBJECT = "You're in. Premium's on us."
const PREHEADER = 'Lifetime Premium, no card, nothing to manage. Just enjoy it.'

const CONTENT_PAD = '18px 26px 0'

export const renderWelcomeGifted: TemplateRenderer<
  EmailTemplateVars['welcome_gifted']
> = () => {
  const title = "You're already in."
  const sub =
    "Lifetime Premium, on us. No tier to pick, no card to add, nothing to manage. You showed up early; that's the whole price."

  const italicLine = `<div style="font-family: ${EMAIL_MONO}; font-style: italic; font-size: 12.5px; color: ${ME.accent}; letter-spacing: 0.02em;">Seriously. We owe you one.</div>`

  const microcopy = `<div style="font-family: ${EMAIL_MONO}; font-size: 9px; letter-spacing: 0.1em; text-transform: uppercase; color: ${ME.subtle};">No card on file · nothing to cancel · just enjoy it</div>`

  const calloutInner =
    monoEyebrow({
      text: 'Everything Premium, switched on',
      color: ME.signal,
      marginBottom: 12,
    }) + featureList({ items: PREMIUM_FEATURES_CORE, accent: ME.signal })

  const bodyRows = [
    headerRow('Lifetime Premium · Beta'),
    ledeRow({ eyebrow: 'On us', title, sub }),
    row('14px 26px 0', tierBadge({ tier: 'gifted', beta: true })),
    row('14px 26px 0', italicLine),
    row(CONTENT_PAD, callout({ inner: calloutInner, accent: ME.signal })),
    row(
      '20px 26px 6px',
      button({
        label: "See everything you've got →",
        tone: 'ghost',
        href: appUrl(),
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
    'Seriously. We owe you one.',
    '',
    'Everything Premium, switched on:',
    ...PREMIUM_FEATURES_CORE.map(
      (item) => `  - ${typeof item === 'string' ? item : item.text}`,
    ),
    '',
    'No card on file · nothing to cancel · just enjoy it',
    '',
    `See everything you've got: ${appUrl()}`,
  ].join('\n')

  return {
    subject: SUBJECT,
    preheader: PREHEADER,
    html: renderEmailShell({ preheader: PREHEADER, bodyRows }),
    text: renderTextShell({ body: text, family: 'product', showManage: false }),
  }
}
