// Shown on the admin crawl management page (/admin/crawl)

export const ADMIN_CRAWL_PAGE_COPY = {
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
} as const
