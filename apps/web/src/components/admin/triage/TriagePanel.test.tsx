// @vitest-environment jsdom

import { render, screen, within } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import { TRIAGE_NO_SWEEP } from '@concert-crawl/types'

import { TriagePanel } from './TriagePanel'
import type { TriageData, TriageFault, TriageQueue } from './definitions/types'

const refresh = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh }),
}))

const SWEEP = {
  venues: 30,
  at: '3:04 AM',
  atIso: '2026-07-30T09:04:00.000Z',
  events: 812,
  next: 'tomorrow 3:00 AM',
}

const base = {
  venueId: '11111111-1111-1111-1111-111111111111',
  venue: 'Bluebird Theater',
  persistedSince: '2026-07-24T09:00:00.000Z',
  days: 6,
  dur: '6d',
  crawlRunId: '22222222-2222-2222-2222-222222222222',
}

const blocked: TriageFault = {
  ...base,
  id: 'f-blocked',
  band: 'hard',
  condition: 'blocked',
  evidence: { status: 403, refusals: 4, lastSuccess: 'Jul 24' },
}

const failed: TriageFault = {
  ...base,
  id: 'f-failed',
  band: 'hard',
  condition: 'failed',
  evidence: { failures: 3, errorClass: 'bot_detection', pauseAt: 3 },
}

const wentDark: TriageFault = {
  ...base,
  id: 'f-dark',
  band: 'loss',
  condition: 'wentDark',
  evidence: {
    count: 2,
    baselineCount: 18,
    avg: 17,
    pct: -88,
    window: 7,
    threshold: -70,
    series: [18, 17, 19, 16, 18, 17, 2],
  },
}

const coverage: TriageFault = {
  ...base,
  id: 'f-coverage',
  band: 'loss',
  condition: 'coverage',
  evidence: { matched: 9, expected: 14, uncovered: 5, wasWhen: 'Jul 12' },
}

const ceilingPinned: TriageFault = {
  ...base,
  id: 'f-ceiling',
  band: 'suspect',
  condition: 'ceiling',
  evidence: {
    kind: 'pinned_count',
    count: 20,
    runs: 5,
    was: 31,
    wasWhen: 'Jul 18',
    furthest: null,
    best: null,
    shrankDays: null,
    series: [34, 31, 20, 20, 20, 20, 20],
  },
}

const ceilingHorizon: TriageFault = {
  ...base,
  id: 'f-horizon',
  band: 'suspect',
  condition: 'ceiling',
  evidence: {
    kind: 'horizon_shrank',
    count: 25,
    runs: 4,
    was: 41,
    wasWhen: 'last week',
    furthest: 'Sep 3',
    best: 'Nov 21',
    shrankDays: 79,
    series: [41, 38, 30, 25],
  },
}

const flagsQueue: TriageQueue = {
  id: 'q-flags',
  kind: 'eventFlags',
  count: 12,
  breakdown: 'Bluebird 5 · Ogden 4 · Marquis 2 · 1 more',
  action: 'openReview',
}

const pricesQueue: TriageQueue = {
  id: 'q-prices',
  kind: 'priceSubmissions',
  count: 5,
  breakdown: 'Khruangbin @ Ogden · Wednesday @ Larimer · 3 more',
  action: 'openSubmissions',
}

const data = (
  faults: TriageFault[],
  queues: TriageQueue[] = [],
): TriageData => ({ faults, queues, sweep: SWEEP })

// jsdom has no matchMedia. `compact` is a presentation switch — the same rows
// with the same accessible names either way — so these render at the desktop
// width, and `setViewport(true)` opts a test into the compact tree.
let compactViewport = false
const setViewport = (compact: boolean) => {
  compactViewport = compact
}

beforeEach(() => {
  refresh.mockClear()
  compactViewport = false
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: compactViewport,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
})

