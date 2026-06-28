import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, it, expect } from 'vitest'
// Import from the DB-free helper module (not the script itself), so
// the test doesn't pull in `@concert-crawl/db` — which constructs a
// Postgres client at module load and would leak an open handle even
// though no query runs (PR #853 R6).
import {
  BACKUP_TABLE_DDL,
  BACKUP_TABLE_PK_BACKFILL_DDL,
  BACKUP_UPSERT_SQL,
  SQL_PREFILTER_REGEX,
} from './2026-06-27-extractor-dedup-suffix-scan-helpers.js'

// Regression test for #851 — the Postgres prefilter regex was
// previously declared as a plain JS template literal containing `\w`,
// `\s`, and `\1`. None of those are valid JS escape sequences, so the
// backslashes were silently dropped (and `\1` became the legacy octal
// escape for char code 1), garbling the regex that reached Postgres and
// turning the candidate scan into a no-op. Switching to `String.raw`
// keeps every backslash intact. Asserting the literal characters here
// pins the invariant so the bug can't be reintroduced silently.
describe('extractor-dedup-suffix-scan — SQL_PREFILTER_REGEX', () => {
  it('preserves the Postgres word-start boundary anchor (`\\m`)', () => {
    // Two characters: a backslash followed by `m`. If the template were
    // interpreted as a normal JS string, `\m` would collapse to just `m`
    // (unknown escapes drop the backslash).
    expect(SQL_PREFILTER_REGEX.startsWith('\\m')).toBe(true)
    expect(SQL_PREFILTER_REGEX.charCodeAt(0)).toBe(0x5c) // backslash
    expect(SQL_PREFILTER_REGEX.charCodeAt(1)).toBe(0x6d) // 'm'
  })

  it('contains the backreference `\\1` as backslash + digit, not the octal escape', () => {
    // `\1` in a normal JS string is the legacy octal escape for char
    // code 1 (and a SyntaxError in strict mode). We need the literal
    // two-character sequence so Postgres parses it as a backreference.
    expect(SQL_PREFILTER_REGEX).toContain('\\1')
    // Pin the negative: the broken-fix result (U+0001, char code 1)
    // must never appear in the string.
    expect(SQL_PREFILTER_REGEX).not.toContain(String.fromCharCode(1))
  })

  it('uses a non-whitespace POSIX class for the captured token', () => {
    // R8 widened the captured "word" from `[[:alnum:]_]+` to
    // `[^[:space:]]+` so the prefilter can't drop real duplicates
    // containing non-alnum Unicode (combining marks, etc.). False
    // positives are absorbed by the JS `cleaned === row.title`
    // short-circuit downstream.
    expect(SQL_PREFILTER_REGEX).toContain('([^[:space:]]+)')
    // The narrower R6 shape must never be reintroduced — operators
    // would silently miss duplicates the JS helper would clean.
    expect(SQL_PREFILTER_REGEX).not.toContain('[[:alnum:]_]+')
  })

  it('uses POSIX character classes for whitespace separators', () => {
    expect(SQL_PREFILTER_REGEX).toContain('[[:space:]]+')
    expect(SQL_PREFILTER_REGEX).toContain('[[:space:]]*')
  })

  it('anchors at end-of-string', () => {
    expect(SQL_PREFILTER_REGEX.endsWith('$')).toBe(true)
  })

  it('does NOT collapse to the broken non-raw shape', () => {
    // If the template literal ever loses its `String.raw` tag, `\w` and
    // `\s` would silently collapse to bare `w` and `s`. The canonical
    // POSIX classes here contain neither `w+` nor `s+` as standalone
    // word-or-whitespace tokens, so a regression would produce a string
    // that fails this equality.
    expect(SQL_PREFILTER_REGEX).not.toContain('w+')
    expect(SQL_PREFILTER_REGEX).not.toContain('s+')
  })

  it('matches the canonical full regex shape end-to-end', () => {
    // Single string equality so a future maintainer who changes the
    // regex sees this test fail loudly and has to consciously update
    // it (vs. silently drifting from the JS helper in
    // strip-duplicated-trailing-word.ts).
    expect(SQL_PREFILTER_REGEX).toBe(
      '\\m([^[:space:]]+)[[:space:]]+\\1[[:space:]]*$',
    )
  })
})

