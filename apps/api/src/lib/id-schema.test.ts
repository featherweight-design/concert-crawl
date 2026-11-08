import { describe, expect, it } from 'vitest';

import { idSchema } from './id-schema.js';

describe('idSchema', () => {
  // Staging's seeded crews use these IDs (scripts/seed-staging/fixture-users.ts).
  // Their version nibble is 0, which a strict RFC 9562 check rejects, so this
  // pins the shape-only rule across the Zod 4 upgrade.
  it.each([
    '5eeded00-0000-0000-0000-000000000001',
    '5eeded00-0000-0000-0000-000000000004',
  ])('accepts the seeded fixture ID %s', (id) => {
    expect(idSchema.safeParse(id).success).toBe(true);
  });

  it('accepts a random v4 UUID', () => {
    expect(idSchema.safeParse(crypto.randomUUID()).success).toBe(true);
  });

  it.each(['', 'not-an-id', '5eeded00-0000-0000-0000-00000000000', '1 OR 1=1'])(
    'rejects %j',
    (id) => {
      expect(idSchema.safeParse(id).success).toBe(false);
    },
  );
});
