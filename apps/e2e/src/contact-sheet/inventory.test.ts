import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import { inventorySchema } from './inventory.js';

// The contact sheet only runs against staging, so an inventory that names a
// route, a board or a key that no longer exists would fail only when someone
// next walks it. This runs in unit-test CI and needs no deployment.
const REPO_ROOT = resolve(__dirname, '../../../..');
const INVENTORY_DIR = join(REPO_ROOT, 'docs/superpowers/inventories');
const APP_DIR = join(REPO_ROOT, 'apps/web/src/app');

function pageRoutes(dir: string, prefix = ''): string[] {
  const routes: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      // Route groups `(main)` and private folders `_components` add no segment.
      if (entry.startsWith('_')) continue;
      const segment = entry.startsWith('(') ? '' : `/${entry}`;
      routes.push(...pageRoutes(full, prefix + segment));
    } else if (entry === 'page.tsx') {
      routes.push(prefix === '' ? '/' : prefix);
    }
  }
  return routes;
}

const ROUTES = pageRoutes(APP_DIR);
const files = existsSync(INVENTORY_DIR)
  ? readdirSync(INVENTORY_DIR).filter((name) => name.endsWith('.json'))
  : [];

describe('contact-sheet inventories', () => {
  it('finds the inventories', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it.each(files)('%s parses, names real routes and real boards', (name) => {
    const parsed = inventorySchema.safeParse(
      JSON.parse(readFileSync(join(INVENTORY_DIR, name), 'utf8')),
    );
    expect(parsed.error?.issues ?? []).toEqual([]);
    if (!parsed.success) return;
    const inventory = parsed.data;
    for (const row of inventory.rows) {
      expect(ROUTES, `${row.id}: route ${row.route}`).toContain(row.route);
      for (const board of row.boards ?? []) {
        expect(
          existsSync(join(REPO_ROOT, inventory.boardsDir, board)),
          `${row.id}: board ${board}`,
        ).toBe(true);
      }
    }
  });
});