// Regression suite for the rollback-determinism invariant (PR #853 R8).
//
// Without the PRIMARY KEY + UPSERT, re-running the script (which is
// expected for pathological titles like "Edition Edition Edition" that
// need multiple --apply passes) lets `events_851_backup` accumulate
// duplicate rows per event_id, making the documented rollback
// (`UPDATE events SET title = b.title_before FROM events_851_backup b
// WHERE events.id = b.event_id`) ambiguous/non-deterministic.
//
// These tests assert the *structural* invariants of the DDL + upsert
// SQL that make rollback unambiguous. They don't spin up a Postgres
// instance — that would drag a real DB into the unit suite. Instead
// they pin the SQL shape, which is what the helper module exists for.
describe('extractor-dedup-suffix-scan — backup-table schema (R8)', () => {
  it('declares event_id as PRIMARY KEY', () => {
    // The PK is what guarantees one snapshot row per event_id, and
    // therefore an unambiguous rollback UPDATE.
    expect(BACKUP_TABLE_DDL).toMatch(
      /event_id\s+uuid\s+NOT NULL\s+PRIMARY KEY/i,
    )
  })

  it('creates the table only if missing (idempotent across runs)', () => {
    expect(BACKUP_TABLE_DDL).toContain(
      'CREATE TABLE IF NOT EXISTS events_851_backup',
    )
  })

  it('keeps title_before, title_after, snapshotted_at columns', () => {
    // Rollback reads title_before; before/after audit reads both;
    // 7-day TTL reads snapshotted_at.
    expect(BACKUP_TABLE_DDL).toContain('title_before text NOT NULL')
    expect(BACKUP_TABLE_DDL).toContain('title_after text NOT NULL')
    expect(BACKUP_TABLE_DDL).toMatch(/snapshotted_at\s+timestamptz/)
  })

  it('self-heals pre-R8 tables by adding the PK if missing', () => {
    // Idempotent: re-running on a freshly-created (R8+) table is a
    // no-op; re-running on a legacy (pre-R8) table adds the PK.
    expect(BACKUP_TABLE_PK_BACKFILL_DDL).toContain(
      "events_851_backup'::regclass",
    )
    expect(BACKUP_TABLE_PK_BACKFILL_DDL).toMatch(/contype\s*=\s*'p'/)
    expect(BACKUP_TABLE_PK_BACKFILL_DDL).toMatch(
      /ALTER TABLE events_851_backup\s+ADD CONSTRAINT\s+events_851_backup_pkey\s+PRIMARY KEY\s*\(event_id\)/i,
    )
  })
})

