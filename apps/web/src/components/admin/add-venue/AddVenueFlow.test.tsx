// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';

type Outcome = {
  success: boolean;
  id?: string;
  field?: string;
  conflict?: boolean;
};
const mockCreateDraft = vi.fn<(body: FormData) => Promise<Outcome>>();
const mockUpdateVenue =
  vi.fn<(id: string, body: FormData) => Promise<Outcome>>();
// Source tests its page the moment it opens; a refused test keeps these flows
// on what they check (SourceStep.test.tsx covers the test card).
vi.mock('@/lib/actions/venues', () => ({
  createDraftVenue: (body: FormData) => mockCreateDraft(body),
  updateVenue: (id: string, body: FormData) => mockUpdateVenue(id, body),
  askVenuePermission: () => Promise.resolve({ ok: true }),
  testCrawlVenue: () => mockTestCrawl(),
  readTestCrawl: () => mockReadTest(),
  goLiveVenue: (id: string) => mockGoLive(id),
}));

const mockTestCrawl = vi.fn();
const mockReadTest = vi.fn();
const mockGoLive = vi.fn();

const mockReplace = vi.fn();
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace, push: mockPush }),
}));

vi.mock('@/components/admin/shell/PageTitleContext', () => ({
  usePageTitle: () => ({ setPageTitle: vi.fn(), setPhoneBack: vi.fn() }),
}));

// The robots.txt card's check is a network read; desktop draws it.
vi.mock('@/lib/api', () => ({
  adminFetch: () => Promise.resolve(new Response('{}', { status: 500 })),
}));

import { AddVenueFlow } from './AddVenueFlow';

const COPY = ADMIN_COPY.addVenue;
const FIELDS = ADMIN_COPY.venueDetails.fields;

const type = (label: string, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });

const fillDazzle = () => {
  type(FIELDS.name, 'Dazzle Jazz');
  type(FIELDS.website, 'dazzledenver.com');
};

