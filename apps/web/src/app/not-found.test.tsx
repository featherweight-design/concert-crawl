// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

import { CONSUMER_COPY } from '@/components/consumer/definitions/copy';
import GlobalNotFound from './not-found';

const copy = CONSUMER_COPY.notFound;

afterEach(cleanup);

describe('global not-found', () => {
  it('draws the board: 404 tile, NOT FOUND eyebrow, heading and Browse shows', () => {
    render(<GlobalNotFound />);

    expect(screen.getByTestId('not-found-surface')).toBeDefined();
    expect(screen.getByTestId('not-found-tile').textContent).toBe(copy.code);
    expect(screen.getByText(copy.eyebrow)).toBeDefined();
    expect(screen.getByRole('heading', { name: copy.heading })).toBeDefined();
    const link = screen.getByRole('link', { name: copy.browseButton });
    expect(link.getAttribute('href')).toBe('/events');
    // The primary pill is the gradient, not the old outline button.
    expect(link.getAttribute('style')).toContain('linear-gradient');
  });
});
