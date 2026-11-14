import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// LLM spend reaches the monthly budget only through recordLlmCost, whose
// service type is LLM_SERVICES. A caller that inserts into cost_tracking on
// its own can price at the wrong rate or use a service the budget never sums,
// so every direct insert outside this list fails here.

const REPO_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../../..',
);

const ALLOWED = new Set([
  // The helper itself.
  'packages/crawler-core/src/lib/record-llm-cost.ts',
  // The extraction call's 'claude' row: its dollars are already in
  // crawl_runs.llm_cost_usd, so it is deliberately not an LLM_SERVICES row.
  'packages/crawler-core/src/crawl.ts',
  // Spotify's zero-dollar observability rows, not LLM spend.
  'apps/api/src/jobs/spotify-weekly.ts',
  'apps/api/src/lib/spotify-sync.ts',
]);

const SKIPPED_DIRS = new Set([
  'node_modules',
  'dist',
  '.next',
  '.turbo',
  'coverage',
]);
const SOURCE_FILE = /\.(ts|tsx|mts|cts)$/;
const TEST_FILE = /\.test\.(ts|tsx|mts|cts)$/;

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return SKIPPED_DIRS.has(entry.name) ? [] : sourceFiles(full);
    }
    return SOURCE_FILE.test(entry.name) && !TEST_FILE.test(entry.name)
      ? [full]
      : [];
  });
}

describe('cost_tracking writers', () => {
  it('records LLM cost only through recordLlmCost', () => {
    const files = ['packages', 'apps'].flatMap((top) =>
      sourceFiles(path.join(REPO_ROOT, top)),
    );
    const writers = files
      .filter((file) =>
        /insert\(\s*costTracking\s*\)/.test(readFileSync(file, 'utf-8')),
      )
      .map((file) => path.relative(REPO_ROOT, file).split(path.sep).join('/'));

    // The scan found the known writers, so it is looking in the right place.
    expect(writers).toContain(
      'packages/crawler-core/src/lib/record-llm-cost.ts',
    );
    expect(writers.filter((file) => !ALLOWED.has(file))).toEqual([]);
  });
});
