import { describe, expect, it } from 'vitest';

import { cardedEdge } from './carded-edge';

describe('cardedEdge', () => {
  it('draws the 2px genre edge on a 12px card', () => {
    const style = cardedEdge('var(--genre-electronic)');
    expect(style.borderRadius).toBe(12);
    expect(style.borderLeftWidth).toBe(2);
    expect(style.borderLeftColor).toBe('var(--genre-electronic)');
  });

  it('fades the genre into the surface from the left', () => {
    expect(cardedEdge('var(--genre-soul)').background).toBe(
      'linear-gradient(90deg, color-mix(in oklch, var(--genre-soul) 7%, var(--surface-1)), var(--surface-1) 45%)',
    );
    expect(cardedEdge('var(--genre-soul)').backgroundImage).toBeUndefined();
  });

  // A hover-tinted card (Concerts) keeps its surface color in a class, so the
  // fade rides over it as an image and never sets the background color.
  it('paints the fade as an image over a transparent ground when hover-safe', () => {
    const style = cardedEdge('var(--genre-soul)', { hoverSafe: true });
    expect(style.background).toBeUndefined();
    expect(style.backgroundImage).toBe(
      'linear-gradient(90deg, color-mix(in oklch, var(--genre-soul) 7%, transparent), transparent 45%)',
    );
    expect(style.borderLeftWidth).toBe(2);
    expect(style.borderLeftColor).toBe('var(--genre-soul)');
  });
});
