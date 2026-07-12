import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { watchForRequiresAction } from './requires-action-detector'

const INTERVAL = 1000

describe('watchForRequiresAction', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('fires onRequiresAction once when the intent flips to requires_action', async () => {
    const retrievePaymentIntent = vi
      .fn()
      .mockResolvedValueOnce({ paymentIntent: { status: 'processing' } })
      .mockResolvedValue({ paymentIntent: { status: 'requires_action' } })
    const onRequiresAction = vi.fn()
    watchForRequiresAction(
      { retrievePaymentIntent },
      'cs_test',
      onRequiresAction,
      INTERVAL,
    )

    await vi.advanceTimersByTimeAsync(INTERVAL)
    expect(onRequiresAction).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(INTERVAL * 3)
    expect(onRequiresAction).toHaveBeenCalledTimes(1)
    // Stops itself after firing — no further polls.
    const callsAfterFire = retrievePaymentIntent.mock.calls.length
    await vi.advanceTimersByTimeAsync(INTERVAL * 3)
    expect(retrievePaymentIntent.mock.calls.length).toBe(callsAfterFire)
  })

  it('polls with the given clientSecret', async () => {
    const retrievePaymentIntent = vi
      .fn()
      .mockResolvedValue({ paymentIntent: { status: 'processing' } })
    watchForRequiresAction(
      { retrievePaymentIntent },
      'cs_secret_123',
      vi.fn(),
      INTERVAL,
    )
    await vi.advanceTimersByTimeAsync(INTERVAL)
    expect(retrievePaymentIntent).toHaveBeenCalledWith('cs_secret_123')
  })

  it('never fires after stop() is called', async () => {
    const retrievePaymentIntent = vi
      .fn()
      .mockResolvedValue({ paymentIntent: { status: 'requires_action' } })
    const onRequiresAction = vi.fn()
    const stop = watchForRequiresAction(
      { retrievePaymentIntent },
      'cs_test',
      onRequiresAction,
      INTERVAL,
    )
    stop()
    await vi.advanceTimersByTimeAsync(INTERVAL * 3)
    expect(retrievePaymentIntent).not.toHaveBeenCalled()
    expect(onRequiresAction).not.toHaveBeenCalled()
  })

  it('ignores a poll that resolves requires_action after stop() mid-flight', async () => {
    let resolvePoll: (value: {
      paymentIntent: { status: string }
    }) => void = () => {}
    const retrievePaymentIntent = vi.fn().mockReturnValue(
      new Promise((resolve) => {
        resolvePoll = resolve
      }),
    )
    const onRequiresAction = vi.fn()
    const stop = watchForRequiresAction(
      { retrievePaymentIntent },
      'cs_test',
      onRequiresAction,
      INTERVAL,
    )
    await vi.advanceTimersByTimeAsync(INTERVAL)
    expect(retrievePaymentIntent).toHaveBeenCalledTimes(1)
    stop()
    resolvePoll({ paymentIntent: { status: 'requires_action' } })
    await vi.advanceTimersByTimeAsync(0)
    expect(onRequiresAction).not.toHaveBeenCalled()
  })

  it('logs and keeps polling when a poll rejects', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const retrievePaymentIntent = vi
      .fn()
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValue({ paymentIntent: { status: 'requires_action' } })
    const onRequiresAction = vi.fn()
    watchForRequiresAction(
      { retrievePaymentIntent },
      'cs_test',
      onRequiresAction,
      INTERVAL,
    )
    await vi.advanceTimersByTimeAsync(INTERVAL)
    expect(consoleSpy).toHaveBeenCalledWith(
      'tier-picker: requires-action poll failed',
      expect.any(Error),
    )
    await vi.advanceTimersByTimeAsync(INTERVAL)
    expect(onRequiresAction).toHaveBeenCalledTimes(1)
    consoleSpy.mockRestore()
  })
})