describe('TriagePanel — evidence per condition', () => {
  it('renders a blocked row', () => {
    render(<TriagePanel data={data([blocked])} />)
    expect(screen.getByText('HTTP 403')).toBeTruthy()
    expect(
      screen.getByText('4 refusals in a row · last success Jul 24'),
    ).toBeTruthy()
    expect(screen.getByText('Blocked')).toBeTruthy()
  })

  it('renders a crawl-failing row with the humanised error class', () => {
    render(<TriagePanel data={data([failed])} />)
    expect(screen.getByText('3 failures in a row')).toBeTruthy()
    // Reads the pause threshold off the payload: 3, not a hardcoded 8.
    expect(screen.getByText('Bot detection · pauses itself at 3')).toBeTruthy()
  })

  it('renders a went-dark row with runs (not days) and the payload threshold', () => {
    render(<TriagePanel data={data([wentDark])} />)
    expect(screen.getByText('18 → 2 events')).toBeTruthy()
    expect(
      screen.getByText('-88% against a 7-run average of 17 · flags at -70%'),
    ).toBeTruthy()
  })

  it('renders a coverage row from the supplied uncovered count', () => {
    render(<TriagePanel data={data([coverage])} />)
    expect(screen.getByText('9 of 14 events have a ticket link')).toBeTruthy()
    // "uncovered since", not "was 14/14 on" — wasWhen is an uncovered-since
    // date (#1266).
    expect(
      screen.getByText(
        '5 have neither a ticket nor an event link · uncovered since Jul 12',
      ),
    ).toBeTruthy()
  })

  it('renders the pinned-count ceiling variant', () => {
    render(<TriagePanel data={data([ceilingPinned])} />)
    expect(screen.getByText('stuck at 20 events')).toBeTruthy()
    expect(
      screen.getByText('5 runs at the same count · 31 before Jul 18'),
    ).toBeTruthy()
  })

  it('renders the horizon-shrank ceiling variant with its own copy', () => {
    render(<TriagePanel data={data([ceilingHorizon])} />)
    expect(screen.getByText('furthest show Sep 3')).toBeTruthy()
    expect(
      screen.getByText('horizon pulled back 79 days · reached Nov 21 before'),
    ).toBeTruthy()
    // The pinned sentence must not leak into the horizon variant.
    expect(screen.queryByText(/runs at the same count/)).toBeNull()
  })
})

describe('TriagePanel — nullable evidence fields', () => {
  // Six nullable fields, each of which would otherwise interpolate the string
  // "null" into copy an admin reads at 3am.
  it('never renders the literal "null" for any null field', () => {
    const nulls: TriageFault[] = [
      {
        ...blocked,
        id: 'n-blocked',
        crawlRunId: null,
        evidence: { status: null, refusals: 2, lastSuccess: null },
      },
      {
        ...coverage,
        id: 'n-coverage',
        evidence: { matched: 0, expected: 4, uncovered: 4, wasWhen: null },
      },
      {
        ...ceilingPinned,
        id: 'n-pinned',
        evidence: {
          kind: 'pinned_count',
          count: 20,
          runs: 1,
          was: null,
          wasWhen: null,
          furthest: null,
          best: null,
          shrankDays: null,
          series: [20],
        },
      },
      {
        ...ceilingHorizon,
        id: 'n-horizon',
        evidence: {
          kind: 'horizon_shrank',
          count: 25,
          runs: 3,
          was: null,
          wasWhen: null,
          furthest: null,
          best: null,
          shrankDays: null,
          series: [30, 25],
        },
      },
    ]
    const { container } = render(<TriagePanel data={data(nulls)} />)
    expect(container.textContent).not.toContain('null')
    expect(container.textContent).not.toContain('undefined')
    expect(screen.getByText('Refusing to crawl')).toBeTruthy()
    expect(
      screen.getByText('2 refusals in a row · no successful crawl on record'),
    ).toBeTruthy()
    expect(
      screen.getByText('4 have neither a ticket nor an event link'),
    ).toBeTruthy()
    // Singular "run", and no dangling "before".
    expect(
      screen.getByText(
        '1 run at the same count · no different count on record',
      ),
    ).toBeTruthy()
    expect(screen.getByText('horizon pulled back')).toBeTruthy()
    expect(screen.getByText('stuck at 25 events')).toBeTruthy()
  })

  it('renders the all-clear body when the sweep has a null atIso', () => {
    render(
      <TriagePanel
        data={{ faults: [], queues: [], sweep: { ...SWEEP, atIso: null } }}
      />,
    )
    expect(screen.getByText("Nothing's broken.")).toBeTruthy()
  })
})

describe('TriagePanel — micro-chart', () => {
  it('plots a two-entry series and labels it in runs', () => {
    render(
      <TriagePanel
        data={data([
          {
            ...wentDark,
            evidence: { ...wentDark.evidence, series: [18, 2] },
          },
        ])}
      />,
    )
    const chart = screen.getByRole('img', { name: /Event counts across/ })
    expect(chart.getAttribute('aria-label')).toBe(
      'Event counts across the last 2 runs: 18, 2. Latest 2.',
    )
    expect(chart.children).toHaveLength(2)
  })

  it('handles a single-run series without pluralising', () => {
    render(
      <TriagePanel
        data={data([
          { ...wentDark, evidence: { ...wentDark.evidence, series: [2] } },
        ])}
      />,
    )
    const chart = screen.getByRole('img', { name: /Event counts across/ })
    expect(chart.getAttribute('aria-label')).toContain('the last 1 run:')
  })

  it('omits the chart for conditions with no series', () => {
    render(<TriagePanel data={data([blocked, coverage])} />)
    expect(screen.queryByRole('img')).toBeNull()
  })
})

