// Single source of truth for all admin UI copy

import { TRIAGE_NO_SWEEP as NO_SWEEP } from '@concert-crawl/types';

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
  llm_quota: 'LLM usage limit',
  llm_rate_limit: 'LLM rate limit or overload',
  unknown: 'Unclassified error',
};

/** 1 → "1st", 12 → "12th", 23 → "23rd". */
const ordinal = (count: number): string => {
  const tens = count % 100;
  const ones = count % 10;
  const suffix =
    tens >= 11 && tens <= 13
      ? 'th'
      : ones === 1
        ? 'st'
        : ones === 2
          ? 'nd'
          : ones === 3
            ? 'rd'
            : 'th';
  return `${count}${suffix}`;
};

const venueCount = (count: number): string =>
  `${count.toLocaleString('en-US')} ${count === 1 ? 'venue' : 'venues'}`;

const showCount = (count: number): string =>
  `${count.toLocaleString('en-US')} ${count === 1 ? 'show' : 'shows'}`;

/**
 * "Ball Arena and its 235 upcoming shows come off the site", "…and its
 * upcoming shows come…" when the count is unknown, and "Ball Arena comes off
 * the site" when it has none.
 */
const offTheSite = (venue: string, upcoming: number | null): string =>
  upcoming === 0
    ? `${venue} comes off the site`
    : upcoming === null
      ? `${venue} and its upcoming shows come off the site`
      : `${venue} and its ${upcoming.toLocaleString('en-US')} upcoming ${upcoming === 1 ? 'show' : 'shows'} come off the site`;

