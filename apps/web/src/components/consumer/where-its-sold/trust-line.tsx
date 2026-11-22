'use client';

// trust-line.tsx — the resale word a price line sets in the Resale trust
// colour, shared by the Where it's sold card and the public event page's
// price card (B+ addendum 10), so the two lines colour it the same way.

import type { ReactNode } from 'react';
import { TRUST_TOKENS } from '@/components/consumer/glyphs';

/**
 * Split `line` around the first `word` and set the word in the Resale trust
 * colour. A line that no longer holds the word (after a copy edit) renders
 * plain rather than losing text. `weight` lets the public card draw the word
 * at 600, as its boards do; the Where it's sold line keeps its own weight.
 */
export function withResaleWord(
  line: string,
  word: string,
  options: { testId?: string; weight?: number } = {},
): ReactNode {
  const at = line.indexOf(word);
  if (at === -1) return line;
  return (
    <>
      {line.slice(0, at)}
      <span
        data-testid={options.testId}
        style={{ color: TRUST_TOKENS.resale.text, fontWeight: options.weight }}
      >
        {word}
      </span>
      {line.slice(at + word.length)}
    </>
  );
}
