// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

import { REPORTING_COPY } from './definitions/copy';
import { LiveReportBanner } from './LiveReportBanner';

const copy = REPORTING_COPY.liveReportBanner;
const twoHoursAgo = () => new Date(Date.now() - 2 * 3600_000).toISOString();

afterEach(cleanup);

describe('LiveReportBanner', () => {
  it('names the venue calendar on a crawled cancellation, no "0 confirms"', () => {
    render(<LiveReportBanner status="cancelled" promotedAt={twoHoursAgo()} />);

    expect(screen.getByText(copy.headlines.cancelled)).toBeTruthy();
    expect(screen.getByText(copy.fromVenueCalendar('2h'))).toBeTruthy();
    expect(screen.queryByText(/confirms/)).toBeNull();
  });

  it('renders the second sentence under the headline when given one', () => {
    render(
      <LiveReportBanner
        status="cancelled"
        promotedAt={twoHoursAgo()}
        body={copy.cancelledBody.venue}
      />,
    );

    expect(screen.getByText(copy.cancelledBody.venue)).toBeTruthy();
  });

  it('keeps the confirms on a sold-out report that carries a count', () => {
    render(
      <LiveReportBanner
        status="sold-out"
        promotedAt={twoHoursAgo()}
        confirmCount={2}
        reporter={null}
      />,
    );

    expect(screen.getByText(/2 confirms/)).toBeTruthy();
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
