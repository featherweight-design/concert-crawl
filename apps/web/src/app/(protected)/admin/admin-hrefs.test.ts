/**
 * Drift guard: every `/admin/...` path written in the web source resolves to
 * an admin page or route handler. "Open the show" once linked to
 * `/admin/events/<id>`, which had no page, and 404'd from two surfaces.
 *
 * The scan reads every string and template literal that starts with `/admin`
 * in non-test source, drops any query or hash, treats each `${…}` as a dynamic
 * segment, and matches it against the app router's tree (route groups
 * dropped, `[param]` matching any segment).
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { describe, expect, it } from 'vitest';

const SRC = join(import.meta.dirname, '..', '..', '..');
const APP = join(SRC, 'app');

/**
 * Literals that are not links. Each names why.
 * - `/admin/operations`: the sidebar's active-state prefix for the Operations
 *   section (`shell/nav.ts`), which has no index page of its own.
 */
const NOT_LINKS = new Set(['/admin/operations']);

const filesUnder = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    return entry.isDirectory() ? filesUnder(full) : [full];
  });

const ROUTES: string[][] = filesUnder(APP)
  .filter((file) => /[\\/](page|route)\.tsx?$/.test(file))
  .map((file) =>
    relative(APP, file)
      .split(sep)
      .slice(0, -1)
      .filter((segment) => !/^\(.*\)$/.test(segment)),
  )
  .filter((segments) => segments[0] === 'admin');

const resolves = (segments: string[]): boolean =>
  ROUTES.some(
    (route) =>
      route.length === segments.length &&
      route.every(
        (segment, i) => /^\[.+\]$/.test(segment) || segment === segments[i],
      ),
  );

const HREF = /(['"`])(\/admin(?:\/[^'"`?#\s]*)?)/g;

const adminPathsInSource = (): { file: string; path: string }[] =>
  filesUnder(SRC)
    .filter((file) => /\.tsx?$/.test(file) && !/\.test\.tsx?$/.test(file))
    .flatMap((file) =>
      [...readFileSync(file, 'utf8').matchAll(HREF)].map((match) => ({
        file: relative(SRC, file),
        path: match[2] ?? '',
      })),
    );

const segmentsOf = (path: string): string[] =>
  path
    .replace(/\$\{[^}]*\}/g, ':param')
    .replace(/\/$/, '')
    .split('/')
    .filter(Boolean);

describe('admin hrefs', () => {
  it('finds the admin pages and some admin paths to check', () => {
    expect(ROUTES.length).toBeGreaterThan(10);
    expect(adminPathsInSource().length).toBeGreaterThan(20);
  });

  it('resolves the bare event path, which redirects to its editor', () => {
    expect(resolves(segmentsOf('/admin/events/e9'))).toBe(true);
  });

  it('every /admin path in the source resolves to a page', () => {
    const misses = adminPathsInSource()
      .filter(({ path }) => !NOT_LINKS.has(path))
      .filter(({ path }) => !resolves(segmentsOf(path)))
      .map(({ file, path }) => `${file}: ${path}`);
    expect(misses).toEqual([]);
  });

  it('every NOT_LINKS entry is still in the source and still has no page', () => {
    const paths = new Set(adminPathsInSource().map(({ path }) => path));
    for (const path of NOT_LINKS) {
      expect(paths.has(path)).toBe(true);
      expect(resolves(segmentsOf(path))).toBe(false);
    }
  });
});
