// Crew identity carried on a notification row (#1226 PR-7).
//
// The fan-out in apps/api/src/lib/crew-notifications.ts stamps every `crew.*`
// row with `{ crewId, crewName, patchSalt }`, which is what lets the bell draw
// the crew's own patch and name the crew in the eyebrow instead of the generic
// category label.
//
// GUARDED, NEVER TRUSTED. `metadata` is a free-form JSON column: a legacy row,
// a hand-inserted one, or a future writer can all reach here without the blob.
// A row that fails the guard falls back to the ordinary category tile and
// label — degraded, never dropped, matching how the panel treats an unknown
// category and a hostile actionUrl.

const CREW_CATEGORY_PREFIX = 'crew.'

export interface CrewRowIdentity {
  crewId: string
  crewName: string
  /** Reroll counter. Absent on a malformed blob, which draws the salt-0 patch. */
  patchSalt: number
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const nonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim() !== ''

/**
 * Both halves have to hold: the category says "this is crew news" and the blob
 * says which crew. A `crew.*` row without usable identity is NOT crew-rendered
 * — a patch drawn from a missing id would be a stable-looking emblem for a
 * crew that isn't the one in the title.
 */
export const crewRowIdentity = (
  category: string,
  metadata: Record<string, unknown> | null,
): CrewRowIdentity | null => {
  if (!category.startsWith(CREW_CATEGORY_PREFIX)) return null
  if (!isRecord(metadata)) return null
  const { crewId, crewName, patchSalt } = metadata
  if (!nonEmptyString(crewId) || !nonEmptyString(crewName)) return null
  return {
    crewId,
    crewName,
    // Salt only ever moves by whole steps, so a non-integer is as broken as a
    // missing one. Either way the salt-0 patch is a real patch, not an error.
    patchSalt:
      typeof patchSalt === 'number' && Number.isInteger(patchSalt)
        ? patchSalt
        : 0,
  }
}
