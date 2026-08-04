// @vitest-environment jsdom

import '@testing-library/jest-dom'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import { ApiError } from '@/lib/api'
import { stubMatchMedia } from '@/test-utils/match-media'
import type { EntitlementResult } from '@/lib/queries/use-entitlement'
import { TIP_CONTENT } from '@/components/ui/cc-tip/definitions/copy'
import { GOING_COPY } from './definitions/copy'
import type { GoingCtaEvent } from './EventDetailCtaBlock'

let entitlement: EntitlementResult = {
  isLoading: false,
  active: true,
  surface: 'visible-active',
}
const mutate = vi.fn()
const refresh = vi.fn()
let isPending = false

vi.mock('@/lib/queries/use-entitlement', () => ({
  useEntitlement: () => entitlement,
}))
vi.mock('@/lib/queries/use-plan-state', () => ({
  usePlanState: () => ({ data: null }),
}))
vi.mock('@/lib/queries/use-attending-toggle', () => ({
  useAttendingToggle: () => ({ mutate, isPending }),
}))
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }))
vi.mock('@/components/consumer/tier-picker/TierPickerSheet', () => ({
  TierPickerSheet: ({ open, entry }: { open: boolean; entry: string }) =>
    open ? <div data-testid="tier-picker" data-entry={entry} /> : null,
}))

const { EventDetailCtaBlock } = await import('./EventDetailCtaBlock')

const event = (over: Partial<GoingCtaEvent> = {}): GoingCtaEvent => ({
  id: 'ev1',
  artist: 'Khruangbin',
  // Far future so it never drifts into the past as the suite ages.
  date: '2099-10-14',
  status: 'upcoming',
  attendingAt: null,
  venue: { timezone: 'America/Denver' },
  ...over,
})

const renderBlock = (over: Partial<GoingCtaEvent> = {}) =>
  render(<EventDetailCtaBlock event={event(over)} scaRegion={false} />)

const EXPLAINER_LABEL = TIP_CONTENT['going-vs-watch'].label

// The block renders more than one button — the commitment CTA plus one or two
// tooltip triggers — so every query has to say which one it means.
const goingButton = (): HTMLElement => {
  const found = screen
    .getAllByRole('button')
    .find((btn) => !btn.hasAttribute('aria-expanded'))
  if (found === undefined) throw new Error('no commitment CTA rendered')
  return found
}