describe('extractor-dedup-suffix-scan — backup upsert semantics (R8)', () => {
  it('targets the (event_id) PK conflict', () => {
    expect(BACKUP_UPSERT_SQL).toContain('ON CONFLICT (event_id) DO UPDATE SET')
  })

  it('refreshes title_after from EXCLUDED on conflict', () => {
    // Multi-pass cleanup needs the latest "after" snapshot so the
    // audit trail reflects the current state.
    expect(BACKUP_UPSERT_SQL).toMatch(
      /title_after\s*=\s*EXCLUDED\.title_after/i,
    )
  })

  it('refreshes snapshotted_at on conflict', () => {
    // Lets the 7-day rollback window slide with each --apply touch.
    expect(BACKUP_UPSERT_SQL).toMatch(/snapshotted_at\s*=\s*now\(\)/i)
  })

  it('does NOT overwrite title_before on conflict (rollback target invariant)', () => {
    // CRITICAL: title_before captures the pre-script state of the row
    // and is the rollback target. If a re-run on
    // "Edition Edition Edition" -> "Edition Edition" -> "Edition"
    // overwrote title_before with the intermediate state, rollback
    // would restore "Edition Edition" instead of the original three-
    // word title. The DO UPDATE SET clause must not mention
    // title_before at all.
    const updateClauseMatch = BACKUP_UPSERT_SQL.match(/DO UPDATE SET([\s\S]*)/)
    expect(updateClauseMatch).not.toBeNull()
    const updateClause = updateClauseMatch![1]
    expect(updateClause).not.toMatch(/\btitle_before\s*=/i)
    expect(updateClause).not.toContain('EXCLUDED.title_before')
  })

  it('simulates the multi-pass rollback target — first run is preserved', () => {
    // End-to-end semantic check on the SQL shape: the upsert clause
    // must update title_after but not title_before. We model the
    // backup-row state as a small object and replay two --apply
    // passes against it using the rules the SQL encodes.

    interface BackupRow {
      event_id: string
      title_before: string
      title_after: string
      snapshotted_at: number
    }
    const backup = new Map<string, BackupRow>()

    function applyUpsert(
      event_id: string,
      title_before: string,
      title_after: string,
      now: number,
    ) {
      // Derive the conflict behavior directly from the SQL string so
      // this test breaks if a future edit changes the clause.
      const existing = backup.get(event_id)
      if (existing === undefined) {
        backup.set(event_id, {
          event_id,
          title_before,
          title_after,
          snapshotted_at: now,
        })
        return
      }
      const conflictClause = BACKUP_UPSERT_SQL.match(
        /DO UPDATE SET([\s\S]*)/,
      )![1]
      const refreshesAfter = /title_after\s*=\s*EXCLUDED\.title_after/i.test(
        conflictClause,
      )
      const refreshesAt = /snapshotted_at\s*=\s*now\(\)/i.test(conflictClause)
      const refreshesBefore = /\btitle_before\s*=/i.test(conflictClause)
      backup.set(event_id, {
        event_id,
        title_before: refreshesBefore ? title_before : existing.title_before,
        title_after: refreshesAfter ? title_after : existing.title_after,
        snapshotted_at: refreshesAt ? now : existing.snapshotted_at,
      })
    }

    // First --apply pass: "Edition Edition Edition" -> "Edition Edition"
    applyUpsert('evt-1', 'Edition Edition Edition', 'Edition Edition', 1000)
    // Second --apply pass: "Edition Edition" -> "Edition"
    applyUpsert('evt-1', 'Edition Edition', 'Edition', 2000)

    // Exactly one snapshot row for the event — PK guarantees this and
    // the Map (a PK on key) models that.
    expect(backup.size).toBe(1)
    const row = backup.get('evt-1')!
    // Rollback target preserved from the first pass.
    expect(row.title_before).toBe('Edition Edition Edition')
    // Latest cleanup state stored.
    expect(row.title_after).toBe('Edition')
    // Snapshotted_at refreshed.
    expect(row.snapshotted_at).toBe(2000)
  })
})

// Cross-check: the inline SQL in the script must match the helper
// constants. The script uses `sql.raw(BACKUP_TABLE_DDL)` +
// `sql.raw(BACKUP_TABLE_PK_BACKFILL_DDL)` directly so those are
// trivially in lockstep; the UPSERT uses an inline `sql` template
// literal (because it has parameter bindings), so the constant and
// the script string can in principle drift. This test pins the two
// together by reading the script source and asserting it contains
// the same key clauses as `BACKUP_UPSERT_SQL`.
describe('extractor-dedup-suffix-scan — script ↔ helper SQL parity (R8)', () => {
  const scriptSource = readFileSync(
    fileURLToPath(
      new URL('./2026-06-27-extractor-dedup-suffix-scan.ts', import.meta.url),
    ),
    'utf-8',
  )

  it('script INSERT uses the same conflict target as BACKUP_UPSERT_SQL', () => {
    expect(scriptSource).toContain('ON CONFLICT (event_id) DO UPDATE SET')
  })

  it('script INSERT refreshes title_after from EXCLUDED', () => {
    expect(scriptSource).toMatch(/title_after\s*=\s*EXCLUDED\.title_after/i)
  })

  it('script INSERT refreshes snapshotted_at via now()', () => {
    expect(scriptSource).toMatch(/snapshotted_at\s*=\s*now\(\)/i)
  })

  it('script INSERT does NOT overwrite title_before on conflict', () => {
    // Slice out just the INSERT statement(s) so a comment elsewhere
    // mentioning title_before doesn't trip the assertion.
    const insertBlock = scriptSource
      .split(/INSERT INTO events_851_backup/)
      .slice(1) // everything after the first occurrence is the SQL body
      .join('INSERT INTO events_851_backup')
    // Inside the actual INSERT...DO UPDATE SET block, title_before
    // must not appear on the left of an assignment.
    const doUpdateMatch = insertBlock.match(/DO UPDATE SET([\s\S]*?)`/)
    expect(doUpdateMatch).not.toBeNull()
    expect(doUpdateMatch![1]).not.toMatch(/\btitle_before\s*=/i)
    expect(doUpdateMatch![1]).not.toContain('EXCLUDED.title_before')
  })
})
