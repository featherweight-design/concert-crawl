// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

import { BACK_CHIP_COPY } from '@/components/consumer/back-chip/definitions/copy';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ back: vi.fn(), push: vi.fn() }),
}));

import EventDetailLoading from './loading';

afterEach(cleanup);

describe('event detail loading (B+ rule 9)', () => {
  it('holds the stage geometry the loaded page uses', () => {
    render(<EventDetailLoading />);
    // The same shell as the loaded page, so nothing jumps when data lands.
    expect(screen.getByTestId('hero-band')).toBeDefined();
    expect(screen.getByTestId('stage-column')).toBeDefined();
  });

  it('renders the chrome immediately: the back control is live', () => {
    render(<EventDetailLoading />);
    expect(
      screen.getByRole('button', { name: BACK_CHIP_COPY.label }),
    ).toBeDefined();
  });

  it('draws only the wash: no image, no countdown, no title text', () => {
    render(<EventDetailLoading />);
    expect(screen.queryByTestId('event-image')).toBeNull();
    expect(screen.queryByTestId('stage-countdown')).toBeNull();
    expect(screen.queryByRole('heading')).toBeNull();
  });

  it('leans on the shared sweep rather than the old pulse keyframes', () => {
    const { container } = render(<EventDetailLoading />);
    expect(container.innerHTML).not.toContain('skeletonPulse');
    expect(container.innerHTML).not.toContain('navProgress');
  });
});
