// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

import { CONSUMER_COPY } from '@/components/consumer/definitions/copy';
import GlobalError from './global-error';

afterEach(cleanup);

describe('global-error', () => {
  it('renders the standalone error page with the digest as the error ID', () => {
    // React warns about <html> inside a div in the test container; the shape is
    // what Next requires of a global-error file.
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const error = Object.assign(new Error('boom'), { digest: '4471' });

    render(<GlobalError error={error} reset={vi.fn()} />, {
      container: document.documentElement,
    });

    expect(
      screen.getByRole('heading', { name: CONSUMER_COPY.error.errorHeading }),
    ).toBeTruthy();
    expect(screen.getByText('4471')).toBeTruthy();
  });
});