beforeEach(() => {
  // `useIsPhone` reads matchMedia, which jsdom does not ship: desktop.
  window.matchMedia = vi.fn().mockImplementation(() => ({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
  mockCreateDraft.mockReset();
  mockUpdateVenue.mockReset();
  mockReplace.mockReset();
  mockPush.mockReset();
  mockTestCrawl.mockReset();
  mockReadTest.mockReset();
  mockGoLive.mockReset();
  mockTestCrawl.mockResolvedValue({ ok: false, code: 'not_draft' });
  mockReadTest.mockResolvedValue(null);
});
afterEach(cleanup);

describe('AddVenueFlow', () => {
  it('opens on Start, with Nobody asked yet and Start from scratch', () => {
    render(<AddVenueFlow draft={null} />);
    expect(screen.getByText(COPY.start.emptyTitle)).toBeTruthy();
    fireEvent.click(screen.getByTestId('add-venue-from-scratch'));
    expect(screen.getByTestId('add-venue-shell')).toBeTruthy();
    expect(screen.getByText(COPY.basics.title)).toBeTruthy();
  });

  it('makes the link from the name until the link is edited', () => {
    render(<AddVenueFlow draft={null} />);
    fireEvent.click(screen.getByTestId('add-venue-from-scratch'));
    type(FIELDS.name, 'Dazzle Jazz');
    const link = screen.getByLabelText<HTMLInputElement>(FIELDS.link.label);
    expect(link.value).toBe('dazzle-jazz');
    type(FIELDS.link.label, 'dazzle');
    type(FIELDS.name, 'Dazzle Jazz Club');
    expect(link.value).toBe('dazzle');
  });

  it('shows what is missing and sends nothing', () => {
    render(<AddVenueFlow draft={null} />);
    fireEvent.click(screen.getByTestId('add-venue-from-scratch'));
    fireEvent.click(screen.getByTestId('add-venue-continue'));
    expect(screen.getByText(COPY.errors.nameRequired)).toBeTruthy();
    expect(screen.getByText(COPY.errors.websiteRequired)).toBeTruthy();
    expect(mockCreateDraft).not.toHaveBeenCalled();
  });

  it('saves the draft on Continue, moves the URL to it, checks Basics off and opens Source', async () => {
    mockCreateDraft.mockResolvedValue({ success: true, id: 'v-9' });
    // Source starts its test crawl on open. Left to the default stub it ends
    // refused within a microtask or two, which enables Continue, and the last
    // assertion raced that. A crawl that never answers holds Source on running.
    mockTestCrawl.mockReturnValue(new Promise(() => undefined));
    render(<AddVenueFlow draft={null} />);
    fireEvent.click(screen.getByTestId('add-venue-from-scratch'));
    fillDazzle();
    fireEvent.click(screen.getByTestId('add-venue-continue'));
    await waitFor(() =>
      expect(mockReplace).toHaveBeenCalledWith(
        '/admin/venues/new?id=v-9&step=basics',
      ),
    );
    const body = mockCreateDraft.mock.calls.at(0)?.[0];
    expect(body?.get('slug')).toBe('dazzle-jazz');
    expect(body?.get('websiteUrl')).toBe('https://dazzledenver.com');
    await waitFor(() =>
      expect(mockReplace).toHaveBeenCalledWith(
        '/admin/venues/new?id=v-9&step=source',
      ),
    );
    expect(
      screen.getByTestId('add-venue-step-basics').getAttribute('data-done'),
    ).toBe('true');
    expect(
      screen.getByTestId('add-venue-step-source').getAttribute('aria-current'),
    ).toBe('step');
    // Continue waits for the test crawl to finish.
    expect(
      screen.getByTestId<HTMLButtonElement>('add-venue-continue').disabled,
    ).toBe(true);
  });

  it('patches only what changed on a resumed draft', async () => {
    mockUpdateVenue.mockResolvedValue({ success: true });
    render(
      <AddVenueFlow
        draft={{
          id: 'v-9',
          basics: {
            name: 'Dazzle',
            slug: 'dazzle',
            address: '',
            capacityType: '',
            capacity: '',
            website: 'dazzledenver.com',
          },
        }}
      />,
    );
    type(FIELDS.name, 'Dazzle Jazz');
    // A saved link stays the admin's.
    expect(
      screen.getByLabelText<HTMLInputElement>(FIELDS.link.label).value,
    ).toBe('dazzle');
    fireEvent.click(screen.getByTestId('add-venue-continue'));
    await waitFor(() => expect(mockUpdateVenue).toHaveBeenCalled());
    const [id, body] = mockUpdateVenue.mock.calls.at(0) ?? [];
    expect(id).toBe('v-9');
    expect(Array.from(body?.keys() ?? [])).toEqual(['name']);
    await waitFor(() =>
      expect(mockReplace).toHaveBeenCalledWith(
        '/admin/venues/new?id=v-9&step=source',
      ),
    );
  });

  it('creates one draft however fast Continue is pressed twice', async () => {
    let finish: (outcome: Outcome) => void = () => {};
    mockCreateDraft.mockReturnValue(
      new Promise<Outcome>((resolve) => {
        finish = resolve;
      }),
    );
    render(<AddVenueFlow draft={null} />);
    fireEvent.click(screen.getByTestId('add-venue-from-scratch'));
    fillDazzle();
    const go = screen.getByTestId('add-venue-continue');
    fireEvent.click(go);
    fireEvent.click(go);
    finish({ success: true, id: 'v-9' });
    await waitFor(() => expect(mockReplace).toHaveBeenCalled());
    expect(mockCreateDraft).toHaveBeenCalledTimes(1);
  });

  it('stops remaking the link from the name once the draft is saved', async () => {
    mockCreateDraft.mockResolvedValue({ success: true, id: 'v-9' });
    render(<AddVenueFlow draft={null} />);
    fireEvent.click(screen.getByTestId('add-venue-from-scratch'));
    fillDazzle();
    fireEvent.click(screen.getByTestId('add-venue-continue'));
    await waitFor(() =>
      expect(mockReplace).toHaveBeenCalledWith(
        '/admin/venues/new?id=v-9&step=source',
      ),
    );
    // Back from Source returns to Basics, where the name can change again.
    fireEvent.click(screen.getByTestId('add-venue-back'));
    type(FIELDS.name, 'Dazzle Jazz Club');
    expect(
      screen.getByLabelText<HTMLInputElement>(FIELDS.link.label).value,
    ).toBe('dazzle-jazz');
  });

  it('focuses the first field it marks', () => {
    render(<AddVenueFlow draft={null} />);
    fireEvent.click(screen.getByTestId('add-venue-from-scratch'));
    fireEvent.click(screen.getByTestId('add-venue-continue'));
    const name = screen.getByLabelText(FIELDS.name);
    expect(document.activeElement).toBe(name);
    expect(name.getAttribute('aria-describedby')).toBe('add-venue-name-error');
  });

  it('clears a field error once the field is edited', () => {
    render(<AddVenueFlow draft={null} />);
    fireEvent.click(screen.getByTestId('add-venue-from-scratch'));
    fireEvent.click(screen.getByTestId('add-venue-continue'));
    type(FIELDS.name, 'Dazzle Jazz');
    expect(screen.queryByText(COPY.errors.nameRequired)).toBeNull();
    expect(screen.getByText(COPY.errors.websiteRequired)).toBeTruthy();
  });

  it('puts a taken link on the link field', async () => {
    mockCreateDraft.mockResolvedValue({
      success: false,
      field: 'slug',
      conflict: true,
    });
    render(<AddVenueFlow draft={null} />);
    fireEvent.click(screen.getByTestId('add-venue-from-scratch'));
    fillDazzle();
    fireEvent.click(screen.getByTestId('add-venue-continue'));
    expect(await screen.findByText(COPY.errors.linkTaken)).toBeTruthy();
  });

  it('puts a website the API refused on the website field', async () => {
    mockCreateDraft.mockResolvedValue({ success: false, field: 'websiteUrl' });
    render(<AddVenueFlow draft={null} />);
    fireEvent.click(screen.getByTestId('add-venue-from-scratch'));
    fillDazzle();
    fireEvent.click(screen.getByTestId('add-venue-continue'));
    expect(await screen.findByText(COPY.errors.websiteInvalid)).toBeTruthy();
  });

  it('says a failed save failed', async () => {
    mockCreateDraft.mockRejectedValue(new Error('network'));
    render(<AddVenueFlow draft={null} />);
    fireEvent.click(screen.getByTestId('add-venue-from-scratch'));
    fillDazzle();
    fireEvent.click(screen.getByTestId('add-venue-continue'));
    expect((await screen.findByRole('alert')).textContent).toBe(
      COPY.errors.saveFailed,
    );
  });

  it('goes back to Start before the draft exists, and to Venues after', async () => {
    const { unmount } = render(<AddVenueFlow draft={null} />);
    fireEvent.click(screen.getByTestId('add-venue-from-scratch'));
    fireEvent.click(screen.getByTestId('add-venue-back'));
    expect(screen.getByTestId('add-venue-start')).toBeTruthy();
    unmount();
    render(
      <AddVenueFlow
        draft={{ id: 'v-9', basics: { ...emptyWithName('Dazzle') } }}
      />,
    );
    fireEvent.click(screen.getByTestId('add-venue-back'));
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/admin/venues'));
    expect(mockUpdateVenue).not.toHaveBeenCalled();
  });

  it('saves an edit before Back leaves a saved draft', async () => {
    mockUpdateVenue.mockResolvedValue({ success: true });
    render(
      <AddVenueFlow
        draft={{ id: 'v-9', basics: { ...emptyWithName('Dazzle') } }}
      />,
    );
    type(FIELDS.name, 'Dazzle Jazz');
    fireEvent.click(screen.getByTestId('add-venue-back'));
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/admin/venues'));
    expect(mockUpdateVenue).toHaveBeenCalledTimes(1);
  });

  it('keeps the admin on Basics when Back cannot save the edit', () => {
    render(
      <AddVenueFlow
        draft={{ id: 'v-9', basics: { ...emptyWithName('Dazzle') } }}
      />,
    );
    type(FIELDS.name, '');
    fireEvent.click(screen.getByTestId('add-venue-back'));
    expect(screen.getByText(COPY.errors.nameRequired)).toBeTruthy();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('draws Icon and Guide as not open yet, and Source and Review as open', () => {
    render(<AddVenueFlow draft={null} />);
    fireEvent.click(screen.getByTestId('add-venue-from-scratch'));
    expect(
      screen.getByTestId('add-venue-step-source').getAttribute('aria-disabled'),
    ).toBeNull();
    for (const step of ['icon', 'guide']) {
      expect(
        screen
          .getByTestId(`add-venue-step-${step}`)
          .getAttribute('aria-disabled'),
      ).toBe('true');
    }
  });

  describe('Review and Go live', () => {
    const FOUND = {
      status: 'found',
      found: 14,
      samples: [],
      counts: { jsonld: 14, llm: 0, html: 0 },
      costUsd: 0,
    };
    const resumeOnSource = () =>
      render(
        <AddVenueFlow
          draft={{
            id: 'v-9',
            step: 'source',
            basics: emptyWithName('Dazzle Jazz'),
          }}
        />,
      );

    it('keeps Continue off until the test passes, then opens a ready Review', async () => {
      mockTestCrawl.mockResolvedValue({ ok: true, triggerId: 't-1' });
      mockReadTest.mockResolvedValue({ status: 'done', testResult: FOUND });
      vi.useFakeTimers({ shouldAdvanceTime: true });
      resumeOnSource();
      const next = screen.getByTestId('add-venue-continue');
      expect(next.hasAttribute('disabled')).toBe(true);
      await waitFor(() => expect(next.hasAttribute('disabled')).toBe(false), {
        timeout: 5000,
      });
      fireEvent.click(next);
      expect(screen.getByText(COPY.review.title)).toBeTruthy();
      expect(screen.getByTestId('add-venue-continue').textContent).toBe(
        COPY.review.goLive,
      );
      vi.useRealTimers();
    });

    it('goes live and shows Gone live, then starts over on Add another', async () => {
      mockTestCrawl.mockResolvedValue({ ok: true, triggerId: 't-1' });
      mockReadTest.mockResolvedValue({ status: 'done', testResult: FOUND });
      mockGoLive.mockResolvedValue({
        ok: true,
        crawlQueued: true,
        guide: null,
      });
      resumeOnSource();
      const next = screen.getByTestId('add-venue-continue');
      await waitFor(() => expect(next.hasAttribute('disabled')).toBe(false), {
        timeout: 5000,
      });
      fireEvent.click(next);
      fireEvent.click(screen.getByTestId('add-venue-continue'));
      await waitFor(() =>
        expect(screen.getByTestId('add-venue-gone-live')).toBeTruthy(),
      );
      expect(mockGoLive).toHaveBeenCalledWith('v-9');
      expect(screen.getByText(COPY.gone.crawlQueued)).toBeTruthy();
      const loc = { href: '' };
      const original = window.location;
      Object.defineProperty(window, 'location', {
        configurable: true,
        value: loc,
      });
      fireEvent.click(screen.getByTestId('add-venue-add-another'));
      Object.defineProperty(window, 'location', {
        configurable: true,
        value: original,
      });
      expect(loc.href).toBe('/admin/venues/new');
    });

    it('says nothing was published when Go live fails, and offers Try again', async () => {
      mockTestCrawl.mockResolvedValue({ ok: true, triggerId: 't-1' });
      mockReadTest.mockResolvedValue({ status: 'done', testResult: FOUND });
      mockGoLive.mockResolvedValue({ ok: false, reason: 'failed' });
      resumeOnSource();
      const next = screen.getByTestId('add-venue-continue');
      await waitFor(() => expect(next.hasAttribute('disabled')).toBe(false), {
        timeout: 5000,
      });
      fireEvent.click(next);
      fireEvent.click(screen.getByTestId('add-venue-continue'));
      await waitFor(() =>
        expect(screen.getByTestId('add-venue-go-live-failed')).toBeTruthy(),
      );
      expect(screen.queryByTestId('add-venue-gone-live')).toBeNull();
      mockGoLive.mockResolvedValue({
        ok: true,
        crawlQueued: false,
        guide: null,
      });
      fireEvent.click(screen.getByTestId('add-venue-go-live-retry'));
      await waitFor(() =>
        expect(screen.getByText(COPY.gone.crawlNotQueued)).toBeTruthy(),
      );
    });
  });
});

function emptyWithName(name: string) {
  return {
    name,
    slug: 'dazzle',
    address: '',
    capacityType: '',
    capacity: '',
    website: 'dazzledenver.com',
  };
}
