// Copy for the admin contest-review surfaces (queue + per-contest panel).
// Per repo convention (memory:feedback_definitions_copy_rule), every
// customer-facing string the queue or panel renders lives here — never
// hardcoded in JSX. Proper nouns (prices, vendors, handles, dates) are
// data, not copy, and stay out of this file.

export const REVIEW_CONTEST_COPY = {
  queue: {
    // Section header
    heading: 'Price disputes',
    // Open-count pill ("{n} open"). Source: design table §1 — `count.badge.text`
    countBadge: (count: number): string => `${count} open`,

    // Loading / error states are not specified in the design property table
    // (rows annotated "NOT SPECIFIED in design" on lines 49–50 of the
    // property table). Spec §7.5 says queue loading = skeleton, queue empty
    // = auto-hide, queue error = inline retry block. Strings live here so
    // future polish PRs can land them without scattering literals.
    loading: 'Loading contests…',
    errorHeading: 'Failed to load contests.',
    errorRetry: 'Retry',

    // Column headers (mono uppercase per design §1)
    columnHeaders: {
      event: 'Event',
      original: 'Original',
      counter: 'Counter',
      filed: 'Filed',
      // Action column has no header per design (admin-queues.jsx:250 —
      // empty THCell width=120). Kept as an empty string so the column
      // count stays aligned with the body's <td>s.
      actions: '',
    },

    // Row badges (design §2 — original.kind === "boxoffice" gold pill,
    // counter cell pending azure pill)
    badges: {
      boxOffice: 'box office',
      pending: 'pending',
    },

    // Row attribution lines ("{handle} · {n} confirms")
    attribution: (handle: string, confirms: number): string =>
      `${handle} · ${confirms} confirms`,

    // Anonymous fallback when a submission has no user handle. The API
    // returns `handle: null` for users without a public profile; the
    // queue should still attribute the submission (vs. dropping the line
    // entirely) so the admin can see whose row it is.
    anonymousHandle: 'anonymous',
  },

  row: {
    // Resolve action — single-cell button on the right of each row
    resolveLabel: 'Resolve →',
    resolveAriaLabel: (eventTitle: string): string =>
      `Resolve dispute for ${eventTitle}`,
  },

  // AdminEntry — per-side card rendered twice inside AdminDisputePanel
  // (parent + counter side-by-side). Strings here mirror the design
  // property table §3b (apps/web/.../docs/superpowers/design-tables/
  // admin-contest-review.md lines 197–232). Source citations in JSX
  // comments point back to the dispute-surfaces.jsx reference rows.
  adminEntry: {
    // §3b line 201 — `badge.text = "winner"` (mono uppercase pill,
    // absolute-positioned over the top-left of the winner card).
    winnerBadge: 'winner',

    // §3b lines 217–223 — metadata grid row labels. Rendered in
    // mono-uppercase via the grid's first column, with values in the
    // second column. The labels are fixed (no count-based pluralization
    // here — confirms value carries its own free-form string).
    metadata: {
      submitter: 'Submitter',
      vendor: 'Vendor',
      observed: 'Observed',
      confirms: 'Confirms',
    },

    // Anonymous fallback when a submission has no user handle. Mirrors
    // the queue's `anonymousHandle` rule so both surfaces attribute
    // unknown handles the same way.
    anonymousHandle: 'anonymous',

    // §3b line 224 — confirms value is a free-form string. When admin
    // confirms > 0, both counts surface ("2 fans · 0 admin"); otherwise
    // just the fan count ("0 fans"). The design treats this as a string
    // not a structured value, so we keep formatting in copy.ts.
    confirmsValue: (fans: number, admin: number): string =>
      admin > 0 ? `${fans} fans · ${admin} admin` : `${fans} fans`,
  },

  // AdminDisputePanel — the 760px two-up adjudication surface mounted at
  // /admin/review/contests/:contestId. Strings pinned to design property
  // table §3 (docs/superpowers/design-tables/admin-contest-review.md
  // lines 101–191). Source citations in JSX comments point back to the
  // dispute-surfaces.jsx reference rows the table cites.
  panel: {
    // §3 line 109 — `eyebrow.text = "Disputes · Phase 8.5"` (mono
    // uppercase, fg-subtle, sits above the title).
    eyebrow: 'Disputes · Phase 8.5',

    // §3 line 112 — title is `{artist} · {venue} · {date}` joined with
    // " · ". The joiner is copy (separator strings live here so we don't
    // hardcode " · " across the JSX); the values are data.
    titleSeparator: ' · ',

    // §3 line 115 — open-dispute status pill. The stale pill mirrors the
    // shape but swaps the text + uses the resolved styling (see read-only
    // banner below). Both are uppercase mono pills.
    statusPill: {
      open: 'open dispute',
      resolved: 'resolved',
    },

    // §3 line 121 — guidance block. Renders below the header on the
    // active surface; the read-only banner replaces it on stale contests.
    guidance:
      'A corroborated price is being challenged. Pick the number that should live on the event page. Either entry can be promoted; the loser is archived (not deleted) with a reason. The submitter is not penalized — disputes are updates, not violations.',

    // Read-only banner — surfaced when counter.status !== 'pending' OR
    // parent.status === 'archived'. Plan §15 line 3689 specifies the
    // exact copy. The trailing link sends the admin back to the live
    // event so they can see the resolved price.
    staleBanner: {
      lead: 'This contest was already resolved.',
      link: 'View the new live price.',
    },

    // Deferred chip — shown near the header when
    // counter.status === 'pending' AND counter.lastAdminActionKind ===
    // 'defer'. Surface the engagement signal without blocking action;
    // admin can still resolve / re-defer.
    deferredChip: 'Previously deferred — admin requested more info',

    // §3 line 131 / 147 — column eyebrows. Counter eyebrow appends the
    // counter's current status, so the suffix is computed at render time
    // (not interpolated here).
    columnEyebrows: {
      original: 'Original · live',
      counterPrefix: 'Counter · ',
    },

    // §3 line 143 — `vs` divider text between the two columns.
    versusDivider: 'vs',

    // §3 line 157 — reason field eyebrow. Disclosure is built into the
    // label: the reason is shown to BOTH submitters when the contest
    // resolves (per README §5).
    reason: {
      label: 'Reason (shown to both submitters)',
      // Hidden a11y-only counterpart for the textarea — RTL queries the
      // label via `screen.getByLabelText(/reason/i)`. The visible eyebrow
      // sits above the textarea via `aria-labelledby`; the textarea also
      // carries an `aria-label` for the role-name match.
      ariaLabel: 'Reason for resolving this dispute',
      // Helper line under the textarea; surfaces when the reason is
      // shorter than the minimum (spec §4.7).
      tooShort: 'Reason must be at least 10 characters.',
      // Character counter — rendered as "{current} / {max}" beneath the
      // textarea. Format kept here so the slash + spacing matches the
      // design property table.
      charCount: (current: number, max: number): string =>
        `${current} / ${max}`,
    },

    // §3 lines 167–185 — three action buttons, fixed order:
    // Need more info, Keep original, Promote counter.
    actions: {
      needMoreInfo: 'Need more info',
      keepOriginal: 'Keep original',
      promoteCounter: 'Promote counter',
    },

    // Loading + error states — design property table marks them as NOT
    // SPECIFIED (§3 lines 190–191), so we keep them minimal: a status
    // line for loading, an inline error banner with a retry affordance
    // for failed fetches. Strings live here for future polish.
    loading: 'Loading contest…',
    errorHeading: 'Failed to load contest.',
    errorRetry: 'Retry',
    notFound: 'Contest not found.',
    // Surfaced inline above the action row when a mutation rejects. The
    // hook surfaces toasts on error too; this is the in-panel backup so
    // admins reading the panel can see the failure without scanning a
    // toast region.
    mutationError: 'That action failed. Please try again.',
  },
} as const
