/**
 * Concert Crawl — synthetic staging generator: user_profiles.
 *
 * Inserts one profile row per fixture user. Rows are designed to be
 * layout-hostile: handles are long (seededHandle_ + 40-char slug), some
 * users have no city, and theme values are spread across the full enum.
 *
 * All random draws go through deps.rng — never Math.random(). Same seed
 * always produces the same row array.
 */

import { userProfiles } from '../../../packages/db/src/schema/index.js'
import type { DrizzleWriteDb } from '../sync-venues.js'
import type { createRng } from '../seeded-rng.js'

export type GeneratorDeps = {
  staging: DrizzleWriteDb
  fixtureUserIds: readonly string[]
  eventIds: readonly string[]
  rng: ReturnType<typeof createRng>
}

export type GenResult = { inserted: number }

const SLUG_CHARS = 'abcdefghijklmnopqrstuvwxyz0123456789' as const
const SLUG_CHAR_ARRAY = SLUG_CHARS.split('')

const THEMES = [
  'electric',
  'jade',
  'light',
  'pulse',
  'forge',
  'bluenote',
  'drip',
  'cedar',
  'gloss',
] as const

const CITIES = [
  'Denver, CO',
  'Boulder, CO',
  'Aurora, CO',
  'Fort Collins, CO',
  'Colorado Springs, CO',
] as const

/** Deterministically generate a 40-char lowercase-alphanumeric slug. */
function makeSlug(rng: ReturnType<typeof createRng>): string {
  let slug = ''
  for (let idx = 0; idx < 40; idx++) {
    slug += rng.pick(SLUG_CHAR_ARRAY)
  }
  return slug
}

export const generateUserProfiles = async (
  deps: GeneratorDeps,
): Promise<GenResult> => {
  const { staging, fixtureUserIds, rng } = deps

  const rows = fixtureUserIds.map((userId) => {
    const handle = 'seededHandle_' + makeSlug(rng)
    // ~40% chance of null city for layout variety
    const city = rng.int(0, 9) < 4 ? null : rng.pick(CITIES)
    const theme = rng.pick(THEMES)

    return {
      userId,
      handle,
      city,
      theme,
    }
  })

  await staging.insert(userProfiles).values(rows)

  return { inserted: rows.length }
}
