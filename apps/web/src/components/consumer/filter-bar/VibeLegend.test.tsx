// @vitest-environment jsdom

import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { VibeLegend } from './VibeLegend';

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
});
