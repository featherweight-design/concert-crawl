// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

import { LEGAL_COPY } from '../definitions/copy';

import TermsPage from './page';

afterEach(cleanup);

describe('/legal/terms', () => {
  // /bot has no other inbound link anywhere in the app. Terms is where the
  // crawler is first mentioned, so it is the one place a reader who wants to
  // know what we take can follow it.
  it('links section 2 to the crawler page', () => {
    render(<TermsPage />);

    const link = screen.getByRole('link', {
      name: LEGAL_COPY.terms.service.crawlerLinkLabel,
    });

    expect(link.getAttribute('href')).toBe('/bot');
  });

  // Concert Crawl went free on 2026-11-10. The Terms must not keep promising
  // renewals, refunds or a payment processor for plans nobody can buy.
  it('describes a free service with no paid-plan terms', () => {
    const { container } = render(<TermsPage />);

    expect(screen.getByText(LEGAL_COPY.terms.cost.body)).not.toBeNull();
    expect(container.textContent).not.toMatch(/auto-renew|refund|stripe/i);
  });
});
