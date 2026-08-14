import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it, expect } from 'vitest'

const here = path.dirname(fileURLToPath(import.meta.url))
const packageRoot = path.resolve(here, '../..')

const read = (relative: string): string =>
  readFileSync(path.join(packageRoot, relative), 'utf8')

// Writing is opt-in, and a regression flipping the default would rewrite public
// artist identities before anyone had read a single agreement. Pin the guard.
describe('musicbrainz-disambiguate CLI entry', () => {
  it('is exposed as a package script', () => {
    const manifest: unknown = JSON.parse(read('package.json'))
    expect(manifest).toMatchObject({
      scripts: {
        'db:musicbrainz-disambiguate':
          'tsx src/scripts/run-musicbrainz-disambiguate.ts',
      },
    })
  })

  it('defaults to a dry run and needs --apply to write', () => {
    const source = read('src/scripts/run-musicbrainz-disambiguate.ts')
    expect(source).toMatch(
      /const\s+dryRun\s*=\s*!process\.argv\.includes\('--apply'\)/,
    )
  })

  it('only runs when it is the process entrypoint', () => {
    const source = read('src/scripts/run-musicbrainz-disambiguate.ts')
    expect(source).toMatch(
      /if\s*\(\s*isEntrypoint\(\)\s*\)\s*\{\s*\n\s*main\(\)/,
    )
  })
})
