// Single source of truth for all admin UI copy

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
    attentionItems: {
      crawlBlocked: (venueName: string) => `${venueName} — crawl blocked`,
      crawlFailed: (venueName: string) => `${venueName} — crawl failed`,
      crawlBlockedMeta: 'Venue blocked · crawl schedule paused',
      crawlFailedMeta: (status: string) =>
        `Status: ${status} · check crawl inspector`,
      crawlTimeLabel: 'recent',
      openCrawl: 'Open crawl',
      eventsFlaggedTitle: (count: number) =>
        `${count} event${count === 1 ? '' : 's'} flagged for review`,
      eventsFlaggedMeta: 'Needs manual verification before publishing',
      eventsTimeLabel: 'pending',
      openReview: 'Open Review',
      pricesWaitingTitle: (count: number) =>
        `${count} price submission${count === 1 ? '' : 's'} waiting`,
      pricesMeta: 'Community submissions need approval or dispute',
      pricesTimeLabel: 'pending',
      openPricesReview: 'Open Review',
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
    attentionFeed: {
      panelTitle: 'Needs your attention',
      activeSuffix: 'active',
      empty: 'No items need attention right now.',
      viewCrawlLog: 'View crawl log',
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

  venueDetailsClient: {
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
    },
    fields: {
      title: 'Title',
      titlePlaceholder: 'Event title',
      artist: 'Artist / lineup',
      artistPlaceholder: 'Headliner + support',
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
      markNonConcertTitle: 'Mark as non-concert',
      markNonConcertBodyBefore: 'Adds the ',
      markNonConcertTag: 'non-concert',
      markNonConcertBodyAfter:
        ' tag and unpublishes from the consumer app. Stays in the system.',
      markNonConcertButton: 'Mark non-concert',
    },
  },

  review: {
    tabs: {
      eventFlags: 'Event flags',
      prices: 'Prices',
      missing: 'Missing',
      allEvents: 'All events',
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
    },

    reviewPageClient: {
      eyebrow: 'operations · moderation',
      title: 'Review',
      subtitle:
        'Most events auto-approve. This page is where flags and community price submissions land for triage.',
      mobileTitle: 'Review',
      mobileSubtitle: (eventCount: number, submissionCount: number) =>
        `${eventCount} event${eventCount !== 1 ? 's' : ''} · ${submissionCount} price${submissionCount !== 1 ? 's' : ''} waiting.`,
    },

    adminReviewMobile: {
      tabEventFlags: 'Event flags',
      tabPrices: 'Prices',
      queueClearHeading: 'Queue is clear.',
      queueClearBody:
        'Every flagged event has been triaged. Next sweep runs at 18:00 MT.',
      communitySubmissionsHeader: 'Community submissions',
      noSubmissions: 'No pending submissions',
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
      denySubmission: '× Deny',
      approveSubmission: '✓ Approve · cred',
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
    summary: {
      userSingular: 'user',
      userPlural: 'users',
    },
    empty: 'No users found.',
    pagination: (shown: number, total: number) =>
      `Showing ${shown} of ${total}. Use the API limit/offset params for pagination.`,
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
        button: 'Send test alert email',
        buttonPending: 'Sending…',
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
  },

  notificationBell: {
    button: {
      ariaLabel: 'Notifications',
      ariaLabelWithCount: (count: number) => `Notifications, ${count} unread`,
      unreadOverflow: '9+',
    },
    panel: {
      title: 'Notifications',
      markAllRead: 'Mark all read',
      empty: 'No notifications',
      markAsRead: 'Mark as read',
      viewAction: 'View →',
    },
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
} as const
