import { z } from 'zod';

/**
 * The one schema for a row ID taken from a route param, query string or body.
 * Every API route validates IDs through it, so the Zod 4 upgrade changes the
 * rule in one place. Zod 3 checked IDs with `z.string().uuid()`, a plain 8-4-4-4-12
 * hex shape check. Zod 4's `.uuid()` also requires RFC 9562 version and variant
 * bits, which staging's seeded fixture IDs (`5eeded00-0000-0000-0000-…`) do not
 * have, so on Zod 4 this is `z.guid()`, which keeps the shape check.
 *
 * Lowercased: Postgres reads a uuid in any case and returns it lowercase, so
 * two spellings of one id must compare equal in code too (a mixed-case copy
 * of one id passed the merge's "must differ" check).
 */
export const idSchema = z.guid().transform((id) => id.toLowerCase());
