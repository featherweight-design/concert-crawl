// @vitest-environment jsdom
import '@testing-library/jest-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { EvidenceSlot } from '../EvidenceSlot';
import type { NeedsYouAnswer, QueueRow } from '../needs-you-api';

const answer = (over: Partial<NeedsYouAnswer>): NeedsYouAnswer => ({
  slug: 'still_on',
  label: 'Still on',
  notifiesFans: false,
  undoable: true,
  suggested: false,
  ...over,
});

const row = (over: Partial<QueueRow>): QueueRow => ({
  key: 'show-dropped:e1:1',
  kind: 'show-dropped',
  title: 'Olive Jones w/ Zoe Stroupe',
  venueId: 'v1',
  venueName: 'Globe Hall',
  fanDate: '2026-11-13',
  showTime: null,
  watchers: 12,
  answers: [
    answer({ suggested: true }),
    answer({ slug: 'postponed', label: 'Postponed', notifiesFans: true }),
  ],
  evidence: [],
  cause: null,
  reportCount: null,
  lastSeenAt: '2026-11-09T10:00:00.000Z',
  moveTo: null,
  lastRuns: [],
  venueLive: null,
  pausedAt: null,
  showCount: null,
  okStreakBefore: null,
  pagesThisRun: null,
  robots: null,
  otherShowsCrawledFine: null,
  ...over,
});

