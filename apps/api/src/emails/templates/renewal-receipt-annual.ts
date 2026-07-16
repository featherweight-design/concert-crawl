// renewal_receipt_annual — annual renewal receipt (#783 brand pass). Same vars
// as monthly; receipt-core flexes the title, hero subline, "two months on the
// house" note, and the year-spanning dates on the `annual` discriminator.

import type { EmailTemplateVars, TemplateRenderer } from '../types.js'
import { renderReceipt } from './receipt-core.js'

export const renderRenewalReceiptAnnual: TemplateRenderer<
  EmailTemplateVars['renewal_receipt_annual']
> = (vars) => renderReceipt('annual', vars)
