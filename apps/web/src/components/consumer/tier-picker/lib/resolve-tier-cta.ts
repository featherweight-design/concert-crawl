// CTA resolver — the six-state logic from the design handoff
// (monetization-tier-states.jsx resolveTierCta), extended with an `action`
// field so components know what a tap does. Flows that don't ship until
// PR 4.5 (#780 change-tier / cancel) render with their designed label but
// disabled — never start a flow the API will 409 on.

import type { FounderWindowState } from '@concert-crawl/types'
import { TIER_PICKER_COPY } from '../definitions/copy'
import { TIER_DEFINITIONS } from '../definitions/constants'
import type { PickerState, TierCta, TierKey } from '../definitions/types'

const CTA_COPY = TIER_PICKER_COPY.cta

const cta = (
  label: string,
  tone: TierCta['tone'],
  action: TierCta['action'],
): TierCta => ({ label, tone, action, disabled: action === 'none' })

export const resolveTierCta = (
  tierKey: TierKey,
  state: PickerState,
  founderWindowState: FounderWindowState,
): TierCta => {
  const isCurrent = state === tierKey

  if (isCurrent) {
    if (tierKey === 'free') return cta(CTA_COPY.youAreOnFree, 'current', 'none')
    return cta(CTA_COPY.manageSubscription, 'current', 'manage')
  }

  // Founder pre-launch: the card is visible but not claimable yet.
  if (tierKey === 'founder' && founderWindowState === 'pre-launch') {
    return cta(TIER_PICKER_COPY.card.founderPreLaunch, 'founder', 'none')
  }

  if (state === 'logged-out') {
    switch (tierKey) {
      case 'free':
        return cta(CTA_COPY.signUpFree, 'ghost', 'sign-up')
      case 'supporter':
        return cta(CTA_COPY.pickSupporter, 'ghost-accent', 'sign-up')
      case 'premium':
        return cta(CTA_COPY.pickPremium, 'signal', 'sign-up')
      case 'founder':
        return cta(CTA_COPY.claimFounderLoggedOut, 'founder', 'sign-up')
    }
  }

  // Free and trial share the acquisition CTAs — a trial user holds no
  // subscription either. They diverge only on the two cards the trial
  // changes the meaning of: Premium is theirs to keep, and Free is where
  // they land rather than a plan they are on.
  if (state === 'free' || state === 'trial') {
    switch (tierKey) {
      case 'free':
        // Unreachable for 'free' — isCurrent short-circuits above.
        return state === 'trial'
          ? cta(CTA_COPY.freeAfterTrial, 'current', 'none')
          : cta(CTA_COPY.youAreOnFree, 'current', 'none')
      case 'supporter':
        return cta(CTA_COPY.becomeSupporter, 'ghost-accent', 'checkout')
      case 'premium':
        return cta(
          state === 'trial' ? CTA_COPY.keepPremium : CTA_COPY.upgradeToPremium,
          'signal',
          'checkout',
        )
      case 'founder':
        return cta(CTA_COPY.claimFounder, 'founder', 'checkout')
    }
  }

  // Paid states — every cross-tier move needs the PR 4.5 change-tier /
  // cancel flows (#780); labels match the design, actions stay disabled.
  if (state === 'supporter') {
    switch (tierKey) {
      case 'free':
        return cta(CTA_COPY.downgradeToFree, 'ghost', 'none')
      case 'premium':
        return cta(CTA_COPY.upgradeToPremium, 'signal', 'none')
      default:
        return cta(CTA_COPY.claimFounder, 'founder', 'none')
    }
  }

  if (state === 'premium') {
    if (tierKey === 'founder') {
      return cta(CTA_COPY.switchToFounder, 'founder', 'none')
    }
    return cta(
      CTA_COPY.switchTo(TIER_DEFINITIONS[tierKey].name),
      'ghost',
      'none',
    )
  }

  // state === 'founder'
  if (tierKey === 'premium') {
    return cta(CTA_COPY.alreadyViaFounder, 'ghost', 'none')
  }
  return cta(CTA_COPY.switchTo(TIER_DEFINITIONS[tierKey].name), 'ghost', 'none')
}