beforeEach(() => {
  window.matchMedia = vi.fn().mockImplementation(() => ({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
});
afterEach(cleanup);

const open = (item: QueueRow, onAnswer = vi.fn(), ranksFirst = true) => {
  render(
    <EvidenceSlot
      row={item}
      today="2026-11-12"
      ranksFirst={ranksFirst}
      busy={false}
      onClose={vi.fn()}
      onAnswer={onAnswer}
    />,
  );
  return onAnswer;
};

describe('ShowDroppedPanel', () => {
  it('draws the labelled sections and the built sentences', () => {
    open(row({}));
    expect(
      screen.getByText('Olive Jones dropped off Globe Hall’s calendar'),
    ).toBeInTheDocument();
    for (const label of [
      'WHAT HAPPENED',
      'CHECKED FOR YOU',
      'WHO SEES IT',
      'YOUR ANSWER',
    ])
      expect(screen.getByText(label)).toBeInTheDocument();
    expect(
      screen.getByText(
        'Olive Jones was on Globe Hall’s calendar until Nov 9, then stopped appearing.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByText('Nov 9, 3 AM')).toBeInTheDocument();
    expect(
      screen.getByText(
        '12 people are Watching it. It’s tomorrow, so it ranks first.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByText('Tomorrow · Fri Nov 13')).toBeInTheDocument();
    expect(screen.getByText('12 watching')).toBeInTheDocument();
  });

  it('adds the other shows crawled fine, from the venue, when the API has it', () => {
    open(row({ otherShowsCrawledFine: 41 }));
    expect(
      screen.getByText(
        /The other 41 Globe Hall shows crawled fine, so this isn’t a page problem\./,
      ),
    ).toBeInTheDocument();
  });

  it('sends answers through the same handler as the card', () => {
    const onAnswer = open(row({}));
    fireEvent.click(screen.getByRole('button', { name: 'Postponed' }));
    expect(onAnswer).toHaveBeenCalledWith(
      expect.objectContaining({ slug: 'postponed', notifiesFans: true }),
    );
  });
});

describe('VenuePanel', () => {
  const failing = row({
    key: 'venue-failing:v1',
    kind: 'venue-failing',
    title: 'Junkyard crawl is failing',
    venueName: 'Junkyard',
    cause: 'parse_failure',
    evidence: [{ label: 'Consecutive failures', value: '3' }],
    lastRuns: [
      {
        at: '2026-11-09T12:00:00Z',
        status: 'failed',
        errorMessage: 'No block',
        eventsFound: 0,
      },
      {
        at: '2026-11-11T12:00:00Z',
        status: 'failed',
        errorMessage: 'No block',
        eventsFound: 0,
      },
      {
        at: '2026-11-08T12:00:00Z',
        status: 'success',
        errorMessage: null,
        eventsFound: 14,
      },
    ],
    venueLive: true,
    pausedAt: '2026-11-11T13:00:00Z',
    showCount: 14,
    answers: [
      answer({ slug: 're_crawl_now', label: 'Re-crawl now' }),
      answer({ slug: 'keep_paused', label: 'Keep paused' }),
    ],
  });

  it('draws the cause, the runs newest first, and no lead without a suggestion', () => {
    open(failing);
    expect(
      screen.getByText('Junkyard stopped crawling after 3 failures'),
    ).toBeInTheDocument();
    expect(screen.getByText('LIKELY CAUSE')).toBeInTheDocument();
    expect(screen.getByText('LAST 4 RUNS')).toBeInTheDocument();
    const runs = screen.getByTestId('last-runs');
    expect(runs.textContent).toMatch(/Nov 11.*Nov 9.*Nov 8/);
    expect(runs).toHaveTextContent('OK');
    expect(screen.getByRole('button', { name: 'Re-crawl now' })).toBeVisible();
  });

  it('draws the chips, the OK run count and how many shows stay listed', () => {
    open(failing);
    expect(screen.getByText('Live')).toBeInTheDocument();
    expect(screen.getByText('Auto-paused: 3 failures')).toBeInTheDocument();
    expect(screen.getByTestId('last-runs')).toHaveTextContent('14 shows');
    expect(
      screen.getByText(/Its 14 shows stay listed but won’t update\./),
    ).toBeInTheDocument();
  });

  it('draws what we checked on a blocked venue', () => {
    open(
      row({
        key: 'venue-blocked:v1',
        kind: 'venue-blocked',
        venueName: 'The Ogden',
        evidence: [{ label: 'HTTP status', value: '429' }],
        answers: [answer({ slug: 're_crawl_once', label: 'Re-crawl once' })],
        venueLive: true,
        showCount: 27,
        pagesThisRun: 1,
        robots: 'no',
        okStreakBefore: 62,
        lastRuns: [
          {
            at: '2026-11-11T10:02:00Z',
            status: 'failed',
            errorMessage: null,
            eventsFound: null,
          },
        ],
      }),
    );
    expect(screen.getByText('CHECKED FOR YOU')).toBeInTheDocument();
    expect(screen.getByText('robots.txt')).toBeInTheDocument();
    expect(screen.getByText('Allows the crawler')).toBeInTheDocument();
    expect(screen.getByText('1 page every 3–5 s')).toBeInTheDocument();
    expect(screen.getByText('1 page')).toBeInTheDocument();
    expect(screen.getByText('Before this')).toBeInTheDocument();
    expect(screen.getByText('62 OK runs in a row')).toBeInTheDocument();
    expect(
      screen.getByText(
        /answered with 429 Too Many Requests on Nov 11 at 3:02 AM\./,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Its 27 shows stay listed but won’t update\./),
    ).toBeInTheDocument();
  });

  it('orders YOUR ANSWER as the board does: Re-crawl now, Check source, Keep paused', () => {
    open(failing);
    const recrawl = screen.getByRole('button', { name: 'Re-crawl now' });
    const source = screen.getByTestId('check-source');
    const paused = screen.getByRole('button', { name: 'Keep paused' });
    expect(source).toHaveAttribute('href', '/admin/venues/v1?tab=source');
    expect(
      recrawl.compareDocumentPosition(source) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      source.compareDocumentPosition(paused) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it('draws a blocked venue with its status chip', () => {
    open(
      row({
        key: 'venue-blocked:v1',
        kind: 'venue-blocked',
        venueName: 'The Ogden',
        evidence: [{ label: 'HTTP status', value: '429' }],
        answers: [answer({ slug: 're_crawl_once', label: 'Re-crawl once' })],
      }),
    );
    expect(screen.getByText('Blocked: 429')).toBeInTheDocument();
    expect(
      screen.getByText(/The Ogden answered with 429 Too Many Requests\./),
    ).toBeInTheDocument();
    expect(
      screen.getByText('The Ogden refused our crawler'),
    ).toBeInTheDocument();
  });
});
