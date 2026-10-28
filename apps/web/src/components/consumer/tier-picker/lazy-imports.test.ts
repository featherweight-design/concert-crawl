import { readdirSync, readFileSync, statSync } from 'fs'
import { join, relative } from 'path'
import { fileURLToPath } from 'url'
import { describe, expect, it } from 'vitest'

// The sheet pulls Stripe's checkout bundle, so every surface that only opens
// it on demand imports `tier-picker/lazy` (#1332). A static import slips back
// in silently, since both paths type-check and render, so this scans for one.
const SRC = fileURLToPath(new URL('../../../', import.meta.url))

// lazy.ts is the one module that imports the sheet by design, and the plan
// page loads it eagerly through the barrel because checkout is what that page
// is for. Every other file must take `tier-picker/lazy`.
const ALLOWED = new Set([
  'components/consumer/tier-picker/lazy.ts',
  'components/settings/plan/PlanPanel.tsx',
])

// A value import (not `import type`) naming TierPickerSheet from the sheet
// module or the barrel, by alias or relative path.
const STATIC_IMPORT =
  /^import\s+\{[^}]*\bTierPickerSheet\b[^}]*\}\s+from\s+'[^']*tier-picker(?:\/TierPickerSheet|\/index)?'|^import\s+\{[^}]*\bTierPickerSheet\b[^}]*\}\s+from\s+'\.\/(?:TierPickerSheet|index)?'/m

const sourceFiles = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return sourceFiles(path)
    return /\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name) ? [path] : []
  })

describe('TierPickerSheet is loaded on demand', () => {
  it('has no static import outside the tier-picker module', () => {
    const offenders = sourceFiles(SRC)
      .map((path) => relative(SRC, path))
      .filter((rel) => !ALLOWED.has(rel))
      .filter((rel) => STATIC_IMPORT.test(readFileSync(join(SRC, rel), 'utf8')))
    expect(offenders).toEqual([])
  })
})
