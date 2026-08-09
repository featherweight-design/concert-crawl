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

/**
 * Every string a user can read that describes what following an artist does —
 * including the two empty-upcoming bodies, which are where the pitch is made
 * hardest and where the false promise survived longest.
 */
const followCopy = () => [
  ARTIST_COPY.follow,
  ARTIST_COPY.following,
  ARTIST_COPY.followPitch,
  ARTIST_COPY.followPitchActive,
  ARTIST_COPY.followSignedOutPitch,
  ARTIST_COPY.emptyBody,
  ARTIST_COPY.emptyBodyFollowing,
  ARTIST_COPY.followAria('Nightjar Choir'),
  ARTIST_COPY.followingAria('Nightjar Choir'),
  ARTIST_COPY.followSignedOutAria('Nightjar Choir'),
]

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

  it('never mentions Watching in follow copy at all', () => {
    // This used to allow "Watching" as the DESTINATION a follow feeds ("lands
    // in your Watching"). The Gate 5 staging walk proved that destination does
    // not exist for a manual follow — the Spotify fan-out only auto-watches
    // `spotify_followed` / `spotify_top` follows, and this button writes
    // `manual` (#1306). So the word is banned outright here, not just as a
    // label for the relationship.
    for (const line of followCopy()) {
      expect(line).not.toMatch(/\bWatching\b/)
    }
  })

  it('never promises that a follow adds shows anywhere on its own', () => {
    // The shape of the old lie, independent of the word "Watching": any claim
    // that shows arrive somewhere without the user coming back to look.
    for (const line of followCopy()) {
      expect(line).not.toMatch(/\blands? in\b/i)
      expect(line).not.toMatch(/\badded to\b/i)
      expect(line).not.toMatch(/without you checking/i)
      expect(line).not.toMatch(/\bon its own\b/i)
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

  it('drops the second absent-player line the pointer clause forced', () => {
    expect('playerNoneSubLast' in ARTIST_COPY).toBe(false)
    expect(ARTIST_COPY.playerNoneSub).not.toContain('below')
  })

  it('does not restate the follow button in the line beneath it', () => {
    expect(ARTIST_COPY.followPitchActive).not.toMatch(
      new RegExp(ARTIST_COPY.following, 'i'),
    )
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
