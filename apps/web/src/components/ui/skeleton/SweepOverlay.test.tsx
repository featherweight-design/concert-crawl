// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { SWEEP_ANIMATION, SweepOverlay } from './SweepOverlay';

// B+ rule 9: the skeleton sheen sweeps on --motion-slow with the shared ease,
// not the old hand-timed 1500ms.
describe('SweepOverlay', () => {
  it('sweeps on the slow motion step and the shared ease', () => {
    expect(SWEEP_ANIMATION).toBe(
      'dlSweep var(--motion-slow) var(--motion-ease) infinite',
    );
    expect(SWEEP_ANIMATION).not.toContain('1500ms');
  });

  it('keeps the class the reduced-motion guard hides', () => {
    const { container } = render(<SweepOverlay />);
    expect(container.querySelector('.dl-sweep')).not.toBeNull();
  });
});
