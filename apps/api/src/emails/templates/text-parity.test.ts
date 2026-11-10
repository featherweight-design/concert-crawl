import { describe, expect, it } from 'vitest';

import { buildTestEmail } from '../test-fixtures.js';
import type { TestEmailKey } from '../test-fixtures.js';

const RULE = '----------------------------------------';

// The footer note each template passes to the HTML footerRow. Plain-text
// readers used to lose all but the digest's (#1386).
const FOOTER_NOTES: ReadonlyArray<[TestEmailKey, string]> = [
  [
    'spotify_digest',
    'You get this because you follow artists and turned on the weekly digest.',
  ],
];

describe('plain-text emails match their HTML', () => {
  it.each(FOOTER_NOTES)(
    '%s carries its footer note above the footer rule, once',
    (key, note) => {
      const { html, text } = buildTestEmail(key);
      expect(html).toContain(note.replace(/'/g, '&#39;'));
      expect(text.split(note)).toHaveLength(2);
      expect(text.indexOf(note)).toBeLessThan(text.indexOf(RULE));
    },
  );
});
