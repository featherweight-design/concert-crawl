// @vitest-environment jsdom
import '@testing-library/jest-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { EvidenceSlot } from '../EvidenceSlot';
import type {
  ArtistCandidate,
  BugFacts,
  EventFacts,
  NeedsYouAnswer,
  PriceFacts,
  QueueRow,
} from '../needs-you-api';

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
  blockedAt: null,
  consecutiveFailures: 0,
  robotsTxtAllowed: null,
  robotsPath: null,
  showCount: null,
  okStreakBefore: null,
  pagesThisRun: null,
  robots: null,
  otherShowsCrawledFine: null,
  artistFacts: null,
  eventFacts: null,
  priceFacts: null,
  bugFacts: null,
  submissionIds: [],
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
      onSnooze={vi.fn()}
      onNotUseful={vi.fn()}
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
      answer({ slug: 'keep_paused', label: 'Keep paused...' }),
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
    const paused = screen.getByRole('button', { name: 'Keep paused...' });
    expect(source).toHaveAttribute('href', '/admin/venues/v1?tab=source');
    expect(
      recrawl.compareDocumentPosition(source) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      source.compareDocumentPosition(paused) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it('says Still allows {path} when the stored robots check allows the crawler', () => {
    open(
      row({
        key: 'venue-blocked:v1',
        kind: 'venue-blocked',
        venueName: 'The Ogden',
        evidence: [{ label: 'HTTP status', value: '429' }],
        robots: 'no',
        robotsPath: '/events',
        answers: [answer({ slug: 're_crawl_once', label: 'Re-crawl once' })],
      }),
    );
    expect(screen.getByText('Still allows /events')).toBeInTheDocument();
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

const candidate = (over: Partial<ArtistCandidate>): ArtistCandidate => ({
  id: 'sp1',
  name: 'Wild Child',
  imageUrl: null,
  genres: ['indie'],
  current: false,
  exact: true,
  playsDenver: true,
  ...over,
});

const artistRow = (
  candidates: ArtistCandidate[],
  over: Partial<QueueRow> = {},
) =>
  row({
    key: 'artist:a1',
    kind: 'artist',
    title: 'Wild Child',
    reportCount: 2,
    answers: [
      answer({
        slug: 'pick_the_right_artist',
        label: 'Pick the right artist',
        suggested: true,
      }),
      answer({ slug: 'keep_this_match', label: 'Keep this match' }),
    ],
    artistFacts: {
      nextShowVenue: 'Globe Hall',
      spotifyArtistId: 'cur',
      photoUrl: null,
      reportReasons: ['wrong_photo'],
      candidates,
    },
    ...over,
  });

describe('ArtistPanel', () => {
  it('picks the best candidate and sends its id with the answer', () => {
    const send = open(
      artistRow([
        candidate({ id: 'cur', name: 'Wild Child (current)', current: true }),
        candidate({ id: 'sp2', name: 'Wild Child Band' }),
      ]),
    );
    fireEvent.click(screen.getByText('Use Wild Child Band (Denver)'));
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({ slug: 'pick_the_right_artist' }),
      { spotifyArtistId: 'sp2' },
    );
  });

  it('names the Denver act on the lead button, and only that one', () => {
    open(
      artistRow([
        candidate({ id: 'sp1', name: 'Away Act', playsDenver: false }),
      ]),
    );
    expect(screen.getByText('Use Away Act')).toBeInTheDocument();
  });

  it('follows the picked card, and relabels keep_this_match', () => {
    const send = open(
      artistRow([
        candidate({ id: 'sp1', name: 'One' }),
        candidate({ id: 'sp2', name: 'Two' }),
      ]),
    );
    fireEvent.click(screen.getAllByTestId('artist-candidate')[1]!);
    fireEvent.click(screen.getByText('Use Two (Denver)'));
    expect(send).toHaveBeenCalledWith(expect.anything(), {
      spotifyArtistId: 'sp2',
    });
    expect(screen.getByText('Keep current photo')).toBeInTheDocument();
  });

  it('offers no pick when there is no candidate', () => {
    open(artistRow([]));
    expect(
      document.querySelector('[data-slug="pick_the_right_artist"]'),
    ).toBeNull();
    expect(
      document.querySelector('[data-slug="keep_this_match"]'),
    ).not.toBeNull();
  });
});

const eventRow = (over: Partial<EventFacts> = {}) =>
  row({
    key: 'event-low-confidence:e9',
    kind: 'event-low-confidence',
    title: 'Open Mic Night',
    answers: [
      answer({ slug: 'its_a_show', label: 'It’s a show', suggested: true }),
      answer({ slug: 'edit_then_list', label: 'Edit, then list' }),
      answer({ slug: 'not_a_concert', label: 'Not a concert' }),
    ],
    eventFacts: {
      eventId: 'e9',
      artist: 'Open Mic Night',
      description: 'Sign up at the door.',
      confidence: 0.55,
      autoApproveBar: 0.7,
      ...over,
    },
  });

describe('EventPanel', () => {
  it('says which side of the bar the score is on', () => {
    open(eventRow());
    expect(screen.getByText(/0\.55/)).toBeInTheDocument();
    cleanup();
    open(eventRow({ confidence: 0.9 }));
    expect(screen.getByText(/0\.90/)).toBeInTheDocument();
  });

  it('quotes the venue page and lists what would be listed', () => {
    open(eventRow());
    expect(screen.getByTestId('venue-quote')).toHaveTextContent(
      '“Sign up at the door.”',
    );
    expect(screen.getByText('WHAT WE’D LIST')).toBeInTheDocument();
    expect(screen.queryByText('Price')).toBeNull();
  });

  it('draws Edit, then list as a link to the event, not an answer', () => {
    open(eventRow());
    expect(screen.getByTestId('edit-event')).toHaveAttribute(
      'href',
      '/admin/events/e9/edit',
    );
    expect(document.querySelector('[data-slug="edit_then_list"]')).toBeNull();
  });
});

const priceRow = (over: Partial<PriceFacts> = {}) =>
  row({
    key: 'price-check:p1',
    kind: 'price-check',
    title: 'Wild Child',
    watchers: 3,
    answers: [
      answer({
        slug: 'use_checked_price',
        label: 'Use the checked price',
        suggested: true,
      }),
      answer({ slug: 'keep_listed_price', label: 'Keep the listed price' }),
    ],
    priceFacts: {
      listed: '29.00',
      listedMax: '64.00',
      checked: '45.00',
      checkedMax: null,
      tier: 'GA',
      listedAt: '2026-11-10T18:00:00.000Z',
      checkedAt: '2026-11-12T16:00:00.000Z',
      checkedFans: 2,
      listedFans: 1,
      ticketUrl: 'https://tickets.example/e',
      checkerSubmissions: 3,
      checkerApproved: 3,
      ...over,
    },
  });

describe('PriceCheckPanel', () => {
  it('draws the two prices as ranges', () => {
    open(priceRow());
    expect(screen.getByTestId('price-listed')).toHaveTextContent('$29–$64');
    expect(screen.getByTestId('price-checked')).toHaveTextContent('$45+');
  });

  it('labels the answers with the prices they pick', () => {
    open(priceRow());
    expect(screen.getByText('Use $45+')).toBeInTheDocument();
    expect(screen.getByText('Keep $29–$64')).toBeInTheDocument();
  });

  it('opens the ticket page in a new tab, and only when there is one', () => {
    open(priceRow());
    expect(screen.getByTestId('open-ticket-page')).toHaveAttribute(
      'target',
      '_blank',
    );
    cleanup();
    open(priceRow({ ticketUrl: null }));
    expect(screen.queryByTestId('open-ticket-page')).toBeNull();
  });

  it('puts the ticket page first, above both answers', () => {
    open(priceRow());
    const link = screen.getByTestId('open-ticket-page');
    const answers = screen.getAllByTestId('needs-you-answer');
    expect(
      link.compareDocumentPosition(answers[0] as HTMLElement) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it('draws CHECKED FOR YOU from the checker record and WHO SEES IT from the Watchers', () => {
    open(priceRow());
    expect(screen.getByText('CHECKED FOR YOU')).toBeInTheDocument();
    expect(screen.getByText('The fan who checked')).toBeInTheDocument();
    expect(screen.getByText('3 prices, all approved')).toBeInTheDocument();
    expect(screen.getByText('WHO SEES IT')).toBeInTheDocument();
    expect(
      screen.getByText('3 people are Watching. The show is tomorrow.'),
    ).toBeInTheDocument();
  });

  it('leaves CHECKED FOR YOU out when the fan has no record', () => {
    open(priceRow({ checkerSubmissions: 0 }));
    expect(screen.queryByText('CHECKED FOR YOU')).toBeNull();
  });
});

const bugRow = (over: Partial<BugFacts> = {}) =>
  row({
    key: 'bug:b1',
    kind: 'bug',
    title: 'Button broken',
    answers: [answer({ slug: 'resolve', label: 'Resolve', suggested: true })],
    evidence: [{ label: 'Page', value: 'https://concertcrawl.app/events/abc' }],
    bugFacts: {
      message: 'Button broken',
      createdAt: null,
      handle: 'fan1',
      screenshot: null,
      issueUrl: null,
      device: null,
      ...over,
    },
  });

describe('BugPanel', () => {
  it('draws the report, who sent it and the page path', () => {
    open(bugRow());
    // The panel title quotes the message too, so it shows twice.
    expect(screen.getAllByText('“Button broken”')).toHaveLength(2);
    expect(screen.getByText('@fan1')).toBeInTheDocument();
    expect(screen.getByText('/events/abc')).toBeInTheDocument();
  });

  it("draws the reporter's device only when the widget sent one", () => {
    open(bugRow());
    expect(screen.queryByText('Device')).toBeNull();
    cleanup();
    open(bugRow({ device: 'iPhone · Safari 19' }));
    expect(screen.getByText('Device')).toBeInTheDocument();
    expect(screen.getByText('iPhone · Safari 19')).toBeInTheDocument();
  });

  it('draws a screenshot only when there is one', () => {
    open(bugRow());
    expect(screen.queryByTestId('bug-screenshot')).toBeNull();
    cleanup();
    open(bugRow({ screenshot: 'data:image/png;base64,AAAA' }));
    expect(screen.getByTestId('bug-screenshot')).toHaveAttribute(
      'src',
      'data:image/png;base64,AAAA',
    );
  });

  it('links to GitHub only with an issue, and has no reply box', () => {
    open(bugRow());
    expect(screen.queryByTestId('open-github')).toBeNull();
    expect(screen.queryByRole('textbox')).toBeNull();
    cleanup();
    open(bugRow({ issueUrl: 'https://github.com/o/r/issues/1' }));
    expect(screen.getByTestId('open-github')).toHaveAttribute(
      'href',
      'https://github.com/o/r/issues/1',
    );
  });
});
