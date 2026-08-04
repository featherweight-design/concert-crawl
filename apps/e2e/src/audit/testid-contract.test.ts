import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

// Playwright specs only run against a deployed environment, so a selector
// that stops matching anything fails in CI-after-merge rather than on the PR
// that broke it. #1436 renamed EventCard to EventRow; twelve
// `[data-testid="event-card"]` selectors kept pointing at markup no
// component rendered any more. The staging suite went red, prod smoke
// tripped auto-rollback, and prod then sat frozen for ~17h.
//
// This runs in unit-test CI on the PR itself and needs no deployment: every
// testid a spec selects on must be emitted somewhere in the web source.

const REPO_ROOT = resolve(__dirname, '../../../..')
const SPEC_DIRS = ['apps/e2e/src/e2e', 'apps/e2e/src/smoke']
const WEB_SRC = 'apps/web/src'

const TESTID_SELECTOR = /\[data-testid="([^"]+)"\]/g

// Only literal forms are resolvable by static analysis:
//   data-testid="event-row"
//   data-testid={cond ? 'venue-chip' : undefined}
//   data-testid={`tier-card-${tier.key}`}
// The template form yields a prefix rather than a full id, so it is matched
// by prefix below — otherwise every dynamic testid reads as an orphan.
//
// Ids passed through an identifier (`data-testid={copy.testId}`) cannot be
// resolved without evaluating the module, so they contribute nothing. That
// makes the check under-strict, never over-strict for the rendered side —
// but a spec selecting on such an id would report a FALSE orphan. If that
// happens, give the component a literal testid rather than loosening this.
const TESTID_ATTRIBUTE = /data-testid="([^"]+)"/g
const TESTID_IN_EXPRESSION = /data-testid=\{([^}]*(?:\{[^}]*\}[^}]*)*)\}/g
// Strings on the right of a comparison are operands, not ids —
// `key === 'where' ? 'venue-chip' : undefined` renders `venue-chip`, never
// `where`. Admitting operands would let a spec select on any string that
// happens to appear in a testid expression.
const COMPARISON_OPERAND = /[=!]==?\s*(['"])[^'"]*\1/g
const QUOTED_STRING = /'([^']+)'|"([^"]+)"/g
const TEMPLATE_PREFIX = /`([^`$]+)\$\{/g

const walk = (dir: string, match: (path: string) => boolean): string[] => {
  const out: string[] = []
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === '.next') continue
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) out.push(...walk(full, match))
    else if (match(full)) out.push(full)
  }
  return out
}

const collect = (files: string[], pattern: RegExp): Map<string, string[]> => {
  const found = new Map<string, string[]>()
  for (const file of files) {
    const source = readFileSync(file, 'utf8')
    for (const [, testid] of source.matchAll(pattern)) {
      if (!testid) continue
      const seen = found.get(testid) ?? []
      seen.push(file.replace(`${REPO_ROOT}/`, ''))
      found.set(testid, seen)
    }
  }
  return found
}

const collectRendered = (
  files: string[],
): { exact: Set<string>; prefixes: string[] } => {
  const exact = new Set<string>()
  const prefixes: string[] = []
  for (const file of files) {
    const source = readFileSync(file, 'utf8')
    for (const [, testid] of source.matchAll(TESTID_ATTRIBUTE)) {
      if (testid) exact.add(testid)
    }
    for (const [, expression] of source.matchAll(TESTID_IN_EXPRESSION)) {
      if (!expression) continue
      const values = expression.replace(COMPARISON_OPERAND, '')
      for (const [, single, double] of values.matchAll(QUOTED_STRING)) {
        const literal = single ?? double
        if (literal) exact.add(literal)
      }
      for (const [, prefix] of values.matchAll(TEMPLATE_PREFIX)) {
        if (prefix) prefixes.push(prefix)
      }
    }
  }
  return { exact, prefixes }
}

describe('e2e testid contract', () => {
  const specFiles = SPEC_DIRS.flatMap((dir) =>
    walk(join(REPO_ROOT, dir), (path) => path.endsWith('.spec.ts')),
  )
  // Test files are excluded deliberately: a testid that only ever appears on
  // a mock in a `.test.tsx` is not rendered by the running app, and counting
  // it here would let exactly the drift this guard exists to catch pass.
  const webFiles = walk(
    join(REPO_ROOT, WEB_SRC),
    (path) =>
      (path.endsWith('.tsx') || path.endsWith('.ts')) &&
      !/\.test\.tsx?$/.test(path) &&
      !path.includes('__tests__'),
  )

  const selected = collect(specFiles, TESTID_SELECTOR)
  const rendered = collectRendered(webFiles)
  const isRendered = (testid: string): boolean =>
    rendered.exact.has(testid) ||
    rendered.prefixes.some((prefix) => testid.startsWith(prefix))

  it('finds specs to check', () => {
    // A refactor that moves the specs would otherwise make this suite pass
    // by checking nothing at all.
    expect(specFiles.length).toBeGreaterThan(0)
    expect(selected.size).toBeGreaterThan(0)
  })

  it('every testid the specs select is rendered by the web app', () => {
    const orphans = [...selected.entries()]
      .filter(([testid]) => !isRendered(testid))
      .map(([testid, files]) => `${testid} (used in ${files.join(', ')})`)

    expect(orphans).toEqual([])
  })
})
