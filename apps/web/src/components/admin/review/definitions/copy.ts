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
} as const
