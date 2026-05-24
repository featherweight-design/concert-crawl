// Shown on the admin crawl page (/admin/crawl) — venue status, issues banner, inspector, and diagnostics

export const CRAWL_COPY = {
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
        intent: 'Slow the sweep to stay under typical 10 req/min rate limits.',
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
          { path: 'crawl.waitForSelector', before: '—', after: '.event-card' },
        ],
        risks: [
          'If the selector changes or is absent, the crawl will time out waiting for an element that never appears.',
        ],
        rollback: 'Revert from the strategy history log.',
        nextRunIn: 'next scheduled sweep · ~2h',
      },
    },
  },
} as const