describe('TriagePanel — rows and links', () => {
  it('renders every fault, never a truncated three', () => {
    const many = Array.from({ length: 5 }, (_, index) => ({
      ...blocked,
      id: `f-${index}`,
      venue: `Venue ${index}`,
    }))
    render(<TriagePanel data={data(many)} />)
    expect(screen.getAllByRole('link')).toHaveLength(5)
  })

  it('composes the row aria-label and softens it for suspect rows', () => {
    render(<TriagePanel data={data([blocked, ceilingPinned])} />)
    expect(
      screen.getByLabelText(
        'Bluebird Theater — blocked by the venue. HTTP 403. Broken for 6d.',
      ),
    ).toBeTruthy()
    expect(
      screen.getByLabelText(
        'Bluebird Theater — possibly stuck on page one. stuck at 20 events. Like this for 6d.',
      ),
    ).toBeTruthy()
  })

  it('deep-links each action to a route that already exists', () => {
    render(<TriagePanel data={data([blocked, failed, ceilingPinned])} />)
    const hrefs = screen
      .getAllByRole('link')
      .map((link) => link.getAttribute('href'))
    expect(hrefs).toContain(`/admin/venues/${base.venueId}`)
    expect(hrefs).toContain(`/admin/crawl?venueId=${base.venueId}&tab=history`)
    expect(hrefs).toContain(
      `/admin/crawl?venueId=${base.venueId}&tab=diagnostics`,
    )
  })

  // The Diagnostics pane only renders for a failed run. A ceiling-suspected
  // venue's latest run succeeded, so pointing it there opens an empty pane —
  // its evidence is the run series on History. Asserting the set of hrefs is
  // not enough; the condition-to-tab mapping is the thing that can invert.
  it.each([
    ['failed', failed, 'diagnostics'],
    ['ceiling', ceilingPinned, 'history'],
    ['wentDark', wentDark, 'history'],
  ])('routes a %s row to the %s tab', (_name, fault, tab) => {
    render(<TriagePanel data={data([fault])} />)
    expect(screen.getByRole('link').getAttribute('href')).toBe(
      `/admin/crawl?venueId=${base.venueId}&tab=${tab}`,
    )
  })

  it('degrades a run-scoped row to the venue page when crawlRunId is null', () => {
    render(<TriagePanel data={data([{ ...failed, crawlRunId: null }])} />)
    expect(screen.getByRole('link').getAttribute('href')).toBe(
      `/admin/venues/${base.venueId}`,
    )
  })
})

describe('TriagePanel — banding', () => {
  it('shows one "broken now" strip below the dense threshold', () => {
    render(<TriagePanel data={data([blocked, wentDark, ceilingPinned])} />)
    expect(screen.getByText('broken now')).toBeTruthy()
    expect(screen.queryByText('not crawling')).toBeNull()
  })

  it('splits into severity bands at seven faults', () => {
    const faults = [
      blocked,
      { ...failed, id: 'd-1' },
      { ...wentDark, id: 'd-2' },
      { ...coverage, id: 'd-3' },
      { ...wentDark, id: 'd-4' },
      { ...ceilingPinned, id: 'd-5' },
      { ...ceilingHorizon, id: 'd-6' },
    ]
    render(<TriagePanel data={data(faults)} />)
    expect(screen.queryByText('broken now')).toBeNull()
    expect(screen.getByText('not crawling')).toBeTruthy()
    expect(screen.getByText('losing events')).toBeTruthy()
    expect(screen.getByText('worth a look')).toBeTruthy()
    expect(screen.getAllByRole('link')).toHaveLength(7)
  })

  it('honours a denseAt override', () => {
    render(<TriagePanel data={data([blocked, wentDark])} denseAt={2} />)
    expect(screen.getByText('not crawling')).toBeTruthy()
  })
})

describe('TriagePanel — compact viewport', () => {
  // Mobile/desktop parity: the same rows, the same links, the same accessible
  // names. Only the context line drops, and only when the list is also banded.
  it('drops the context line when banded on a phone, but keeps the figure', () => {
    setViewport(true)
    const faults = Array.from({ length: 7 }, (_, index) => ({
      ...wentDark,
      id: `c-${index}`,
    }))
    render(<TriagePanel data={data(faults)} />)
    expect(screen.getAllByRole('link')).toHaveLength(7)
    expect(screen.getAllByText('18 → 2 events')).toHaveLength(7)
    expect(screen.queryByText(/against a 7-run average/)).toBeNull()
  })

  it('keeps the context line on a phone when the list is short', () => {
    setViewport(true)
    render(<TriagePanel data={data([wentDark])} />)
    expect(
      screen.getByText('-88% against a 7-run average of 17 · flags at -70%'),
    ).toBeTruthy()
  })

  it('keeps the Refresh button reachable by name when its label is hidden', () => {
    setViewport(true)
    render(<TriagePanel data={data([blocked])} />)
    expect(screen.getByRole('button', { name: 'Refresh' })).toBeTruthy()
  })
})

