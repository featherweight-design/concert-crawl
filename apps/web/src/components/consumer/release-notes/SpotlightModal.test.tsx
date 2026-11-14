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

  it('draws no close button over the art; Maybe later, Escape and the backdrop close it', () => {
    const onClose = vi.fn();
    const { container } = render(
      <SpotlightModal release={RELEASE} onClose={onClose} />,
    );
    // more-r3-feature_modal draws no ×. The hero's stats, chips and artist
    // tags fill every corner of the stage, so nothing is laid over it.
    expect(screen.queryByLabelText('Close')).toBeNull();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);

    // The backdrop is the dialog's parent; a tap on the dialog itself is not.
    const dialog = screen.getByRole('dialog');
    fireEvent.click(dialog);
    expect(onClose).toHaveBeenCalledTimes(1);
    const backdrop = container.firstElementChild;
    if (!(backdrop instanceof HTMLElement)) throw new Error('no backdrop');
    fireEvent.click(backdrop);
    expect(onClose).toHaveBeenCalledTimes(2);

    // A drag that began inside the card and ended on the backdrop does not close.
    fireEvent.pointerDown(dialog);
    fireEvent.click(backdrop);
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('puts the eyebrow in the body above the title, off the hero art', () => {
    render(<SpotlightModal release={RELEASE} onClose={vi.fn()} />);
    const eyebrow = screen.getByText(/v0\.5\.0-beta/);
    const hero = screen.getByTestId('spotlight-hero');
    const title = screen.getByRole('heading', { level: 2 });
    expect(hero.contains(eyebrow)).toBe(false);
    // Document order: hero, then the eyebrow, then the title.
    expect(
      hero.compareDocumentPosition(eyebrow) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      eyebrow.compareDocumentPosition(title) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it('names the feature in the eyebrow when the hero has a name, else keeps the version', () => {
    const named: Release = {
      ...RELEASE,
      spotlight: { ...RELEASE.spotlight!, hero: 'price' },
    };
    render(<SpotlightModal release={named} onClose={vi.fn()} />);
    expect(screen.getByText('New · Submitted prices')).toBeTruthy();
    expect(screen.queryByText(/v0\.5\.0-beta/)).toBeNull();
  });

  it('draws a 520-wide card on a wide screen and a rounded-top sheet on a phone', () => {
    const original = window.innerWidth;
    try {
      Object.defineProperty(window, 'innerWidth', {
        configurable: true,
        value: 1300,
      });
      const { unmount } = render(
        <SpotlightModal release={RELEASE} onClose={vi.fn()} />,
      );
      expect(screen.getByRole('dialog').style.width).toBe('520px');
      unmount();

      Object.defineProperty(window, 'innerWidth', {
        configurable: true,
        value: 390,
      });
      render(<SpotlightModal release={RELEASE} onClose={vi.fn()} />);
      const sheet = screen.getByRole('dialog');
      expect(sheet.style.borderRadius).toBe('22px 22px 0 0');
      expect(sheet.style.maxHeight).toBe('92svh');
    } finally {
      Object.defineProperty(window, 'innerWidth', {
        configurable: true,
        value: original,
      });
    }
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

  // `more-r3-feature_modal`: the dots are the only navigation; no Back or Next.
  it('moves to step 2 from its dot, with no Back or Next buttons', () => {
    render(<SpotlightModal release={RELEASE} onClose={vi.fn()} />);
    expect(screen.queryByText('Next →')).toBeNull();
    expect(screen.queryByText('← Back')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Go to step 2' }));
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

  it('draws the primary CTA as the signal-to-cta-end gradient pill with a glow', () => {
    render(<SpotlightModal release={RELEASE} onClose={vi.fn()} />);
    const primary = screen.getByRole('button', { name: /try it/i });
    expect(primary.style.background).toContain('linear-gradient(135deg');
    // A fill under dark label text ends on the derived stop (addendum-4 §3).
    expect(primary.style.background).toContain('var(--cta-end)');
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
