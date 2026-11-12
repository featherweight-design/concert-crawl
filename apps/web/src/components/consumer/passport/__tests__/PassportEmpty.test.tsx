// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy';
import { PassportEmpty } from '../PassportEmpty';

afterEach(cleanup);

const COPY = CONSUMER_COPY.passport;

// Addendum-2 `16-undrawn-pages/passport-empty-m|d`: Find a show sits on
// `0 8px 24px rgba(122,230,255,0.22)`, the signal at 22%, on both variants.
describe('PassportEmpty Find a show glow', () => {
  it.each<'card' | 'block'>(['card', 'block'])(
    'glows on the %s variant',
    (variant) => {
      render(<PassportEmpty variant={variant} />);
      const cta = screen.getByRole('link', { name: COPY.emptyCta });
      expect(cta.style.boxShadow).toContain('0 8px 24px');
      expect(cta.style.boxShadow).toContain('var(--signal) 22%');
    },
  );
});
