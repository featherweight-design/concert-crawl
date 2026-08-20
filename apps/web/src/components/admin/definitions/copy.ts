// Single source of truth for all admin UI copy

import { TRIAGE_NO_SWEEP as NO_SWEEP } from '@concert-crawl/types'

// The crawler's `classifyCrawlError` identifiers, written out for the triage
// panel. Anything unrecognised falls back to the raw identifier rather than
// being swallowed — a new classifier value should read oddly, not vanish.
const TRIAGE_ERROR_CLASS_LABELS: Record<string, string> = {
  bot_detection: 'Bot detection',
  server_error: 'Server error',
  timeout: 'Timed out',
  robots_disallowed: 'Disallowed by robots.txt',
  network_error: 'Network error',
  parse_failure: 'Could not parse the page',
  crawl_error: 'Crawl error',
  unknown: 'Unclassified error',
}

export const ADMIN_COPY = {
  dashboard: {
    statCards: {
      needsReview: 'Needs review',
      needsReviewUnit: 'items',
      llmCost: 'LLM cost · 30d',
      crawlHealth: 'Crawl health',
      crawlHealthUnit: 'green',
      activeVenues: 'Active venues',
    },
    buttons: {
      openReview: 'Open Review',
    },
    panels: {
      crawlHealthToday: 'Crawl health · today',
    },
    costPanel: {
      title: 'LLM spend, last 30 days',
      wowBadge: (delta: string) => `${delta} wow`,
      wowBadgeAriaLabel: (delta: string) => `LLM spend ${delta} week over week`,
      budgetCaption: (budget: number) => `of $${budget} budget`,
      topSpendLabel: 'top spend',
      othersLabel: '(others)',
      empty: 'No LLM spend recorded in the last 30 days.',
      topSpendEmpty: 'No venue spend yet.',
      chartAriaLabel: (total: string) =>
        `LLM spend over the last 30 days: ${total} total`,
    },
    summary: {
      venuesNeedAttention: (count: number) =>
        `${count} venue${count === 1 ? '' : 's'} need${count === 1 ? 's' : ''} attention`,
      eventsFlagged: (count: number) => `${count} events flagged`,
      pricesWaiting: (count: number) => `${count} price submissions waiting`,
      venuesGreen: (green: number, total: number) =>
        `${green} of ${total} venues green`,
    },
    budget: {
      hint: (budget: number, pct: number) => `Budget $${budget} · ${pct}% used`,
    },
    activeVenues: {
      addedThisWeek: (count: number) => `+${count} this week`,
      venuesOfTotal: (total: number) => `of ${total}`,
    },
    greeting: {
      morning: 'Good morning',
      afternoon: 'Good afternoon',
      evening: 'Good evening',
    },
    activityFeed: {
      tabs: {
        all: 'All',
        crawl: 'Crawl',
        events: 'Events',
        invites: 'Invites',
      },
      noRecentActivity: 'No recent activity.',
      noActivity: 'No activity yet.',
      crawlOk: (venueName: string) => `${venueName} crawl ok`,
      crawlStatus: (venueName: string, status: string) =>
        `${venueName} crawl ${status}`,
      venueFallback: 'Venue',
    },
    crawlHealthTable: {
      columns: {
        venue: 'Venue',
        status: 'Status',
        lastCrawl: 'Last crawl',
        strategy: 'Strategy',
        events: 'Events',
        cost: 'Cost',
      },
    },
    runHistoryBlocks: {
      lastNRuns: (count: number) => `Last ${count} runs`,
    },
    runAllVenuesButton: {
      pending: 'Running…',
      idle: 'Run all venues',
    },
  },

  crawlPage: {
    sectionEyebrow: 'automation',
    sectionTitle: 'Crawl status',
    sectionSubtitle:
      'Every venue crawl, run by run. Click a failed row for diagnostics + staged remediation.',
    statLastSweep: 'Last sweep',
    statLastSweepUnit: 'ago',
    statTodaysRuns: "Today's runs",
    statEventsIngested: 'Events ingested',
    statEventsIngestedUnit: 'today',
    statEventsHintFallback: 'today',
    statLlmCost: 'LLM cost · today',
  },

  crawl: {
    issuesBanner: {
      jumpToIssues: 'Jump to issues',
      statusBlocked: 'blocked',
      statusFailed: 'failed',
      statusPaused: 'paused',
      statusDetail: {
        disallowed: 'disallowed',
      },
    },

    splitView: {
      filterLabel: 'Filter',
      filterStatusLabel: 'Status',
      filterVenueLabel: 'Venue',
      filterVenuePlaceholder: 'Search venues…',
      filterClearButton: 'Clear filters',
      filterNoResults: 'No venues match the current filter.',
      latestRunHeader: 'Latest run · per venue',
      venueLastRunNever: 'never',
      backToAllVenues: '← All venues',
      sourceUrlButton: 'Source URL',
      recrawlTriggering: 'Triggering…',
      recrawlQueued: 'Queued',
      recrawlButton: 'Re-crawl',
      noRunsYetTitle: 'No runs yet',
      noRunsYetBody: 'Hit Re-crawl to trigger the first run for this venue.',
      selectVenuePrompt: 'Select a venue to inspect',
      errorSectionLabel: 'Error',
      errorHttpBlock: 'HTTP {code} · venue blocked',
      errorCrawlFailed: 'Crawl failed',
      errorConsecutiveFailures: 'Consecutive failures:',
      errorWillPause: ' · Will pause venue on next failure.',
      errorHttpFirstObserved: 'HTTP {code} first observed:',
      errorIpAllowlist: ' · Try requesting a new IP allowlist.',
      eventsSectionLabel: 'Events',
      eventsFoundLabel: 'Found',
      eventsCreatedLabel: 'Created',
      eventsUpdatedLabel: 'Updated',
      sourceSectionLabel: 'Source',
      strategySectionLabel: 'Strategy',
      vitalStartedLabel: 'Started',
      vitalDurationLabel: 'Duration',
      vitalHttpLabel: 'HTTP',
      vitalLlmCostLabel: 'LLM Cost',
      runHistoryTitle: 'Run history',
      runHistoryLoading: 'loading…',
      runHistoryShowing: 'showing',
      runHistoryEmpty: 'No runs yet — trigger a crawl to see history here',
      tableColRun: 'Run',
      tableColVenue: 'Venue',
      tableColStarted: 'Started',
      tableColDuration: 'Duration',
      tableColStatus: 'Status',
      tableColStrategy: 'Strategy',
      tableColEvents: 'Events',
      tableColLlmCost: 'LLM cost',
      tableColError: 'Error',
      runAllQueuing: 'Queuing…',
      runAllQueued: 'Queued ✓',
      runAllError: 'Error — retry?',
      runAllButton: 'Run all',
      statusFilterOptions: [
        { label: 'All statuses', value: '' },
        { label: 'Success', value: 'success' },
        { label: 'Partial', value: 'partial' },
        { label: 'Failed', value: 'failed' },
        { label: 'Blocked', value: 'blocked' },
        { label: 'Paused', value: 'paused' },
        { label: 'Never', value: 'never' },
      ],
    },

    diagnostics: {
      whatHappenedLabel: 'What happened',
      whyHappenedLabel: 'Why it probably happened',
      optionsLabel: 'Options · next steps',
      strategyHistoryLabel: 'Strategy history',
      statHttpStatus: 'HTTP status',
      statErrorClass: 'Error class',
      statStrategy: 'Strategy',
      statConsecutive: 'Consecutive',
      stagedNotice:
        "Staged options are not auto-applied. You'll review the diff and confirm before any change touches the worker config.",
      badgeRuleBased: 'rule-based',
      badgeRec: 'rec.',
      badgeStaged: 'Staged',
      buttonApply: 'Apply',
      buttonDiscard: 'Discard',
      errLabels: {
        http403: 'HTTP 403 · venue blocked',
        http429: 'HTTP 429 · rate limited',
        timeout: 'Request timeout',
      },
      errorReasons: {
        bot_detection: {
          label: 'Bot detection or IP blocking',
          body: '403 from this venue usually means their edge layer (Cloudflare or similar) is denying the request. Could be IP-rate-based, user-agent fingerprinting, or a JS challenge.',
        },
        rate_limit: {
          label: 'Rate limiting',
          body: '429 means the venue is rate-limiting requests. Backing off the schedule or staggering with a delay is usually enough.',
        },
        parse_failure: {
          label: 'Parse failure',
          body: "The page returned 200 but the parser couldn't find the expected structure. Likely a layout change, schema.org markup removed, or a new template.",
        },
        timeout: {
          label: 'Timeout',
          body: 'Request did not complete in time. Often a JavaScript-heavy page that Playwright is struggling to render fully.',
        },
        unknown: {
          label: 'Unclassified failure',
          body: "The error doesn't match a known pattern. Open the raw response and inspect manually.",
        },
      },
      diagOptions: {
        bot_detection: [
          {
            id: 'opt-headers',
            iconName: 'FileEdit',
            recommended: true,
            title: 'Add custom request headers',
            body: 'Send a browser-like User-Agent + Accept-Language. Lowest-impact change.',
            cta: 'Stage header swap',
          },
          {
            id: 'opt-playwright',
            iconName: 'Play',
            recommended: false,
            title: 'Switch to Playwright with a real session',
            body: 'Solve a JS challenge once, persist cookies, then re-use the session. Higher LLM cost.',
            cta: 'Stage Playwright run',
          },
          {
            id: 'opt-manual',
            iconName: 'User',
            recommended: false,
            title: 'Mark venue as manual entry',
            body: 'Stop crawling. Events for this venue will be added by the admin only.',
            cta: 'Stage manual mode',
          },
        ],
        rate_limit: [
          {
            id: 'opt-delay',
            iconName: 'RefreshCw',
            recommended: true,
            title: 'Increase request delay to 8s',
            body: 'Slows the sweep but stays under typical 10 req/min limits.',
            cta: 'Stage delay 8s',
          },
          {
            id: 'opt-sched',
            iconName: 'RefreshCw',
            recommended: false,
            title: 'Reduce schedule to every 12h',
            body: 'Half as many requests per day.',
            cta: 'Stage schedule',
          },
        ],
        parse_failure: [
          {
            id: 'opt-llm',
            iconName: 'FileEdit',
            recommended: true,
            title: 'Switch to LLM extraction',
            body: 'Fallback while the page template stabilizes. Cost goes up.',
            cta: 'Stage LLM strategy',
          },
          {
            id: 'opt-struct',
            iconName: 'FileEdit',
            recommended: false,
            title: 'Refresh selector hints',
            body: 'Re-train the structured extractor against the current DOM.',
            cta: 'Stage retrain',
          },
        ],
        timeout: [
          {
            id: 'opt-pw',
            iconName: 'Play',
            recommended: true,
            title: 'Increase render timeout to 30s',
            body: 'Gives heavy pages more room to settle.',
            cta: 'Stage timeout 30s',
          },
          {
            id: 'opt-wait',
            iconName: 'RefreshCw',
            recommended: false,
            title: 'Wait for selector instead of load',
            body: 'Stop waiting on the full load event; key off `.event-card`.',
            cta: 'Stage selector wait',
          },
        ],
        unknown: [
          {
            id: 'opt-manual',
            iconName: 'User',
            recommended: true,
            title: 'Mark venue as manual entry',
            body: 'Stop crawling and rely on admin entry.',
            cta: 'Stage manual mode',
          },
        ],
      },
    },

    inspectorTabs: {
      overview: 'Overview',
      diagnostics: 'Diagnostics',
      history: 'History',
    },

    stagedApply: {
      unknownOptionTitle: 'Unknown optimization option',
      unknownOptionBody:
        'Unknown optimization option. Please close and try again.',
      unknownOptionClose: 'Close',
      headerEyebrow: 'Applying staged change',
      headerBodySuffix:
        '. The change writes to the worker config and is picked up on the next crawl.',
      sectionWhyChange: 'Why this change',
      sectionConfigDiff: 'Config diff',
      sectionRisks: 'Risks',
      sectionRollback: 'Rollback',
      sectionNextRun: 'Next run',
      footerTriggerLabel: 'Trigger re-crawl now',
      footerCancel: 'Cancel',
      footerApply: 'Apply change',
      stagedDiffs: {
        'opt-headers': {
          title: 'Add custom request headers',
          intent:
            "Try to look more like a real browser so the venue's edge layer stops blocking us.",
          diff: [
            {
              path: 'headers.User-Agent',
              before: 'ConcertCrawl/1.0',
              after:
                'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15 (KHTML, like Gecko)',
            },
            {
              path: 'headers.Accept-Language',
              before: '(unset)',
              after: 'en-US,en;q=0.9',
            },
          ],
          risks: [
            "If the venue rolls out a tighter bot policy, this stops working on its own — won't break the consumer app.",
          ],
          rollback: 'One click to revert from the strategy history log.',
          nextRunIn: 'next scheduled sweep · ~2h',
        },
        'opt-delay': {
          title: 'Increase request delay to 8s',
          intent:
            'Slow the sweep to stay under typical 10 req/min rate limits.',
          diff: [{ path: 'request.delay_ms', before: '1500', after: '8000' }],
          risks: ['Sweep takes ~5× longer; LLM cost per sweep is unchanged.'],
          rollback: 'Revert from the strategy history log.',
          nextRunIn: 'next scheduled sweep · ~2h',
        },
        'opt-llm': {
          title: 'Switch to LLM extraction',
          intent:
            'Use the LLM to parse the page while the structured-data template stabilizes.',
          diff: [
            {
              path: 'extraction.strategy',
              before: 'structured_data',
              after: 'llm',
            },
            {
              path: 'extraction.model',
              before: '(n/a)',
              after: 'claude-haiku-4-5',
            },
            { path: 'budget.per_run_max_usd', before: '$0.00', after: '$0.60' },
          ],
          risks: [
            'LLM cost jumps from $0 to ~$0.40/run for this venue.',
            'Confidence scores drop; expect a flag spike in Review.',
          ],
          rollback: 'Revert from the strategy history log.',
          nextRunIn: 'manual re-crawl now, or next scheduled sweep',
        },
        'opt-playwright': {
          title: 'Switch to Playwright with a real session',
          intent:
            'Solve a JS challenge once, persist cookies, then re-use the session.',
          diff: [
            { path: 'extraction.mode', before: 'fetch', after: 'playwright' },
            { path: 'session.persist_cookies', before: 'false', after: 'true' },
          ],
          risks: [
            'Higher LLM cost per run.',
            'Session may expire and require re-solving.',
          ],
          rollback: 'Revert from the strategy history log.',
          nextRunIn: 'trigger manual re-crawl now',
        },
        'opt-manual': {
          title: 'Mark venue as manual entry',
          intent: 'Stop crawling and rely on admin entry for this venue.',
          diff: [{ path: 'venue.crawl_mode', before: 'auto', after: 'manual' }],
          risks: [
            'Events will stop being automatically discovered.',
            'Requires manual admin updates to keep event listings current.',
          ],
          rollback: 'Change crawl_mode back to auto from the venue settings.',
          nextRunIn: 'no further crawls scheduled',
        },
        'opt-sched': {
          title: 'Reduce crawl schedule to every 12 hours',
          intent:
            'Crawl more frequently so fresh events are discovered sooner after they go on sale.',
          diff: [{ path: 'crawl.schedule_hours', before: '24', after: '12' }],
          risks: [
            'Doubles the number of crawl runs for this venue — higher infrastructure and LLM cost if extraction uses the LLM path.',
          ],
          rollback: 'Revert from the strategy history log.',
          nextRunIn: 'next scheduled sweep · ~2h',
        },
        'opt-struct': {
          title: 'Retrain structured extractor selector hints',
          intent:
            'Refresh the cached CSS selector hints so the structured extractor can parse the page again after a venue redesign.',
          diff: [
            {
              path: 'extraction.selector_hints',
              before: 'stale',
              after: 'regenerated',
            },
          ],
          risks: [
            'Regeneration requires one LLM-assisted crawl to rebuild hints.',
            'Confidence scores may dip on the first run.',
          ],
          rollback: 'Revert from the strategy history log.',
          nextRunIn: 'trigger manual re-crawl now',
        },
        'opt-pw': {
          title: 'Increase Playwright render timeout to 30s',
          intent:
            'Give the page more time to finish rendering before extraction — useful for slow SPAs or venues behind CDN challenges.',
          diff: [
            {
              path: 'crawl.render_timeout_ms',
              before: '10000',
              after: '30000',
            },
          ],
          risks: [
            'Each crawl run takes up to 20s longer per page.',
            'May mask a deeper issue if the venue is blocking or the page never fully loads.',
          ],
          rollback: 'Revert from the strategy history log.',
          nextRunIn: 'next scheduled sweep · ~2h',
        },
        'opt-wait': {
          title: 'Switch from networkidle to selector-based wait',
          intent:
            'Wait for a specific DOM element rather than network idle — more reliable on pages that stream content or have persistent websocket connections.',
          diff: [
            {
              path: 'crawl.waitUntil',
              before: 'networkidle',
              after: 'domcontentloaded',
            },
            {
              path: 'crawl.waitForSelector',
              before: '—',
              after: '.event-card',
            },
          ],
          risks: [
            'If the selector changes or is absent, the crawl will time out waiting for an element that never appears.',
          ],
          rollback: 'Revert from the strategy history log.',
          nextRunIn: 'next scheduled sweep · ~2h',
        },
      },
    },
  },

  crawlHistoryTable: {
    heading: 'Crawl History',
    columns: {
      timestamp: 'Timestamp',
      status: 'Status',
      strategy: 'Strategy',
      eventsFound: 'Found',
      eventsInserted: 'Inserted',
      duration: 'Duration',
      error: 'Error',
    },
    empty: 'No crawl runs yet.',
    noValue: '—',
    timeSuffix: 'MT',
    alertBadgeTitle:
      'An unread admin alert is associated with this crawl run. Mark the notification as read to clear this badge.',
    alertBadgeAriaLabel:
      'This crawl run has an unread admin alert. Visit the notifications inbox for details.',
    // Badge labels keyed by alert category + severity. 'Went dark' = 0
    // events on a previously healthy venue; 'Dropped sharply' = non-zero
    // but well below baseline; 'Event drop' is the neutral fallback for
    // older event-count rows whose metadata predates the severity field.
    alertBadgeLabelWentDark: 'Went dark',
    alertBadgeLabelDroppedSharply: 'Dropped sharply',
    alertBadgeLabelEventDrop: 'Event drop',
    alertBadgeLabelFailing: 'Failing',
    // 'Capped' = the run succeeded, but the catalogue looks truncated by a
    // pagination/API ceiling rather than genuinely short (#1185).
    alertBadgeLabelCeilingSuspected: 'Capped',
    // The run succeeded and the events are real, but they carry no per-event
    // ticket links, so the consumer "Get tickets" CTA falls back to the venue
    // homepage. 'No links' = the whole upcoming catalogue; 'Some links
    // missing' = part of it.
    alertBadgeLabelLinksMissing: 'No links',
    alertBadgeLabelLinksIncomplete: 'Some links missing',
    filterShowAll: 'Show all',
    filterAlertsOnly: 'Show alerts only',
    filterAriaLabel: 'Filter crawl history by active alert state',
  },

  crawlStatusTable: {
    columns: {
      venue: 'Venue',
      lastCrawl: 'Last Crawl',
      status: 'Status',
      events: 'Events',
      strategy: 'Strategy',
      failures: 'Failures',
    },
    empty: 'No venues found. Add venues in the Venues section.',
    statusLabels: {
      paused: '(paused)',
      blocked: '(blocked)',
      never: 'never',
    },
  },

  crawlTriggerButton: {
    button: {
      idle: 'Run crawl now',
      triggering: 'Starting…',
      polling: 'Crawling…',
    },
    status: {
      initiating: 'Initiating crawl…',
      waiting: 'Waiting for result…',
    },
    result: {
      heading: 'Last run',
      strategy: 'Strategy',
      eventsFound: 'Events found',
      eventsInserted: 'Events inserted',
      duration: 'Duration',
      completed: 'Completed',
      timeSuffix: 'MT',
      noValue: '—',
    },
    errors: {
      notAuthenticated: 'Not authenticated',
      triggerFailed: 'Failed to trigger crawl',
      pollFailed: 'Polling failed',
      crawlFailed: 'Crawl failed before a run was recorded',
    },
  },

  venuesPage: {
    page: {
      title: 'Venues',
      subtitle: (total: number, blocked: number) =>
        `${total} configured · ${blocked} blocked.`,
      robotsAuditButton: 'robots.txt audit',
    },
    stats: {
      totalVenues: 'Total venues',
      active: 'Active',
      pausedBlocked: 'Paused / Blocked',
      avgHealth: 'Avg health · 7d',
      avgHealthHint: 'average run success rate',
    },
    options: {
      all: 'All statuses',
      active: 'Active',
      paused: 'Paused',
      blocked: 'Blocked',
    },
    statusFallback: 'Status',
    ariaLabel: 'Filter by status',
  },

  robotsAudit: {
    page: {
      eyebrow: 'Venues · robots.txt',
      title: 'robots.txt audit',
      subtitle:
        'Stored crawl-time robots.txt result for each active venue. Blocked or unchecked venues may need manual intervention.',
      backButton: 'Back to venues',
    },
    stats: {
      total: 'Active venues',
      allowed: 'Allowed',
      blocked: 'Blocked',
      unchecked: 'Unchecked',
    },
    filters: {
      all: 'All',
      allowed: 'Allowed',
      blocked: 'Blocked',
      unchecked: 'Unchecked',
      ariaLabel: 'Filter by robots.txt status',
    },
    table: {
      venue: 'Venue',
      website: 'Website',
      status: 'robots.txt',
      checked: 'Last checked',
    },
    status: {
      allowed: 'Allowed',
      blocked: 'Blocked',
      unchecked: 'Unchecked',
    },
    neverChecked: 'Never checked',
    empty: 'No active venues match this filter.',
    loadError: 'Could not load the robots.txt audit. Try refreshing.',
  },

  venueDetailsClient: {
    // #764 first-timer guide authoring block. Strings are lifted verbatim from
    // design/design_handoff_venue_first_timer_guide/guide-data.jsx; the
    // `unpublish` group is newly authored (Design never drew that state).
    guide: {
      blockTitle: 'First-timer guide',
      blockSub:
        "Concert-goer voice only. Write it like you're texting a friend who's never been — specific beats generic, honest beats hype.",
      badge: {
        ready: 'Ready to publish',
        readyWithPlaceholder: 'Publishable · access marked undocumented',
        blocked: 'Blocked · accessibility required',
      },
      insiderTip: {
        label: 'Insider tip',
        marker: 'SURFACED FIRST',
        placeholder:
          "e.g. Never been? Roxy runs loud — earplugs at the bar. The line's brutal after 8:30, come early.",
        help: "Surfaced first on the venue page — the thing you'd tell a friend who's never been. Altitude, loudness, the brutal line, a real heads-up. This is what sets us apart.",
      },
      banner: {
        title: "Can't publish yet.",
        body: "Accessibility is the one field every venue needs. Fill it in, or flip “Can't document yet” to publish the honest placeholder.",
      },
      accessibility: {
        label: 'Accessibility',
        requiredTag: 'REQUIRED',
        placeholder:
          'e.g. Step-free entry on the north side. Accessible restroom, main floor. No elevator to the balcony.',
        help: 'Required. Publish is blocked until this is filled — or explicitly marked not-yet-documented.',
        error:
          'Accessibility is required to publish — author it or mark it not-yet-documented.',
        toggleLabel: "Can't document yet",
        previewIntro: 'Will show the honest placeholder on the venue page:',
        // Quote marks live in the string, not in JSX — the block assembles no
        // display text of its own.
        previewBody:
          '“Not documented yet. Best to call the venue and ask before you head out — details are on the main page.”',
      },
      picker: {
        heading: 'Add more chips',
        countSeparator: ' of ',
        addLabel: 'Add',
        removeLabel: 'Remove',
        soonMarker: 'SOON · #997',
        soonHint: 'Coming in a later release — not authorable yet.',
      },
      chipLabel: {
        accessibility: 'Accessibility',
        parking: 'Parking',
        age_policy: 'Age policy',
        bag_check: 'Bag check',
        coat_check: 'Coat check',
        will_call: 'Will-call / entry',
        food_drink: 'Food + drink',
        transit: 'Getting there',
      },
      chipHint: {
        accessibility:
          "Step-free entry, restrooms, elevator, seating. Required — a first-timer with a mobility need can't guess.",
        parking: 'Lot vs street, price, cash-only, how early it fills.',
        age_policy: '18+/21+, where they check ID, wristband rules.',
        bag_check: "Size limit, whether there's a check, pat-down at the door.",
        coat_check: 'Price, cash-only, where it is, worth-it call.',
        will_call: 'Which door, ID needed, do digital tickets scan cleanly.',
        food_drink: 'Bars, in-house food, the cart out front, re-entry.',
        transit: 'Nearest train/bus, walk time, where rideshare should drop.',
      },
      chipPlaceholder: {
        parking:
          'e.g. Paid lot on Blake, $15 cash. Street opens up on Walnut after 7.',
        age_policy: 'e.g. 18+ in, 21+ to drink. IDs checked on the sidewalk.',
        bag_check:
          'e.g. Nothing bigger than a small purse. No check — leave it in the car.',
        coat_check:
          'e.g. $3, cash only, back-left by merch. Worth it in winter.',
        will_call:
          'e.g. Will-call is the right door, bring ID. Screenshots scan fine.',
        food_drink:
          'e.g. Two bars. No food inside; green-chile cart out front till close.',
        transit:
          'e.g. A-line to 38th & Blake, 6-min walk. Rideshare drops on Walnut.',
      },
      v2Chip: {
        weather: 'Weather',
        restrooms: 'Restrooms',
        atm: 'ATMs',
        cell_service: 'Cell service',
      },
      field: {
        remove: 'REMOVE',
        // Disambiguates this control from the picker toggle, which carries the
        // same "Remove <chip>" name.
        removeSuffix: 'from this guide',
      },
      state: {
        blank: 'Blank',
        authored: 'Authored',
        honest_placeholder: 'Honest placeholder',
      },
      footer: {
        publishHint: ' publish',
        saveDraft: 'Save draft',
        publish: 'Publish guide',
        saving: 'Saving…',
        publishing: 'Publishing…',
      },
      // Newly authored for the unpublish flow — no design reference exists.
      unpublish: {
        liveNote: 'Live on the venue page.',
        action: 'Unpublish',
        confirmPrompt:
          'Take this guide off the venue page? The draft is kept, so you can publish it again whenever you want.',
        confirmAction: 'Yes, unpublish',
        cancel: 'Cancel',
        working: 'Unpublishing…',
      },
      status: {
        saved: 'Draft saved.',
        published: 'Guide published.',
        unpublished: 'Guide unpublished.',
        saveError: 'Could not save the guide. Try again.',
      },
      loadError:
        'Couldn’t load this guide, so editing is off — saving now would wipe whatever is already there. Refresh to try again.',
      charsLeft: (remaining: number) => `${remaining} characters left`,
    },
    header: {
      eyebrow: 'Venues · edit',
      title: 'Venue detail',
      subtitle:
        'Identity, ticketing, crawl config, editorial fields. LLM-assisted fields are always admin-reviewed before they save.',
    },
    actions: {
      backToVenues: 'Back to venues',
      crawlHistory: 'Crawl history',
      viewOnSite: 'View on site',
      makeFlagship: 'Make flagship',
      flagship: 'Flagship',
    },
    summary: {
      lastCrawl: 'last crawl ·',
      never: 'never',
      eventsLive: 'events live',
      health: 'health',
    },
    sections: {
      identity: {
        eyebrow: '01 · identity',
        title: 'Name + slug + source',
      },
      ticketing: {
        eyebrow: '02 · ticketing',
        title: 'Where fans buy',
      },
      crawlConfig: {
        eyebrow: '03 · crawl config',
        title: 'How the scraper hits this venue',
      },
      editorial: {
        eyebrow: '04 · editorial',
        title: 'About · capacity · neighborhood',
        subtitle: "These fields render on the venue's public page.",
        llmNote: 'LLM-assisted',
        llmSuffix: '— every generation needs your sign-off before it saves.',
      },
      identityArt: {
        eyebrow: '05 · identity art',
        title: 'Generative cover',
        description:
          'Deterministic generative art derived from the venue identity. Current seed:',
        phase8Warning:
          'Seed + namespace will be persisted to the DB. Changes here are preview-only until then.',
        phase8Label: 'Phase 8 —',
      },
      dangerZone: {
        eyebrow: 'danger zone',
        title: 'Pause or remove this venue',
      },
    },
    fields: {
      venueName: 'Venue name',
      slug: {
        label: 'Slug',
        autoGeneratedBadge: 'Auto-generated',
        prefix: '/v/',
        regenerateTitle: 'Regenerate slug from name',
      },
      sourceUrl: {
        label: 'Source URL',
        hint: 'The events page we crawl on the configured schedule.',
      },
      city: 'City',
      address: {
        label: 'Street address',
        placeholder: 'e.g. 1380 W Florida Ave, Denver, CO 80223',
        hint: 'Powers the embedded map on the public venue page. Leave blank to show the placeholder map.',
      },
      status: {
        label: 'Status',
        ariaLabel: 'Venue status',
        active: 'Active',
        paused: 'Paused',
        blocked: 'Blocked',
      },
      primaryVendor: 'Primary vendor',
      ticketUrl: {
        label: 'Ticket URL',
        hint: "Default destination for the 'Buy tickets' button when an event has no per-show URL.",
        openTitle: 'Open ticket URL',
        placeholder: 'https://...',
      },
      platformRouting: {
        heading: 'Platform routing',
        help: 'Platform routing overrides Extraction Strategy — when a platform is set, events come from the platform feed instead of the crawl cascade.',
        platform: {
          label: 'Platform',
          auto: 'Auto (no platform)',
          aeg: 'AEG',
          livenation: 'Live Nation',
          detailPage: 'Detail pages (follow calendar links)',
        },
        platformVenueId: {
          label: 'Platform venue ID',
          aegHint:
            "Events.json shard ID from aegwebprod.blob.core.windows.net/json/events/<shardId>/events.json — find this in the venue's calendar page HTML.",
          livenationHint:
            "Venue ID from the site's own calendar payload (e.g. KovZpZAE6eJA) — find it as venue.discovery_id in any event record on the venue's /shows/calendar/<YYYY-MM> page.",
          aegPlaceholder: 'e.g. 89',
          livenationPlaceholder: 'e.g. KovZpZAE6eJA',
          requiredError: 'Platform venue ID is required when a platform is set',
        },
        probe: {
          button: 'Probe platform fetch',
          buttonPending: 'Probing…',
          okPrefix: 'Probe OK —',
          okEvents: 'events found in',
          okSource: 'source:',
          failedPrefix: 'Probe failed —',
          reasons: {
            missingConfig: 'missing config (set a platform + venue ID first)',
            fetchError: 'fetch error',
            schemaError: 'platform response did not match expected schema',
          },
          requestFailed: 'Probe request failed',
        },
      },
      apiProvider: {
        label: 'API provider',
        hint: 'If this venue exposes a calendar API, pick the provider — we’ll skip crawling and pull events directly.',
        optionNone: 'None',
        optionVenuePilot: 'VenuePilot',
      },
      apiAccountId: {
        label: 'API account ID',
        hint: 'The venue’s identifier with the provider (e.g. VenuePilot venue ID).',
        errorRequired:
          'API account ID is required when an API provider is selected',
      },
      extractionStrategy: {
        label: 'Extraction strategy',
        auto: '— Auto —',
        structuredData: 'structured — schema.org/Event',
        llm: 'LLM — Claude Haiku extraction',
        manual: 'manual — admin entry only',
      },
      requestDelay: {
        label: 'Request delay',
        hint: 'Milliseconds between requests inside one sweep. Tune up if you hit rate limits.',
        unit: 'ms',
      },
      fetchMode: {
        label: 'Fetch mode',
        autoDetect: 'Auto-detect',
        httpOnly: 'HTTP only',
        browser: 'Browser',
        autoDescription:
          'tries plain HTTP first; falls back to browser if needed.',
        httpDescription: 'plain request. Fails if events need JavaScript.',
        browserDescription:
          'always uses Playwright. Required for JS-rendered pages.',
      },
      schedule: {
        label: 'Schedule (cron)',
        badge: 'Daily · 3 AM MT',
        value: '0 3 * * *',
      },
      waitSelector: {
        label: 'Wait selector',
        badge: 'Optional',
        hint: 'If set, Playwright waits for this selector before parsing.',
        placeholder: 'e.g. .event-card, [data-event]',
      },
      debugCaptureHtml: {
        label: 'Debug · capture HTML',
        badge: 'Diagnostic',
        hint: 'Logs the raw fetched HTML to crawler stdout on each run. Use when a venue serves a sparse or empty page — capture once, then disable.',
        off: 'Off',
        on: 'On',
      },
      about: {
        label: 'About',
        description:
          'One short paragraph shown on the venue page (under the hero). Plain prose, no markdown.',
        placeholder:
          "A short description of the venue's character and history.",
        generate: 'Generate',
        generateCost: '~$0.0042',
      },
      capacity: {
        label: 'Capacity',
        description:
          'Used in the venue facts strip. Be specific (seated / standing / mixed).',
        placeholder: 'e.g. 1600',
        generatedBadge: 'generated · accepted',
      },
      neighborhood: {
        label: 'Neighborhood',
        description:
          'Single line — where it sits in the city. Helps fans gauge travel time.',
        placeholder: 'e.g. Capitol Hill, RiNo, LoDo',
        generatedBadge: 'generated · accepted',
      },
      namespace: {
        label: 'Namespace',
        hint: 'Venues use architectural patterns; artists use organic ones.',
        venue: 'Venue',
        artist: 'Artist',
      },
      seed: {
        label: 'Seed',
        lockedHint: 'LOCKED UNLESS BUMPED',
        bumpedHint: 'Bumped to',
        rollButton: 'Roll',
      },
    },
    ticketVendors: {
      unknown: '— Unknown —',
      axs: 'AXS',
      ticketmaster: 'Ticketmaster',
      seatgeek: 'SeatGeek',
      dice: 'DICE',
      eventbrite: 'Eventbrite',
      venueBoxOffice: 'Venue Box Office',
      unknownValue: 'Unknown',
    },
    robots: {
      unchecked: 'unchecked',
      allowed: 'robots ok',
      blocked: 'robots blocked',
    },
    dangerZone: {
      pause: {
        title: 'Pause crawling',
        description: 'Stops scheduled runs. Existing events stay published.',
        pauseButton: 'Pause venue',
        activateButton: 'Activate venue',
      },
      delete: {
        title: 'Delete venue',
        description:
          'Removes config + breaks links to existing events. Cannot be undone.',
      },
    },
    saveBar: {
      unsavedChange: 'change',
      unsavedChanges: 'changes',
      unsaved: 'unsaved',
      discard: 'Discard',
      saveChanges: 'Save changes',
      saving: 'Saving…',
      saved: 'Saved',
    },
    errors: {
      slugInUse: 'Slug already in use',
      saveFailed: 'Save failed',
      unexpected: 'An unexpected error occurred',
      generationFailed: 'Generation failed',
      networkError: 'Network error — could not reach API',
    },
  },

  venueQuickView: {
    sections: {
      ticketVendor: 'Ticket vendor',
      crawlSchedule: 'Crawl schedule',
      extractionStrategy: 'Extraction strategy',
      consecutiveFailures: 'Consecutive failures',
      robotsTxt: 'robots.txt',
    },
    crawlSchedule: {
      label: 'daily · 3 AM MT',
      cron: '0 0 3 * * *',
    },
    consecutiveFailures: {
      outOf: 'of 4',
    },
    robots: {
      unchecked: 'unchecked',
      allowed: 'allowed',
      disallowed: 'disallowed',
    },
    actions: {
      runCrawl: 'Run crawl now',
      triggering: 'Triggering…',
      queued: 'Queued ✓',
      error: 'Error — retry?',
      editVenue: 'Edit venue',
      crawlHistory: 'Crawl history',
    },
  },

  venueTableClient: {
    empty: 'No venues match the current filter.',
    bulkActions: {
      selected: 'selected',
      verify: 'Verify',
      unverify: 'Unverify',
      activate: 'Activate',
      deactivate: 'Deactivate',
    },
    configuredVenues: 'Configured venues',
    columns: {
      venue: 'Venue',
      sourceUrl: 'Source URL',
      strategy: 'Strategy',
      schedule: 'Schedule',
      status: 'Status',
      health: 'Health',
      lastCrawl: 'Last crawl',
      events: 'Events',
    },
    schedule: 'daily · 3 AM MT',
    expand: {
      expandAriaLabel: 'Expand venue',
      collapseAriaLabel: 'Collapse venue',
    },
    selectAll: 'Select all venues',
    selectVenue: 'Select',
  },

  addVenueModal: {
    trigger: 'Add venue',
    header: {
      eyebrow: 'new venue',
      title: 'Add a crawl target',
      subtitle:
        "Point us at an events page. We'll respect robots.txt and crawl daily at 3 AM MT.",
    },
    fields: {
      name: {
        label: 'Venue name',
        placeholder: 'e.g. Bluebird Theater',
      },
      slug: {
        label: 'Slug',
        autoGeneratedBadge: 'auto-generated',
        prefix: 'concertcrawl.app/v/',
        placeholder: 'bluebird-theater',
        hint: 'Used in the public URL. Auto-derived from the venue name.',
      },
      sourceUrl: {
        label: 'Source URL',
        placeholder: 'https://www.bluebirdtheater.net/calendar/',
        hint: "The events page we'll crawl. Usually a /calendar, /events, or /shows path.",
      },
      city: {
        label: 'City',
      },
      address: {
        label: 'Street address',
        placeholder: 'e.g. 3317 E Colfax Ave, Denver, CO 80206',
      },
    },
    robots: {
      checking: 'checking robots.txt…',
      allowed: 'robots ok',
      disallowed: 'robots blocked',
      unknown: 'unchecked',
    },
    actions: {
      cancel: 'Cancel',
      saveVenue: 'Save venue',
      saveAndCrawl: 'Save & crawl now',
      saving: 'Saving…',
      saved: 'Saved',
      escHint: 'cancel',
    },
    errors: {
      slugInUse: 'Slug already in use — choose a different one',
      unexpected: 'An unexpected error occurred. Please try again.',
    },
    validation: {
      nameRequired: 'Name is required (2+ chars)',
      slugInvalid:
        'Slug must be 2–60 chars, lowercase alphanumeric and hyphens',
      urlNotHttp: 'Must be an http:// or https:// URL',
      urlInvalid: 'Enter a valid URL (http:// or https://...)',
      cityRequired: 'City is required',
    },
    slugButtons: {
      regenerateTitle: 'Regenerate slug from name',
      regenerateAriaLabel: 'Regenerate slug from name',
    },
    closeButton: {
      ariaLabel: 'Close',
    },
  },

  deleteVenueConfirm: {
    trigger: 'Delete venue…',
    header: {
      eyebrow: 'Destructive action',
      description:
        "This can't be undone. The venue config, crawl schedule, and ticketing defaults will be removed.",
    },
    removed: {
      heading: 'What gets removed',
      items: [
        'Venue config (name, slug, source URL, ticketing)',
        'Crawl schedule + extraction strategy + history',
        'About / Capacity / Neighborhood editorial copy',
        'Identity art seed',
      ],
    },
    survives: {
      heading: 'What survives',
      items: [
        'Individual event records (orphaned, can be re-linked or re-deleted manually)',
        'Fan-submitted prices and confirmations on those events',
      ],
    },
    gate: {
      label: 'Type',
      keyword: 'DELETE',
      labelSuffix: 'to confirm.',
      placeholder: 'DELETE',
    },
    actions: {
      keep: 'Keep venue',
      deleting: 'Deleting…',
      deletePermanently: 'Delete permanently',
      typeToEnable: 'Type DELETE to enable',
    },
    errors: {
      deleteFailed: 'Delete failed — please try again',
    },
  },

  deleteVenueDialog: {
    trigger: 'Delete…',
    header: {
      dangerLabel: 'danger · permanent',
      titlePrefix: 'Delete',
    },
    body: {
      description:
        'This will permanently delete the venue and detach all events that reference it. This cannot be undone.',
      consequences: {
        venueDeleted: 'deleted from',
        venueTable: 'venues',
        tableSuffix: 'table.',
        eventsNulled: 'will have their',
        venueIdField: 'venue_id',
        nulledSuffix: 'nulled. Events remain published.',
        crawlsStop: 'All scheduled crawls for this venue stop immediately.',
        publicPagePrefix: 'Public page at',
        publicPagePath: 'concertcrawl.app/v/…',
        publicPageSuffix: 'will 404.',
      },
    },
    confirmInput: {
      labelPrefix: 'Type',
      labelSuffix: 'to confirm',
      matchMessage: 'Match — delete is now enabled.',
      mismatchPrefix: "Doesn't match",
      mismatchSuffix: '. Type exactly, including capitalization.',
    },
    footer: {
      escCancel: 'cancel',
      cancelButton: 'Cancel',
      deleteButtonIdle: 'Delete venue',
      deleteButtonPending: 'Deleting…',
    },
    errors: {
      deleteFailed: 'Delete failed. Please try again.',
    },
  },

  events: {
    tabs: {
      pending: 'Pending',
      lowConf: 'Low conf.',
      duplicates: 'Duplicates',
      approved: 'Approved',
      rejected: 'Rejected',
    },
    filters: {
      allVenues: 'All venues',
      dateRange: 'Date · next 30d',
      source: 'Source · any',
    },
    listHeader: {
      approved: 'approved',
      pending: 'pending',
      sortLabel: 'sort: discovered ↓',
    },
    flags: {
      lowConf: 'low conf.',
      noPrice: 'no price',
    },
    inspector: {
      pendingReview: 'Pending review',
      lowConfidence: 'low confidence',
      extractedEditable: 'extracted (editable)',
      extractedEditing: 'extracted · editing',
      rawSource: 'raw source · llm input',
    },
    vitals: {
      confidence: 'Confidence',
      source: 'Source',
      discovered: 'Discovered',
      priceRange: 'Price range',
    },
    fields: {
      title: 'Title',
      artist: 'Artist',
      venue: 'Venue',
      date: 'Date',
      doors: 'Doors',
      show: 'Show',
      priceLow: 'Price low',
      priceHigh: 'Price high',
      tags: 'Tags',
      addTag: '+ tag',
    },
    actions: {
      reject: 'Reject',
      approve: 'Approve',
      edit: 'Edit',
      savePending: 'Saving…',
      save: 'Save',
      cancel: 'Cancel',
    },
    keyboard: {
      navigate: 'navigate',
      approve: 'approve',
      reject: 'reject',
    },
    bulkActions: {
      eventsSelected: 'events selected',
      approveAll: 'Approve all',
      reject: 'Reject',
      retag: 'Re-tag',
    },
    empty: {
      title: 'Queue is clear.',
      subtitle: 'Every event has been reviewed.',
    },
    noSelection: 'Select an event to review',
    confirms: {
      deleteEvent: 'Delete this event? Cannot be undone.',
    },
    errors: {
      actionFailed: 'Action failed',
      saveFailed: 'Save failed',
    },
  },

  eventReviewTable: {
    empty: 'No events pending review. All extractions have been verified.',
    columns: {
      event: 'Event',
      date: 'Date',
      flags: 'Flags',
      source: 'Source',
      actions: 'Actions',
    },
    source: {
      viewSource: 'View source',
    },
    actions: {
      approvePending: 'Saving…',
      approve: 'Approve',
      reject: 'Reject',
      approveAriaLabel: (title: string) => `Approve ${title}`,
      rejectAriaLabel: (title: string) => `Reject ${title}`,
    },
    errors: {
      approveFailed: 'Failed to approve event. Please try again.',
      deleteFailed: 'Failed to delete event. Please try again.',
    },
    confirms: {
      deleteEvent: 'Delete this event? This cannot be undone.',
    },
  },

  editor: {
    monoLabelPrefix: 'edit event ·',
    viewDetailButton: 'View detail',
    unsavedChangeTooltip: 'Unsaved change',
    sections: {
      identityNumber: '01',
      identityTitle: 'Identity',
      pricingNumber: '02',
      pricingTitle: 'Pricing',
      classificationNumber: '03',
      classificationTitle: 'Classification',
      statusNumber: '04',
      statusTitle: 'Status',
      artNumber: '05',
      artTitle: 'Identity art',
      dangerNumber: '06',
    },
    fields: {
      title: 'Title',
      titlePlaceholder: 'Event title',
      artist: 'Artist / lineup',
      artistPlaceholder: 'Headliner + support',
      tourName: 'Tour name',
      tourNamePlaceholder: 'e.g. The Rising Tide Tour',
      tourNameHelp:
        'Shows as the kicker above the title. Crawls rarely pick this up, so set it by hand. Leave blank to clear it.',
      venue: 'Venue',
      date: 'Date',
      doors: 'Doors',
      show: 'Show',
      priceLow: 'Price low',
      priceLowPlaceholder: '35',
      priceHigh: 'Price high',
      priceHighPlaceholder: '65',
      priceSource: 'Source',
      priceUpdated: 'Updated',
      genreTags: 'Genre tags',
      genreEmptyHelp:
        "No genre yet — this event won't surface in genre browse.",
      lifecycleLabel: 'status · events.status',
      availabilityLabel: 'availability',
      verificationLabel: 'verification',
      confidenceLabel: 'confidence',
      sourceLabel: 'source',
      noSource: 'no source',
    },
    status: {
      upcoming: 'Upcoming',
      postponed: 'Postponed',
      cancelled: 'Cancelled',
      available: 'Available',
      soldOut: 'Sold out',
      unverified: 'Unverified',
      verified: 'Verified',
    },
    saveBar: {
      dirty: 'You have unsaved changes',
      save: 'Save',
      discard: 'Discard',
      saving: 'Saving…',
      saveFailed: 'Failed to save.',
    },
    dangerZone: {
      title: 'Danger zone',
      body: 'Merge or remove this event. Every action is reflected in the audit log.',
      mergeIntoAnother: 'Merge with another event…',
      deleteEvent: 'Delete event…',
    },
    mergeDialog: {
      eyebrow: 'merge events',
      heading: 'Merge this event into another',
      body: 'Pick the canonical event. Watchlist rows, sold-out/cancelled reports, fan price submissions, and the price log will all be moved to it. This event will then be deleted.',
      searchLabel: 'Search by title, artist, or venue',
      searchPlaceholder: 'e.g. Lord Huron, Mission Ballroom…',
      searchingHint: 'Searching…',
      noResults: 'No matches.',
      resultsHint: (count: number) =>
        `${count} match${count === 1 ? '' : 'es'} — pick one.`,
      sameEventDisallowed: "That's this event — pick a different one.",
      previewHeading: (sourceTitle: string, targetTitle: string) =>
        `Merge "${sourceTitle}" → "${targetTitle}"`,
      previewBody:
        "All user-side data moves to the target, then this event is deleted. This can't be undone.",
      cancel: 'Cancel',
      confirm: 'Merge',
      pickAnother: 'Pick another',
      mergeFailed: 'Failed to merge.',
    },
    statusControls: {
      newDateLabel: 'New date',
      // Pre-fills with the event's current date; admin picks the rescheduled
      // date when known. The PATCH endpoint takes a YYYY-MM-DD string, so no
      // TBD sentinel — admins can save without changing the date if the
      // reschedule is still being worked out, then come back to set it.
      newDateHint:
        'Pre-filled with the current date. Pick the rescheduled date when you know it.',
      verifyToggleLabel: 'Verified',
      verifyHint:
        'Verifying confirms this event is publishable. Send back to review unsets it.',
      availabilityLabel: 'availability',
      available: 'Available',
      soldOut: 'Sold out',
      provenance: {
        title: 'Sold-out provenance',
        methodLabel: 'How did you confirm?',
        methodOptions: {
          saw_listing: 'Saw it listed',
          venue_site: 'Venue website',
          bought_myself: 'Tried to buy it',
          other: 'Other',
        },
        urlLabel: 'Source URL (optional)',
        urlPlaceholder: 'https://…',
        noteLabel: 'Note (optional, 280 chars max)',
        notePlaceholder: 'e.g. "Friday GA gone; pit waitlist still open."',
      },
    },
    art: {
      regenerate: 'Regenerate',
      placeholderLabel: 'identity art',
      bodyPrefix: 'Generated from ',
      bodyArtistPrefix: 'artist · ',
      bodySuffix:
        '. Regenerate rerolls the seed. Swaps to a real press photo automatically when one lands (Phase 8).',
    },
    upcomingHint:
      'Postponed, cancelled, and sold-out events all stay published with a fan-facing banner — none are hidden.',
    classification: {
      reviewNeededPillLabel: 'LLM flagged for review',
      reviewNeededPillTooltip:
        'The classifier had reasonable doubt about whether this is a concert.',
      // Mark non-concert (shown when hiddenFromConsumer=false)
      markNonConcertTitle: 'Mark as non-concert',
      markNonConcertBodyBefore: 'Adds the ',
      markNonConcertTag: 'non-concert',
      markNonConcertBodyAfter:
        ' tag and unpublishes from the consumer app. Stays in the system.',
      markNonConcertButton: 'Mark non-concert',
      // Mark as concert (shown when hiddenFromConsumer=true)
      markAsConcertTitle: 'Mark as concert',
      markAsConcertBody:
        'Republishes this event to every consumer-facing surface. Use this when the classifier wrongly hid a real concert.',
      markAsConcertButton: 'Mark as concert',
      // Confirm-modal copy. Mark-non-concert reuses the existing
      // review.allEvents.nonConcertConfirm block — EventConfirmModal
      // already routes the 'non-concert' kind there (see task 3.5),
      // and the copy is what we'd otherwise be duplicating. Only the
      // inverse direction needs a new block.
      markAsConcertConfirm: {
        heading: 'Mark as concert?',
        body: 'The event re-appears on every consumer-facing surface within one router refresh cycle. You can flip it back later if the classification was wrong.',
        confirm: 'Mark as concert',
        cancel: 'Cancel',
        eyebrow: 'classification',
      },
    },
  },

  review: {
    tabs: {
      eventFlags: 'Event flags',
      prices: 'Price coverage',
      submissions: 'Submissions',
      missing: 'Missing',
      allEvents: 'All events',
      contests: 'Contests',
      ariaLabel: 'Review sections',
    },

    allEvents: {
      columns: {
        event: 'Event',
        venueDate: 'Venue / date',
        status: 'Status',
        genre: 'Genre',
        confidence: 'Confidence',
        created: 'Created',
      },
      noGenre: 'no genre',
      noShowTime: 'no time',
      loadMore: 'Load more',
      loadingMore: 'Loading…',
      empty: {
        heading: 'No events to show.',
        body: 'Nothing has been verified or pulled in yet.',
      },
      skeletonAriaLabel: 'Loading events',
      filters: {
        searchPlaceholder: 'Search title, artist, or venue',
        searchAriaLabel: 'Search events',
        verification: {
          label: 'Verification',
          all: 'All',
          verified: 'Verified',
          unverified: 'Unverified',
        },
        dateFromLabel: 'From',
        dateToLabel: 'Until',
        genreLabel: 'Genres',
        genreInputPlaceholder: 'Add genre…',
        addGenre: 'Add',
        removeGenre: (tag: string) => `Remove ${tag}`,
        missingDataLabel: 'Missing data',
        missingFlag: {
          'no-price': 'No price',
          'no-show-time': 'No show time',
          'no-genre': 'No genre',
          'no-doors-time': 'No doors time',
        },
        activeCount: (count: number) =>
          `${count} active filter${count === 1 ? '' : 's'}`,
        clearAll: 'Clear all',
        flaggedChipLabel: 'Hidden — flagged for review',
        flaggedChipAriaLabel: 'Toggle hidden-and-flagged-for-review filter',
        flaggedChipEmpty: 'No hidden events are flagged for review.',
      },
      rowMenu: {
        triggerAriaLabel: 'Row actions',
        viewDetail: 'View detail',
        edit: 'Edit…',
        verify: 'Verify',
        sendBackToReview: 'Send back to review',
        markPostponed: 'Mark postponed',
        markCancelled: 'Mark cancelled',
        markUpcoming: 'Mark upcoming',
        markSoldOut: 'Mark sold out',
        markAvailable: 'Mark available',
        markNonConcert: 'Mark non-concert',
        delete: 'Delete…',
      },
      deleteConfirm: {
        heading: 'Delete this event?',
        body: "It'll be removed from the catalog and the consumer app immediately. Fan-submitted prices on it are dropped too. This is recorded in the audit log.",
        confirm: 'Delete event',
        cancel: 'Cancel',
        eyebrow: 'destructive action',
      },
      nonConcertConfirm: {
        heading: 'Mark as non-concert?',
        body: 'The event stays in the catalog but is hidden from every consumer-facing surface. You can flip this back later if the classification was wrong.',
        confirm: 'Mark non-concert',
        cancel: 'Cancel',
        eyebrow: 'classification',
      },
      bulkDock: {
        selectedCount: (count: number) => `${count} selected`,
        sendBackToReview: 'Send back to review',
        markNonConcert: 'Mark non-concert',
        markAsConcert: 'Mark as concert',
        delete: (count: number) => `Delete ${count}`,
        clear: 'Clear',
        rowAriaLabel: 'Select event',
        selectAllAriaLabel: 'Select all events on the page',
        markAsConcertDisabledTooltip:
          'Mark as concert only applies to hidden events. Deselect any visible rows to enable.',
      },
      bulkDeleteConfirm: {
        eyebrow: 'destructive action · bulk',
        heading: (count: number) => `Delete ${count} events?`,
        body: "This can't be undone. Every deletion is recorded in the audit log.",
        typedPrompt: 'Type DELETE to confirm:',
        typedInputAriaLabel: 'Type DELETE to confirm',
        confirm: (count: number) => `Delete ${count}`,
        cancel: 'Cancel',
      },
      bulkUnverifyConfirm: {
        heading: (count: number) => `Send ${count} events back to review?`,
        body: 'They will reappear in the review queue and disappear from the consumer surface until verified again.',
        confirm: (count: number) => `Send ${count} back`,
        cancel: 'Cancel',
        eyebrow: 'workflow',
      },
      bulkNonConcertConfirm: {
        heading: (count: number) => `Mark ${count} events as non-concert?`,
        body: 'All selected events are hidden from every consumer-facing surface. You can flip individual events back from the editor.',
        confirm: (count: number) => `Mark ${count} non-concert`,
        cancel: 'Cancel',
        eyebrow: 'classification · bulk',
      },
      bulkMarkAsConcertConfirm: {
        heading: (count: number) => `Mark ${count} events as concert?`,
        body: 'All selected events reappear on every consumer-facing surface within one router-refresh cycle. The LLM-flagged-for-review pill stays in place — the bit reflects the classifier, not your verdict.',
        confirm: (count: number) => `Mark ${count} as concert`,
        cancel: 'Cancel',
        eyebrow: 'classification · bulk',
      },
    },

    missing: {
      headerTitle: 'Missing from crawl',
      flaggedCount: (count: number) => `${count} flagged`,
      allAccountedFor: 'all accounted for',
      // bannerBody is rendered in two parts so the JSX layer can emphasise
      // "Upcoming" without embedding HTML in copy strings.
      bannerBodyBefore:
        "The crawler expected these in a venue's daily sweep but didn't find them. Usually a cancellation, postponement, or silent lineup change — sometimes just a crawl miss. They stay ",
      bannerBodyHighlight: 'Upcoming',
      bannerBodyAfter: ' until you act.',
      mobileBannerBodyBefore:
        'Expected in a daily sweep but not found. They stay ',
      mobileBannerBodyAfter: ' until you act.',
      lastSeenLabel: 'last seen',
      actionPostponed: 'Postponed',
      actionCancelled: 'Cancelled',
      actionDismiss: 'Dismiss',
      emptyHeading: "Nothing's gone missing.",
      emptyBody:
        'Every event the crawler expected showed up in the last sweep.',
      chipMissed: (count: number) =>
        `missed ${count} sweep${count === 1 ? '' : 's'}`,
      chipCadence: 'expected daily',
      classificationRemoved: 'Likely removed',
      classificationCrawlGap: 'Possible crawl gap',
      classificationDuplicate: 'Possible duplicate',
      clusterBadge: (count: number, venue: string) =>
        `${count} missing at ${venue}`,
      skeletonAriaLabel: 'Loading missing events',
      checkAtVenue: 'Check at venue',
      checkAtVenueAria: (title: string) =>
        `Check ${title} on the venue's own site, opens in a new tab`,
      openEventAria: (title: string) => `Edit the event record for ${title}`,
      // venueName arrives via a LEFT JOIN, so a row can carry a live venueId
      // with no name. The link still works, so it still needs a label.
      openVenueAria: (venue: string | null) =>
        venue === null
          ? 'Open the admin page for this venue'
          : `Open the admin page for ${venue}`,
      venueUnknown: '—',
    },

    eventFlags: {
      panelTitle: 'Event flags',
      queueClearBadge: 'queue clear',
      queueClearHeading: 'Queue is clear.',
      queueClearBody:
        'Every flagged event has been triaged. Next sweep runs at 18:00 MT.',
      selectAll: 'Select all',
      hideNonConcert: 'Hide non-concert',
      needsReview: 'Needs review',
    },

    eventFlagRow: {
      approve: 'Approve',
      reject: 'Reject',
    },

    eventFlagInspector: {
      emptyState: 'Select an event to inspect',
      confidence: 'Confidence',
      llmReasoning: 'LLM Reasoning',
      extraction: 'Extraction',
      rawSource: 'Raw source',
      source: 'Source',
      date: 'Date',
      doors: 'Doors',
      show: 'Show',
      price: 'Price',
      reject: 'Reject',
      editAndApprove: 'Edit & approve',
      approve: 'Approve',
    },

    bulkActionDock: {
      selected: 'selected',
      retag: 'Re-tag',
      rejectAll: '× Reject all',
      approveCount: (count: number) => `✓ Approve ${count}`,
    },

    bulkApproveModal: {
      eyebrow: 'Bulk action',
      heading: (count: number) =>
        `Approve ${count} flagged event${count !== 1 ? 's' : ''}?`,
      subtext:
        "They'll publish to the consumer app immediately. You can undo from the toast for 6s.",
      aboutToApprove: 'About to approve',
      lowConfidenceWarning: (count: number) =>
        `${count} event${count !== 1 ? 's have' : ' has'} confidence below 0.70. Double-check the lowest-confidence rows before approving.`,
      cancel: 'Cancel',
      confirmApprove: (count: number) => `✓ Approve ${count}`,
    },

    bulkApproveConfirm: {
      eyebrow: 'bulk approve',
      heading: (count: number) =>
        `Approve ${count} event${count !== 1 ? 's' : ''}?`,
      extraEvents: (count: number) =>
        `+${count} more event${count !== 1 ? 's' : ''}`,
      warningStrip:
        'These events will be marked as verified and visible to users.',
      cancel: 'Cancel',
      approveAll: 'Approve all',
    },

    bulkToast: {
      approved: (count: number) =>
        `${count} event${count !== 1 ? 's' : ''} approved`,
      undo: 'Undo',
    },

    priceCoverage: {
      panelTitle: 'Price coverage',
      missingOnly: 'Missing only',
      loading: 'Loading…',
      emptyAllPrices: 'All events have prices — nothing missing.',
      emptyNoPrices: 'No upcoming events with price data.',
      columnEvent: 'Event',
      columnVenueDate: 'Venue / Date',
      columnSource: 'Source',
      columnCurrentPrice: 'Current Price',
      columnUpdated: 'Updated',
      sourceCrawled: 'crawled',
      sourceCommunity: 'community',
      sourceNoPrice: 'no price',
      addPrice: '+ Add price',
      addingPriceFor: 'Adding price for',
      priceLow: 'Low',
      priceHigh: 'High',
      vendor: 'Vendor',
      howFound: 'How found',
      buyTickets: 'Buy tickets',
      addingPriceStatus: 'Adding price',
      discard: 'Discard',
      saving: 'Saving…',
      saveChanges: 'Save changes',
      vendorOptions: {
        ticketmaster: 'Ticketmaster',
        axs: 'AXS',
        seatgeek: 'SeatGeek',
        dice: 'DICE',
        eventbrite: 'Eventbrite',
        venueBoxOffice: 'Venue box office',
      },
      howFoundOptions: {
        sawListing: 'Saw listing',
        boughtMyself: 'Bought tickets',
        atTheVenue: 'At the venue',
      },
      loadMore: 'Load more events',
      loadingMore: 'Loading…',
    },

    pendingSubmissions: {
      panelTitle: 'Community price submissions',
      empty: 'No pending submissions',
      deny: 'Deny',
      approve: 'Approve · award cred',
      allSubmissionsLink: 'All submissions',
      ticketLinkLabel: 'Open ticket page',
    },

    reviewPageClient: {
      eyebrow: 'operations · moderation',
      title: 'Review',
      subtitle:
        'Most events auto-approve. This page is where flags and community price submissions land for triage.',
      mobileTitle: 'Review',
      mobileSubtitle: (
        eventCount: number,
        submissionCount: number,
        missingCount: number,
      ) =>
        `${eventCount} event${eventCount !== 1 ? 's' : ''} · ${submissionCount} price${submissionCount !== 1 ? 's' : ''} · ${missingCount} missing waiting.`,
    },

    adminReviewMobile: {
      tabEventFlags: 'Event flags',
      queueClearHeading: 'Queue is clear.',
      queueClearBody:
        'Every flagged event has been triaged. Next sweep runs at 18:00 MT.',
      needsPrice: 'Needs price',
      missingOnly: 'Missing only',
      allHavePrices: 'All events have prices.',
      noUpcomingEvents: 'No upcoming events.',
      loadMore: 'Load more',
      loadingMore: 'Loading…',
      llmReasoning: 'LLM reasoning',
      llmDetailsStrategy: 'strategy:',
      llmDetailsConfidence: 'confidence:',
      llmDetailsSource: 'source:',
      buyTickets: 'Buy tickets',
      rejectEvent: '× Reject',
      approveEvent: '✓ Approve',
      priceLowPlaceholder: 'Low $',
      priceHighPlaceholder: 'High $',
      cancel: 'Cancel',
      saving: 'Saving…',
      save: 'Save',
      vendorOptions: {
        ticketmaster: 'Ticketmaster',
        axs: 'AXS',
        seatgeek: 'SeatGeek',
        dice: 'DICE',
        eventbrite: 'Eventbrite',
        venueBoxOffice: 'Box office',
      },
      howFoundOptions: {
        sawListing: 'Saw listing',
        boughtMyself: 'Bought tickets',
        atTheVenue: 'At the venue',
      },
    },
  },

  submissionsHistory: {
    eyebrow: 'operations · moderation',
    title: 'Price submissions',
    subtitle:
      'Every community price submission — pending, corroborated, disputed, stale, or archived.',
    backLink: 'Back to Review',
    panelTitle: 'Submission history',
    countBadge: (count: number) => `${count} total`,
    // Shown instead of countBadge when a status filter is active — `count` is
    // then the filtered subset, so "total" would misstate it.
    countBadgeFiltered: (shown: number, loaded: number) =>
      `${shown} of ${loaded}`,
    empty: 'No price submissions yet.',
    // Shown instead of `empty` when a status filter matches no rows even though
    // submissions exist — `label` is the lowercased active filter name.
    emptyFiltered: (label: string) => `No ${label} price submissions.`,
    loadError: 'Couldn’t load submissions. Refresh to try again.',
    authError: 'Your session expired. Refresh and sign in to continue.',
    filterLabel: 'Status',
    filters: {
      all: 'All',
      pending: 'Pending',
      corroborated: 'Corroborated',
      disputed: 'Disputed',
      stale: 'Stale',
      archived: 'Archived',
    },
    columns: {
      event: 'Event',
      price: 'Price',
      user: 'User',
      status: 'Status',
      submitted: 'Submitted',
    },
    sort: {
      date: 'Date',
      event: 'Event',
      user: 'User',
      ariaLabel: (column: string, dir: 'asc' | 'desc' | null) =>
        dir === null
          ? `Sort by ${column}`
          : `Sort by ${column}, currently ${
              dir === 'asc' ? 'ascending' : 'descending'
            }`,
    },
    statusLabels: {
      pending: 'Pending',
      corroborated: 'Corroborated',
      disputed: 'Disputed',
      stale: 'Stale',
      archived: 'Archived',
    },
    approve: 'Approve',
    deny: 'Deny',
    approveAria: (event: string) => `Approve submission for ${event}`,
    denyAria: (event: string) => `Deny submission for ${event}`,
    selectRowAria: (event: string) => `Select submission for ${event}`,
    selectAllAria: 'Select all pending submissions on this page',
    ticketLinkAria: (event: string) => `Open ticket page for ${event}`,
    truncatedNotice: (loaded: number, total: number) =>
      `Showing ${loaded} of ${total} submissions.`,
    anonUser: 'anonymous',
    itemLabel: 'submissions',
  },

  users: {
    page: {
      title: 'Users',
      subtitle: (total: number) => `${total} total · manage role assignments`,
    },
    columns: {
      emailHandle: 'Email / Handle',
      role: 'Role',
      joined: 'Joined',
      assignRole: 'Assign role',
    },
    roleSelect: {
      ariaLabel: 'Assign role',
      errorFallback: 'Failed to update role',
    },
    viewDetail: (label: string) => `View details for ${label}`,
    summary: {
      userSingular: 'user',
      userPlural: 'users',
    },
    empty: 'No users found.',
    pagination: (shown: number, total: number) =>
      `Showing ${shown} of ${total}. Use the API limit/offset params for pagination.`,
    detail: {
      backButton: 'Back to users',
      eyebrow: 'operations · users',
      loadError: "Couldn't load this user. Refresh to try again.",
      identity: {
        noEmail: 'No email on file',
        noHandle: 'no handle',
        noRole: 'no role',
        deletedNote: 'No Clerk account — showing retained activity only.',
        joinedPrefix: 'Joined',
        unknownJoined: 'Join date unknown',
        idPrefix: 'ID',
        themePrefix: 'Theme',
        avatarPrefix: 'Avatar',
      },
      stats: {
        feedback: 'Feedback',
        watching: 'Events',
        priceSubmissions: 'Price subs',
        artistFollows: 'Artist follows',
      },
      feedback: {
        title: 'Feedback history',
        empty: 'No feedback submitted.',
        columns: {
          category: 'Category',
          status: 'Status',
          message: 'Message',
          when: 'When',
        },
        viewIssue: 'Issue',
      },
      watching: {
        title: 'Tracked events',
        empty: 'No tracked events.',
        unknownVenue: 'Unknown venue',
        attending: 'attending',
        columns: {
          event: 'Event',
          venue: 'Venue',
          date: 'Date',
          status: 'Status',
          added: 'Added',
        },
      },
    },
  },

  settings: {
    page: {
      title: 'Settings',
    },
    appearance: {
      heading: 'Appearance',
      description:
        'Choose the theme for your admin interface. Your selection is saved locally.',
    },
    opsTools: {
      heading: 'Ops tools',
      description:
        'Operational diagnostics for admins. Use these to verify integrations are healthy outside of incident response.',
      testEmail: {
        pickerLabel: 'Email to preview',
        pickerHint:
          'Sends a sample of the selected email to ADMIN_EMAIL so you can see how it lands in a real inbox. Uses mock data — no logging, no customer is contacted.',
        button: 'Send test email',
        buttonPending: 'Sending…',
        optionsLoading: 'Loading email list…',
        optionsFailed: 'Could not load the email list.',
        optionsFailedFallback: 'Admin alert (generic) — fallback',
        optionsFailedHint:
          'Could not load the full email list. Only the generic admin alert is available — that is what will be sent.',
        successPrefix: 'Test email sent.',
        notSentPrefix: 'Email not sent —',
        requestFailed: 'Request failed',
        notAuthenticated: 'Not authenticated',
        reasons: {
          missingApiKey:
            'RESEND_API_KEY is not set on the API. Configure it in Render and redeploy.',
          missingAdminEmail:
            'ADMIN_EMAIL is not set on the API. Configure it in Render and redeploy.',
          sendFailed:
            'Resend rejected the send. Inspect the error below + check that the sender domain is verified.',
        },
      },
    },
  },

  feedback: {
    eyebrow: 'operations · users',
    title: 'Feedback',
    subtitle:
      'Inbox for in-app feedback (and Sentry, soon email). Triage: mark read, flag for investigation, open a GH issue, or archive.',
    unreadBadgeSuffix: 'unread',
    statusChips: {
      all: 'All',
      unread: 'Unread',
      flagged: 'Flagged',
      issue_opened: 'Issue opened',
      resolved: 'Resolved',
      archived: 'Archived',
    },
    panelTitle: {
      all: 'Active feedback',
      unread: 'Unread feedback',
      flagged: 'Flagged feedback',
      issue_opened: 'Issues opened',
      resolved: 'Resolved feedback',
      archived: 'Archived feedback',
      read: 'Read feedback',
    },
    statCards: {
      lastSevenDays: 'Last 7 days',
      unread: 'Unread',
      flagged: 'Flagged',
      flaggedHint: 'awaiting investigation',
      issuesOpened: 'Issues opened',
      issuesOpenedHint: 'this month',
    },
    itemsCountSuffix: 'items',
    markAllRead: 'Mark all read',
    loadingState: 'Loading…',
    emptyState: 'No feedback in this category',
    row: {
      statusLabel: {
        unread: 'Unread',
        flagged: 'Flagged',
        issue_opened: 'Issue opened',
        resolved: 'Resolved',
        read: 'Read',
        archived: 'Archived',
      },
      screenshotBadge: 'screenshot',
      // Prefixes — concatenated with the row handle so each button gets a
      // unique accessible name. The "Expand feedback" stem stays intact for
      // the ui-audit harness, which targets buttons by /expand feedback/i.
      expandLabel: 'Expand feedback details from',
      collapseLabel: 'Collapse feedback details from',
    },
    filterRail: {
      viewLabel: 'View',
      sourceLabel: 'Source',
      statusItems: {
        all: 'All',
        unread: 'Unread',
        flagged: 'Flagged',
        issue_opened: 'Issue opened',
        resolved: 'Resolved',
        archived: 'Archived',
      },
      sourceItems: {
        feedback_surface: 'FeedbackSurface',
        sentry: 'Sentry',
        email: 'Email',
      },
      soonBadge: 'soon',
    },
    expanded: {
      sectionLabels: {
        fullBody: 'full body',
        screenshot: 'screenshot',
        adminNotes: 'admin notes',
        context: 'context',
        linkedIssue: 'linked issue',
        createIssue: 'create issue',
      },
      screenshotPlaceholder: 'User-attached screenshot',
      openFullSize: 'Open full size',
      adminNotesPlaceholder: 'Internal note — visible to you, not to the user…',
      createIssuePrompt:
        "Stage a GitHub issue using this feedback's body + context strip as the description. You can edit before submit.",
      openInGitHub: 'Open in GitHub…',
      copyUrlTitle: 'Copy URL',
      actions: {
        markRead: 'Mark read',
        markUnread: 'Mark unread',
        flag: 'Flag for investigation',
        unflag: 'Unflag',
        openInGitHub: 'Open in GitHub…',
        resolve: 'Resolve',
        archive: 'Archive',
      },
      contextRowLabels: {
        route: 'Route',
        theme: 'Theme',
        build: 'Build',
        device: 'Device',
        submitted: 'Submitted',
        userId: 'User ID',
      },
    },
  },

  generateInviteForm: {
    expiresLabel: 'Expires (optional)',
    submitPending: 'Generating…',
    submitIdle: 'Generate Code',
  },

  inviteCodes: {
    mintButton: {
      pending: 'Minting…',
      idle: 'Mint code',
    },
    // #1084 — legacy redemption rows carry `usedBy` but no `usedAt`, so
    // the Redeemed date cell falls back to a plain textual marker to
    // avoid blanking the column for those records.
    redeemedWithoutDate: 'Redeemed',
  },

  generateField: {
    idle: {
      generateButton: 'Generate with AI',
    },
    loading: {
      label: 'Generating…',
      estimatedTime: '~3–5s',
      cancel: 'Cancel',
    },
    review: {
      suggestedLabel: 'suggested',
      llmBadge: 'llm',
      sourcesPrefix: 'SOURCES: ',
      accept: 'Accept',
      regenerate: 'Regenerate',
      discard: 'Discard',
    },
    accepted: {
      label: 'generated · accepted',
    },
    error: {
      fallback: 'Generation failed',
      retry: 'retry',
    },
  },

  shell: {
    sidebar: {
      adminBadge: 'ADMIN',
      sectionOperations: 'Operations',
      sectionAccount: 'Account',
      userRoleLabel: 'admin',
      userMenuLabel: 'User menu',
      signOut: 'Sign out',
      collapse: 'Collapse',
      toggleTitles: {
        toRail: 'Switch to rail',
        toAuto: 'Switch to auto',
        toFull: 'Switch to full',
      },
    },
    appSwitcher: {
      ariaLabel: 'App context',
      userApp: 'User app',
      userAppTitle: 'Open the consumer app in this tab',
      admin: 'Admin',
      adminTitle: 'You are here',
    },
    topbar: {
      breadcrumbAriaLabel: 'Breadcrumb',
    },
    mobileDrawer: {
      closeMenuAriaLabel: 'Close menu',
      sectionOperations: 'Operations',
      sectionAccount: 'Account',
      userRoleLabel: 'admin',
      signOutAriaLabel: 'Sign out',
      signOutTitle: 'Sign out',
    },
    mobileBottomBar: {
      navAriaLabel: 'Main navigation',
    },
  },

  founderWindow: {
    sectionEyebrow: 'MONETIZATION',
    sectionTitle: 'Founder window',
    sectionSubtitle:
      'The one-time founder launch. Opening the window starts the countdown and lets members claim founder seats.',
    stateLabels: {
      'pre-launch': 'Pre-launch',
      open: 'Open',
      closed: 'Closed',
    },
    stats: {
      state: 'Window state',
      seatsRemaining: 'Seats remaining',
      seatsRemainingUnit: 'left',
      seatsRemainingHint: (total: number) => `of ${total} founder seats`,
      testSeats: 'Test seats',
      testSeatsUnit: 'left',
      testSeatsHint: 'Rehearsal counter only',
      closesAt: 'Window closes',
      closesAtPending: 'Opens on launch',
      windowDaysHint: (days: number) => `${days}-day window`,
    },
    launch: {
      title: 'Launch control',
      helpPreLaunch:
        'Opening the window is the real launch. It starts the countdown and lets every member claim a founder seat immediately. There is no undo from here.',
      helpOpen: 'The founder window is open — the launch has begun.',
      helpClosed: 'The founder window has closed. The launch has ended.',
      button: 'Open the founder window',
      buttonPending: 'Opening…',
      openedAt: (iso: string) => `Opened ${iso}`,
      closesOn: (iso: string) => `Closes ${iso}`,
    },
    confirm: {
      eyebrow: 'IRREVERSIBLE',
      heading: 'Open the founder window?',
      body: 'This starts the founder launch for every member immediately. The countdown begins now and cannot be undone from here. Only do this when you are ready to launch.',
      cancel: 'Cancel',
      confirm: 'Open the window',
    },
    rehearsal: {
      title: 'Pre-launch rehearsal',
      help: 'Simulate seat claims against a throwaway test counter. The real seat count is never touched.',
      simulateButton: 'Simulate a claim',
      simulatePending: 'Claiming…',
      resetButton: 'Reset test seats',
      resetPending: 'Resetting…',
      exhausted: 'No test seats left — reset to run another rehearsal.',
    },
    claims: {
      title: 'Recent founder claims',
      empty: 'No founder seats claimed yet.',
      seatLabel: (seat: number) => `Seat #${seat}`,
      seatUnknown: 'Seat —',
    },
    errors: {
      generic: 'Something went wrong. Try again.',
      notAuthenticated: 'Not authenticated.',
    },
  },

  pagination: {
    navAriaLabel: 'Pagination',
    firstAriaLabel: 'First page',
    previousAriaLabel: 'Previous page',
    nextAriaLabel: 'Next page',
    lastAriaLabel: 'Last page',
    pageLabel: 'Page',
    of: 'of',
    rowsLabel: 'rows',
    sizeSelectorAriaLabel: 'Rows per page',
    prev: 'Prev',
    next: 'Next',
    noResults: (itemLabel: string) => `No ${itemLabel}`,
  },

  // The Spotify artist match-review queue (#1115, PR-C). Deliberately plain:
  // this surface is exempt from the design pipeline.
  artists: {
    eyebrow: 'Artists',
    title: 'Spotify match',
    subtitle:
      'Ambiguous rows had more than one exact Spotify hit. Find on Spotify shows what the matcher saw, so you can pick one — a wrong photo is worse than no photo. Hide takes down the public page for a row that is not a performer, such as a festival ticket package.',
    statusChips: {
      ambiguous: 'Ambiguous',
      unmatched: 'Unmatched',
      no_match: 'No match',
      matched: 'Matched',
      not_an_artist: 'Not an artist',
    },
    /** Chip label carrying its queue size, so the biggest backlog is visible. */
    statusChipCount: (label: string, count: number) => `${label} (${count})`,
    searchLabel: 'Search artists',
    searchPlaceholder: 'Search every status',
    searchNotice: 'Searching every status. Clear the box to filter by chip.',
    notAnArtist: 'Not an artist',
    notAnArtistHint:
      'Bingo nights, ticket packages, venue names. Marking one stops the match job working it, and stops the reaper deleting it only to have tomorrow’s backfill put it back.',
    prev: 'Previous',
    next: 'Next',
    pageStatus: (from: number, to: number, total: number) =>
      `${from}–${to} of ${total}`,
    columns: {
      name: 'Artist',
      canonicalName: 'Canonical name',
      status: 'Status',
      spotifyArtistId: 'Spotify artist id',
      checkedAt: 'Last checked',
      actions: '',
    },
    idPlaceholder: 'Spotify artist id',
    noSpotifyId: '—',
    pasteIdLabel: 'Or paste an id',
    save: 'Save',
    clear: 'Clear',
    hide: 'Hide',
    restore: 'Restore',
    hiddenBadge: 'Hidden',
    visibilityError: 'Could not change that artist’s visibility.',
    findOnSpotify: 'Find on Spotify',
    hideCandidates: 'Close',
    // Covers both paths: opening the picker reads a saved snapshot, searching
    // or refreshing hits Spotify.
    candidatesLoading: 'Loading candidates…',
    candidatesEmpty:
      'Spotify returned nothing for this search. Try a different spelling.',
    candidatesError: 'Could not search Spotify.',
    candidatesDormant:
      'Spotify search is not configured on the API, so candidates cannot be fetched. Paste an artist id below instead.',
    candidatesRateLimited:
      'Spotify is rate limiting us. Cooldowns usually run for hours, so searching again now will not help. The API logs record how long it asked for.',
    candidatesCredentialsRejected:
      'Spotify rejected our app credentials. Check SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET on the API.',
    exactMatchBadge: 'Exact name',
    useCandidate: 'Use this one',
    candidateSearchLabel: 'Search Spotify for',
    candidateSearch: 'Search',
    openInSpotify: 'Open in Spotify',
    noGenres: 'No genres listed',
    /** `genres: null` — hydration never ran or failed, so we do not know. */
    genresUnknown: 'Genres unavailable',
    candidatesCachedAt: (when: string) => `Fetched from Spotify on ${when}.`,
    candidatesRefresh: 'Refresh from Spotify',
    loadingState: 'Loading artists…',
    emptyState: 'Nothing in this queue.',
    noSearchResults: 'No artist matches that search.',
    errorState: 'Could not load artists.',
    saveError: 'Could not save that artist.',
    never: 'never',
    dormantNotice:
      'Automatic matching needs SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET on the API. If those are not set, rows stay unmatched and can only be resolved by hand here.',
  },

  // The dashboard triage panel (#1215). Mirrors
  // design/design_handoff_admin_triage/triage-copy.jsx with the plan's
  // handoff-vs-reality reconciliations and the state-coverage audit's copy
  // actions applied: every nullable evidence field gets a branch rather than
  // an interpolation, ceiling has two variants, and "day" becomes "run"
  // wherever the underlying figure counts crawl runs.
  triage: {
    panel: {
      title: 'Needs attention',
      allClear: 'all clear',
      faultCount: (count: number) =>
        `${count} ${count === 1 ? 'fault' : 'faults'}`,
      queueCount: (count: number) => `${count} in queue`,
      syncedAt: (at: string) =>
        at === NO_SWEEP ? 'no sweep yet' : `checked ${at}`,
      refresh: 'Refresh',
      refreshing: 'Checking…',
    },

    // Tier strips. Lowercase mono — these are labels, not headlines.
    tiers: {
      faults: 'broken now',
      queues: 'work waiting',
      expected: 'marked expected',
    },

    // The acknowledged strip. It is folded shut because these rows are not
    // work — but the count stays visible, because an all-clear badge sitting
    // above three hidden faults is the summary this panel exists to avoid.
    expected: {
      by: (who: string, when: string) => `${who} · ${when}`,
      show: 'Show',
      hide: 'Hide',
    },

    // Severity bands, only rendered in the dense/banded presentation.
    bands: {
      hard: 'not crawling',
      loss: 'losing events',
      suspect: 'worth a look',
    },

    // `label` is the condition chip; `verb` completes the accessible sentence
    // "Bluebird Theater — {verb}."
    conditions: {
      blocked: { label: 'Blocked', verb: 'blocked by the venue' },
      failed: { label: 'Crawl failing', verb: 'failing to crawl' },
      wentDark: {
        label: 'Went dark',
        verb: 'returning far fewer events than usual',
      },
      ceiling: {
        label: 'Ceiling suspected',
        verb: 'possibly stuck on page one',
      },
      coverage: {
        label: 'Coverage gap',
        verb: 'missing ticket links it used to have',
      },
    },

    // Evidence lines. `stat` is the figure that earns the row; `detail` is the
    // context that makes the figure mean something.
    evidence: {
      blockedStat: (status: number | null) =>
        status === null ? 'Refusing to crawl' : `HTTP ${status}`,
      // `lastSuccess` is drawn from the endpoint's per-venue run-history
      // window, not the venue's whole lifetime, so a null means "none in the
      // recent runs" — not "never crawled successfully". The copy says only
      // what the data can evidence.
      blockedDetail: (refusals: number, lastSuccess: string | null) =>
        lastSuccess === null
          ? `${refusals} refusals in a row · no success in recent runs`
          : `${refusals} refusals in a row · last success ${lastSuccess}`,

      failedStat: (failures: number) => `${failures} failures in a row`,
      failedDetail: (errorClass: string, pauseAt: number) =>
        `${TRIAGE_ERROR_CLASS_LABELS[errorClass] ?? errorClass} · pauses itself at ${pauseAt}`,

      wentDarkStat: (baselineCount: number, count: number) =>
        `${baselineCount} → ${count} events`,
      // `window` is the length of the series actually plotted, not the
      // BASELINE_RUN_COUNT constant, which overstates the sample on a venue
      // with fewer than seven baseline runs.
      wentDarkDetail: (
        pct: number,
        window: number,
        avg: number,
        threshold: number,
      ) =>
        `${pct}% against a ${window}-run average of ${avg} · flags at ${threshold}%`,

      // Ceiling variant 1 — the same count reported run after run.
      ceilingPinnedStat: (count: number) => `stuck at ${count} events`,
      ceilingPinnedDetail: (
        runs: number,
        was: number | null,
        wasWhen: string | null,
      ) => {
        const head = `${runs} ${runs === 1 ? 'run' : 'runs'} at the same count`
        if (was === null) return `${head} · no different count on record`
        if (wasWhen === null) return `${head} · ${was} before that`
        return `${head} · ${was} before ${wasWhen}`
      },

      // Ceiling variant 2 — the furthest show on sale pulled back toward now.
      ceilingHorizonStat: (furthest: string | null, count: number) =>
        furthest === null
          ? `stuck at ${count} events`
          : `furthest show ${furthest}`,
      ceilingHorizonDetail: (
        shrankDays: number | null,
        best: string | null,
      ) => {
        const head =
          shrankDays === null
            ? 'horizon pulled back'
            : `horizon pulled back ${shrankDays} days`
        return best === null ? head : `${head} · reached ${best} before`
      },

      // Coverage states the covered figure — the panel's evidence line is
      // consistently "how much is working". `wasWhen` is a genuine
      // last-fully-covered date (venues.lastUrlCoverageOkAt, #1266); it stays
      // null for a venue with no fully-covered run on record, and the clause
      // drops.
      //
      // The clause deliberately carries no count. `expected` is TODAY's
      // upcoming total, while `wasWhen` is a past date — pairing them would
      // render "was 40/40 on Jul 12" off a catalogue that held some other
      // number on Jul 12. The date is the only fact the column actually
      // evidences; `coverageStat` already states the current figures.
      coverageStat: (matched: number, expected: number) =>
        `${matched} of ${expected} events have a ticket link`,
      coverageDetail: (uncovered: number, wasWhen: string | null) => {
        const head = `${uncovered} have neither a ticket nor an event link`
        return wasWhen === null
          ? head
          : `${head} · last fully covered ${wasWhen}`
      },
    },

    persistence: {
      label: 'for',
    },

    actions: {
      openRun: 'Open run',
      openVenue: 'Open venue',
      openDiagnostics: 'Diagnostics',
      openReview: 'Open Review',
      openSubmissions: 'Open prices',
    },

    queues: {
      eventFlags: {
        title: (count: number) => `${count} events flagged for review`,
        detail: (breakdown: string) =>
          breakdown.length > 0
            ? `${breakdown} · below the auto-approve threshold`
            : 'Below the auto-approve threshold',
      },
      priceSubmissions: {
        title: (count: number) => `${count} price submissions waiting`,
        detail: (breakdown: string) => breakdown,
      },
    },

    // The all-clear is a GOOD state, reported as a result with the numbers
    // that prove it.
    empty: {
      eyebrow: 'all clear',
      title: "Nothing's broken.",
      // `at` is '—' when no crawl run exists at all. Interpolating that reads
      // as "crawled clean at —", claiming a clean sweep that never ran.
      body: (venues: number, at: string, events: number) =>
        at === NO_SWEEP
          ? `No crawl has run yet across ${venues} venues. Nothing to report.`
          : `All ${venues} venues crawled clean at ${at}. ${events} events came in. Both queues are empty.`,
      aside: (next: string) => `Next sweep ${next}`,
      faultsClearStrip: (venues: number, at: string) =>
        at === NO_SWEEP
          ? `${venues} venues · no crawl has run yet`
          : `${venues} venues crawling clean · last checked ${at}`,
    },

    // Shown when the triage fetch fails. A broken health panel must not take
    // the health page down with it.
    degraded: {
      title: "Couldn't check venue health.",
      body: 'The triage service did not answer. Refresh to try again — crawl health below is unaffected.',
    },

    a11y: {
      // `acknowledged` is appended rather than folded into the all-clear
      // branch: "nothing is broken" while three faults sit marked expected is
      // true of the live list and misleading about the venue estate.
      announce: (faults: number, queued: number, acknowledged: number) => {
        const head =
          faults === 0 && queued === 0
            ? 'Nothing is broken. Both queues are clear.'
            : `${faults} ${faults === 1 ? 'fault' : 'faults'}, ${queued} ${queued === 1 ? 'item' : 'items'} in the queues.`
        if (acknowledged === 0) return head
        return `${head} ${acknowledged} ${acknowledged === 1 ? 'fault' : 'faults'} marked expected.`
      },
      checking: 'Checking venue health…',
      degraded: 'Venue health could not be checked.',
      // `suspect` rows are not asserted to be broken — the band exists
      // because the condition may be a real 20-show venue.
      rowLabel: (
        venue: string,
        verb: string,
        stat: string,
        dur: string,
        band: string,
      ) =>
        `${venue} — ${verb}. ${stat}. ${band === 'suspect' ? 'Like this for' : 'Broken for'} ${dur}.`,
      queueRowLabel: (title: string) => title,
      expectedRowLabel: (venue: string, verb: string, reason: string) =>
        `${venue} — ${verb}, marked expected. ${reason}`,
      severity: {
        hard: 'Severity: not crawling',
        loss: 'Severity: losing events',
        suspect: 'Severity: worth a look',
      },
      // Runs, not days — the series is a run history, and skipped runs are
      // filtered out of it.
      evidenceChart: (window: number, series: number[], count: number) =>
        `Event counts across the last ${window} ${window === 1 ? 'run' : 'runs'}: ${series.join(', ')}. Latest ${count}.`,
    },

    // The absence of a dismiss button is a design decision the admin should
    // be able to read rather than discover.
    model:
      'Rows clear themselves on the next clean crawl. Mark one expected and it returns the moment its figure moves.',
  },

  // The acknowledge control in the crawl inspector. Every string here has to
  // carry the same idea: this is not a dismiss. The figure is pinned, and the
  // fault comes back the moment it moves.
  faultAcknowledge: {
    title: 'Is this expected?',
    body: 'Pin the figure you judged expected. The fault stops showing, and comes straight back if that figure moves.',
    evidenceLabel: 'Pinning',
    noEvidence: 'no figure recorded',
    reasonLabel: 'Why is this expected?',
    reasonPlaceholder: 'Live Nation caps the list at 36.',
    confirm: 'Mark expected',
    confirming: 'Marking…',
    remove: 'Unmark',
    removing: 'Unmarking…',
    acknowledgedTitle: 'Marked expected',
    // The venue detail page has room for a chip, not a paragraph — the
    // condition and the pinned reason move into the tip.
    badge: 'Expected exception',
    badgeTipBody: (reason: string) =>
      `${reason} Unmark it from the run history in the crawl inspector.`,
    acknowledgedBy: (who: string, when: string) => `${who} · ${when}`,
    errors: {
      notAuthenticated: 'Session expired. Refresh and sign in again.',
      failed: "Couldn't save that. Nothing was changed.",
    },
  },
} as const
