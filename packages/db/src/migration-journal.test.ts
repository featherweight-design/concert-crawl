import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * Drizzle's migrator walks the journal in order and applies an entry only
 * when its `when` is later than the newest migration already applied
 * (drizzle-orm pg-core dialect `migrate`). A migration whose `when` is not
 * greater than the one before it is therefore skipped silently on any
 * database that has the later one: no error, no schema change. This pins the
 * order so a rebase that lands a migration behind a newer one fails CI here
 * instead of in production.
 *
 * Entries 0096-0101 carry idx values out of sequence (they were renumbered
 * after being applied), so the rule is on journal order, not on idx.
 */

interface JournalEntry {
  idx: number;
  when: number;
  tag: string;
}

const isJournalEntry = (value: unknown): value is JournalEntry =>
  typeof value === 'object' &&
  value !== null &&
  'idx' in value &&
  typeof value.idx === 'number' &&
  'when' in value &&
  typeof value.when === 'number' &&
  'tag' in value &&
  typeof value.tag === 'string';

const journalPath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../migrations/meta/_journal.json',
);

const readEntries = (): JournalEntry[] => {
  const parsed: unknown = JSON.parse(readFileSync(journalPath, 'utf8'));
  const entries =
    typeof parsed === 'object' && parsed !== null && 'entries' in parsed
      ? parsed.entries
      : undefined;
  if (!Array.isArray(entries) || !entries.every(isJournalEntry)) {
    throw new Error('migrations/meta/_journal.json has an unexpected shape');
  }
  return entries;
};

describe('migration journal order', () => {
  const entries = readEntries();

  it('has a `when` later than the entry before it, all the way down', () => {
    const inversions: string[] = [];
    entries.forEach((entry, index) => {
      const previous = entries[index - 1];
      if (previous && entry.when <= previous.when) {
        inversions.push(
          `${entry.tag} (when ${entry.when}) is not later than ${previous.tag} (when ${previous.when}): bump the later migration's when on rebase`,
        );
      }
    });
    expect(inversions).toEqual([]);
  });

  it('appends each new migration with the highest idx and the latest `when`', () => {
    const last = entries[entries.length - 1];
    expect(last).toBeDefined();
    if (!last) return;
    const otherIdx = entries.slice(0, -1).map((entry) => entry.idx);
    const otherWhen = entries.slice(0, -1).map((entry) => entry.when);
    expect(last.idx).toBeGreaterThan(Math.max(...otherIdx));
    expect(last.when).toBeGreaterThan(Math.max(...otherWhen));
  });

  it('has no repeated idx or tag', () => {
    const idxs = entries.map((entry) => entry.idx);
    const tags = entries.map((entry) => entry.tag);
    expect(new Set(idxs).size).toBe(idxs.length);
    expect(new Set(tags).size).toBe(tags.length);
  });
});