export const ADMIN_COPY = {
  // --- Health (plan row 1c; boards 03-health) ---
  health: {
    title: 'Health',
    summary: (count: number) =>
      count === 0
        ? 'Everything is running. Nothing needs you.'
        : `Everything is running. ${count} ${count === 1 ? 'thing needs' : 'things need'} you, and ${count === 1 ? "it's" : "they're"} already in Needs you.`,
    summaryPhone: (count: number) =>
      `Everything is running · ${count} in Needs you`,
    openNeedsYou: (count: number | null) =>
      count === null ? 'Open Needs you' : `Open Needs you · ${count}`,
    tiles: {
      crawl: {
        label: 'Crawl · last night',
        labelPhone: 'Crawl',
        value: (ok: number, total: number) => `${ok} of ${total}`,
        finished: (time: string, shows: string, added: string) =>
          `Finished ${time} · ${shows} shows, ${added} new`,
        finishedPhone: (time: string, added: string) =>
          `${time} · ${added} new`,
        failed: (count: number) => `${count} failed.`,
        noRuns: 'No runs last night.',
        onTime: 'On time',
        failedPill: (count: number) => `${count} failed`,
      },
      artists: {
        label: 'Artists',
        soon: (count: number) =>
          `Matched to a photo and genre. ${count} unsure have shows soon.`,
        soonPhone: (count: number) => `${count} unsure, soon`,
        toCheck: (count: number) =>
          `Matched to a photo and genre. ${count} to check.`,
        toCheckPhone: (count: number) => `${count} to check`,
      },
      cost: {
        label: (month: string) => `LLM cost · ${month}`,
        labelPhone: (month: string) => `LLM · ${month}`,
        ofBudget: (budget: string, pace: string) =>
          `of ${budget} budget · on pace for ${pace}`,
        ofBudgetPhone: (budget: string, pace: string) =>
          `of ${budget} · pace ${pace}`,
        over: (budget: string) =>
          `Over the ${budget} budget. Haiku still runs.`,
        noBudget: (pace: string) => `On pace for ${pace}`,
        noBudgetPhone: (pace: string) => `Pace ${pace}`,
        // The pill on a tile with no budget: it points at the panel.
        setBudget: 'Set a budget',
        under: 'Under budget',
        underPhone: 'Under',
        willGoOver: 'Will go over',
        overPill: 'Over budget',
      },
      site: {
        label: 'The site',
        labelPhone: 'Site',
        value: (sent: number) => `${sent} sent`,
        emails: (hours: number) => `Emails, last ${hours} h`,
        failed: (count: number) => `${count} failed`,
        lastSent: (time: string) => `last sent ${time}`,
      },
    },
    grid: {
      title: 'Last night, venue by venue',
      crawlRuns: 'Crawl runs',
      groups: {
        failed: 'Failed',
        paused: 'Paused',
        quiet: 'Quiet on purpose',
        ok: 'OK',
      },
      failure: (count: number, autoPaused: boolean) =>
        `${ordinal(count)} failure${autoPaused ? ' · auto-paused' : ''}`,
      paused: 'Paused',
      pageUnchanged: 'Page unchanged',
      footer: 'Worst first. Every venue opens its own page.',
      empty: 'No venue ran last night.',
    },
    cost: {
      title: 'LLM cost by day',
      perDay: (amount: string) => `${amount} a day`,
      dailyBudget: (amount: string) => `Daily budget ${amount}`,
      footnote: 'Haiku only runs when HTML and JSON-LD fail.',
      chartLabel: (month: string, total: string) =>
        `LLM cost by day in ${month}: ${total} so far`,
      day: (date: string, amount: string) => `${date}: ${amount}`,
    },
    doneForYou: {
      title: 'Done for you overnight',
      allActivity: 'All activity',
      empty: 'Nothing to report overnight.',
      failed: 'Couldn’t load what was done overnight.',
      // `atLeast`: the audit read was a full page, so the true count may be
      // higher and the line says "N+" rather than a number it cannot back.
      published: (count: number, atLeast: boolean) =>
        `Published ${count}${atLeast ? '+' : ''} ${count === 1 && !atLeast ? 'price' : 'prices'} a second fan confirmed`,
      paused: (venue: string, failures: number) =>
        `Paused crawling ${venue} after its ${ordinal(failures)} failure`,
      blocked: (venue: string) => `Flagged ${venue} as blocking the crawler`,
      merged: (venue: string, count: number) =>
        `Merged ${count} duplicate ${count === 1 ? 'listing' : 'listings'} at ${venue}`,
      cancelled: (count: number, atLeast: boolean) =>
        `Marked ${count}${atLeast ? '+' : ''} ${count === 1 && !atLeast ? 'show' : 'shows'} cancelled after the venue stopped listing ${count === 1 && !atLeast ? 'it' : 'them'}`,
      matched: (count: number, atLeast: boolean) =>
        `Matched ${count}${atLeast ? '+' : ''} ${count === 1 && !atLeast ? 'artist' : 'artists'} to a photo and genre`,
    },
    artistSync: {
      title: 'Artist sync',
      artists: 'Artists',
      matched: 'Matched',
      unsureSoon: 'Unsure, show in 60 days',
      unsureLater: 'Unsure, later or no show',
      noMatch: 'No match',
      footnote:
        'Unsure artists with a show in the next 60 days are in Needs you. The rest wait on Artists.',
    },
    site: {
      title: 'The site',
      emails: 'Emails',
      lastSent: (time: string, hours: number) =>
        `Last ${hours} h · last sent ${time}`,
      noneSent: (hours: number) => `Last ${hours} h · none sent`,
      sending: 'Sending',
      failed: (count: number) => `${count} failed`,
      quiet: 'Quiet',
    },
    // The LLM budget panel (`03/llm-budget-panel`), opened from the cost tile.
    budget: {
      eyebrow: 'LLM budget',
      title: 'Monthly LLM budget',
      body: 'Haiku only runs when HTML and JSON-LD find nothing. This sets what Health compares against.',
      amountLabel: 'Budget per month',
      amountHint: 'Leave empty for no budget.',
      amountInvalid: (max: string) =>
        `Enter an amount above $0 and up to ${max}, or leave it empty.`,
      warnLabel: 'Warn me at',
      warnOption: (percent: number) => `${percent}%`,
      runsOutLabel: 'If it runs out',
      // On: stop Haiku at the budget. Off, the default: keep running and warn.
      runsOutOn:
        'Keep crawling with HTML and JSON-LD only, and tell me. Never stops a crawl.',
      runsOutOff: 'Haiku keeps running past the budget, and I get a warning.',
      soFar: 'This month so far',
      soFarValue: (spent: string, pace: string) =>
        `${spent} · on pace for ${pace}`,
      lastMonth: 'Last month',
      save: 'Save',
      saving: 'Saving…',
      cancel: 'Cancel',
      // Rule 10, through `states.saveFailed`: "Couldn't change the LLM budget".
      failedWhat: 'the LLM budget',
      stillSaved: (budget: string | null) =>
        budget === null
          ? 'No budget is set.'
          : `The budget is still ${budget}.`,
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
      errorWillPause: ' · Will pause its crawl on next failure.',
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
          body: '403 from this venue usually means their edge layer (Cloudflare or similar) is denying the request. Could be IP-rate-based, user-agent fingerprinting, or a JS challenge. We never work around a block: ask the venue to allow ConcertCrawl, or move it to manual entry.',
        },
        rate_limit: {
          label: 'Rate limiting',
          body: "429 means the venue is rate-limiting requests. Raise the request delay on the venue's settings page, or ask the venue what rate it wants.",
        },
        parse_failure: {
          label: 'Parse failure',
          body: "The page returned 200 but the parser couldn't find the expected structure. Likely a layout change, schema.org markup removed, or a new template. Open the page and compare it with the last good run.",
        },
        timeout: {
          label: 'Timeout',
          body: 'Request did not complete in time. Often a JavaScript-heavy page that never goes network-idle. If it fetches with a browser and has no Wait selector, set its Wait until to Load on its settings page.',
        },
        llm_quota: {
          label: 'LLM usage limit (account-wide)',
          body: 'The LLM account hit its spend or usage limit, so every LLM-extracted venue fails until it resets or the limit is raised. Nothing is wrong with this venue, and the failure never counts toward its pause.',
        },
        llm_rate_limit: {
          label: 'LLM rate limit or overload (account-wide)',
          body: "The LLM API refused the request after its own retries: the account's rate limit, or Anthropic's capacity. It clears on its own. Nothing is wrong with this venue, and the failure never counts toward its pause.",
        },
        unknown: {
          label: 'Unclassified failure',
          body: "The error doesn't match a known pattern. Open the raw response and inspect manually.",
        },
      },
      diagOptions: {
        bot_detection: [
          {
            id: 'opt-manual',
            iconName: 'User',
            recommended: true,
            title: 'Keep venue on manual entry',
            body: 'The 403 already took this venue out of scheduled crawls. Its shows stay published; add new ones by hand.',
            cta: 'Stage manual mode',
          },
        ],
        rate_limit: [],
        parse_failure: [],
        timeout: [],
        // Account-wide: there is no venue-level fix to stage.
        llm_quota: [],
        llm_rate_limit: [],
        // An unclassified failure records no block, so there is no crawl to
        // leave off; errorReasons.unknown already says to inspect it.
        unknown: [],
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
        'opt-manual': {
          title: 'Keep venue on manual entry',
          intent:
            'A 403 records a block, and scheduled crawls skip blocked venues. Its shows stay published. Applying this queues no crawl, so the block stays in place and new shows are added by hand.',
          diff: [
            {
              path: 'venue.blocked_at',
              before: 'set by the 403',
              after: 'set by the 403 (unchanged)',
            },
          ],
          risks: [
            'Events will stop being automatically discovered.',
            'Requires manual admin updates to keep event listings current.',
          ],
          rollback:
            "Once the venue allows ConcertCrawl, queue a crawl from the venue's page. A successful crawl clears the block.",
          nextRunIn: 'none while the venue is blocked',
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

  // `04/venues-desktop`, `04/venues-mobile`, `A3/03/venues-select-d`.
  venuesList: {
    title: 'Venues',
    subtitle: (venues: number, shows: number) =>
      `${venueCount(venues)} · ${shows.toLocaleString('en-US')} upcoming ${shows === 1 ? 'show' : 'shows'} · worst first`,
    subtitlePhone: (venues: number) => `${venueCount(venues)} · worst first`,
    shows: (count: number) =>
      `${count.toLocaleString('en-US')} ${count === 1 ? 'show' : 'shows'}`,
    search: 'Search venues',
    filtersLabel: 'Filter venues',
    filters: {
      all: 'All',
      needsLook: 'Needs a look',
      paused: 'Paused',
      hidden: 'Hidden',
      disallowed: 'Disallowed',
    },
    // The pink dot's name for screen readers; the dot itself is decoration.
    needsYouDot: 'In Needs you',
    columns: {
      venue: 'Venue',
      onSite: 'On the site',
      crawling: 'Crawling',
      upcoming: 'Upcoming',
      latestRun: 'Latest run',
      robots: 'robots.txt',
    },
    // The latest-run line: "OK · 3:04 AM · 2 new", "Failed: calendar block
    // not found" (`04/venues-desktop`). Outcome words follow the run-result
    // chips (`09/run-result-chips`, ruling 8: "Unchanged", not "Skipped").
    latestRun: {
      success: 'OK',
      failed: 'Failed',
      partial: 'Partial',
      skipped: 'Skipped',
      unchanged: 'Unchanged',
      blocked: 'Blocked',
      notRun: 'Not run',
      robots: 'robots.txt',
      // Not "Not crawled yet": a hidden venue's chip already says "Not crawled".
      never: 'No runs yet',
      newShows: (count: number) => `${count.toLocaleString('en-US')} new`,
      withReason: (outcome: string, reason: string) => `${outcome}: ${reason}`,
      pausedOn: (date: string) => `Paused · ${date}`,
      pausedBy: (name: string, date: string) => `Paused by ${name} · ${date}`,
      reasons: {
        calendar_not_found: 'calendar block not found',
        no_events_found: 'no shows found',
        timeout: 'timed out',
        crawl_paused: 'paused',
        robots_disallowed: 'disallowed',
        robots_unreachable: 'unreachable',
        robots_crawl_delay: 'Crawl-delay over the cap',
        llm_account: 'account-wide LLM refusal',
      },
    },
    robots: {
      allowed: 'Allowed',
      disallowed: 'Disallowed',
      notChecked: 'Not checked',
    },
    pausedWith: (reason: string) => `Paused: ${reason}`,
    // Chip forms, short enough for the drawn 196px Crawling column. The Pause
    // panel's radios keep the long names ("Waiting on permission").
    pauseReason: {
      waiting_on_permission: 'awaiting reply',
      site_broken_or_moved: 'site down or moved',
    },
    moreOk: (count: number) => `${count} more, all OK`,
    // Select mode and its bottom bar (`A3/03/venues-select-d`).
    select: 'Select',
    done: 'Done',
    selectAll: 'Select every venue shown',
    selectVenue: (name: string) => `Select ${name}`,
    bulk: {
      selected: (count: number) => `${count} selected`,
      clear: 'Clear',
      recrawl: (count: number) => `Re-crawl ${count}`,
      pause: (count: number) => `Pause crawling ${count}…`,
      // `A3/03/re-crawl-states`: the reason beside a disabled Re-crawl.
      recrawlPaused: 'Resume crawling to re-crawl',
      // Rule 10, through `states.saveFailed`: "Couldn't change {what}".
      pauseFailed: (names: string) => `crawling for ${names}`,
      recrawlFailed: (names: string) => `Couldn't re-crawl ${names}`,
      othersDone: (count: number, done: 'paused' | 'queued') =>
        count === 1
          ? `The other one is ${done}.`
          : `The other ${count} are ${done}.`,
      pauseNoneDone: 'Crawling is as it was.',
      // No hour: the daily crawl's cron is `7 9 * * *` UTC, which is 02:07
      // MST in winter and 03:07 MDT in summer.
      recrawlNoneDone: 'The nightly crawl still runs.',
      // A re-crawl that failed for a reason other than the API refusing it
      // (a 5xx, the network): the request itself didn't land. No full stop:
      // `withCause` adds it.
      recrawlErrored: 'The request didn’t go through',
      // Beside Re-crawl when the venues left out aren't all paused (blocked,
      // robots-disallowed, hidden or unverified ones among them).
      recrawlSkipped: (count: number) => `${count} can’t be re-crawled`,
      // Beside Pause: venues already paused, blocked or disallowed are left
      // out, so an auto-pause keeps its own label.
      pauseSkipped: (count: number) => `${count} not crawling`,
      // A Try again leaves out failed venues no longer on screen.
      notRetried: (names: string) => `Not tried again, out of view: ${names}.`,
      // The cause first, then what is still true: "Pick a date after today.
      // The other one is paused."
      withCause: (cause: string, rest: string) => `${cause}. ${rest}`,
      names: (names: readonly string[]) =>
        names.length > 3
          ? `${names.slice(0, 2).join(', ')} and ${names.length - 2} more`
          : new Intl.ListFormat('en-US', { type: 'conjunction' }).format(names),
    },
    /** A row cell's column name, read before its value by screen readers. */
    cellName: (column: string) => `${column}: `,
    noMatch: 'No venues match the current filter.',
  },

  // The shared Pause panel and sheet (`A3/03/pause-panel-d`, rule 4), for one
  // venue or a Select of N.
  pausePanel: {
    title: (venue: string) => `Pause crawling ${venue}`,
    titleMany: (count: number) => `Pause crawling ${count} venues`,
    body: (shows: number) =>
      `Its ${showCount(shows)} stay listed. We stop visiting the site until you resume.`,
    bodyMany: (shows: number) =>
      `Their ${showCount(shows)} stay listed. We stop visiting their sites until you resume.`,
    why: 'Why',
    resume: 'Resume',
    reasons: {
      waiting_on_permission: 'Waiting on permission',
      site_broken_or_moved: 'Site is broken or moved',
      other: 'Other',
    },
    noteLabel: 'What’s going on',
    notePlaceholder: 'Ticketmaster migration this week; check back Monday.',
    resumeChoices: {
      manual: 'When I say',
      twoWeeks: 'In 2 weeks',
      date: 'Pick a date',
    },
    previousMonth: 'Previous month',
    nextMonth: 'Next month',
    weekdays: ['S', 'M', 'T', 'W', 'T', 'F', 'S'],
    // The auto-resume job runs at 08:40 UTC on the resume date, before the
    // daily crawl (Vercel cron `7 9 * * *`: 02:07 MST, 03:07 MDT), so that
    // date's own crawl is the first one. No hour: it moves with daylight time.
    resumesOn: (date: string) =>
      `Resumes ${date}, and is crawled early that morning.`,
    submit: 'Pause crawling',
    cancel: 'Cancel',
    // The API's 422s, shown inline (spec: Pause panel). Every refusal but
    // "too far out" means the date isn't after today.
    dateError: (apiError: string) =>
      apiError === 'Pick a date within a year'
        ? 'Pick a date within a year'
        : 'Pick a date after today',
  },

  // The venue page header (`A3/03/re-crawl-states`, phone
  // `A3/03/venue-overview-m`).
  venueHeader: {
    // "235 upcoming shows", as the board writes it.
    upcoming: (shows: number) =>
      `${shows.toLocaleString('en-US')} upcoming ${shows === 1 ? 'show' : 'shows'}`,
    recrawl: 'Re-crawl',
    queued: 'Queued',
    running: 'Crawling now',
    viewOnSite: 'View on site',
    // Why Re-crawl is off. The API refuses all four (paused 409, robots 409,
    // hidden or unverified 400). The board's "/events" has no source, so no
    // path is named.
    recrawlOff: {
      paused: 'Resume crawling to re-crawl',
      robots: 'robots.txt disallows the page we crawl. We never override it.',
      hidden: 'Show it on the site to re-crawl',
      // A taken-down venue: Show is refused too, so it can't point there.
      removed: 'Taken down at their request, so it isn’t crawled',
      unverified: 'Verify the venue to re-crawl',
    },
    // Rule 10 through `states.saveFailed`: "Couldn't change crawling for Ball
    // Arena. The re-crawl didn't start. Nothing changed." When the API says
    // why it refused, its message takes `recrawlSaved`'s place.
    failed: {
      recrawl: (venue: string) => `crawling for ${venue}`,
      recrawlSaved: 'The re-crawl didn’t start.',
      // The ⋯ menu's changes that run at once.
      flagship: 'the flagship',
      flagshipSaved: 'Venues is in the same order.',
      resume: (venue: string) => `crawling for ${venue}`,
      resumeSaved: 'Crawling is still paused.',
      show: (venue: string) => venue,
      showSaved: 'It is still hidden.',
    },
    menuLabel: (venue: string) => `More for ${venue}`,
    // The ⋯ menu per state (`A3/03/venue-menu-states`, `A3/03/delete-refused`).
    // The refused Delete row's hint is `venueConfirms.deleteRefused`.
    menu: {
      pause: 'Pause crawling…',
      pauseHint: 'Shows stay listed. Pick a reason.',
      // A hidden venue's shows are already off the site.
      pauseHintHidden: 'Stops crawling. Pick a reason.',
      resume: 'Resume crawling',
      makeFlagship: 'Make flagship',
      makeFlagshipHint: 'Shows it first on Venues.',
      removeFlagship: 'Remove flagship',
      removeFlagshipHint: 'It goes back to its place on Venues.',
      hide: 'Hide from site…',
      // The auto-paused board drops the count; the others carry it.
      hideHint: (shows: number | null) =>
        shows === null
          ? 'Removes the venue and its shows from the app.'
          : `Removes the venue and its ${showCount(shows)} from the app.`,
      takeDown: 'Take down…',
      takeDownHint: 'They asked us to remove their data.',
      show: 'Show on site',
      delete: 'Delete venue…',
      deleteHint: 'Only for venues added by mistake.',
      deleteRefusedLabel: 'Delete venue',
    },
    // "Hidden by @hugh, Nov 2: venue closed.", as the paused line says it.
    hiddenBy: (name: string, date: string, reason: string | null) =>
      reason
        ? `Hidden by ${name}, ${date}: ${reason}.`
        : `Hidden by ${name}, ${date}.`,
    hiddenSince: (date: string, reason: string | null) =>
      reason ? `Hidden since ${date}: ${reason}.` : `Hidden since ${date}.`,
    hiddenNoRecord: 'Hidden from the site.',
    hiddenReasons: {
      venue_closed: 'venue closed',
      not_music_venue: 'not a music venue',
    },
    // A taken-down venue (`removedAt`): its menu is this line and Delete.
    takenDown: (date: string) =>
      `Taken down ${date} at their request. Its prices are gone.`,
    takenDownRestore: 'Restoring it needs a separate approval.',
    // Settled outcomes with nothing to retry: the crawl was queued, so
    // Try again would only queue a second one.
    notice: {
      ranFailed: 'The re-crawl ran and failed. See Crawl history.',
      unknown:
        'The re-crawl was queued, but we couldn’t read its progress. See Crawl history.',
      stalled: 'Still queued. See Crawl history.',
      dismiss: 'Dismiss',
    },
    // The crawl summary the old header card carried, kept under the new
    // header until part 5's Overview tab takes it.
    summary: {
      consecutiveFailures: (count: number) => `${count} consec. failures`,
      strategy: {
        structured_data: 'structured',
        llm: 'llm',
        manual: 'manual',
        auto: 'auto',
      },
    },
  },

  // The venue page's Overview tab (3b part 3: `04/venue-overview`, phone
  // `A3/03/venue-overview-m`, `A3/03/last-14-runs-legend`,
  // `A3/01/warnings-off-overview-d`). Run outcome words and reasons are
  // `venuesList.latestRun`'s, so the list and the page say a run the same way.
  venueOverview: {
    latestRun: {
      title: 'Latest run',
      // "Nov 11 · 3:02 AM", Mountain Time.
      when: (date: string, time: string) => `${date} · ${time}`,
      // 1d ruling 8 and the board's caption.
      unchanged: (date: string, shows: number) =>
        `The calendar page hasn’t changed since ${date}’s full run, so we kept its ${showCount(shows)} and didn’t re-read it. Nothing to do.`,
      // No full run on record to name.
      unchangedNoFullRun:
        'The calendar page hasn’t changed since the last run, so we didn’t re-read it. Nothing to do.',
      found: (shows: number, added: number) =>
        added > 0
          ? `Found ${showCount(shows)}, ${added.toLocaleString('en-US')} new.`
          : `Found ${showCount(shows)}.`,
      // A reason line ("Failed: timed out") as a sentence.
      sentence: (line: string) => `${line}.`,
      openRun: 'Open run',
      recrawlAnyway: 'Re-crawl anyway',
    },
    lastRuns: {
      title: 'Last 14 runs',
      allRuns: 'All runs',
      chart: 'Last 14 runs, oldest first',
      legend: 'What the bars mean',
      // Bar kinds in `A3/03/last-14-runs-legend` order. Low is HOLD.
      kinds: {
        found: 'Shows found',
        unchanged: 'Skipped, unchanged',
        partial: 'Partial',
        failed: 'Failed',
        paused: 'Paused or not crawled',
      },
      bar: (date: string, kind: string) => `${date}: ${kind}`,
    },
    shows: {
      title: 'Shows',
      upcoming: 'Upcoming shows on the site',
      lastFullRun: 'Found in the last full run',
      lastFullRunValue: (shows: number, date: string) =>
        `${shows.toLocaleString('en-US')} (${date})`,
      noneYet: 'None yet',
      hidden: 'Hidden, not counted',
    },
    needsYou: {
      title: 'In Needs you',
      empty: (venue: string) => `Nothing waiting for ${venue}.`,
      turnedOff: 'Warnings you turned off',
      // Couldn't load {this}, when only the turned-off list failed.
      turnedOffPage: 'the warnings you turned off',
      // "Off since Nov 3, by @hugh · “It’s normal for this venue”"
      offSince: (date: string, by: string, reason: string | null) =>
        reason
          ? `Off since ${date}, by ${by} · “${reason}”`
          : `Off since ${date}, by ${by}`,
      handle: (name: string) => `@${name}`,
      turnBackOn: 'Turn back on',
      // Its accessible name, so each row's button says which warning.
      turnBackOnLabel: (kind: string) => `Turn back on: ${kind}`,
      // Rule 10 through `states.saveFailed`: "Couldn't change Shows moving.
      // It is still off. Nothing changed."
      turnBackOnSaved: 'It is still off.',
      // What each kind of warning is called once turned off. Only the first
      // five can be turned off as Not useful; the rest are named anyway.
      kinds: {
        'show-dropped': 'Shows dropping off the calendar',
        'show-moved': 'Shows moving',
        'venue-failing': 'Failing crawls',
        'venue-blocked': 'Blocked crawls',
        'event-low-confidence': 'Listings we’re unsure of',
        artist: 'Artist matches',
        'price-check': 'Price checks',
        'price-batch': 'Submitted prices',
        bug: 'Bug reports',
      },
    },
  },

  // The venue page's Runs tab (3b part 4, `04/venue-runs`, `04/venue-runs-
  // mobile`). Outcome words come from `venuesList.latestRun`.
  venueRuns: {
    title: 'Runs',
    filters: {
      label: 'Which runs',
      all: 'All',
      notOk: 'Not OK',
      // The count beside Not OK, read out after the name.
      notOkCount: (count: number) => `${count.toLocaleString('en-US')} not OK`,
    },
    // "106 shows · 2 new" (the row line for a run that read shows).
    shows: (shows: number, added: number) =>
      added > 0
        ? `${showCount(shows)} · ${added.toLocaleString('en-US')} new`
        : showCount(shows),
    unchangedSince: (date: string) => `Page unchanged since ${date}`,
    // "230 s"; a run with no recorded duration reads the dash.
    duration: (seconds: number) => `${seconds.toLocaleString('en-US')} s`,
    noDuration: '—',
    // "$0.15"; nothing spent reads "$0", under a cent "<$0.01".
    cost: (dollars: string) => `$${dollars}`,
    noCost: '$0',
    underACent: '<$0.01',
    // A row's accessible name: "Nov 10, 3:01 AM: OK, 106 shows · 2 new".
    rowLabel: (date: string, time: string, outcome: string, line: string) =>
      `${date}, ${time}: ${outcome}, ${line}`,
    // `A3/09/runs-filter-empty-d`.
    filterEmpty: (count: number) =>
      count === 1
        ? 'The one run here was OK.'
        : `All ${count.toLocaleString('en-US')} runs here were OK.`,
    showAll: 'Show all',
    // `A3/09/load-more`. The API sends no total, so the count is what's shown.
    showing: (count: number) => `Showing ${count.toLocaleString('en-US')}`,
    showingAll: (count: number) =>
      `Showing all ${count.toLocaleString('en-US')}`,
    loadMore: (count: number) => `Load ${count.toLocaleString('en-US')} more`,
    loading: 'Loading',
    loadMoreFailed: 'Couldn’t load more runs.',
    tryAgain: 'Try again',
  },

  // A run's detail: the desktop side panel and the phone sheet
  // (`07/a-runs-detail`, `G2/run-detail-sheet`). Shared with 1d.
  runDetail: {
    // "Nov 9 · 3:02 AM · 212 s · $0.14"
    meta: (parts: readonly string[]) => parts.join(' · '),
    pages: 'Pages',
    // Couldn't load {this}.
    pagesPage: 'this run’s pages',
    loadingPages: 'Loading pages…',
    noPages: 'No pages were kept for this run.',
    // "200 · 1.9 MB"
    pageLine: (parts: readonly string[]) => parts.join(' · '),
    // A page stored without an HTTP status (a platform or API read): neutral,
    // not a failure.
    noStatus: '—',
    // After a page's URL when it redirected: "→ …/events/2026".
    redirectedTo: (url: string) => `→ ${url}`,
    firstFailure: 'First failure',
    bytes: (count: number) => `${count.toLocaleString('en-US')} B`,
    kilobytes: (count: number) => `${count.toLocaleString('en-US')} KB`,
    megabytes: (count: string) => `${count} MB`,
    inspect: 'Inspect page',
    // On each PAGES row, beside its URL: inspect that page.
    inspectRow: 'Inspect',
    inspectRowLabel: (url: string) => `Inspect ${url}`,
    compare: (date: string) => `Compare with ${date}`,
  },

  // Inspect a fetched page (3b part 5): `04/inspect-a-fetched-page`, `G2/*`.
  inspect: {
    // The breadcrumb: Venues / {Venue} / Runs / Inspect.
    runsCrumb: 'Runs',
    crumb: 'Inspect',
    // "Inspect · ballarena.com/events"
    title: (page: string) => `Inspect · ${page}`,
    // The phone's back link: "Ball Arena · Runs".
    back: (venue: string) => `${venue} · Runs`,
    // "Ball Arena · run of Nov 9, 3:02 AM · 200 · 1.9 MB"
    meta: (parts: readonly string[]) => parts.join(' · '),
    runOf: (date: string, time: string) => `run of ${date}, ${time}`,
    // The phone line leads with it: "Run of Nov 9, 3:02 AM · 200 · 1.9 MB".
    runOfLead: (date: string, time: string) => `Run of ${date}, ${time}`,
    openLive: 'Open the live page',
    openLiveHint: (page: string) => `${page}, in your browser`,
    compareHint: 'The last full run, in the same view',
    menuLabel: 'Inspect actions',
    fetched: 'What we fetched',
    tabsLabel: 'Show the page as',
    tabs: { page: 'Page', text: 'Text', html: 'HTML' },
    // The Page frame's title: "ballarena.com/events as fetched, scripts off".
    frameTitle: (page: string) => `${page} as fetched, scripts off`,
    stoppedHere: (page: number) => `Stopped here: page ${page} never loaded`,
    keptFor: 'Fetched pages are kept for 14 days.',
    loading: 'Loading the page we fetched…',
    noText: 'This page has no text.',
    // The Page tab when the defused copy can't be shown safely.
    pageUnsafe: 'This page can’t be shown safely. Use the HTML or Text tab.',
    gone: {
      title: 'This run’s pages are gone',
      notKeptTitle: 'This page wasn’t kept',
      expired:
        'We keep fetched pages for 14 days, and this run is older. Its counts and reason are still on the Runs tab.',
      tooLarge: 'This page was too large to keep.',
      notStored: 'We didn’t keep this page’s HTML.',
      latestRun: 'Inspect the latest run',
    },
    couldntLoad: {
      title: 'Couldn’t load this page',
      body: 'Our copy of the page didn’t open. The run itself is fine, and nothing was changed.',
      tryAgain: 'Try again',
    },
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
    // 3b part 1: the venue page's tab strip, in strip order.
    tabs: {
      label: 'Venue sections',
      overview: 'Overview',
      runs: 'Runs',
      source: 'Source',
      details: 'Details',
      guide: 'Guide',
      // A refused save opens the field's tab; this banner says where.
      refused: (field: string, tab: string) =>
        `Not saved. Check ${field} on the ${tab} tab.`,
    },
    actions: {
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
        openLabel: 'Open the venue’s events page',
      },
      city: 'City',
      address: {
        label: 'Street address',
        placeholder: 'e.g. 1380 W Florida Ave, Denver, CO 80223',
        hint: 'Powers the embedded map on the public venue page. Leave blank to show the placeholder map.',
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
        hint: 'Milliseconds between requests, at least 3000. Raise it if you hit rate limits.',
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
      waitUntil: {
        label: 'Wait until',
        options: {
          networkidle: 'Network idle',
          load: 'Load',
          domcontentloaded: 'DOM ready',
        },
        hints: {
          networkidle:
            'Waits until the network goes quiet. Times out on pages that keep polling or hold a connection open.',
          load: "Waits for the page's load event. Use when network idle times out.",
          domcontentloaded:
            'Waits only for the HTML to parse. Fastest; may miss events added by scripts.',
        },
        ignoredWithSelector:
          'Not used while a Wait selector is set: the page loads to DOM ready, then waits for the selector.',
        ignoredHttpOnly:
          'Not used in HTTP only mode, which never opens a browser.',
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
      crawlPause: {
        title: 'Pause crawling',
        description:
          'Stops every crawl of this venue, manual runs included. Its shows stay published.',
        pausedSince: (date: string) => `Paused since ${date}.`,
        // Menu line pattern (`A3/03/venue-menu-states`): "Paused by @hugh,
        // Oct 28: waiting on permission." The auto-pause's "Try a re-crawl
        // first." is HOLD (§4.1).
        pausedBy: (name: string, date: string, reason: string | null) =>
          reason
            ? `Paused by ${name}, ${date}: ${reason}.`
            : `Paused by ${name}, ${date}.`,
        // An admin kept an auto-pause: a reason, but the crawler paused it.
        pausedSinceBecause: (date: string, reason: string) =>
          `Paused since ${date}: ${reason}.`,
        autoPaused: 'Auto-paused after 3 failures.',
        reasons: {
          waiting_on_permission: 'waiting on permission',
          site_broken_or_moved: 'site is broken or moved',
        },
        // Rule 10, through `states.saveFailed`: "Couldn't change crawling for
        // Ball Arena. Crawling is as it was. Nothing changed."
        failedWhat: (venue: string) => `crawling for ${venue}`,
        failedSaved: 'Crawling is as it was.',
        reasonLabel: 'Reason (kept in the audit log)',
        reasonPlaceholder: 'e.g. venue asked us to stop',
        pauseButton: 'Pause crawling…',
        resumeButton: 'Resume crawling',
      },
      remove: {
        title: 'Remove venue data',
        description:
          "For a venue that asked us to take its data down. Takes its shows off the site, stops crawls and deletes every price for its shows, users' submitted prices included. Shows stay in users' lists.",
        trigger: 'Remove data',
        removedNote:
          'Removed at their request: off the site, not crawled, prices deleted. Restoring it needs a separate approval.',
        dialog: {
          eyebrow: 'Removal request',
          heading: (venueName: string) => `Remove ${venueName}'s data?`,
          body: "Its shows leave the site and crawling stops. Every price for its shows is deleted, including users' submitted prices, and cannot be restored. The shows stay in users' Watching and Concerts lists.",
          reasonLabel: 'Reason (kept in the audit log)',
          reasonPlaceholder: 'e.g. venue emailed 2026-10-28 asking for removal',
          typedPrompt: (venueName: string) => `Type ${venueName} to confirm`,
          typedInputAriaLabel: 'Venue name confirmation',
          cancel: 'Cancel',
          confirm: 'Remove data',
          removing: 'Removing…',
          failed:
            'Removal failed. Reload the page to check its status before trying again.',
        },
      },
      pause: {
        title: 'Pause venue',
        description:
          'Takes the venue and all of its shows off the site, and stops crawls.',
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

  crawlPausedBadge: {
    // Never plain "Paused": the venue status already says "Paused" for a
    // venue taken off the site. A crawl pause keeps its shows published.
    label: 'Crawl paused',
  },
  addVenueModal: {
    trigger: 'Add a venue',
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
      nonConcertBadge: 'non-concert',
      reviewNeededBadge: 'needs review',
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
        nonConcertChipLabel: 'Non-concert',
        nonConcertChipAriaLabel: 'Toggle non-concert filter',
        nonConcertChipEmpty: 'No events are marked non-concert.',
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
      actionConfirmMove: 'Confirm move',
      moveConfirm: {
        eyebrow: 'Confirm move',
        heading: 'Merge this show into its replacement?',
        reasonDate: 'Same venue, new date',
        reasonVenue: 'New venue, date within a day',
        fromLabel: 'Missing',
        toLabel: 'Replacement',
        body: 'Watch and attendance rows move to the replacement, this row is deleted, and everyone watching it gets told the show moved. None of that can be undone.',
        cancel: 'Cancel',
        confirm: 'Merge and notify',
      },
      emptyHeading: "Nothing's gone missing.",
      emptyBody:
        'Every event the crawler expected showed up in the last sweep.',
      chipMissed: (count: number) =>
        `missed ${count} sweep${count === 1 ? '' : 's'}`,
      chipCadence: 'expected daily',
      classificationRemoved: 'Likely removed',
      classificationCrawlGap: 'Possible crawl gap',
      classificationDuplicate: 'Possible duplicate',
      classificationMoved: 'Possibly moved',
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
      mobileSubtitle: (decisions: number) =>
        `${decisions} decision${decisions !== 1 ? 's' : ''} waiting.`,
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
      lastSeen: 'Last seen',
    },
    // Both last_seen columns are overwritten on every sighting, so the cell
    // shows the most recent one only — a lead for a human, not a pattern.
    lastSeenBy: (userId: string) => `by ${userId}`,
    // A sighting whose actor has since deleted their account. deleteUserData
    // clears last_seen_by and keeps last_seen_at, so this is a real reachable
    // state, and it is not the same thing as an anonymous user.
    lastSeenByDeleted: 'by a deleted account',
    lastSeenNever: '—',
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
        doing: 'Was doing',
        errorDigest: 'Error digest',
        sentryEvent: 'Sentry event',
      },
    },
  },

  generateInviteForm: {
    expiresLabel: 'Expires (optional)',
    submitPending: 'Generating…',
    submitIdle: 'Generate Code',
  },

  // 5b, boards 07/invite-codes* and addendum-3 12/code-taken-d.
  // Admin 2b: the Needs you queue. Boards: 02/needs-you-desktop, needs-you-mobile,
  // all-clear, couldnt-load; addendum-3 01/filter-empty-d.
  // 4d Prices (boards 06 prices-*, add-a-price-mobile). Strings are the boards'.
  pricesPage: {
    title: 'Prices',
    subtitle: 'Submitted prices, Price checks, and shows still missing one',
    approve: {
      label: 'Approve every price myself',
      helper:
        'On while fewer than 50 people submit prices. Turn it off and prices a second fan confirms publish on their own; only Price checks and outliers reach Needs you.',
      people: (count: number) =>
        `${count} ${count === 1 ? 'person' : 'people'} submitting`,
      // The phone draws no switch, only this line under the title.
      phoneOn: 'Approving every price yourself',
      phoneOff: 'Prices a second fan confirms publish on their own',
      saveFailed: "Couldn't save that setting",
    },
    tabsLabel: 'Prices',
    tabs: {
      missing: 'Missing a price',
      submitted: 'Submitted prices',
      checks: 'Price checks',
    },
    phoneTabs: {
      missing: 'Missing',
      submitted: 'Submitted',
      checks: 'Checks',
    },
    interim: {
      checks: 'Open Price checks',
    },
    missing: {
      hint: 'A backlog, not a queue: no badge. Soonest and most-Watched first, with the ticket page one tap away.',
      listLabel: 'Shows missing a price',
      columns: {
        date: 'Date',
        show: 'Show',
        venue: 'Venue',
        watching: 'Watching',
      },
      watching: (count: number) => `${count} Watching`,
      ticketPage: 'Ticket page',
      addPrice: 'Add price',
      adding: 'Adding…',
      moreRows: (count: number) => `${count.toLocaleString('en-US')} more`,
      loadMore: 'Load more',
      loadingMore: 'Loading…',
      loadMoreFailed: "Couldn't load more shows.",
      empty: {
        title: 'Every show has a price',
        body: 'New shows without one appear here, soonest first.',
      },
    },
    add: {
      eyebrow: 'Price',
      sheetTitle: 'Add a price',
      openTicketPage: 'Open ticket page',
      lowest: 'Lowest',
      highest: 'Highest',
      highestOptional: 'Highest (optional)',
      free: "It's free",
      soldOut: 'Sold out',
      source: 'Where you saw it',
      sourcePlaceholder: 'axs.com/events/…',
      note: 'Publishes now, as your submission. Then the next show without a price opens here, so you can work down the list.',
      publishAndNext: 'Publish and next',
      publish: 'Publish',
      nothingLeft: 'That was the last show without a price.',
      needsPrice: 'Enter the lowest price, for example $50.',
      needsHighest: 'Enter a highest price that is at least the lowest.',
      needsSource: 'Enter a web address, or leave it empty.',
      alreadyPriced: 'That show already has a price.',
      saveFailed: "Couldn't save that price",
      soldOutFailed: "Published the price, but couldn't mark the show sold out",
    },
  },
  needsYou: {
    title: 'Needs you',
    summary: (decisions: number, handledToday: number) =>
      `${decisions} ${decisions === 1 ? 'decision' : 'decisions'}. Soonest for fans first.${
        handledToday > 0 ? ` ${handledToday} handled today.` : ''
      }`,
    filtersLabel: 'Kind of decision',
    filters: {
      all: 'All',
      shows: 'Shows',
      venues: 'Venues',
      artists: 'Artists',
      prices: 'Prices',
      bugs: 'Bugs',
    },
    when: {
      today: 'Today',
      tomorrow: 'Tomorrow',
      inDays: (days: number) => `In ${days} days`,
    },
    watching: (count: number) => `${count} watching`,
    reports: (count: number) =>
      `${count} ${count === 1 ? 'report' : 'reports'}`,
    batch: 'Batch',
    hiddenUntilDecided: 'Hidden until you decide',
    noFanImpact: 'No fan impact yet',
    // Undrawn: the card's "what happened" line. The API sends evidence lines,
    // not a sentence, so each kind's line is built from them.
    what: {
      showDropped: (venue: string | null, lastSeen: string | null) =>
        `Dropped off ${venue ?? 'the venue'}'s calendar${lastSeen ? `, last seen ${lastSeen}` : ''}.`,
      showMoved: (venue: string | null) =>
        `Looks like it moved${venue ? ` to ${venue}` : ''}.`,
      venueFailing: (failures: string | null) =>
        failures
          ? `Failed ${failures} crawls in a row.`
          : 'Its crawl is failing.',
      venueBlocked: (status: string | null) =>
        status
          ? `The site refused the crawler (HTTP ${status}).`
          : 'The site refused the crawler.',
      // `status` arrives already in words (`matchStatus` below).
      artist: (status: string | null, reports: string | null) =>
        `${status ?? 'No match status'}${reports ? `. ${reports} open reports.` : '.'}`,
      eventLowConfidence: (confidence: string | null) =>
        `Reads like it may not be a concert${confidence ? `. Confidence ${confidence}` : ''}.`,
      priceCheck: (listed: string | null, checked: string | null) =>
        `Listed ${listed ?? 'a price'}, a fan checked ${checked ?? 'another'}.`,
      priceBatch: (count: string | null) =>
        `${count ?? 'New'} new prices, each confirmed by a second fan.`,
      bug: (page: string | null) => `Reported${page ? ` on ${page}` : ''}.`,
    },
    emptyFilter: (kindLabel: string, others: number) =>
      `No ${kindLabel.toLowerCase()} waiting. ${others} in other kinds.`,
    showAll: 'Show all',
    allClear: {
      title: 'All clear',
      body: (handledToday: number) =>
        handledToday > 0
          ? `Nothing needs a decision. You handled ${handledToday} today.`
          : 'Nothing needs a decision.',
      openHealth: 'Open Health',
    },
    panel: {
      yourAnswer: 'YOUR ANSWER',
      details: 'DETAILS',
      whatHappened: 'WHAT HAPPENED',
      checkedForYou: 'CHECKED FOR YOU',
      whoSeesIt: 'WHO SEES IT',
      matchingShow: 'MATCHING SHOW',
      whatMovingDoes: 'WHAT MOVING DOES',
      likelyCause: 'LIKELY CAUSE',
      lastRuns: 'LAST 4 RUNS',
      lastSeen: 'Last seen',
      match: 'Match',
      blockedChip: (status: string) => `Blocked: ${status}`,
      // The word a run's status wears in LAST 4 RUNS. Failed and OK are drawn.
      runStatus: {
        failed: 'Failed',
        ok: 'OK',
        partial: 'Partial',
        skipped: 'Skipped',
      },
      showDropped: {
        title: (name: string, venue: string | null) =>
          `${name} dropped off ${venue ?? 'the venue'}’s calendar`,
        wasOn: (name: string, venue: string | null, date: string | null) =>
          `${name} was on ${venue ?? 'the venue'}’s calendar${date ? ` until ${date}` : ''}, then stopped appearing.`,
        watchers: (count: number) =>
          count === 0
            ? 'Nobody is Watching it yet.'
            : count === 1
              ? '1 person is Watching it.'
              : `${count} people are Watching it.`,
        itsWhen: (when: string) => `It’s ${when}, so it ranks first.`,
        answerNote:
          'Cancelled and Postponed tell Watchers; Still on keeps it listed and stops this warning for this show.',
      },
      showMoved: {
        title: (name: string, venue: string) => `${name} moved to ${venue}`,
        nowLists: (venue: string) =>
          `${venue} now lists the same act on the same night.`,
        doesWhat: (
          venue: string | null,
          from: string | null,
          watchers: number,
        ) =>
          `Keeps one event${venue ? `, now at ${venue}` : ''}.${
            watchers > 0
              ? ` The ${watchers} Watchers keep it and get one “Moved” notice.`
              : ''
          }${
            from
              ? ` Prices submitted for ${from} stay on the history, not the new listing.`
              : ''
          }`,
      },
      venue: {
        failingTitle: (venue: string | null, failures: number | null) =>
          `${venue ?? 'The venue'} stopped crawling${failures ? ` after ${failures} failures` : ''}`,
        blockedTitle: (venue: string | null) =>
          `${venue ?? 'The site'} refused our crawler`,
        // Authored: one sentence per error class the triage names.
        cause: {
          bot_detection: 'The site refused the crawler.',
          server_error: 'The site’s server is returning errors.',
          timeout: 'The site is not answering in time.',
          robots_disallowed: 'robots.txt disallows the page.',
          network_error: 'We could not reach the site.',
          parse_failure:
            'The page loads, but we could not read the calendar from it.',
          crawl_error: 'The runs do not say why.',
          unknown: 'The runs do not say why.',
        },
        answered: (venue: string | null, status: string | null) =>
          `${venue ?? 'The site'} answered${status ? ` with ${status}` : ''}. We flagged it blocked straight away and won’t retry on our own.`,
        refused:
          'We flagged it blocked straight away and won’t retry on our own.',
        stayListed: (next: string | null) =>
          `Its shows stay listed but won’t update.${next ? ` The next one is ${next}.` : ''}`,
        checkSource: 'Check source',
        failingNote:
          'Re-crawl tries the HTML, JSON-LD and Haiku steps again. If the page changed, Check source opens the venue’s Source tab to fix the address or the selector.',
        blockedNote: 'Re-crawl once is a single, manual try.',
      },
    },
    list: 'Decisions waiting',
    // The API sends an artist's match status as an enum; the queue says it in
    // words, and passes an unknown status through as it came.
    matchStatus: (status: string) =>
      status === 'no_match'
        ? 'No match found'
        : status === 'ambiguous'
          ? 'More than one artist fits'
          : status,
    // `02/answered-with-undo`: the dashed line that takes the answered card's place.
    answered: (name: string, label: string) => `${name} marked ${label}.`,
    snoozedLine: (name: string) => `${name} snoozed.`,
    undo: {
      action: 'Undo',
      failed: "Couldn't undo that.",
      failedSaved: 'The answer stands.',
    },
    answerFailed: {
      title: "Couldn't save that answer",
      saved: 'The item is still waiting.',
    },
    // A notifying answer sits behind a confirm and has no Undo (decision 2).
    confirmNotify: {
      title: (label: string) => `${label}?`,
      body: 'Fans watching this show are told right away. This can’t be undone.',
    },
    // `02/snooze-menu`.
    snooze: {
      trigger: 'Snooze',
      menuLabel: 'Snooze this decision',
      oneDay: 'Snooze 1 day',
      oneDaySub: 'Back tomorrow at 8 AM.',
      aWeek: 'Snooze a week',
      backOn: (day: string) => `Back ${day}.`,
      untilDate: 'Until a date...',
      untilDateSub: 'For off-season venues and slow replies.',
      dateLabel: 'Back on',
      setDate: 'Snooze',
      notUseful: 'Not useful',
      notUsefulSub: 'Stops this kind of warning for this venue. Tell us why.',
      reasonLabel: 'Why is it not useful?',
      reasonPlaceholder: 'Optional',
      stopWarning: 'Stop this warning',
      failed: "Couldn't snooze that",
    },
  },
  peoplePage: {
    title: 'People',
    subtitle:
      'Handles, not emails. Open someone to change their role or what they can try early.',
    phoneSubtitle: (total: number) => `${total} · handles, not emails`,
    search: 'Search by handle',
    chips: {
      label: 'Who to show',
      everyone: 'Everyone',
      beta: 'Beta',
      promoter: 'Promoter',
      admin: 'Admin',
      test: 'Test accounts',
      testShort: 'Test',
    },
    // Undrawn: the list opened from a code's "See all N".
    codeChip: (code: string | null) => (code ? `Code ${code}` : 'This code'),
    clearCode: 'Remove this filter',
    columns: {
      person: 'PERSON',
      role: 'ROLE',
      joined: 'JOINED',
      lastActive: 'LAST ACTIVE',
      watching: 'WATCHING',
    },
    roles: {
      user: 'Member',
      beta: 'Beta',
      promoter: 'Promoter',
      admin: 'Admin',
      sub_admin: 'Staff',
    },
    testTag: 'TEST',
    // JOINED after the date: "Oct 2 · code REDROCKS".
    joined: {
      code: (code: string) => `code ${code}`,
      poster: (code: string) => `poster ${code}`,
      founder: 'founder',
      test: 'test',
    },
    active: {
      now: 'Now',
      yesterday: 'Yesterday',
      minutes: (count: number) => `${count}m ago`,
      hours: (count: number) => `${count}h ago`,
      days: (count: number) => `${count}d ago`,
      // The phone's line: "Active 2h ago", "Active yesterday".
      phone: (when: string) => `Active ${when.toLowerCase()}`,
    },
    footer: (shown: number, total: number) =>
      `${shown} of ${total} · newest activity first`,
    // Undrawn: the pager under a list longer than one page.
    itemLabel: 'people',
    // Undrawn: the API stops reading accounts past its cap.
    truncated:
      'Not everyone is listed: there are more people than this list can read.',
    noResults: {
      title: 'Nobody matches',
      body: 'Check the spelling of the handle, or clear the filters.',
      clear: 'Clear filters',
    },
  },
  // 5a person page (`07/person`, `07/person-mobile`, addendum-3 `12/person-menu-d`).
  personPage: {
    back: 'People',
    joined: (date: string, how: string | null) =>
      how ? `Joined ${date} ${how}` : `Joined ${date}`,
    // Undrawn past "with code": how someone else came in.
    joinedAs: {
      code: (code: string) => `with code ${code}`,
      poster: (code: string) => `with poster ${code}`,
      founder: 'as a founder',
      test: 'as a test account',
    },
    active: (when: string) => `active ${when.toLowerCase()}`,
    stats: {
      watching: 'Watching',
      concerts: 'Concerts',
      submittedPrices: 'Submitted prices',
      feedback: 'Feedback',
    },
    role: 'Role',
    roleCaption: (role: string) =>
      `${role}. Beta testers see what is on for Beta in Feature flags and wear the Beta badge. Promoter is kept for later. Making someone an admin asks first.`,
    // Rule 10's line when the API refuses a role change (the self-demote 403).
    roleRefused: 'You can’t take Admin away from yourself.',
    roleFailed: 'The role didn’t change. Try again.',
    makeAdmin: {
      title: (name: string) => `Make ${name} an admin?`,
      body: 'Admins see every page here, including people’s emails when they choose to show them, and can change venues, prices and flags. This is logged.',
      confirm: 'Make admin',
    },
    // Undrawn: Admin to a lower role asks first with the same dialog (#25).
    removeAdmin: {
      title: (name: string, role: string) => `Make ${name} a ${role}?`,
      body: 'They stop seeing every page here, including people’s emails, and can no longer change venues, prices and flags. This is logged.',
      confirm: (role: string) => `Make ${role}`,
    },
    change: (from: string, to: string) => `${from} → ${to}`,
    toast: {
      title: (name: string, role: string) => `${name} is now ${role}`,
      betaOff:
        'Their Beta badge and Beta flags are off on their next page load.',
      betaOn:
        'Their Beta badge and Beta flags are on from their next page load.',
      undo: 'Undo',
    },
    account: 'Account',
    email: 'Email',
    showEmail: 'Show email',
    noEmail: 'No email on file',
    emailShown: 'Shown to you · logged',
    emailShownNote:
      'Shown for this visit only, and written to the Activity log with your handle. Hidden again when you leave the page.',
    emailFailed: 'Couldn’t show the email. Try again.',
    signsInWith: 'Signs in with',
    inviteCode: 'Invite code',
    inviteCodeCount: (code: string, count: number) =>
      `${code} · 1 of ${count} who joined with it`,
    testAccount: 'Test account',
    testAccountCaption:
      'Left out of counts, Beta and Needs you. Any role can be one.',
    testAccountFailed: 'Not saved, so the switch is back where it was.',
    recentTitle: 'Recent',
    recent: {
      price: (range: string, artist: string, venue: string) =>
        `Submitted ${range} for ${artist} at ${venue}`,
      feedback: (message: string) => `Feedback: “${message}”`,
      artist: {
        different_artist: (subject: string) =>
          `Reported the wrong artist on ${subject}`,
        wrong_photo: (subject: string) =>
          `Reported the wrong photo on ${subject}`,
        not_an_artist: (subject: string) =>
          `Reported ${subject} as not an artist`,
      },
      event: {
        'sold-out': (subject: string) => `Reported ${subject} sold out`,
        cancelled: (subject: string) => `Reported ${subject} cancelled`,
        postponed: (subject: string) => `Reported ${subject} postponed`,
        available: (subject: string) => `Reported ${subject} on sale again`,
      },
      other: (subject: string) => `Reported a problem with ${subject}`,
    },
    menu: {
      label: (name: string) => `More for ${name}`,
      signOut: 'Sign them out everywhere…',
      signOutHint: 'For a lost phone. They can sign in again.',
    },
    signOut: {
      title: (name: string) => `Sign ${name} out everywhere?`,
      body: (name: string) =>
        `${name} is signed out on every phone and computer within a minute. Nothing else changes: their Watching, Concerts and prices stay. They can sign in again right away.`,
      confirm: 'Sign them out',
      done: (name: string) => `Signed ${name} out everywhere`,
      doneBody: 'They can sign in again.',
      failed: 'They weren’t signed out. Try again.',
    },
  },
  codesPage: {
    title: 'People',
    subtitle:
      'Invite codes let people in before launch. One code can seat many people.',
    newCode: 'New code',
    tabs: {
      label: 'People',
      people: 'People',
      codes: 'Invite codes',
      codesShort: 'Codes',
      posters: 'Posters',
    },
    columns: {
      code: 'CODE',
      seats: 'SEATS USED',
      expires: 'EXPIRES',
      status: 'STATUS',
      madeBy: 'MADE BY',
    },
    status: {
      active: 'Active',
      full: 'Full',
      expired: 'Expired',
      revoked: 'Revoked',
    },
    seatsUsed: (used: number, max: number) => `${used} of ${max}`,
    // A member's share code: its cap is a ceiling, never drawn.
    seatsJoined: (joined: number) => `${joined.toLocaleString('en-US')} joined`,
    never: 'Never',
    expiresOn: (date: string | null) =>
      date ? `Expires ${date}` : 'Expires never',
    posterLabel: (label: string | null) =>
      label ? `Poster · ${label}` : 'Poster',
    // A member's own share code, from `design_handoff_share_app`.
    memberLabel: (name: string | null) =>
      name ? `Personal · @${name}` : 'Personal',
    formerAdmin: 'A former admin',
    footer:
      'Revoked and expired codes stay listed, so you can see who they brought in.',
    empty: {
      title: 'No invite codes yet',
      // `max` is the seat cap (`MAX_SEATS`, 500), so the line can't drift.
      body: (max: number) =>
        `Make one for a friend or a poster. Each can seat up to ${max} people.`,
    },
    menu: {
      // Names the row, so a screen reader can tell the menus apart.
      trigger: (code: string) => `Actions for ${code}`,
      columnLabel: 'Code actions',
      copyLink: 'Copy link',
      copyLinkEnded: 'Shows “This code has ended” when opened.',
      copied: 'Link copied',
      copyFailed: "Couldn't copy the link.",
      makePoster: 'Make a poster',
      makePosterHint: 'Opens Posters with this code picked.',
      seeWhoJoined: 'See who joined',
      seeWhoJoinedHint: (joined: number) =>
        `Opens the code: ${joined} ${joined === 1 ? 'person' : 'people'}.`,
      edit: 'Edit…',
      editHint: 'Label, seats or expiry.',
      revoke: 'Revoke…',
      revokeHint: 'Nobody new can join. Asks first.',
      reactivate: 'Reactivate…',
      reactivateHint: 'Lets people join again. Asks first.',
    },
    panel: {
      byline: (label: string | null, maker: string) =>
        label ? `${label} · made by ${maker}` : `Made by ${maker}`,
      expires: 'Expires',
      lastUsed: 'Last used',
      whoJoined: (joined: number) => `Who joined with it · ${joined}`,
      joined: (date: string, role: string | null) =>
        role ? `Joined ${date} · ${role}` : `Joined ${date}`,
      roles: {
        admin: 'Admin',
        promoter: 'Promoter',
        beta: 'Beta',
        sub_admin: 'Staff',
      },
      addSeats: 'Add seats',
      seeAll: (joined: number) => `See all ${joined}`,
      // Undrawn: someone who joined before picking a handle.
      noHandle: 'No handle yet',
    },
    form: {
      editNote: 'The code itself can’t change; printed posters use it.',
      newTitle: 'New code',
      label: 'Label (only you see it)',
      code: 'Code',
      codeHint:
        'Letters and numbers. Suggested from the label; change it if you like.',
      codeTaken: (code: string, suggestion: string | null) =>
        suggestion
          ? `${code} is already a code. Try ${suggestion}.`
          : `${code} is already a code.`,
      codeRule: '4 to 20 letters and numbers. Not case-sensitive.',
      // Undrawn: the API reserves the generated codes' prefix.
      codeReserved: (prefix: string) => `Codes can't start with ${prefix}.`,
      seats: 'Seats',
      other: 'Other',
      otherLabel: 'Seats, 1 to 500',
      seatsNewHint: '1 to 500 people can join with it.',
      seatsEditHint: (used: number) =>
        `${used} already used; can’t go below that.`,
      seatsFloor: (used: number) => `${used} already used`,
      expires: 'Expires',
      keep: (date: string) => `Keep ${date}`,
      expiry: {
        never: 'Never',
        d7: '7 days',
        d30: '30 days',
        d90: '90 days',
      },
      posterNext: 'Make a poster for it next',
      posterNextHint: 'Opens Posters with this code picked.',
      save: 'Save',
      make: 'Make code',
      cancel: 'Cancel',
      makeFailed: "Couldn't make the code. Try again.",
      // SaveFailedToast's "what is still saved", e.g. "REDROCKS is still active."
      stillStatus: (code: string, status: string) =>
        `${code} is still ${status.toLowerCase()}.`,
    },
    revoke: {
      title: (code: string) => `Revoke ${code}?`,
      body: (code: string, joined: number) =>
        [
          `Nobody new can join with ${code}.`,
          // Nobody has joined yet: there are no accounts to reassure about.
          joined === 0
            ? null
            : joined === 1
              ? 'The 1 person who already joined keeps their account.'
              : `The ${joined} people who already joined keep their accounts.`,
          'A poster with this code will show “This code has ended” when scanned.',
        ]
          .filter(Boolean)
          .join(' '),
      keep: 'Keep it',
      confirm: 'Revoke',
    },
    reactivate: {
      title: (code: string) => `Reactivate ${code}?`,
      body: (code: string, max: number, used: number) =>
        `People can join with ${code} again, up to its ${max} ${max === 1 ? 'seat' : 'seats'} (${used} used).`,
      keep: 'Keep it ended',
      confirm: 'Reactivate',
    },
  },

  inviteCodes: {
    poster: {
      tabs: { codes: 'Codes', posters: 'Posters', label: 'Invite codes' },
      title: 'Print a poster',
      subtitle:
        'One shared code per poster. Pick the code, pick the look, print at Letter.',
      steps: { code: 'Code', look: 'Look', print: 'Print' },
      newCode: 'New poster code',
      seatsTaken: (taken: number, max: number) =>
        `${taken} of ${max} seats taken`,
      expiresNever: 'Never expires',
      expiresOn: (date: string) => `Expires ${date}`,
      full: 'Every seat is taken. Mint a new code to put up another poster.',
      personalNote:
        "Personal codes (1 seat) don't show here. A poster needs a code many people can use.",
      // From the mobile board: the one-card picker's count of the rest.
      moreCodes: (more: number, full: number) =>
        `${more} more poster code${more === 1 ? '' : 's'}${full > 0 ? `, ${full} full` : ''}`,
      form: {
        label: "Where it's going",
        labelHint: 'Only admins see this. It helps you tell posters apart.',
        seats: 'Seats',
        seatsOther: 'Other',
        seatsHint: 'How many people this one code lets in. 2 to 500.',
        expires: 'Expires',
        never: 'Never',
        days30: '30 days',
        days90: '90 days',
        submit: 'Mint and preview',
        pending: 'Minting…',
        cancel: 'Cancel',
        previewNote: "The preview switches to the new code once it's minted.",
        mintedNoId: "Minted, but couldn't select it. Find it in the list.",
        mintedMissing:
          "Minted, but the list didn't refresh. Reload the page to find it.",
        mintFailed: "Couldn't mint the code. Try again.",
      },
      look: {
        night: {
          name: 'Night',
          hint: 'Color printer. Reads best in a dark bar.',
        },
        paper: {
          name: 'Paper',
          hint: 'Any printer, black ink. Copies well, works on colored paper.',
        },
      },
      tearTabs: {
        name: 'Tear-off tabs',
        hint: 'Nine tabs with the code along the bottom. The QR shrinks to 3.5 in, so it scans from about 6 ft instead of 8.',
      },
      print: 'Print poster',
      qrDownload: 'QR as SVG',
      qrShort: 'QR',
      printTipsHeading: 'In the print dialog',
      printTips: [
        'Letter at 100% scale',
        'Margins: None',
        'Background graphics on (Night needs it)',
        'Headers and footers off',
      ],
      scanTip: 'Before you hang it, scan the printout from across the room.',
      previewLabel: 'Preview · 8.5 × 11 in',
      previewSpec: {
        full: 'QR 4.5 in · scans from about 8 ft',
        tabs: 'QR 3.5 in · scans from about 6 ft',
      },
      notPrintable:
        "That code can't be printed: it's full, expired, revoked or a personal code. Pick another.",
      noCodes: 'No poster codes yet. Mint one to print a poster.',
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
    brand: { admin: 'ADMIN' },
    nav: {
      ariaLabel: 'Admin',
      needsYou: 'Needs you',
      health: 'Health',
      venues: 'Venues',
      events: 'Events',
      artists: 'Artists',
      prices: 'Prices',
      people: 'People',
      featureFlags: 'Feature flags',
      inviteCodes: 'Invite codes',
      crawlRuns: 'Crawl runs',
      operations: 'Operations',
      groups: { manage: 'MANAGE', system: 'SYSTEM' },
      badgeAriaLabel: (count: number) =>
        `${count} ${count === 1 ? 'decision' : 'decisions'} waiting`,
    },
    tabBar: { ariaLabel: 'Admin sections', more: 'More' },
    more: {
      title: 'More',
      details: {
        health: 'Venues, cost, site checks',
        artists: (count: number) =>
          `${count} ${count === 1 ? 'artist' : 'artists'} to check`,
        prices: (count: number) => `${count} missing a price`,
        people: 'People, invite codes, posters',
        featureFlags: (count: number) =>
          `${count} ${count === 1 ? 'flag' : 'flags'}`,
        crawlRuns: (when: string) => `Last run ${when}`,
        operations: (count: number) => `${count} feedback to read`,
        operationsDescription: 'Feedback, emails, activity log',
      },
      // Interim row until the audit's own place is drawn (`08/more-interim-m`).
      robotsAudit: {
        title: 'Robots.txt audit',
        detail: "Every venue's last robots.txt check",
      },
    },
    userMenu: {
      trigger: 'Your account',
      role: 'ADMIN',
      roleIn: (environment: string) => `ADMIN · ${environment}`,
      openApp: 'Open Concert Crawl',
      openAppHint:
        'The fan app, signed in as you. Admin stays one tap away in your menu there.',
      openAppHintPhone: 'The fan app, signed in as you. Admin is in its menu.',
      theme: 'Theme',
      themeHint: (name: string) => `Follows your theme in the app: ${name}.`,
      signOut: 'Sign out',
      signOutHint: 'On this device.',
    },
    environment: {
      staging: 'STAGING ADMIN',
      production: 'PRODUCTION',
      local: 'LOCAL',
    },
    environmentShort: {
      staging: 'STAGING',
      production: 'PRODUCTION',
      local: 'LOCAL',
    },
    topbar: {
      breadcrumbAriaLabel: 'Breadcrumb',
    },
    crumbs: {
      editVenue: 'Edit venue',
      details: 'Details',
    },
  },

  featureFlags: {
    sectionEyebrow: 'RELEASE',
    sectionTitle: 'Feature flags',
    sectionSubtitle:
      'Turn a feature off and it disappears from every surface, and its API routes answer 404. A flag can only hide a feature, never grant one past its plan.',
    stateOn: 'On',
    stateOff: 'Off',
    changedPrefix: 'Changed',
    neverToggled: 'Never changed',
    toggleOn: 'Turn on',
    toggleOff: 'Turn off',
    confirmTitleOn: 'Turn this on?',
    confirmTitleOff: 'Turn this off?',
    confirmBodyOn:
      'Customers will see this feature everywhere it appears, subject to their plan.',
    confirmBodyOff:
      'Customers will stop seeing this feature everywhere, and its API routes will answer 404. Existing data is left alone.',
    confirmCancel: 'Cancel',
    confirmAccept: 'Save',
    saveError: 'Could not save the flag. Try again.',
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

  // 4c Artists (`06/artists-*`). Board strings are verbatim; the rest went
  // through copy-review.
  artists: {
    title: 'Artists',
    subtitle:
      'The photo and genre fans see on every show. Fix it here; reports land here too.',
    tabs: {
      label: 'Artist lists',
      toCheck: 'To check',
      matched: 'Matched',
      notArtists: 'Not artists',
    },
    toCheckCount: (count: number) => `${count} to check`,
    windows: {
      label: 'Next show',
      soon: 'Show in 60 days',
      later: 'Later',
      none: 'No show',
    },
    search: 'Search artists',
    kind: {
      reported: 'Unsure',
      unsure: 'Unsure',
      no_match: 'No match',
      check: 'Check',
    },
    reports: (count: number) =>
      `${count} wrong-artist ${count === 1 ? 'report' : 'reports'}`,
    matchedAutomatically: 'Matched automatically',
    candidates: (name: string) => `Spotify artists for ${name}`,
    searchCard: { title: 'Search', line: 'Pick someone else' },
    // The artist search (`06/artists-search-opens-the-side-panel`,
    // `06/artist-search-mobile`).
    searchPanel: {
      title: (name: string) => `Find the right ${name}`,
      forLine: (line: string) => `For ${line}`,
      separator: ' · ',
      inputLabel: 'Search Spotify by name',
      exactName: 'Exact name',
      results: (count: number) =>
        `${count} ${count === 1 ? 'result' : 'results'}`,
      loading: 'Searching Spotify…',
      // Whole-sentence lines end with a period; labels and the loading line
      // don't.
      failed: "Couldn't reach Spotify.",
      // A typed search that found nobody.
      empty: 'No artist by that name. Try another spelling.',
      // Opened on a row with no saved candidates.
      noSaved: 'Nothing saved for this name yet. Search Spotify above.',
      // Exact name hid every hit.
      noExact: 'No exact name match. Turn off Exact name to see the rest.',
      use: 'Use',
    },
    // The open reports on a reported row: what Looks right would dismiss.
    reportList: {
      label: (name: string) => `Reports on ${name}`,
      loading: 'Loading reports…',
      failed: "Couldn't load the reports.",
      reason: {
        different_artist: 'Different artist, same name',
        wrong_photo: 'Right music, wrong photo',
        not_an_artist: 'Not an artist',
        other: 'Something else',
      },
      age: (days: number) => (days < 1 ? 'today' : `${days}d ago`),
      meta: (reason: string, age: string) => `${reason} · ${age}`,
      separator: ' · ',
      suggested: 'Suggested artist',
    },
    useSelected: 'Use selected',
    looksRight: 'Looks right',
    notAnArtist: 'Not an artist',
    pick: 'Pick',
    searchButton: 'Search',
    notAnArtistConfirm: {
      title: (name: string) => `Mark ${name} as not an artist?`,
      body: 'Its page comes down and matching stops.',
      confirm: 'Not an artist',
    },
    empty: {
      title: 'Every artist checks out',
      soon: 'No unsure or unmatched artists with a show in the next 60 days.',
      later: 'No unsure or unmatched artists with a show after 60 days.',
      none: 'No unsure or unmatched artists without a show.',
    },
    noResults: {
      title: 'No artist matches',
      body: 'Check the spelling, or clear the search.',
      clear: 'Clear search',
      elsewhereTitle: (tab: string) => `Not in ${tab}`,
      elsewhereBody: (tabs: string) => `That name is in ${tabs}.`,
      or: ' or ',
    },
    /** A row's buttons name the artist for screen readers. */
    actionFor: (action: string, name: string) => `${action}: ${name}`,
    // Under "Couldn't change {name}", so the name isn't said twice.
    stillIn: (tab: string) => `It's still in ${tab}.`,
    subtitleShort: 'The photo and genre fans see on every show.',
    // Fans follow artists; Watching is for shows (locked vocabulary).
    matchedMeta: (upcoming: number, followerCount: number) =>
      `${upcoming} upcoming · ${followerCount} ${followerCount === 1 ? 'follower' : 'followers'}`,
    itsAnArtist: 'It’s an artist',
    changeMatch: 'Change match',
    menu: {
      label: (name: string) => `More for ${name}`,
      changeMatch: 'Change match…',
      changeMatchLine: 'Pick another Spotify artist.',
      notAnArtist: 'Not an artist…',
      notAnArtistLine: 'A tour name, promoter, series or sports.',
    },
    emptyMatched: {
      title: 'No matches yet',
      body: 'Artists with a confirmed Spotify match land here.',
    },
    emptyNotArtists: {
      title: 'Nothing marked',
      body: 'Mark a tour, promoter or series and it moves here.',
    },
    itemLabel: 'artists',
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
      // An account-wide LLM refusal is the account's, not the venue's: it
      // never counts toward the pause, so the strike count would mislead.
      failedAccountWideStat: 'Account-wide LLM refusal',
      // The venue's own strikes still show: a venue one real failure from the
      // pause must not look harmless because the account is down.
      failedAccountWideDetail: (
        errorClass: string,
        failures: number,
        pauseAt: number,
      ) =>
        `${TRIAGE_ERROR_CLASS_LABELS[errorClass] ?? errorClass} · account-wide, never a strike` +
        (failures > 0
          ? ` · ${failures} earlier ${failures === 1 ? 'failure' : 'failures'}, pauses itself at ${pauseAt}`
          : ''),
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
        const head = `${runs} ${runs === 1 ? 'run' : 'runs'} at the same count`;
        if (was === null) return `${head} · no different count on record`;
        if (wasWhen === null) return `${head} · ${was} before that`;
        return `${head} · ${was} before ${wasWhen}`;
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
            : `horizon pulled back ${shrankDays} days`;
        return best === null ? head : `${head} · reached ${best} before`;
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
        const head = `${uncovered} have neither a ticket nor an event link`;
        return wasWhen === null
          ? head
          : `${head} · last fully covered ${wasWhen}`;
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
            : `${faults} ${faults === 1 ? 'fault' : 'faults'}, ${queued} ${queued === 1 ? 'item' : 'items'} in the queues.`;
        if (acknowledged === 0) return head;
        return `${head} ${acknowledged} ${acknowledged === 1 ? 'fault' : 'faults'} marked expected.`;
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

  // 4d Prices, the Submitted prices tab (boards 06 prices-submitted-prices,
  // prices-row-menu, reject-a-submitted-price, submitted-prices-mobile).
  pricesSubmitted: {
    filtersLabel: 'Filter submitted prices',
    filters: {
      all: 'All',
      waiting: 'Waiting for you',
      published: 'Published',
      'price-check': 'Price check',
    },
    search: 'Search shows or people',
    listLabel: 'Submitted prices',
    columns: {
      show: 'Show',
      price: 'Price',
      from: 'From',
      backedBy: 'Backed by',
      state: 'State',
    },
    noHandle: 'A fan',
    fans: (count: number) => `${count} ${count === 1 ? 'fan' : 'fans'}`,
    priceCheck: 'Price check',
    // The state as plain text on a desktop; the phone draws pills.
    states: {
      waiting: 'Waiting for you',
      published: 'Published',
      'price-check': 'In Needs you',
      'not-used': 'Not used',
      stale: 'Stale',
    },
    phoneStates: {
      waiting: 'Waiting for you',
      published: 'Live',
      'price-check': 'Price check',
      'not-used': 'Not used',
      stale: 'Stale',
    },
    empty: { title: 'No submitted prices', body: 'Nothing matches that.' },
    loadMore: 'Load more',
    loadingMore: 'Loading…',
    loadMoreFailed: "Couldn't load more prices.",
    showing: (shown: number, total: number) => `Showing ${shown} of ${total}`,
    menu: {
      label: 'Price actions',
      openShow: {
        label: 'Open the show',
        hint: 'Event edit, with this price in context',
      },
      openTicket: { label: 'Open ticket page', hint: 'Where the fan saw it' },
      otherPrices: {
        label: 'This fan’s other prices',
        hint: (handle: string) => `Filter to @${handle}`,
      },
      reject: { label: 'Reject…', hint: 'Unpublish it and tell the fan why' },
    },
    reject: {
      eyebrow: 'Reject price',
      thisShow: 'this show',
      title: (price: string, show: string) => `Reject ${price} for ${show}?`,
      body: (handle: string | null) =>
        `The price comes off the show, and ${handle === null ? 'the fan' : `@${handle}`} sees it as Not used in Submitted prices, with your reason.`,
      reasonLabel: 'Reason',
      reasons: {
        'wrong-show': 'Wrong show',
        'wrong-amount': 'Wrong amount',
        resale: 'Resale price',
        'fees-included': 'Fees included',
        other: 'Other',
      },
      noteLabel: 'Note to the fan (optional)',
      cancel: 'Cancel',
      confirm: 'Reject price',
      failed: "Couldn't reject that price",
      notWaiting: 'That price is no longer waiting for you.',
    },
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
  // --- Admin redesign primitives (plan row 0b) ---
  venueStatus: {
    onSite: { live: 'Live', hidden: 'Hidden', draft: 'Draft' },
    crawling: {
      crawling: 'Crawling',
      paused: 'Paused',
      autoPaused: 'Auto-paused: 3 failures',
      autoPausedShort: 'Auto-paused',
      blocked: 'Blocked',
      robotsDisallowed: 'Paused: robots.txt',
      notCrawled: 'Not crawled',
    },
  },
  kind: {
    show: 'SHOW',
    venue: 'VENUE',
    artist: 'ARTIST',
    event: 'EVENT',
    prices: 'PRICES',
    bug: 'BUG',
    flag: 'FLAG',
    priceCheck: 'PRICE CHECK',
    inviteCode: 'INVITE CODE',
  },
  // The venue page's Hide, Take down and Delete confirms (`A3/03/hide-other-d`,
  // `A3/03/take-down-d`, `04/delete-venue`) and the delete-refused line
  // (`A3/03/delete-refused`), which the ⋯ menu (3a 4b part 2) also draws.
  venueConfirms: {
    // Rule 10 through `states.saveFailed`, shown inside the dialog.
    failed: {
      hide: (venue: string) => venue,
      hideSaved: 'It is still on the site.',
      takeDown: (venue: string) => venue,
      takeDownSaved: 'Its shows and prices are as they were.',
      delete: (venue: string) => venue,
      deleteSaved: 'It is still here, hidden.',
    },
    // "Can't delete: it has 12 past shows and 3 people Watching them."
    // With no shows at all (Watchers only), the shows clause drops.
    deleteRefused: (past: number, upcoming: number, watchers: number) => {
      const people = `${watchers.toLocaleString('en-US')} ${watchers === 1 ? 'person' : 'people'}`;
      if (past === 0 && upcoming === 0) {
        return `Can’t delete: ${people} ${watchers === 1 ? 'is' : 'are'} Watching its shows. It stays hidden instead.`;
      }
      const shows =
        upcoming > 0
          ? showCount(past + upcoming)
          : `${past.toLocaleString('en-US')} past ${past === 1 ? 'show' : 'shows'}`;
      const watching = watchers === 0 ? '' : ` and ${people} Watching them`;
      return `Can’t delete: it has ${shows}${watching}. It stays hidden instead.`;
    },
    // The board's "including Watching lists" is cut: Watching
    // (`routes/watching.ts`) doesn't filter hidden venues. The Watchers count
    // spans past shows too, so the clause carries no number.
    hide: {
      title: (venue: string) => `Hide ${venue} from the site?`,
      // A null count (no `deleteBlockers` on the payload) drops the number.
      body: (venue: string, shows: number | null) =>
        `${offTheSite(venue, shows)} and out of search. Fans Watching its shows get no notice. Crawling stops too.`,
      why: 'Why',
      reasons: {
        venue_closed: 'Venue closed',
        not_music_venue: 'Not a music venue',
        other: 'Other',
      },
      noteLabel: 'What’s going on',
      notePlaceholder: 'Renovation through March.',
      foot: 'You can show it again from the ⋯ menu. Nothing is deleted. A venue that asked us to remove its data uses Take down instead.',
      confirm: 'Hide venue',
    },
    // The board's "deleted for good" for the shows is false (POST /:id/remove
    // keeps the event rows) and "won't add it again" has nothing enforcing
    // it, so both are cut. The count is the upcoming one, as Hide's; prices go
    // for past shows too.
    takeDown: {
      title: (venue: string) => `Take down ${venue}?`,
      body: (venue: string, shows: number | null) =>
        `${offTheSite(venue, shows)}, and every price fans submitted for its shows is deleted for good. Nobody gets a notice, and crawling stops.`,
      warn: 'This can’t be undone. For a closed venue, hide it instead.',
      // Sent as the API's required reason, and kept in the audit log; the
      // note, when given, follows it there.
      reason: 'They asked us to remove their data',
      auditReason: (note: string) =>
        note === ''
          ? 'They asked us to remove their data'
          : `They asked us to remove their data: ${note}`,
      noteLabel: 'Who asked, and how (optional)',
      notePlaceholder: 'e.g. their booker emailed venues@ on Nov 2',
      confirm: 'Take down',
    },
    // Offered only on a hidden venue with no shows.
    remove: {
      title: (venue: string) => `Delete ${venue}?`,
      body: 'Only for a venue added by mistake. Deleting removes the venue and its run history. This can’t be undone.',
      field: 'Type the venue’s name to confirm',
      note: 'A venue with shows or Watchers can’t be deleted; hide it instead.',
      confirm: 'Delete venue',
    },
  },
  panel: { close: 'Close' },
  confirm: { cancel: 'Cancel' },
  states: {
    couldntLoad: {
      title: (page: string) => `Couldn't load ${page}`,
      titleGeneric: "Couldn't load this page",
      body: "This page didn't load. Nothing you decided is lost.",
      tryAgain: 'Try again',
      openHealth: 'Open Health',
      errorId: (digest: string) => `Error ID: ${digest}`,
    },
    saveFailed: {
      title: (what: string) => `Couldn't change ${what}`,
      body: (saved: string) => `${saved} Nothing changed.`,
      tryAgain: 'Try again',
      dismiss: 'Dismiss',
    },
    notFound: {
      title: "That page isn't here",
      body: 'It may have moved or been deleted.',
      back: 'Back to Health',
    },
  },
} as const;