describe('EventDetailCtaBlock', () => {
  beforeEach(() => {
    // The explainer trigger reads useIsMobileViewport; jsdom has no matchMedia.
    stubMatchMedia(false)
    mutate.mockReset()
    refresh.mockReset()
    isPending = false
    entitlement = { isLoading: false, active: true, surface: 'visible-active' }
  })
  afterEach(cleanup)

  it('offers the commitment on an upcoming show the user has not marked', () => {
    renderBlock()
    expect(goingButton()).toHaveTextContent(GOING_COPY.button.default)
  })

  it('reflects the commitment on an upcoming show already marked', () => {
    renderBlock({ attendingAt: '2026-01-01T00:00:00.000Z' })
    expect(goingButton()).toHaveTextContent(GOING_COPY.button.going)
  })

  it('shows the attended state on a past show that was marked', () => {
    renderBlock({ date: '2020-10-14', attendingAt: '2020-10-14T00:00:00.000Z' })
    expect(goingButton()).toHaveTextContent('You went')
  })

  it('shows the declined state on a past show that was never marked', () => {
    renderBlock({ date: '2020-10-14' })
    expect(goingButton()).toHaveTextContent(GOING_COPY.button.pastNo)
  })

  it('renders nothing for a cancelled show', () => {
    const { container } = renderBlock({ status: 'cancelled' })
    expect(container).toBeEmptyDOMElement()
  })

  // Returning nothing while the plan resolved let the watch strip render alone
  // and uncarded, then reparent into the card once it landed — a visible pop-in.
  it('reserves the card while the plan resolves rather than flashing a lock', () => {
    entitlement = { isLoading: true, active: false, surface: null }
    renderBlock()
    const placeholder = screen.getByTestId('going-button-placeholder')
    // Without the sweep the reserved slot reads as an empty box, not as loading.
    expect(placeholder.querySelector('.dl-sweep')).not.toBeNull()
    expect(
      screen.getByRole('button', { name: EXPLAINER_LABEL }),
    ).toBeInTheDocument()
    expect(screen.queryByText(GOING_COPY.button.default)).toBeNull()
    expect(screen.queryByText(GOING_COPY.locked.line)).toBeNull()
  })

  it('commits and refreshes the server-rendered page on tap', () => {
    renderBlock()
    fireEvent.click(goingButton())
    expect(mutate).toHaveBeenCalledWith(
      { eventId: 'ev1', going: true },
      expect.anything(),
    )
  })

  it('releases the commitment when tapped while going', () => {
    renderBlock({ attendingAt: '2026-01-01T00:00:00.000Z' })
    fireEvent.click(goingButton())
    expect(mutate).toHaveBeenCalledWith(
      { eventId: 'ev1', going: false },
      expect.anything(),
    )
  })

  it('routes a locked tap to the upgrade path instead of mutating', () => {
    entitlement = { isLoading: false, active: false, surface: 'paywall-on-tap' }
    renderBlock()
    fireEvent.click(goingButton())
    expect(mutate).not.toHaveBeenCalled()
    expect(screen.getByTestId('tier-picker')).toHaveAttribute(
      'data-entry',
      'paywall',
    )
  })

  it('shows the locked treatment to a user without the entitlement', () => {
    entitlement = { isLoading: false, active: false, surface: 'paywall-on-tap' }
    renderBlock()
    // Same label as unlocked, so the control reads as the thing you'd get.
    expect(goingButton()).toHaveTextContent(GOING_COPY.button.default)
    expect(goingButton()).toHaveAttribute('aria-label', GOING_COPY.locked.aria)
    // A disabled control can't sell anything.
    expect(goingButton()).toBeEnabled()
    expect(screen.getByText(GOING_COPY.locked.line)).toBeInTheDocument()
  })

  it('leaves a past show alone even when the entitlement is gone', () => {
    entitlement = { isLoading: false, active: false, surface: 'paywall-on-tap' }
    renderBlock({ date: '2020-10-14' })
    expect(goingButton()).toHaveTextContent(GOING_COPY.button.pastNo)
    expect(screen.queryByText(GOING_COPY.locked.line)).toBeNull()
  })

  it('puts the retry in the button and names what survived beneath it', () => {
    mutate.mockImplementation((_input, options) => options.onError())
    renderBlock()
    fireEvent.click(goingButton())
    expect(goingButton()).toHaveTextContent(GOING_COPY.error.retry)
    expect(screen.getByRole('alert')).toHaveTextContent(
      GOING_COPY.error.survived,
    )
  })

  it('retries the same intent when the failed button is tapped again', () => {
    mutate.mockImplementation((_input, options) => options.onError())
    renderBlock()
    fireEvent.click(goingButton())
    mutate.mockImplementation(() => {})
    fireEvent.click(goingButton())
    expect(mutate).toHaveBeenLastCalledWith(
      { eventId: 'ev1', going: true },
      expect.anything(),
    )
  })

  // The error treatment reports as not-going, so a naive retry would
  // replay `going: true` and quietly no-op instead of releasing.
  it('retries a failed release as a release, not as a fresh commitment', () => {
    mutate.mockImplementation((_input, options) => options.onError())
    renderBlock({ attendingAt: '2026-01-01T00:00:00.000Z' })
    fireEvent.click(goingButton())
    mutate.mockImplementation(() => {})
    fireEvent.click(goingButton())
    expect(mutate).toHaveBeenLastCalledWith(
      { eventId: 'ev1', going: false },
      expect.anything(),
    )
  })

  it('keeps the locked treatment when a failure and a lost entitlement collide', () => {
    mutate.mockImplementation((_input, options) => options.onError())
    const { rerender } = render(
      <EventDetailCtaBlock event={event()} scaRegion={false} />,
    )
    fireEvent.click(goingButton())
    expect(goingButton()).toHaveTextContent(GOING_COPY.error.retry)

    // The entitlement lapses while the failure is still on screen.
    entitlement = { isLoading: false, active: false, surface: 'paywall-on-tap' }
    rerender(<EventDetailCtaBlock event={event()} scaRegion={false} />)
    expect(goingButton()).toHaveAttribute('aria-label', GOING_COPY.locked.aria)
  })

  it('sends a logged-out tap straight to the picker', () => {
    entitlement = {
      isLoading: false,
      active: false,
      surface: 'tier-picker-on-tap',
    }
    renderBlock()
    fireEvent.click(goingButton())
    // Not `logged-out-paywall`: this reach is for Concert History, and the
    // entry keys the gate's copy as well as the funnel dimension.
    expect(screen.getByTestId('tier-picker')).toHaveAttribute(
      'data-entry',
      'logged-out-going',
    )
  })

  // The explainer used to render only in the else-branch beneath the button, so
  // the gate and a failure both silenced it — the two moments someone is most
  // likely to ask what Going even is.
  it.each(['locked', 'error'] as const)(
    'keeps the explainer reachable in the %s treatment',
    (treatment) => {
      if (treatment === 'locked') {
        entitlement = {
          isLoading: false,
          active: false,
          surface: 'paywall-on-tap',
        }
        renderBlock()
      } else {
        mutate.mockImplementation((_input, options) => options.onError())
        renderBlock()
        fireEvent.click(goingButton())
      }
      expect(
        screen.getByRole('button', { name: EXPLAINER_LABEL }),
      ).toBeInTheDocument()
    },
  )

  it('heads the block with an eyebrow so the tip has a line to sit on', () => {
    renderBlock()
    expect(screen.getByText(GOING_COPY.eyebrow.upcoming)).toBeInTheDocument()
    cleanup()
    renderBlock({ date: '2020-10-14' })
    expect(screen.getByText(GOING_COPY.eyebrow.past)).toBeInTheDocument()
  })

  // The going-vs-watch distinction sits behind a tooltip rather than a standing
  // line, so the CTAs aren't buried under explanatory copy. It reads from the
  // shared registry: the same pair is explained the same way everywhere.
  it('keeps the difference explainer behind a tooltip trigger', () => {
    const tip = TIP_CONTENT['going-vs-watch']
    if (tip.variant !== 'defs') throw new Error('expected the defs panel')
    renderBlock()
    expect(screen.queryByText(tip.intro)).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: EXPLAINER_LABEL }))
    expect(screen.getByText(tip.intro)).toBeInTheDocument()
    expect(screen.getByText(tip.rows[0].title)).toBeInTheDocument()
  })

  // A hand-rolled glyph passed as CCTip's children silently replaces the
  // designed info disc, taking its open state and touch target with it.
  it('uses CCTip’s own trigger rather than a bespoke glyph', () => {
    renderBlock()
    const trigger = screen.getByRole('button', { name: EXPLAINER_LABEL })
    expect(trigger).toHaveTextContent('')
    expect(trigger.querySelector('svg')).not.toBeNull()
  })

  // The gate line sells Concert History, so it carries its own tip; the header
  // tip explains the going/watching distinction, which is a different question.
  it('pairs the locked line with a Concert History tip', () => {
    entitlement = { isLoading: false, active: false, surface: 'paywall-on-tap' }
    renderBlock()
    expect(
      screen.getByRole('button', {
        name: TIP_CONTENT['concert-history'].label,
      }),
    ).toBeInTheDocument()
  })

  // Watching is free and ungated, so a suppressed commitment must never take
  // the strip down with it.
  it('still renders the watch strip when the commitment is suppressed', () => {
    render(
      <EventDetailCtaBlock event={event({ status: 'cancelled' })} scaRegion>
        <div data-testid="watch-strip" />
      </EventDetailCtaBlock>,
    )
    expect(screen.getByTestId('watch-strip')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: EXPLAINER_LABEL })).toBeNull()
  })

  // The mutation only lands in the tree via router.refresh(), so without a
  // local override the button sat unchanged until the server HTML arrived.
  it('shows the committed state immediately, before the server agrees', () => {
    mutate.mockImplementation(() => {})
    renderBlock()

    fireEvent.click(
      screen.getByRole('button', { name: GOING_COPY.button.ariaNotGoing }),
    )
    expect(screen.getByText(GOING_COPY.button.going)).toBeInTheDocument()
  })

  // Go, then release before the first refresh lands. When that first refresh
  // finally arrives it carries the now-stale "going" state — the UI has to keep
  // showing the second tap rather than flashing back.
  it('holds the latest tap when a stale refresh arrives', () => {
    mutate.mockImplementation(() => {})
    const { rerender } = render(
      <EventDetailCtaBlock event={event()} scaRegion={false} />,
    )

    fireEvent.click(goingButton())
    fireEvent.click(goingButton())
    expect(goingButton().getAttribute('aria-label')).toBe(
      GOING_COPY.button.ariaNotGoing,
    )

    rerender(
      <EventDetailCtaBlock
        event={event({ attendingAt: '2099-10-01T00:00:00.000Z' })}
        scaRegion={false}
      />,
    )
    expect(goingButton().getAttribute('aria-label')).toBe(
      GOING_COPY.button.ariaNotGoing,
    )
  })

  it('surfaces a failure without leaving the row silent', () => {
    mutate.mockImplementation((_input, options) => options.onError())
    renderBlock()
    fireEvent.click(goingButton())
    expect(screen.getByText(GOING_COPY.error.survived)).toBeInTheDocument()
  })

  it('routes a server-side entitlement 403 to the upgrade path, not the error line', () => {
    mutate.mockImplementation((_input, options) =>
      options.onError(
        new ApiError(403, 'Upgrade required', 'entitlement_required'),
      ),
    )
    renderBlock()
    fireEvent.click(goingButton())
    expect(screen.getByTestId('tier-picker')).toBeInTheDocument()
    expect(screen.queryByText(GOING_COPY.error.survived)).toBeNull()
  })

  it('refreshes the page after a successful commitment', () => {
    mutate.mockImplementation((_input, options) => options.onSuccess())
    renderBlock()
    fireEvent.click(goingButton())
    expect(refresh).toHaveBeenCalled()
  })

  it('disables the commitment while the toggle is in flight', () => {
    isPending = true
    renderBlock()
    expect(goingButton()).toBeDisabled()
  })
})
