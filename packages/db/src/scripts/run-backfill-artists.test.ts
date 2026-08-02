import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it, expect } from 'vitest'

const here = path.dirname(fileURLToPath(import.meta.url))
const packageRoot = path.resolve(here, '../..')

const read = (relative: string): string =>
  readFileSync(path.join(packageRoot, relative), 'utf8')

// The `artists` table shipped empty to staging and prod: `backfillArtists` had
// no caller outside `seed.ts`, which only ever runs locally, so every
// `/artists/:slug` 404'd in both deployed environments. These guard the caller.
describe('backfill-artists CLI entry', () => {
  it('is exposed as a package script', () => {
    const manifest: unknown = JSON.parse(read('package.json'))
    expect(manifest).toMatchObject({
      scripts: {
        'db:backfill-artists': 'tsx src/scripts/run-backfill-artists.ts',
      },
    })
  })

  it('invokes backfillArtists against the real database handle', () => {
    const source = read('src/scripts/run-backfill-artists.ts')
    expect(source).toMatch(/import\s*\{\s*db\s*\}\s*from\s*'\.\.\/client\.js'/)
    expect(source).toMatch(/backfillArtists\(\s*db\s*\)/)
  })

  it('only runs when it is the process entrypoint', () => {
    const source = read('src/scripts/run-backfill-artists.ts')
    // A bare top-level `main()` would backfill — and then `process.exit` —
    // on any import.
    expect(source).toMatch(
      /if\s*\(\s*isEntrypoint\(\)\s*\)\s*\{\s*\n\s*main\(\)/,
    )
  })
})
