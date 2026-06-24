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
} as const
