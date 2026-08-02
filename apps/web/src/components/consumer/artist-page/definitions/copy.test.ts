import { readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import { ARTIST_COPY } from './copy'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry)
    return statSync(full).isDirectory() ? walk(full) : [full]
  })

const sourceFiles = () => walk(ROOT).filter((file) => /\.tsx?$/.test(file))

/**
 * A file that asserts the ban has to name the banned words to do it. Any such
 * file carries this sentinel and excludes itself — a bare filename allow-list
 * silently stops covering a file the day it is renamed.
 */
const BAN_CHECK_SENTINEL = 'VOCABULARY-BAN-CHECK'
const assertsTheBan = (body: string) => body.includes(BAN_CHECK_SENTINEL)

// VOCABULARY-BAN-CHECK
describe('artist page vocabulary', () => {
  // A show is WATCHED; an artist is FOLLOWED. The watching affordance is an
  // EYE — no heart icon exists anywhere in this product, and "Saved" /
  // "Favorites" are not concepts here.
  it('never mentions a heart', () => {
    for (const file of sourceFiles()) {
      const body = readFileSync(file, 'utf8')
      if (assertsTheBan(body)) continue
      expect(body.toLowerCase(), file).not.toContain('heart')
    }
  })

  it('never says Saved or Favorites', () => {
    for (const file of sourceFiles()) {
      const body = readFileSync(file, 'utf8')
      if (assertsTheBan(body)) continue
      expect(body, file).not.toMatch(/\bSaved\b/)
      expect(body, file).not.toMatch(/\bFavou?rites?\b/i)
    }
  })

  it('never labels an artist relationship as Watching', () => {
    // "Watching" is legitimate as the DESTINATION a follow feeds ("lands in
    // your Watching") — it is never the name of the artist relationship, so
    // every occurrence must be possessive.
    const artistFacing = [
      ARTIST_COPY.follow,
      ARTIST_COPY.following,
      ARTIST_COPY.followPitch,
      ARTIST_COPY.followPitchActive,
      ARTIST_COPY.followAria('Nightjar Choir'),
      ARTIST_COPY.followingAria('Nightjar Choir'),
      ARTIST_COPY.followSignedOutAria('Nightjar Choir'),
    ]
    for (const line of artistFacing) {
      expect(line.replace(/your Watching/g, 'that list')).not.toMatch(
        /\bWatching\b/,
      )
    }
  })
})

describe('ARTIST_COPY', () => {
  it('drops the superseded signed-out follow label', () => {
    expect('followSignedOut' in ARTIST_COPY).toBe(false)
  })

  it('drops the orphaned player loading key', () => {
    expect('playerLoading' in ARTIST_COPY).toBe(false)
  })

  it('pluralises the show count', () => {
    expect(ARTIST_COPY.showCount(1)).toBe('1 show')
    expect(ARTIST_COPY.showCount(13)).toBe('13 shows')
  })

  it('gives the signed-out follow control an honest accessible name', () => {
    expect(ARTIST_COPY.followSignedOutAria('Wax Harbour')).toContain(
      'Wax Harbour',
    )
    expect(ARTIST_COPY.followSignedOutAria('Wax Harbour')).toMatch(/sign in/i)
  })
})
