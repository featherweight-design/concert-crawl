// @vitest-environment jsdom

import '@testing-library/jest-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

import { SubmitPriceCardButton } from './SubmitPriceCardCta';
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy';

const copy = CONSUMER_COPY.submitPriceCardCta;

describe('SubmitPriceCardButton signed-out gate is announced, not drawn (#1247)', () => {
  it('carries the sign-up invitation on the accessible name only', () => {
    render(<SubmitPriceCardButton signedOut onClick={vi.fn()} />);

    expect(
      screen.getByRole('button', { name: copy.ariaSignedOut }),
    ).toBeInTheDocument();
    // The card itself is unchanged: no dimming, no lock, no relabel.
    expect(screen.getByText(copy.heading)).toBeInTheDocument();
    expect(screen.getByText(copy.ctaLabel)).toBeInTheDocument();
  });

  it('leaves the accessible name alone when signed in', () => {
    render(<SubmitPriceCardButton onClick={vi.fn()} />);

    expect(
      screen.queryByRole('button', { name: copy.ariaSignedOut }),
    ).toBeNull();
  });
});

describe('SubmitPriceCardButton draws more-p-price_states', () => {
  // The gate tests above leave their renders mounted.
  beforeEach(cleanup);
  afterEach(cleanup);

  it('is a dashed 12px-radius card with 11px / 16px inside', () => {
    render(<SubmitPriceCardButton onClick={vi.fn()} />);

    const card = screen.getByRole('button');
    expect(card.style.padding).toBe('11px 16px');
    expect(card.style.borderRadius).toBe('12px');
    expect(card.getAttribute('style')).toContain('dashed');
  });

  it('sets the heading at 14px, the body at 12.5px and the CTA in 9.5px caps', () => {
    render(<SubmitPriceCardButton onClick={vi.fn()} />);

    expect(screen.getByTestId('submit-another-heading')).toHaveStyle({
      fontSize: '14px',
      fontWeight: '700',
    });
    expect(screen.getByTestId('submit-another-body')).toHaveStyle({
      fontSize: '12.5px',
    });
    expect(screen.getByTestId('submit-another-cta')).toHaveStyle({
      fontSize: '9.5px',
      letterSpacing: '0.14em',
      textTransform: 'uppercase',
    });
  });
});
