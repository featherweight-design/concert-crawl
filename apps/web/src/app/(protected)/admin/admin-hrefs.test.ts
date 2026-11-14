/**
 * Drift guard: every `/admin/...` path written in the web source resolves to
 * an admin page or route handler. "Open the show" once linked to
 * `/admin/events/<id>`, which had no page, and 404'd from two surfaces.
 *
 * The scan reads every string and template literal that starts with `/admin`
 * in non-test source, drops any query or hash, treats each whole-segment
 * `${…}` as a dynamic segment, and matches it against the app router's tree.
 *
 * Not checked (each needs code the scan cannot evaluate): a path built by
 * concatenation (`'/admin/' + slug`), one whose literal starts with an
 * expression (`` `${base}/admin/x` ``), and a segment only partly dynamic
 * (`` `/admin/x-${id}` ``). Those are skipped, not passed.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { describe, expect, it } from 'vitest';

const SRC = join(import.meta.dirname, '..', '..', '..');
const APP = join(SRC, 'app');

/** Literals that are not links. Each names why. (None today.) */
const NOT_LINKS = new Set<string>([]);

const DYNAMIC = ':param';

const filesUnder = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    return entry.isDirectory() ? filesUnder(full) : [full];
  });

/** A route group `(name)` or a parallel slot `@name`: no URL segment. */
const isUrlless = (segment: string): boolean =>
  /^\([^.].*\)$/.test(segment) || segment.startsWith('@');

/**
 * The URL shape of each admin page and route handler. A private folder
 * (`_name`) and an intercepting route (`(.)name`) are not addressable, so
 * neither counts.
 */
const ROUTES: string[][] = filesUnder(APP)
  .filter((file) => /[\\/](page|route)\.tsx?$/.test(file))
  .map((file) => relative(APP, file).split(sep).slice(0, -1))
  .filter(
    (segments) =>
      !segments.some((seg) => seg.startsWith('_') || /^\(\.+\)/.test(seg)),
  )
  .map((segments) => segments.filter((seg) => !isUrlless(seg)))
  .filter((segments) => segments[0] === 'admin');

const matchesRoute = (route: string[], segments: string[]): boolean => {
  const [head, ...rest] = route;
  if (head === undefined) return segments.length === 0;
  // `[[...x]]` takes zero or more segments, `[...x]` one or more.
  if (/^\[\[\.\.\..+\]\]$/.test(head)) return rest.length === 0;
  if (/^\[\.\.\..+\]$/.test(head)) {
    return rest.length === 0 && segments.length > 0;
  }
  const [first, ...others] = segments;
  if (first === undefined) return false;
  const fits = /^\[.+\]$/.test(head) || head === first;
  return fits && matchesRoute(rest, others);
};

const resolves = (segments: string[]): boolean =>
  ROUTES.some((route) => matchesRoute(route, segments));

// One pattern per quote. A template literal keeps `${…}` whole, quotes and
// spaces inside it included, and stops at its first query or hash.
const LITERALS = [
  /'(\/admin(?:\/[^'?#\s]*)?)/g,
  /"(\/admin(?:\/[^"?#\s]*)?)/g,
  /`(\/admin(?:\/(?:[^`$?#\s]|\$\{[^}]*\})*)?)/g,
];

const adminPathsInSource = (): { file: string; path: string }[] =>
  filesUnder(SRC)
    .filter((file) => /\.tsx?$/.test(file) && !/\.test\.tsx?$/.test(file))
    .flatMap((file) => {
      const text = readFileSync(file, 'utf8');
      return LITERALS.flatMap((pattern) =>
        [...text.matchAll(pattern)].map((match) => ({
          file: relative(SRC, file),
          path: match[1] ?? '',
        })),
      );
    });

/** The path's segments, or `null` when a segment is only partly dynamic. */
const segmentsOf = (path: string): string[] | null => {
  const segments = path
    .replace(/\/$/, '')
    .split('/')
    .filter(Boolean)
    .map((seg) => (/^\$\{[^}]*\}$/.test(seg) ? DYNAMIC : seg));
  return segments.some((seg) => seg.includes('${')) ? null : segments;
};

const checked = () =>
  adminPathsInSource()
    .filter(({ path }) => !NOT_LINKS.has(path))
    .map((entry) => ({ ...entry, segments: segmentsOf(entry.path) }));

describe('admin hrefs', () => {
  it('finds the pages and the links it is meant to check', () => {
    const paths = new Set(adminPathsInSource().map(({ path }) => path));
    // The editor's own href helper, the sidebar, and a nested dynamic route.
    expect(paths).toContain('/admin/events/${eventId}/edit');
    expect(paths).toContain('/admin/venues');
    expect(resolves(['admin', 'venues', DYNAMIC, 'inspect', DYNAMIC])).toBe(
      true,
    );
  });

  it('resolves the bare event path, which redirects to its editor', () => {
    expect(resolves(['admin', 'events', DYNAMIC])).toBe(true);
  });

  it('every /admin path in the source resolves to a page', () => {
    const misses = checked()
      .filter(({ segments }) => segments !== null && !resolves(segments))
      .map(({ file, path }) => `${file}: ${path}`);
    expect(misses).toEqual([]);
  });

  it('every NOT_LINKS entry is still in the source and still has no page', () => {
    const paths = new Set(adminPathsInSource().map(({ path }) => path));
    for (const path of NOT_LINKS) {
      expect(paths.has(path)).toBe(true);
      expect(resolves(segmentsOf(path) ?? [])).toBe(false);
    }
  });
});
