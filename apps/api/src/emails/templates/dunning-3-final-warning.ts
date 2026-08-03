// dunning_3_final_warning — final retry pending, Premium pauses tomorrow (#783
// brand pass). Flips to amber, fills the third tracker segment, and adds an "If
// it pauses" callout — but the CTA stays branded signal, never alarm-red.
// Nothing gets deleted; a fresh card switches everything back on.

import type { EmailTemplateVars, TemplateRenderer } from '../types.js'
import { renderDunning } from './dunning-core.js'

export const renderDunning3FinalWarning: TemplateRenderer<
  EmailTemplateVars['dunning_3_final_warning']
> = ({ portalUrl }) =>
  renderDunning(
    {
      step: 3,
      subject: 'Heads up: Premium pauses tomorrow.',
      preheader: 'One more try left. A fresh card sorts it.',
      headerEyebrow: 'Billing · last try',
      statusText: 'Billing · last try',
      title: 'Premium pauses tomorrow.',
      sub: "We couldn't get that card through after a week of trying. There's one more attempt tomorrow. If it doesn't land, Premium pauses and you drop back to Free.",
      reassure: 'One more retry tomorrow · update the card any time',
      isFinal: true,
      calloutEyebrow: 'If it pauses',
      calloutBody:
        'Your account and the shows you watch stay put. History, alerts, and calendar export go quiet until a payment goes through. Nothing gets deleted. A fresh card switches all of it back on.',
    },
    portalUrl,
  )
