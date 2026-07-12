// Server-safe constants shared by the SSR seed (server component) and the
// client offset walker. Kept out of use-admin-price-submissions.ts because
// that module is 'use client'; a server component importing a runtime value
// from it would force an unintended client boundary.

// The submissions endpoint caps `limit` at 100. Both the first-paint seed and
// the client-side offset walker page at this size, so they must share it to
// stay aligned.
export const FETCH_PAGE_SIZE = 100
