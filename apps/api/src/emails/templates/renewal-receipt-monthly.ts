// renewal_receipt_monthly — monthly renewal receipt (#783 brand pass). All the
// composition lives in receipt-core; this file just pins the period.

import type { EmailTemplateVars, TemplateRenderer } from '../types.js'
import { renderReceipt } from './receipt-core.js'

export const renderRenewalReceiptMonthly: TemplateRenderer<
  EmailTemplateVars['renewal_receipt_monthly']
> = (vars) => renderReceipt('monthly', vars)
