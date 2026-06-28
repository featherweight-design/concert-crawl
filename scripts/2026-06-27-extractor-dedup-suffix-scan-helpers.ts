/**
 * Pure helpers extracted from
 * scripts/2026-06-27-extractor-dedup-suffix-scan.ts so the regex
 * invariant can be unit-tested without dragging in the full script
 * module — which imports `@concert-crawl/db` at top level and
 * constructs a Postgres client as a side effect of import. Pulling
 * only the constant into a DB-free module keeps the test from
 * opening a Postgres connection it never uses (and from leaking the
 * resulting handle on test exit).
 *
 * Helper here backs Copilot review feedback on PR #853:
 *   - SQL_PREFILTER_REGEX (R6): the Postgres-side prefilter regex
 *     used as Stage 1 of the two-stage filter. The regression test
 *     in 2026-06-27-extractor-dedup-suffix-scan.test.ts pins the
 *     literal-backslash invariant (`\m`, `\1`) that was broken in
 *     R1 by accidental JS escape-sequence interpretation.
 */

// Postgres-side prefilter regex (Stage 1 in the two-stage filter
// described in scripts/2026-06-27-extractor-dedup-suffix-scan.ts).
// Declared as a `String.raw` template so backslashes survive the
// JS string literal untouched and Postgres receives the regex
// verbatim.
//
// Without `String.raw` the JS parser eats unrecognized escapes:
// `\m` becomes `m`, `\1` becomes the legacy octal `\x01` (char
// code 1, and a syntax error in strict mode), and so on — Postgres
// then gets a garbled regex that silently matches nothing, and
// the candidate scan becomes a no-op. #851 fix.
//
// Anchors:
//   `\m`             — Postgres word-start boundary (modern syntax;
//                      replaces the deprecated `[[:<:]]` form).
//   `([[:alnum:]_]+)`— capture the word using POSIX char class
//                      (locale-aware on UTF-8 databases) plus `_`.
//                      Not byte-identical to the JS helper's
//                      `[\p{L}\p{M}\p{N}_]+` — Postgres regex has
//                      no Unicode property escapes — but the
//                      docstring at the top of the script already
//                      positions SQL as a prefilter (false-positives
//                      OK, JS is source of truth via the
//                      `cleaned === row.title` short-circuit), so
//                      byte-equivalence is not required.
//   `[[:space:]]+`   — one-or-more whitespace separating the two
//                      occurrences.
//   `\1`             — backreference to the captured word.
//   `[[:space:]]*$`  — optional trailing whitespace, then end-of-
//                      string, mirroring the JS `\s*$` anchor.
//
// Operator on the query is `~*` (case-insensitive POSIX regex
// match).
export const SQL_PREFILTER_REGEX = String.raw`\m([[:alnum:]_]+)[[:space:]]+\1[[:space:]]*$`
