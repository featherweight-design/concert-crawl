import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it, expect } from 'vitest'
import { photoTiebreakVerdict } from './resolve-photo-tiebreak.js'

const here = path.dirname(fileURLToPath(import.meta.url))
const packageRoot = path.resolve(here, '../..')

const read = (relative: string): string =>
  readFileSync(path.join(packageRoot, relative), 'utf8')

const snapshot = (
  id: string,
  name: string,
  imageUrl: string | null = null,
) => ({
  id,
  name,
  imageUrl,
})

// These mirror apps/api/src/lib/artist-match.test.ts case for case. The two
// implementations judge the same rule over different inputs (a live search vs. a
// stored snapshot), so a divergence here is the drift the doc comment warns about.
describe('photoTiebreakVerdict', () => {
  it('resolves toward the only exact candidate carrying a photo', () => {
    expect(
      photoTiebreakVerdict('blue october', [
        snapshot('sp1', 'blue october'),
        snapshot('sp2', 'Blue October', 'https://i.scdn.co/image/big'),
      ]),
    ).toEqual({ kind: 'resolved', spotifyArtistId: 'sp2', exactCount: 2 })
  })

  it('resolves a three-way tie when the photo is unique, not sole', () => {
    expect(
      photoTiebreakVerdict('wednesday', [
        snapshot('sp1', 'Wednesday'),
        snapshot('sp2', 'WEDNESDAY', 'https://i.scdn.co/image/one'),
        snapshot('sp3', 'wednesday'),
      ]),
    ).toEqual({ kind: 'resolved', spotifyArtistId: 'sp2', exactCount: 3 })
  })

  it('leaves two photographed namesakes for a human', () => {
    expect(
      photoTiebreakVerdict('nirvana', [
        snapshot('sp1', 'Nirvana', 'https://i.scdn.co/image/one'),
        snapshot('sp2', 'NIRVANA', 'https://i.scdn.co/image/two'),
      ]),
    ).toEqual({ kind: 'skipped', reason: 'several-photographed-candidates' })
  })

  it('leaves a tie no candidate can break', () => {
    expect(
      photoTiebreakVerdict('nirvana', [
        snapshot('sp1', 'Nirvana'),
        snapshot('sp2', 'NIRVANA'),
      ]),
    ).toEqual({ kind: 'skipped', reason: 'no-photographed-candidate' })
  })

  it('skips a snapshot whose candidates never matched the name exactly', () => {
    expect(
      photoTiebreakVerdict('beatles', [
        snapshot('sp1', 'The Beatles', 'https://i.scdn.co/image/one'),
      ]),
    ).toEqual({ kind: 'skipped', reason: 'no-exact-name-match' })
  })

  it('skips a lone exact hit rather than resolving what was never a tie', () => {
    expect(
      photoTiebreakVerdict('khruangbin', [
        snapshot('sp1', 'Khruangbin', 'https://i.scdn.co/image/one'),
        snapshot('sp2', 'Khruangbin Tribute Band'),
      ]),
    ).toEqual({ kind: 'skipped', reason: 'single-exact-candidate' })
  })

  it('skips an empty snapshot', () => {
    expect(photoTiebreakVerdict('khruangbin', [])).toEqual({
      kind: 'skipped',
      reason: 'no-exact-name-match',
    })
  })
})

// Writing settles which Spotify identity a public artist page embeds, so a
// regression flipping the default would repoint pages before anyone read a sample.
describe('resolve-photo-tiebreak CLI entry', () => {
  it('is exposed as a package script', () => {
    const manifest: unknown = JSON.parse(read('package.json'))
    expect(manifest).toMatchObject({
      scripts: {
        'db:resolve-photo-tiebreak':
          'tsx src/scripts/run-resolve-photo-tiebreak.ts',
      },
    })
  })

  it('defaults to a dry run and needs --apply to write', () => {
    const source = read('src/scripts/run-resolve-photo-tiebreak.ts')
    expect(source).toMatch(
      /const\s+dryRun\s*=\s*!process\.argv\.includes\('--apply'\)/,
    )
  })

  // A limit that parses to undefined walks the whole queue against whatever
  // DATABASE_URL points at, so both the accepted form and the rejected one are
  // asserted rather than left to the reader.
  it('takes --limit=<n> and refuses the space-separated form', () => {
    const source = read('src/scripts/run-resolve-photo-tiebreak.ts')
    expect(source).toMatch(/startsWith\('--limit='\)/)
    expect(source).toMatch(/argv\.includes\('--limit'\)/)
  })

  it('only runs when it is the process entrypoint', () => {
    const source = read('src/scripts/run-resolve-photo-tiebreak.ts')
    expect(source).toMatch(
      /if\s*\(\s*isEntrypoint\(\)\s*\)\s*\{\s*\n\s*main\(\)/,
    )
  })
})
