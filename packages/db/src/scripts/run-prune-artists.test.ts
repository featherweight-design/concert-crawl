import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it, expect } from 'vitest'

const here = path.dirname(fileURLToPath(import.meta.url))
const packageRoot = path.resolve(here, '../..')

const read = (relative: string): string =>
  readFileSync(path.join(packageRoot, relative), 'utf8')

// Deleting is opt-in, and a regression that flipped the default would be
// invisible until it had already reaped a production table. Pin the guard.
describe('prune-artists CLI entry', () => {
  it('is exposed as a package script', () => {
    const manifest: unknown = JSON.parse(read('package.json'))
    expect(manifest).toMatchObject({
      scripts: { 'db:prune-artists': 'tsx src/scripts/run-prune-artists.ts' },
    })
  })

  it('defaults to a dry run and needs --apply to delete', () => {
    const source = read('src/scripts/run-prune-artists.ts')
    expect(source).toMatch(
      /const\s+dryRun\s*=\s*!process\.argv\.includes\('--apply'\)/,
    )
  })

  it('only runs when it is the process entrypoint', () => {
    const source = read('src/scripts/run-prune-artists.ts')
    expect(source).toMatch(
      /if\s*\(\s*isEntrypoint\(\)\s*\)\s*\{\s*\n\s*main\(\)/,
    )
  })
})
