/**
 * Locks the display name of the given artists, so the name repair
 * (`repair-artist-names`, Spotify respell included) never rewrites it.
 *
 * The admin rename route sets the lock on every rename from now on. This is
 * for the names an admin fixed by hand before the lock existed (`MGMT`,
 * `bbno$`): it records that the current name is the admin's answer, without
 * changing it.
 *
 * Idempotent: an already-locked row keeps its original lock time.
 */

import { inArray } from 'drizzle-orm';
import type { Database } from '../client.js';
import { artists } from '../schema/artists.js';
import { auditLog } from '../schema/users.js';

/** The `audit_log.actor_id` for this script's writes: an operator ran it by hand. */
export const LOCK_NAMES_ACTOR = 'system:lock-artist-names';
export const LOCK_NAMES_AUDIT_ACTION = 'artist.name.lock';

export interface LockArtistNamesResult {
  /** The rows the slugs named, with the name each one keeps. */
  found: { slug: string; name: string; alreadyLocked: boolean }[];
  /** Slugs that name no artist. Nothing is written for them. */
  missing: string[];
  /** Rows newly locked. Zero on a dry run. */
  locked: number;
}

export async function lockArtistNames(
  database: Database,
  options: { slugs: string[]; dryRun: boolean },
): Promise<LockArtistNamesResult> {
  const slugs = [...new Set(options.slugs)];
  if (slugs.length === 0) return { found: [], missing: [], locked: 0 };

  // Read and write in one transaction, with the rows locked, so the report
  // describes exactly the rows the write saw.
  return database.transaction(async (tx) => {
    const rows = await tx
      .select({
        id: artists.id,
        slug: artists.slug,
        name: artists.name,
        nameLockedAt: artists.nameLockedAt,
      })
      .from(artists)
      .where(inArray(artists.slug, slugs))
      .for('update');

    const found = rows.map((row) => ({
      slug: row.slug,
      name: row.name,
      alreadyLocked: row.nameLockedAt !== null,
    }));
    const seen = new Set(rows.map((row) => row.slug));
    const missing = slugs.filter((slug) => !seen.has(slug));
    const toLock = rows.filter((row) => row.nameLockedAt === null);

    if (options.dryRun || toLock.length === 0) {
      return { found, missing, locked: 0 };
    }

    const now = new Date();
    await tx
      .update(artists)
      .set({ nameLockedAt: now, updatedAt: now })
      .where(
        inArray(
          artists.id,
          toLock.map((row) => row.id),
        ),
      );
    await tx.insert(auditLog).values(
      toLock.map((row) => ({
        actorId: LOCK_NAMES_ACTOR,
        action: LOCK_NAMES_AUDIT_ACTION,
        targetId: row.id,
        metadata: { slug: row.slug, name: row.name },
      })),
    );
    return { found, missing, locked: toLock.length };
  });
}
