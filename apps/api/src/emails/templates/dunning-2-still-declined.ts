// dunning_2_still_declined — mid-window, retries still failing (#783 brand
// pass). Same calm signal accent as step 1; step 2 of the tracker. A fresh card
// skips the remaining wait; Premium stays on.

import type { EmailTemplateVars, TemplateRenderer } from '../types.js'
import { renderDunning } from './dunning-core.js'

export const renderDunning2StillDeclined: TemplateRenderer<
  EmailTemplateVars['dunning_2_still_declined']
> = ({ portalUrl }) =>
  renderDunning(
    {
      step: 2,
      subject: 'Still no luck with your card.',
      preheader: "We're retrying automatically. A fresh one skips the wait.",
      headerEyebrow: 'Billing',
      statusText: 'Billing · still trying',
      title: "We're still trying that card.",
      sub: 'A few automatic retries haven’t landed yet. Dropping in a fresh card takes about 30 seconds and skips the rest of the waiting. Premium stays on in the meantime.',
      reassure: "Still on · we'll keep retrying for a few more days",
      isFinal: false,
    },
    portalUrl,
  )
