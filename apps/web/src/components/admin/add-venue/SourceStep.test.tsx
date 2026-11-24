// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import type { CrawlTrigger, TestCrawlResult } from '@concert-crawl/types';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import type { TestOutcome } from './source-test-rules';

const mockTest = vi.fn<(id: string) => Promise<TestOutcome>>();
type PolledTrigger = Pick<CrawlTrigger, 'status' | 'testResult'>;
const mockRead = vi.fn<(id: string) => Promise<PolledTrigger | null>>();
const mockUpdate =
  vi.fn<(id: string, body: FormData) => Promise<{ success: boolean }>>();
vi.mock('@/lib/actions/venues', () => ({
  testCrawlVenue: (id: string) => mockTest(id),
  readTestCrawl: (id: string) => mockRead(id),
  updateVenue: (id: string, body: FormData) => mockUpdate(id, body),
}));

import { SourceStep } from './SourceStep';

const SOURCE = ADMIN_COPY.addVenue.source;

const found: TestCrawlResult = {
  status: 'found',
  strategy: 'jsonld',
  found: 5,
  counts: { html: 0, jsonLd: 5, haiku: 0 },
  samples: [
    { artist: 'Ron Miles', title: null, date: '2026-11-13', showTime: null },
    { artist: 'Tia Fuller', title: null, date: '2026-11-14', showTime: null },
    { artist: 'Orrin Evans', title: null, date: '2026-11-15', showTime: null },
  ],
  costUsd: 0,
  crawlRunId: null,
  error: null,
};

// The trigger shape the poll reads; only status and testResult matter here.
const trigger = (testResult: TestCrawlResult | null): PolledTrigger => ({
  status: 'done',
  testResult,
});

const mount = (
  onPageSaved = vi.fn(),
  pageUrl = 'https://dazzledenver.com/events',
) =>
  render(
    <SourceStep
      phone={false}
      venueId="v-1"
      venueName="Dazzle"
      pageUrl={pageUrl}
      onPageSaved={onPageSaved}
    />,
  );

const settle = () => act(() => vi.advanceTimersByTimeAsync(2100));

beforeEach(() => {
  vi.useFakeTimers();
  mockTest.mockReset();
  mockRead.mockReset();
  mockUpdate.mockReset();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('SourceStep', () => {
  it('tests the saved page on open and shows what it found', async () => {
    mockTest.mockResolvedValue({ ok: true, triggerId: 't-1' });
    mockRead.mockResolvedValue(trigger(found));
    mount();
    await settle();
    expect(mockTest).toHaveBeenCalledWith('v-1');
    expect(mockUpdate).not.toHaveBeenCalled();
    expect(screen.getByText(SOURCE.test.passed)).toBeTruthy();
    expect(
      screen.getByText(SOURCE.test.found(5, 'JSON-LD', 'no LLM cost')),
    ).toBeTruthy();
    expect(screen.getByText('Ron Miles')).toBeTruthy();
    expect(screen.getByText('Fri Nov 13')).toBeTruthy();
    expect(screen.getByText(SOURCE.test.more(2))).toBeTruthy();
  });

  it('stops at robots.txt without reading a trigger', async () => {
    mockTest.mockResolvedValue({ ok: false, code: 'robots_disallowed' });
    mount();
    await settle();
    expect(screen.getByText(SOURCE.robots.title)).toBeTruthy();
    expect(mockRead).not.toHaveBeenCalled();
  });

  it('says the test did not finish when the crawl request fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    mockTest.mockRejectedValue(new Error('network'));
    mount();
    await settle();
    expect(screen.getByText(SOURCE.test.failedTitle)).toBeTruthy();
  });

  it('shows the running card while the test is in flight', async () => {
    mockTest.mockReturnValue(new Promise(() => undefined));
    mount();
    await act(() => vi.advanceTimersByTimeAsync(10));
    expect(screen.getByText(SOURCE.test.running)).toBeTruthy();
  });

  it('opens on an unusable saved link without testing, and lets it be fixed', async () => {
    mount(vi.fn(), 'no spaces allowed');
    await settle();
    expect(mockTest).not.toHaveBeenCalled();
    expect(screen.queryByText(SOURCE.test.running)).toBeNull();
    expect(screen.getByText(SOURCE.test.idle)).toBeTruthy();
    const input = screen.getByLabelText<HTMLInputElement>(SOURCE.calendarPage);
    expect(input.disabled).toBe(false);
  });

  it('keeps the test card honest when saving the page fails', async () => {
    mockUpdate.mockResolvedValue({ success: false });
    mount();
    await settle();
    fireEvent.change(screen.getByLabelText(SOURCE.calendarPage), {
      target: { value: 'dazzledenver.com/shows' },
    });
    mockTest.mockClear();
    fireEvent.click(screen.getByTestId('add-venue-test-again'));
    await settle();
    expect(
      screen.getByText(ADMIN_COPY.addVenue.errors.saveFailed),
    ).toBeTruthy();
    expect(screen.queryByText(SOURCE.test.running)).toBeNull();
    expect(mockTest).not.toHaveBeenCalled();
  });

  it('says so when a test finds no shows', async () => {
    mockTest.mockResolvedValue({ ok: true, triggerId: 't-1' });
    mockRead.mockResolvedValue(
      trigger({ ...found, status: 'none', found: 0, samples: [] }),
    );
    mount();
    await settle();
    expect(screen.getByText(SOURCE.test.noneTitle)).toBeTruthy();
  });

  it('names a refusal that is not robots', async () => {
    mockTest.mockResolvedValue({ ok: false, code: 'test_pending' });
    mount();
    await settle();
    expect(screen.getByText(SOURCE.refused.test_pending)).toBeTruthy();
  });

  it('calls a test that never settles slow instead of waiting forever', async () => {
    mockTest.mockResolvedValue({ ok: true, triggerId: 't-1' });
    mockRead.mockResolvedValue(null);
    mount();
    await act(() => vi.advanceTimersByTimeAsync(185_000));
    expect(screen.getByText(SOURCE.test.timedOut)).toBeTruthy();
  });

  it('saves an edited page before it tests again', async () => {
    mockTest.mockResolvedValue({ ok: false, code: 'not_draft' });
    mockUpdate.mockResolvedValue({ success: true });
    const onPageSaved = vi.fn();
    mount(onPageSaved);
    await settle();
    fireEvent.change(screen.getByLabelText(SOURCE.calendarPage), {
      target: { value: 'dazzledenver.com/shows' },
    });
    fireEvent.click(screen.getByTestId('add-venue-test-again'));
    await settle();
    const body = mockUpdate.mock.calls.at(0)?.[1];
    expect(body?.get('websiteUrl')).toBe('https://dazzledenver.com/shows');
    expect(onPageSaved).toHaveBeenCalledWith('https://dazzledenver.com/shows');
    expect(mockTest).toHaveBeenCalledTimes(2);
  });

  it('keeps a bad page link from being tested', async () => {
    mockTest.mockResolvedValue({ ok: false, code: 'not_draft' });
    mount();
    await settle();
    fireEvent.change(screen.getByLabelText(SOURCE.calendarPage), {
      target: { value: 'no spaces allowed' },
    });
    fireEvent.click(screen.getByTestId('add-venue-test-again'));
    await settle();
    expect(
      screen.getByText(ADMIN_COPY.addVenue.errors.websiteInvalid),
    ).toBeTruthy();
    expect(mockTest).toHaveBeenCalledTimes(1);
  });
});
