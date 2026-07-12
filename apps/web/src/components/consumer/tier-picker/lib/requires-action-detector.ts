// 3DS/SCA detection for the embedded Payment Element flow (PR 4.4).
//
// stripe-js's Payment Element `confirmPayment` handles next-actions itself —
// there is no `handleActions: false` split and `handleNextAction` is
// server-confirm-only. So while `confirmPayment` is in flight we poll
// `retrievePaymentIntent` (client-side, publishable-key scoped); the moment
// the intent reads `requires_action` we know Stripe is about to (or already
// did) present its bank challenge, and mount the ChallengeMount chrome
// around it.

/** The slice of the Stripe client we need — keeps tests mock-light. */
export interface RequiresActionStripe {
  retrievePaymentIntent(clientSecret: string): Promise<{
    paymentIntent?: { status: string } | undefined
  }>
}

/**
 * Starts polling for `requires_action`. Returns a stop() that must be
 * called when confirmPayment settles (success or failure). Fires
 * `onRequiresAction` at most once, then stops itself.
 */
export const watchForRequiresAction = (
  stripe: RequiresActionStripe,
  clientSecret: string,
  onRequiresAction: () => void,
  intervalMs: number,
): (() => void) => {
  let stopped = false
  let inFlight = false

  const timer = setInterval(() => {
    if (stopped || inFlight) return
    inFlight = true
    void (async () => {
      try {
        const result = await stripe.retrievePaymentIntent(clientSecret)
        if (stopped) return
        if (result.paymentIntent?.status === 'requires_action') {
          stopped = true
          clearInterval(timer)
          onRequiresAction()
        }
      } catch (err) {
        console.error('tier-picker: requires-action poll failed', err)
      } finally {
        inFlight = false
      }
    })()
  }, intervalMs)

  return () => {
    stopped = true
    clearInterval(timer)
  }
}
