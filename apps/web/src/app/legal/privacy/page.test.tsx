// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';

import PrivacyPage from './page';

afterEach(cleanup);

describe('/legal/privacy', () => {
  // Concert Crawl went free on 2026-11-10 and sends no billing email, so the
  // policy must not promise receipts or billing notices.
  it('promises no billing email', () => {
    const { container } = render(<PrivacyPage />);

    expect(container.textContent).not.toMatch(/billing notice|receipt/i);
  });
});
