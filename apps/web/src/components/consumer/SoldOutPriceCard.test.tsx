// @vitest-environment jsdom

import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { SoldOutPriceCard } from './SoldOutPriceCard';

afterEach(() => {
  cleanup();
});

describe('SoldOutPriceCard', () => {
  describe('variant="has-listing" (default)', () => {
    it('draws "Sold out" large in the accent, with the reporter caption and no price', () => {
      const { container } = render(
        <SoldOutPriceCard reporterHandle="ada" confirmsCount={3} />,
      );

      const heading = screen.getByText('Sold out') as HTMLElement;
      expect(heading.style.color).toBe('var(--accent)');
      expect(heading.style.fontSize).toBe('28px');
      expect(heading.style.fontWeight).toBe('900');
      expect(heading.style.textDecoration).not.toContain('line-through');
      expect(container.textContent).not.toContain('$');
      expect(
        screen.getByText('Reported sold out by @ada · 3 fans confirmed'),
      ).toBeDefined();
    });

    it('strokes the card in the accent, never amber', () => {
      const { container } = render(
        <SoldOutPriceCard reporterHandle="ada" confirmsCount={3} />,
      );
      const card = container.firstElementChild as HTMLElement;
      expect(card.style.border).toContain('var(--accent)');
      expect(card.style.borderRadius).toBe('16px');
      expect(card.outerHTML).not.toContain('oklch(0.73 0.13 78)');
      expect(card.outerHTML).not.toContain('--warning');
    });

    it('omits @handle when reporterHandle is null', () => {
      render(<SoldOutPriceCard reporterHandle={null} confirmsCount={1} />);
      expect(
        screen.getByText('Reported sold out · 1 fan confirmed'),
      ).toBeDefined();
    });
  });

  describe('variant="no-listing" (Q1 lock — Appendix A.2)', () => {
    it('renders em-dash price (no strikethrough), an accent Sold-out pill, and the no-listing caption', () => {
      render(<SoldOutPriceCard variant="no-listing" />);

      const price = screen.getByText('—');
      expect((price as HTMLElement).style.textDecoration).not.toContain(
        'line-through',
      );

      const pill = screen.getByText('Sold out') as HTMLElement;
      expect(pill.style.background).toBe('var(--accent)');
      expect(
        screen.getByText(
          'No tickets listed anywhere we can see. Not even resale.',
        ),
      ).toBeDefined();
    });

    it('does not render reporter caption when no-listing', () => {
      render(<SoldOutPriceCard variant="no-listing" />);
      expect(screen.queryByText(/Reported sold out/)).toBeNull();
    });
  });
});
