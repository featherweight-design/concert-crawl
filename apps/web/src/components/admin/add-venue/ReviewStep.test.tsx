// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import { GoneLive } from './GoneLive';
import { ReviewStep } from './ReviewStep';

const REVIEW = ADMIN_COPY.addVenue.review;
const GONE = ADMIN_COPY.addVenue.gone;

const basics = {
  name: 'Dazzle Jazz',
  slug: 'dazzle',
  address: '1512 Curtis St',
  capacityType: '',
  capacity: '',
  website: 'https://dazzledenver.com',
};

const mount = (over: Partial<Parameters<typeof ReviewStep>[0]> = {}) => {
  const props = {
    phone: false,
    basics,
    found: 14,
    going: false,
    failed: null,
    onRetry: vi.fn(),
    onEditBasics: vi.fn(),
    onEditSource: vi.fn(),
    onSaveDraft: vi.fn(),
    ...over,
  };
  render(<ReviewStep {...props} />);
  return props;
};

afterEach(cleanup);

describe('ReviewStep', () => {
  it('reads ready when the test passed, with what happens on Go live', () => {
    mount();
    expect(screen.getByText(REVIEW.title)).toBeTruthy();
    expect(screen.getByText(REVIEW.sourcePassed(14))).toBeTruthy();
    expect(screen.getByTestId('add-venue-review-when')).toBeTruthy();
    expect(screen.queryByTestId('add-venue-fix-source')).toBeNull();
  });

  it('reads not ready without a passing test, and sends the admin to Source', () => {
    const props = mount({ found: null });
    expect(screen.getByText(REVIEW.notReadyTitle)).toBeTruthy();
    expect(screen.getByText(REVIEW.sourceNotPassed)).toBeTruthy();
    expect(screen.queryByTestId('add-venue-review-when')).toBeNull();
    fireEvent.click(screen.getByTestId('add-venue-fix-source'));
    expect(props.onEditSource).toHaveBeenCalled();
    fireEvent.click(screen.getByTestId('add-venue-save-draft'));
    expect(props.onSaveDraft).toHaveBeenCalled();
  });

  it('edits Basics and Source from their rows', () => {
    const props = mount();
    fireEvent.click(screen.getByTestId('add-venue-review-basics-edit'));
    fireEvent.click(screen.getByTestId('add-venue-review-source-edit'));
    expect(props.onEditBasics).toHaveBeenCalled();
    expect(props.onEditSource).toHaveBeenCalled();
  });

  it('says nothing was published on failure and retries', () => {
    const props = mount({ failed: 'failed' });
    expect(screen.getByText(REVIEW.failedTitle('Dazzle Jazz'))).toBeTruthy();
    fireEvent.click(screen.getByTestId('add-venue-go-live-retry'));
    expect(props.onRetry).toHaveBeenCalled();
  });

  it('offers Fix Source, not Try again, when robots.txt now disallows the page', () => {
    const props = mount({ failed: 'robots' });
    expect(screen.getByText(REVIEW.failedRobots)).toBeTruthy();
    expect(screen.queryByTestId('add-venue-go-live-retry')).toBeNull();
    fireEvent.click(screen.getByTestId('add-venue-go-live-fix'));
    expect(props.onEditSource).toHaveBeenCalled();
  });

  it('hides the failure while going live', () => {
    mount({ failed: 'failed', going: true });
    expect(screen.queryByTestId('add-venue-go-live-failed')).toBeNull();
  });
});

describe('GoneLive', () => {
  const gone = (crawlQueued: boolean | null) =>
    render(
      <GoneLive
        phone={false}
        id="v-9"
        name="Dazzle Jazz"
        slug="dazzle"
        crawlQueued={crawlQueued}
        onAddAnother={vi.fn()}
      />,
    );

  it('links to the venue page and the fan page', () => {
    gone(true);
    expect(
      screen.getByTestId('add-venue-open-venue').getAttribute('href'),
    ).toBe('/admin/venues/v-9');
    expect(
      screen.getByTestId('add-venue-see-as-fan').getAttribute('href'),
    ).toBe('/v/dazzle');
    expect(screen.getByText(GONE.crawlQueued)).toBeTruthy();
  });

  it('does not claim a crawl state the answer did not give', () => {
    gone(null);
    expect(screen.getByText(GONE.crawlUnknown)).toBeTruthy();
  });

  it('says when the first crawl did not start', () => {
    gone(false);
    expect(screen.getByText(GONE.crawlNotQueued)).toBeTruthy();
  });
});
