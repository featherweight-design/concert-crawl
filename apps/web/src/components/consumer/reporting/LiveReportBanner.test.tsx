// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

import { REPORTING_COPY } from './definitions/copy';
import { LiveReportBanner } from './LiveReportBanner';

const copy = REPORTING_COPY.liveReportBanner;
const twoHoursAgo = () => new Date(Date.now() - 2 * 3600_000).toISOString();

afterEach(cleanup);

describe('LiveReportBanner', () => {
  it('keeps only the age for a crawled cancellation, no "0 confirms"', () => {
    render(<LiveReportBanner status="cancelled" promotedAt={twoHoursAgo()} />);

    expect(screen.getByText(copy.headlines.cancelled)).toBeTruthy();
    expect(screen.queryByText(/confirms/)).toBeNull();
  });

  it('credits the reporter and the confirms on a reported change', () => {
    render(
      <LiveReportBanner
        status="cancelled"
        promotedAt={twoHoursAgo()}
        confirmCount={3}
        reporter={{ handle: 'sami', url: '' }}
      />,
    );

    expect(screen.getByText(/Reported by @sami · 3 confirms/)).toBeTruthy();
  });
});
