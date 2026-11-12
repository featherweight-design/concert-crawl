// @vitest-environment jsdom

import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GenreDot, genreDotGlow } from './GenreDot';

describe('genreDotGlow', () => {
  // shelf-see-all-m: `box-shadow: 0 0 6px rgba(<genre>,0.6)`.
  it('draws a 6px glow in the genre color at 60%', () => {
    expect(genreDotGlow('var(--genre-rock)')).toBe(
      '0 0 6px color-mix(in oklch, var(--genre-rock) 60%, transparent)',
    );
  });
});

describe('GenreDot', () => {
  it('draws a 7px dot in the genre color with its glow', () => {
    render(<GenreDot genre="alternative" />);
    const dot = screen.getByTestId('genre-dot');
    expect(dot.style.width).toBe('7px');
    expect(dot.style.height).toBe('7px');
    expect(dot.style.background).toBe('var(--genre-rock)');
    expect(dot.style.boxShadow).toBe(genreDotGlow('var(--genre-rock)'));
  });

  it('leaves an unbucketed dot flat, with no glow', () => {
    render(<GenreDot genre="polka-step" />);
    const dot = screen.getByTestId('genre-dot');
    expect(dot.style.background).toBe('var(--fg-subtle)');
    expect(dot.style.boxShadow).toBe('');
  });
});
