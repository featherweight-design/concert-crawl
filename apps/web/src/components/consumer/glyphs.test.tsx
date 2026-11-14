// @vitest-environment jsdom

import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { PendingDot, StarGlyph, TierMark, TRUST_TOKENS } from './glyphs';

afterEach(() => {
  cleanup();
});

describe('TierMark', () => {
  it('renders its children as the label text', () => {
    render(<TierMark kind="boxoffice">Box office</TierMark>);
    expect(screen.getByText('Box office')).toBeTruthy();
  });

  it('renders a gold star SVG with the TierMark-specific 12×12 viewBox when kind="boxoffice" and glyph=true', () => {
    const { container } = render(
      <TierMark kind="boxoffice" glyph>
        Box office
      </TierMark>,
    );

    const svg = container.querySelector('svg');
    expect(svg).not.toBeNull();
    // CRITICAL: TierMark's boxoffice star uses an inline 12×12 viewBox SVG —
    // it is NOT the shipped 10×10 StarGlyph. Per property table §primitives
    // line 48, the two stars coexist intentionally: StarGlyph is chip-scale
    // (10×10), TierMark carries a fuller eyebrow-scale star (12×12).
    expect(svg?.getAttribute('viewBox')).toBe('0 0 12 12');
    expect(svg?.getAttribute('viewBox')).not.toBe('0 0 10 10');

    // The path d must match the TierMark-specific star geometry, not the
    // shipped StarGlyph's path.
    const path = svg?.querySelector('path');
    expect(path?.getAttribute('d')).toBe(
      'M6 0.8l1.5 3.1 3.4.5-2.5 2.4.6 3.4L6 8.9 2.9 10.6l.6-3.4L1 4.4l3.4-.5z',
    );

    // Filled with the box office warning gold, as text (AA-safe on Light).
    expect(svg?.getAttribute('fill')).toBe('var(--price-text-warning)');
  });

  it('omits the star SVG when glyph=false (default)', () => {
    const { container } = render(
      <TierMark kind="boxoffice">Box office</TierMark>,
    );
    expect(container.querySelector('svg')).toBeNull();
  });

  it('omits the star SVG for non-boxoffice kinds even when glyph=true', () => {
    const { container: resaleContainer } = render(
      <TierMark kind="resale" glyph>
        Resale
      </TierMark>,
    );
    expect(resaleContainer.querySelector('svg')).toBeNull();

    const { container: communityContainer } = render(
      <TierMark kind="community" glyph>
        Community
      </TierMark>,
    );
    expect(communityContainer.querySelector('svg')).toBeNull();
  });

  // The B+ trust tokens (addendum 4, price-states-age-trust): Community is
  // the theme's signal, Resale its danger, Box office its warning gold.
  it.each([
    ['community', 'signal'],
    ['resale', 'danger'],
    ['boxoffice', 'warning'],
  ] as const)('draws %s in the B+ --%s token', (kind, token) => {
    render(<TierMark kind={kind}>{kind}</TierMark>);
    const span = screen.getByTestId(`tier-mark-${kind}`);
    expect(span.style.color).toBe(`var(--price-text-${token})`);
    expect(span.style.border).toContain(`var(--${token})`);
    expect(span.style.background).toContain(`var(--${token})`);
    expect(span.getAttribute('style')).not.toContain('oklch(0.6');
  });
});

describe('TRUST_TOKENS', () => {
  it('maps each trust kind to the B+ signal / danger / warning tokens', () => {
    expect(TRUST_TOKENS).toEqual({
      community: { tone: 'var(--signal)', text: 'var(--price-text-signal)' },
      resale: { tone: 'var(--danger)', text: 'var(--price-text-danger)' },
      boxoffice: { tone: 'var(--warning)', text: 'var(--price-text-warning)' },
    });
  });

  it('retires the old trust colours from the glyph defaults', () => {
    const { container } = render(
      <>
        <PendingDot />
        <StarGlyph />
      </>,
    );
    const circle = container.querySelector('circle');
    expect(circle?.getAttribute('stroke')).toBe('var(--signal)');
    const star = container.querySelector('path');
    expect(star?.getAttribute('fill')).toBe('var(--warning)');
  });
});
