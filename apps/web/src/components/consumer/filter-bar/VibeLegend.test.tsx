// @vitest-environment jsdom

import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { VibeLegend } from './VibeLegend';
import { VIBE_ORDER } from './filter-defs';

afterEach(cleanup);

describe('VibeLegend', () => {
  it('draws each pick as a dot and a name, and speaks one sentence', () => {
    render(<VibeLegend genres={['electronic', 'hip-hop']} />);
    const legend = screen.getByTestId('vibe-legend');
    expect(legend.textContent).toContain('Electronic');
    expect(legend.textContent).toContain('Hip-hop');
    expect(
      screen.getByText(
        'Only electronic and hip-hop shows, each marked by its dot.',
      ),
    ).toBeTruthy();
  });

  it('names a single pick without a conjunction', () => {
    render(<VibeLegend genres={['jazz']} />);
    expect(
      screen.getByText('Only jazz shows, each marked by its dot.'),
    ).toBeTruthy();
  });

  it('lists three or more with commas and a final "and"', () => {
    render(<VibeLegend genres={['rock', 'punk', 'metal']} />);
    expect(
      screen.getByText(
        'Only rock, punk and metal shows, each marked by its dot.',
      ),
    ).toBeTruthy();
  });

  it('names four picks whole', () => {
    render(<VibeLegend genres={['rock', 'punk', 'metal', 'jazz']} />);
    expect(screen.queryByTestId('vibe-legend-more')).toBeNull();
    expect(screen.getByText('Jazz')).toBeTruthy();
  });

  it('names three of five, then "+2 more", and the sentence names all five', () => {
    render(<VibeLegend genres={['rock', 'punk', 'metal', 'jazz', 'blues']} />);
    expect(screen.queryByText('Jazz')).toBeNull();
    expect(screen.getByTestId('vibe-legend-more').textContent).toBe('+2 more');
    expect(
      screen.getByText(
        'Only rock, punk, metal, jazz and blues shows, each marked by its dot.',
      ),
    ).toBeTruthy();
  });

  it('shows no names for all 16, and the sentence still names every one', () => {
    render(<VibeLegend genres={[...VIBE_ORDER]} />);
    expect(screen.queryByTestId('vibe-legend-more')).toBeNull();
    const legend = screen.getByTestId('vibe-legend');
    expect(legend.querySelectorAll('[aria-hidden="true"]')).toHaveLength(0);
    expect(legend.querySelector('.sr-only')?.textContent).toContain('Only ');
  });
});
