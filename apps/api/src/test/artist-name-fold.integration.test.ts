import { describe, expect, it } from 'vitest';
import { sql } from 'drizzle-orm';
import { normalizeArtistName } from '@concert-crawl/types';
import { foldedArtistName } from '@concert-crawl/db/scripts/artist-name-fold';
import { testDb } from './helpers/db.js';

// The SQL fold pairs raw headliners with canonical names that JS produced, so
// any drift between the two is a silent failure to pair. Pinned against a real
// Postgres because the risky parts (NFD, locale-dependent lower and
// [[:space:]]) only exist there.
describe('foldedArtistName parity with normalizeArtistName', () => {
  it.each([
    'Clipse',
    'J.I.D',
    'Beyoncé',
    'MANÁ',
    'Røyksopp',
    'Sigur Rós',
    'Mötley Crüe',
    'Łona',
    'Æther Realm',
    'Thee   Sacred  Souls',
    'Thee Sacred Souls',
    'Thee Sacred　Souls ',
    '  Kokoroko ',
    'Simon & Garfunkel',
  ])('folds %j exactly as the JS does', async (input) => {
    const rows = await testDb.execute<{ folded: string }>(
      sql`SELECT ${foldedArtistName('input.value')} AS folded FROM (SELECT ${input}::text AS value) AS input`,
    );
    expect([...rows][0]?.folded).toBe(normalizeArtistName(input).trim());
  });
});
