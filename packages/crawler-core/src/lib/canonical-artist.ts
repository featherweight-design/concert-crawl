/**
 * Re-export shim. The implementation moved to
 * `packages/types/src/canonical-artist.ts` so `packages/db` can canonicalize
 * without depending on crawler-core — crawler-core already depends on db, so
 * the reverse edge would be a workspace build cycle. That cycle is exactly why
 * the seed shipped events with an empty `canonical_artist`, which silently
 * emptied the `artists` projection in every seeded environment.
 *
 * This file stays so the `@concert-crawl/crawler-core/canonical` subpath export
 * and every existing import site keep resolving unchanged.
 */

export {
  canonicalizeArtist,
  canonicalizeSupporting,
} from '@concert-crawl/types'
