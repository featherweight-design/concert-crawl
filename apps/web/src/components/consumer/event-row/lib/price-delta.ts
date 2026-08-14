export type DeltaClass = 'drop' | 'spike' | 'flat'

/**
 * A dollar or two either way is noise — ticket prices jitter by that much
 * without anything having happened. Anything inside the dead band reports as
 * flat rather than earning an arrow, which is reserved for a real move.
 */
const FLAT_BAND = 2

export function deltaClass(delta: number): DeltaClass {
  if (Math.abs(delta) < FLAT_BAND) return 'flat'
  return delta < 0 ? 'drop' : 'spike'
}
