/**
 * Pure helpers extracted from
 * scripts/2026-06-27-extractor-dedup-suffix-scan.ts so the SQL
 * invariants can be unit-tested without dragging in the full script
 * module — which imports `@concert-crawl/db` at top level and
 * constructs a Postgres client as a side effect of import. Pulling
 * only the constants into a DB-free module keeps the tests from
 * opening a Postgres connection they never use (and from leaking the
 * resulting handle on test exit).
 *
 * Helpers here back Copilot review feedback on PR #853:
 *   - SQL_PREFILTER_REGEX (R6): the Postgres-side prefilter regex
 *     used as Stage 1 of the two-stage filter. The regression test
 *     in 2026-06-27-extractor-dedup-suffix-scan.test.ts pins the
 *     literal-backslash invariant (`\m`, `\1`) that was broken in
 *     R1 by accidental JS escape-sequence interpretation.
 *   - BACKUP_TABLE_DDL / BACKUP_TABLE_PK_BACKFILL_DDL /
 *     BACKUP_UPSERT_SQL (R8): pin the backup-table schema (PRIMARY
 *     KEY on event_id) and the upsert shape (preserve title_before
 *     on conflict, refresh title_after + snapshotted_at) so a
 *     deterministic rollback is structurally guaranteed.
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

// Backup-table schema, used by the script on first --apply
// (PR #853 R8). PRIMARY KEY on `event_id` guarantees at most one
// snapshot row per event so rollback (`UPDATE events SET title =
// b.title_before FROM events_851_backup b WHERE events.id =
// b.event_id`) is unambiguous even after multiple --apply passes.
export const BACKUP_TABLE_DDL = `CREATE TABLE IF NOT EXISTS events_851_backup (
      event_id uuid NOT NULL PRIMARY KEY,
      title_before text NOT NULL,
      title_after text NOT NULL,
      snapshotted_at timestamptz NOT NULL DEFAULT now()
    )`

// Idempotent self-heal for tables created by pre-R8 runs of this
// script (which created `events_851_backup` without a PRIMARY KEY).
// Postgres has no `ADD CONSTRAINT IF NOT EXISTS` for PRIMARY KEY, so
// we guard with a `pg_constraint` lookup. Safe to run every --apply.
export const BACKUP_TABLE_PK_BACKFILL_DDL = `DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conrelid = 'events_851_backup'::regclass
          AND contype = 'p'
      ) THEN
        ALTER TABLE events_851_backup
          ADD CONSTRAINT events_851_backup_pkey PRIMARY KEY (event_id);
      END IF;
    END
    $$`

// Snapshot upsert (PR #853 R8). On a PK conflict, deliberately
// preserve `title_before` — it captures the pre-script state of the
// row and is the rollback target. Only `title_after` (the latest
// proposed cleanup) and `snapshotted_at` (when this --apply touched
// the row) refresh. This is what makes multi-pass cleanup of
// pathological titles like "Edition Edition Edition" → "Edition
// Edition" → "Edition" still roll back to the original three-word
// title in a single deterministic UPDATE.
export const BACKUP_UPSERT_SQL = `INSERT INTO events_851_backup (event_id, title_before, title_after)
              VALUES ($1, $2, $3)
              ON CONFLICT (event_id) DO UPDATE SET
                title_after = EXCLUDED.title_after,
                snapshotted_at = now()`
