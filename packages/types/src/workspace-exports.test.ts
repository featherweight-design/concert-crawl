import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

// Every workspace package's exports must resolve for a CommonJS consumer too.
// Playwright loads apps/e2e's global setup through require(), which matches
// neither an "import" condition nor a missing "default"; with only "import"
// the prod post-deploy smoke could not even start, and the API rolled back
// (2026-11-10). "default" is what require() falls through to.
const packagesDir = path.resolve(__dirname, '../..');

const exportEntries = (): [string, string, Record<string, unknown>][] =>
  readdirSync(packagesDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .flatMap((entry) => {
      let manifest: { name?: string; exports?: unknown };
      try {
        manifest = JSON.parse(
          readFileSync(
            path.join(packagesDir, entry.name, 'package.json'),
            'utf8',
          ),
        );
      } catch {
        return [];
      }
      const { exports } = manifest;
      if (typeof exports !== 'object' || exports === null) return [];
      return Object.entries(exports).flatMap<
        [string, string, Record<string, unknown>]
      >(([subpath, target]) =>
        typeof target === 'object' && target !== null
          ? [[manifest.name ?? entry.name, subpath, { ...target }]]
          : [],
      );
    });

describe('workspace package exports', () => {
  it('finds the packages it is meant to check', () => {
    expect(exportEntries().length).toBeGreaterThan(5);
  });

  it.each(exportEntries())(
    '%s %s resolves for require() as well as import',
    (_name, _subpath, conditions) => {
      // The same file either way: a CommonJS consumer must load exactly what
      // an ESM one does.
      expect(conditions['default'] ?? conditions['require']).toBeDefined();
      expect(conditions['default'] ?? conditions['require']).toBe(
        conditions['import'],
      );
    },
  );
});
