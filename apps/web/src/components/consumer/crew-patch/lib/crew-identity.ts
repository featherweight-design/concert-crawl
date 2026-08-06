/**
 * Crew patch identity.
 *
 * A crew's emblem is generated, not stored: every visual layer is read from an
 * independent bit slice of one FNV-1a hash of `(crewId, patchSalt)`. Same pair
 * in, same patch out, on any device and any render. The pair is the contract —
 * changing the hash, the input string, or a slice offset silently re-rolls
 * every crew's artwork, so all four are covered by tests.
 */

export const CREW_CHORDS = ['c0', 'c1', 'c2', 'c3', 'c4'] as const
export const CREW_WEAVES = ['twill', 'warp', 'braid', 'knot'] as const
export const CREW_SIGILS = [
  'triad',
  'bloom',
  'beacon',
  'keystone',
  'tangle',
] as const
export const CREW_GROUNDS = ['halo', 'wedges', 'bands'] as const

export type CrewChord = (typeof CREW_CHORDS)[number]
export type CrewWeave = (typeof CREW_WEAVES)[number]
export type CrewSigil = (typeof CREW_SIGILS)[number]
export type CrewGround = (typeof CREW_GROUNDS)[number]

export interface CrewIdentity {
  chord: CrewChord
  weave: CrewWeave
  sigil: CrewSigil
  ground: CrewGround
  /** Rotation applied to the weave layer, in degrees: one of 0, 60 … 300. */
  spin: number
}

/** Token role pair per chord. No hex: the patch reads the active theme. */
export const CREW_CHORD_TOKENS: Record<
  CrewChord,
  { primary: string; secondary: string }
> = {
  c0: { primary: '--signal', secondary: '--accent' },
  c1: { primary: '--accent', secondary: '--signal' },
  c2: { primary: '--signal', secondary: '--success' },
  c3: { primary: '--accent', secondary: '--warning' },
  c4: { primary: '--success', secondary: '--accent' },
}

const FNV_OFFSET_BASIS = 0x811c9dc5
const FNV_PRIME = 0x01000193

export const crewHash = (crewId: string, salt = 0): number => {
  let hash = FNV_OFFSET_BASIS >>> 0
  const input = `crew:${String(crewId || '')}:${String(salt || 0)}`
  for (let i = 0; i < input.length; i++) {
    hash = (hash ^ input.charCodeAt(i)) >>> 0
    hash = Math.imul(hash, FNV_PRIME) >>> 0
  }
  return hash >>> 0
}

/**
 * A modulo index is always in range, but `noUncheckedIndexedAccess` can't know
 * that, so the first element is the total-function fallback rather than a cast.
 */
const pick = <T>(options: readonly [T, ...T[]], index: number): T =>
  options[index % options.length] ?? options[0]

export const crewIdentity = (crewId: string, salt = 0): CrewIdentity => {
  const hash = crewHash(crewId, salt)
  return {
    chord: pick(CREW_CHORDS, hash),
    weave: pick(CREW_WEAVES, hash >>> 5),
    sigil: pick(CREW_SIGILS, hash >>> 11),
    ground: pick(CREW_GROUNDS, hash >>> 17),
    spin: ((hash >>> 21) % 6) * 60,
  }
}

/**
 * Next salt that produces a patch a person would call different: the weave
 * must change outright, and at most `maxShared` of sigil / ground / chord may
 * carry over. Scans 60 candidates; if none clears both rules it steps by one
 * rather than refusing to reroll.
 */
export const nextPatchSalt = (
  crewId: string,
  currentSalt = 0,
  maxShared = 1,
): number => {
  const current = crewIdentity(crewId, currentSalt)
  for (let salt = currentSalt + 1; salt <= currentSalt + 60; salt++) {
    const candidate = crewIdentity(crewId, salt)
    if (candidate.weave === current.weave) continue
    const shared = [
      candidate.sigil === current.sigil,
      candidate.ground === current.ground,
      candidate.chord === current.chord,
    ].filter(Boolean).length
    if (shared <= maxShared) return salt
  }
  return currentSalt + 1
}
