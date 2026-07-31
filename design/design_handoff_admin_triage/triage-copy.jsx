// triage-copy.jsx — mirror of components/admin/definitions/copy.ts (#1215).
// EVERY user-facing string in this handoff lives here. Nothing in the JSX
// hardcodes copy. Venue names, counts, timestamps and percentages are DATA —
// they arrive as arguments and are interpolated here.
//
// Voice: admin. Plainer than the consumer app. Direct and factual, still
// written by a person. The panel is read daily and mostly says nothing is
// wrong, so nothing shouts: no "CRITICAL", no "ALERT", no exclamation marks on
// fault rows. The condition names are the loudest thing in the panel.

const TRIAGE_COPY = {
  panel: {
    title: "Needs attention",
    // Header summary badge. Exactly one of these renders.
    allClear: "all clear",
    faultCount: (n) => `${n} ${n === 1 ? "fault" : "faults"}`,
    queueCount: (n) => `${n} in queue`,
    syncedAt: (t) => `checked ${t}`,
    refresh: "Refresh",
    refreshing: "Checking…",
  },

  // Tier strips. Lowercase mono — these are labels, not headlines.
  tiers: {
    faults: "broken now",
    queues: "work waiting",
  },

  // Severity bands. Only rendered in high-volume mode, where they replace the
  // faults tier strip. Named for what is happening, not for how bad it is.
  bands: {
    hard: "not crawling",
    loss: "losing events",
    suspect: "worth a look",
  },

  // Fault conditions. `label` is the condition chip; `verb` completes the
  // accessible sentence "Bluebird Theater — {verb}".
  conditions: {
    blocked: { label: "Blocked", verb: "blocked by the venue" },
    failed: { label: "Crawl failing", verb: "failing to crawl" },
    wentDark: { label: "Went dark", verb: "returning far fewer events than usual" },
    ceiling: { label: "Ceiling suspected", verb: "possibly stuck on page one" },
    coverage: { label: "Coverage gap", verb: "missing source URLs it used to match" },
  },

  // Evidence lines. Each returns { stat, detail } — `stat` is the number that
  // earns the row, `detail` is the context that makes the number mean something.
  evidence: {
    blocked: (d) => ({
      stat: `HTTP ${d.status}`,
      detail: `${d.refusals} refusals in a row · last success ${d.lastSuccess}`,
    }),
    failed: (d) => ({
      stat: `${d.failures} failures in a row`,
      detail: `${d.errorClass} · pauses itself at ${d.pauseAt}`,
    }),
    wentDark: (d) => ({
      stat: `${d.baselineCount} → ${d.count} events`,
      detail: `${d.pct}% against a ${d.window}-day average of ${d.avg} · flags at ${d.threshold}%`,
    }),
    ceiling: (d) => ({
      stat: `stuck at ${d.count} events`,
      detail: `${d.runs} runs at the same round number · ${d.was} before ${d.wasWhen}`,
    }),
    coverage: (d) => ({
      stat: `${d.matched} of ${d.expected} source URLs`,
      detail: `${d.expected - d.matched} stopped matching · was ${d.expected}/${d.expected} on ${d.wasWhen}`,
    }),
  },

  // Persistence column. Value ("12d") is data; this labels it.
  persistence: {
    label: "for",
    a11y: (dur) => `broken for ${dur}`,
    fresh: "since last night",
  },

  actions: {
    openRun: "Open run",
    openVenue: "Open venue",
    openDiagnostics: "Diagnostics",
    openReview: "Open Review",
    openSubmissions: "Open prices",
  },

  // Queue tier. Aggregate rows — count-led.
  queues: {
    eventFlags: {
      title: (n) => `${n} events flagged for review`,
      detail: (breakdown) => `${breakdown} · below the auto-approve threshold`,
    },
    priceSubmissions: {
      title: (n) => `${n} price submissions waiting`,
      detail: (breakdown) => breakdown,
    },
    empty: "Both queues are clear.",
  },

  // Empty state. This is a GOOD state. It reports a clean sweep as a fact,
  // with the numbers that prove it — reassurance you can check, not a shrug.
  empty: {
    eyebrow: "all clear",
    title: "Nothing's broken.",
    body: (d) => `All ${d.venues} venues crawled clean at ${d.at}. ${d.events} events came in. Both queues are empty.`,
    aside: (d) => `Next sweep ${d.next}`,
    // Faults empty but queues present — the faults tier collapses to this strip.
    faultsClearStrip: (d) => `${d.venues} venues crawling clean · last checked ${d.at}`,
  },

  a11y: {
    panelLabel: "Needs attention",
    faultsHeading: "Broken now",
    queuesHeading: "Work waiting",
    // Announced on refresh. One sentence, no row-by-row reading.
    announce: (f, q) =>
      f === 0 && q === 0
        ? "Nothing is broken. Both queues are clear."
        : `${f} ${f === 1 ? "fault" : "faults"}, ${q} ${q === 1 ? "item" : "items"} in the queues.`,
    checking: "Checking venue health…",
    // `suspect` rows are not asserted to be broken — the band exists precisely
    // because the condition may be a real 20-show venue. The sentence says how
    // long the pattern has held, not how long something has been broken.
    rowLabel: (venue, verb, stat, dur, tier) =>
      `${venue} — ${verb}. ${stat}. ${tier === "suspect" ? "Like this for" : "Broken for"} ${dur}.`,
    queueRowLabel: (title) => title,
    severity: { hard: "Severity: not crawling", loss: "Severity: losing events", suspect: "Severity: worth a look" },
    evidenceChart: (d) => `Daily event counts for the last ${d.window} days: ${d.series.join(", ")}. Latest ${d.count}.`,
  },

  // Footnote under the fault list. Explains the model in one line, because the
  // absence of a dismiss button is a design decision the admin should be able
  // to read rather than discover.
  model: "Rows clear themselves on the next clean crawl. Nothing to dismiss.",
};

window.TRIAGE_COPY = TRIAGE_COPY;
