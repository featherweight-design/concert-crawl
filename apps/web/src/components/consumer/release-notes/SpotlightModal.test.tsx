// @vitest-environment jsdom

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi, beforeAll } from 'vitest';
import type { Release } from '@/lib/definitions/releases';
import { SpotlightModal } from './SpotlightModal';

beforeAll(() => {
  global.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

const RELEASE: Release = {
  version: 'v0.5.0-beta',
  date: 'May 8, 2026',
  items: [],
  spotlight: {
    title: 'Submit a price. Help the next fan.',
    tagline: 'Community-sourced ticket prices.',
    hero: 'map',
    cta: 'Try it',
    ctaHref: '/events',
    steps: [{ caption: 'Step one caption.' }, { caption: 'Step two caption.' }],
    founderNote: 'Some founder note.',
    founderSign: '— Hugh',
  },
};

describe('SpotlightModal', () => {
  it('renders spotlight title and tagline', () => {
    render(<SpotlightModal release={RELEASE} onClose={vi.fn()} />);
    expect(screen.getByText('Submit a price. Help the next fan.')).toBeTruthy();
    expect(screen.getByText('Community-sourced ticket prices.')).toBeTruthy();
  });

  it('calls onClose when close button is clicked', () => {
    const onClose = vi.fn();
    render(<SpotlightModal release={RELEASE} onClose={onClose} />);
    fireEvent.click(screen.getByLabelText('Close'));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('keeps the eyebrow and the close button off the hero art', () => {
    render(<SpotlightModal release={RELEASE} onClose={vi.fn()} />);
    // The hero's stats, chips and artist tags fill every corner of the stage,
    // so the close button and the FEATURE DROP eyebrow share a strip above it
    // rather than floating over it (they landed on chips at 390 and 1300).
    const close = screen.getByLabelText('Close');
    const eyebrow = screen.getByText(/v0\.5\.0-beta/);
    const hero = screen.getByTestId('spotlight-hero');
    expect(hero.contains(close)).toBe(false);
    expect(hero.contains(eyebrow)).toBe(false);
    expect(close.parentElement?.contains(eyebrow)).toBe(true);
  });

  it('calls onClose when "Maybe later" is clicked', () => {
    const onClose = vi.fn();
    render(<SpotlightModal release={RELEASE} onClose={onClose} />);
    fireEvent.click(screen.getByText('Maybe later'));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('shows step 1 caption initially', () => {
    render(<SpotlightModal release={RELEASE} onClose={vi.fn()} />);
    expect(screen.getByText('Step one caption.')).toBeTruthy();
  });

  it('advances to step 2 when Next is clicked', () => {
    render(<SpotlightModal release={RELEASE} onClose={vi.fn()} />);
    fireEvent.click(screen.getByText('Next →'));
    expect(screen.getByText('Step two caption.')).toBeTruthy();
  });

  it('calls onCTA when CTA button is clicked', () => {
    const onCTA = vi.fn();
    render(
      <SpotlightModal release={RELEASE} onClose={vi.fn()} onCTA={onCTA} />,
    );
    fireEvent.click(screen.getByText('Try it'));
    expect(onCTA).toHaveBeenCalledOnce();
  });

  it('renders founder note', () => {
    render(<SpotlightModal release={RELEASE} onClose={vi.fn()} />);
    expect(screen.getByText('Some founder note.')).toBeTruthy();
  });

  it('wears the blue-to-pink top edge on the elevated fill (rule 7)', () => {
    render(<SpotlightModal release={RELEASE} onClose={vi.fn()} />);
    const dialog = screen.getByRole('dialog');
    expect(dialog.className).toContain('sheet-edge');
    expect(dialog.style.getPropertyValue('--sheet-bg')).toBe(
      'var(--bg-elevated)',
    );
    // The edge layers own the fill and the border; no flat ones override them.
    expect(dialog.style.background).toBe('');
    expect(dialog.style.border).toBe('');
  });

  it('draws the primary CTA as the signal-to-accent gradient pill with a glow', () => {
    render(<SpotlightModal release={RELEASE} onClose={vi.fn()} />);
    const primary = screen.getByRole('button', { name: /try it/i });
    expect(primary.style.background).toContain('linear-gradient(135deg');
    expect(primary.style.background).toContain('var(--accent)');
    expect(primary.style.boxShadow).toContain('var(--signal)');
  });

  it('returns null when release has no spotlight', () => {
    const releaseNoSpotlight: Release = {
      version: 'v0.4.0-beta',
      date: 'Apr 15, 2026',
      items: [],
    };
    const { container } = render(
      <SpotlightModal release={releaseNoSpotlight} onClose={vi.fn()} />,
    );
    expect(container.firstChild).toBeNull();
  });
});