describe('TriagePanel — queues', () => {
  it('renders both queue kinds, including the "N more" tail', () => {
    render(<TriagePanel data={data([], [flagsQueue, pricesQueue])} />)
    expect(screen.getByText('12 events flagged for review')).toBeTruthy()
    expect(
      screen.getByText(
        'Bluebird 5 · Ogden 4 · Marquis 2 · 1 more · below the auto-approve threshold',
      ),
    ).toBeTruthy()
    expect(screen.getByText('5 price submissions waiting')).toBeTruthy()
    expect(
      screen.getByText('Khruangbin @ Ogden · Wednesday @ Larimer · 3 more'),
    ).toBeTruthy()
    expect(
      screen.getAllByRole('link').map((link) => link.getAttribute('href')),
    ).toEqual(['/admin/review', '/admin/prices/submissions'])
  })

  it('reassures that faults are clear when only queues remain', () => {
    render(<TriagePanel data={data([], [flagsQueue, pricesQueue])} />)
    expect(
      screen.getByText('30 venues crawling clean · last checked 3:04 AM'),
    ).toBeTruthy()
    expect(screen.getByText('17 in queue')).toBeTruthy()
  })
})

describe('TriagePanel — panel states', () => {
  it('reports the all-clear as a result, with the numbers behind it', () => {
    render(<TriagePanel data={data([])} />)
    expect(screen.getByText("Nothing's broken.")).toBeTruthy()
    expect(
      screen.getByText(
        'All 30 venues crawled clean at 3:04 AM. 812 events came in. Both queues are empty.',
      ),
    ).toBeTruthy()
    expect(screen.getByText('Next sweep tomorrow 3:00 AM')).toBeTruthy()
    // Both the header badge and the empty-state eyebrow read "all clear".
    expect(screen.getAllByText('all clear')).toHaveLength(2)
  })

  // The API sends the no-sweep sentinel for sweep.at when no crawl run exists
  // at all. Interpolating it claims a clean sweep that never ran.
  it('says no sweep has run rather than "crawled clean at —"', () => {
    const noSweep = data([])
    render(
      <TriagePanel
        data={{ ...noSweep, sweep: { ...noSweep.sweep, at: TRIAGE_NO_SWEEP } }}
      />,
    )
    expect(
      screen.getByText(
        'No crawl has run yet across 30 venues. Nothing to report.',
      ),
    ).toBeTruthy()
    expect(screen.queryByText(/crawled clean at/)).toBeNull()
    expect(screen.queryByText(/checked —/)).toBeNull()
  })

  it('degrades rather than throwing when the fetch failed', () => {
    render(<TriagePanel data={null} />)
    expect(screen.getByText("Couldn't check venue health.")).toBeTruthy()
    // No badge, no rows, but the panel and its Refresh button survive.
    expect(screen.queryByRole('link')).toBeNull()
    expect(screen.getByRole('button', { name: 'Refresh' })).toBeTruthy()
  })

  it('picks the badge severity from the worst band present', () => {
    const { rerender } = render(<TriagePanel data={data([blocked])} />)
    expect(screen.getByText('1 fault')).toBeTruthy()
    rerender(<TriagePanel data={data([wentDark, ceilingPinned])} />)
    expect(screen.getByText('2 faults')).toBeTruthy()
  })

  it('announces the counts in a polite live region', () => {
    const { container } = render(
      <TriagePanel data={data([blocked], [flagsQueue])} />,
    )
    const live = container.querySelector('[aria-live="polite"]')
    expect(live?.textContent).toBe('1 fault, 12 items in the queues.')
  })

  it('calls router.refresh when Refresh is pressed', () => {
    render(<TriagePanel data={data([blocked])} />)
    screen.getByRole('button', { name: 'Refresh' }).click()
    expect(refresh).toHaveBeenCalledTimes(1)
  })

  it('keeps one tab stop per row — the action chevron is not focusable', () => {
    const { container } = render(
      <TriagePanel data={data([blocked], [flagsQueue])} />,
    )
    expect(container.querySelectorAll('[tabindex]')).toHaveLength(0)
    const rows = screen.getAllByRole('link')
    expect(rows).toHaveLength(2)
    // The action label lives inside the row, hidden from the accessible name.
    expect(within(rows[0]!).getByText('Open venue')).toBeTruthy()
  })
})
