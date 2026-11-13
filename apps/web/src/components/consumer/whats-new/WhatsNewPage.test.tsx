// @vitest-environment jsdom

import '@testing-library/jest-dom';
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { FEATURE_CARDS } from '@/lib/definitions/releases';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
}));
vi.mock('@/components/consumer/feedback/FeedbackModal', () => ({
  FeedbackModal: () => null,
}));

import { WhatsNewPage } from './WhatsNewPage';

describe('WhatsNewPage', () => {
  it('draws one card per feature in the board order, each with its art', () => {
    render(<WhatsNewPage cards={FEATURE_CARDS} />);
    const cards = screen.getAllByTestId('feature-card');
    expect(cards.map((card) => card.getAttribute('data-art'))).toEqual([
      'venues',
      'watching',
      'crews',
      'passport',
      'prices',
    ]);
    for (const card of cards) {
      expect(within(card).getByTestId('feature-card-art')).toBeTruthy();
    }
  });

  it('gives each card its title and its call to action link', () => {
    render(<WhatsNewPage cards={FEATURE_CARDS} />);
    for (const feature of FEATURE_CARDS) {
      expect(
        screen.getByRole('heading', { level: 2, name: feature.title }),
      ).toBeTruthy();
      if (feature.cta) {
        expect(
          screen.getByRole('link', { name: new RegExp(feature.cta.label) }),
        ).toHaveAttribute('href', feature.cta.href);
      }
    }
  });

  it('heads the page and links on to the full changelog', () => {
    render(<WhatsNewPage cards={FEATURE_CARDS} />);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(
      'What you can do here.',
    );
    expect(
      screen.getByRole('link', { name: /See every update/ }),
    ).toHaveAttribute('href', '/changelog');
  });
});
