// dunning_1_card_declined — Day 0, first failed renewal (#783 brand pass).
// Calm signal-accent "give it a refresh" nudge; step 1 of the tracker. Honest,
// never blamey, never "fraud" — Premium stays on while retries run.

import type { EmailTemplateVars, TemplateRenderer } from '../types.js'
import { renderDunning } from './dunning-core.js'

export const renderDunning1CardDeclined: TemplateRenderer<
  EmailTemplateVars['dunning_1_card_declined']
> = ({ portalUrl }) =>
  renderDunning(
    {
      step: 1,
      subject: 'Your card bounced — mind giving it a refresh?',
      preheader: "No drama. Takes about 30 seconds. We'll retry automatically.",
      headerEyebrow: 'Billing',
      statusText: 'Billing · heads up',
      title: "Your card didn't go through.",
      sub: "Happens all the time — expired card, bank playing it safe, whatever it is. Give it a refresh and you're set. We'll keep trying in the background either way.",
      reassure: "Nothing's changed yet · Premium's still on",
      isFinal: false,
    },
    portalUrl,
  )
