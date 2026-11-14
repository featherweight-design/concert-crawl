// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';

const mockUpdateVenue = vi.fn();
const mockGenerate = vi.fn();
vi.mock('@/lib/actions/venues', () => ({
  updateVenue: (...args: unknown[]) => mockUpdateVenue(...args),
  generateVenueAbout: (...args: unknown[]) => mockGenerate(...args),
}));

const mockRefresh = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mockRefresh, push: vi.fn(), replace: vi.fn() }),
}));

// The review UI has its own suite; this stub accepts the draft on a click,
// shows what it holds, offers Cancel, and holds Accept when disabled.
vi.mock('@/components/admin/generate-field/GenerateField', () => ({
  GenerateField: ({
    state,
    result,
    onAccept,
    onCancel,
    disabled,
  }: {
    state: string;
    result?: { content: string };
    onAccept: (content: string) => void;
    onCancel?: () => void;
    disabled?: boolean;
  }) => (
    <>
      <button
        type="button"
        data-testid={`generate-${state}`}
        data-content={result?.content ?? ''}
        disabled={disabled}
        onClick={() => onAccept(result?.content ?? '')}
      >
        accept
      </button>
      <button type="button" onClick={() => onCancel?.()}>
        cancel
      </button>
    </>
  ),
}));

import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import { DetailsTab, type DetailsVenue } from './DetailsTab';

const COPY = ADMIN_COPY.venueDetails;
const FIELDS = COPY.fields;

let phone = false;
const mediaListeners = new Set<EventListenerOrEventListenerObject>();
const matchMediaStub = (query: string): MediaQueryList => ({
  get matches() {
    return phone;
  },
  media: query,
  onchange: null,
  addListener: () => undefined,
  removeListener: () => undefined,
  addEventListener: (
    _type: string,
    listener: EventListenerOrEventListenerObject,
  ) => {
    mediaListeners.add(listener);
  },
  removeEventListener: (
    _type: string,
    listener: EventListenerOrEventListenerObject,
  ) => {
    mediaListeners.delete(listener);
  },
  dispatchEvent: () => false,
});
/** Crosses the admin breakpoint, as a resize would. */
const setPhone = (next: boolean) => {
  phone = next;
  act(() => {
    const change = new Event('change');
    for (const listener of mediaListeners) {
      if (typeof listener === 'function') listener(change);
      else listener.handleEvent(change);
    }
  });
};
/** A draft request the test settles by hand. */
const deferred = <T,>() => {
  let resolve: (value: T) => void = () => undefined;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
};
const drafted = (about: string) => ({
  success: true,
  data: {
    about,
    capacity: 18000,
    venueType: 'Amphitheater',
    neighborhood: 'LoDo',
  },
});

const venue: DetailsVenue = {
  id: 'venue-1',
  websiteUrl: 'https://www.ballarena.com/events',
  name: 'Ball Arena',
  // A slug with a drawn glyph, so the Look card shows its icon and hero.
  slug: 'ball-arena',
  address: '1000 Chopper Cir, Denver, CO 80204',
  neighborhood: 'Central Platte Valley',
  lat: 39.7487,
  lng: -105.0077,
  venueType: 'Arena',
  capacity: 19500,
  about: 'Denver’s big indoor arena.',
  ticketVendor: 'ticketmaster',
  priceUrl: 'https://ballarena.com/tickets',
  contactEmail: 'booking@ballarena.com',
  city: 'Denver',
};

const input = (label: string): HTMLInputElement => {
  const el = screen.getByLabelText(label);
  if (!(el instanceof HTMLInputElement)) throw new Error(`${label}: no input`);
  return el;
};
const sentForm = (): FormData => {
  const formData = mockUpdateVenue.mock.calls.at(-1)?.[1];
  if (!(formData instanceof FormData)) throw new Error('No FormData sent');
  return formData;
};
const save = () =>
  fireEvent.click(screen.getByRole('button', { name: COPY.saveBar.save }));

describe('DetailsTab', () => {
  beforeEach(() => {
    phone = false;
    mediaListeners.clear();
    vi.stubGlobal('matchMedia', matchMediaStub);
    mockUpdateVenue.mockReset();
    mockUpdateVenue.mockResolvedValue({ success: true });
    mockRefresh.mockReset();
    mockGenerate.mockReset();
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('draws the five cards, with the venue’s values', () => {
    render(<DetailsTab venue={venue} />);
    const titles = screen
      .getAllByRole('region')
      .map((region) => region.getAttribute('aria-label'));
    // Desktop: the left column, then the right.
    expect(titles).toEqual([
      COPY.cards.venue,
      COPY.cards.about,
      COPY.cards.tickets,
      COPY.cards.contact,
      COPY.cards.look,
    ]);
    expect(input(FIELDS.city).value).toBe('Denver');
    expect(
      screen.getByRole('textbox', { name: COPY.cards.about }),
    ).toHaveProperty('value', 'Denver’s big indoor arena.');
    expect(input(FIELDS.name).value).toBe('Ball Arena');
    expect(input(FIELDS.mapPin.label).value).toBe('39.7487, −105.0077');
    expect(input(FIELDS.capacity.label).value).toBe('19,500');
    expect(input(FIELDS.link.label).value).toBe('ball-arena');
    expect(input(FIELDS.contactEmail.label).value).toBe(
      'booking@ballarena.com',
    );
    // Ruling b: the Website is Source's calendar page, read-only here.
    expect(input(FIELDS.website).value).toBe('ballarena.com');
    expect(input(FIELDS.website).readOnly).toBe(true);
    // Ruling h: the pin is entered by hand, never "Set from the address".
    expect(screen.getByText(FIELDS.mapPin.hint)).toBeTruthy();
    expect(screen.queryByText('Set from the address.')).toBeNull();
  });

  it('offers the six capacity types, and keeps a stored one outside them', () => {
    render(<DetailsTab venue={{ ...venue, venueType: 'Black box' }} />);
    const select = screen.getByLabelText(FIELDS.capacityType.label);
    const options = within(select)
      .getAllByRole('option')
      .map((option) => option.textContent);
    expect(options).toEqual([
      FIELDS.capacityType.none,
      ...Object.values(COPY.capacityTypes),
      FIELDS.capacityType.current('Black box'),
    ]);
  });

  it('has no Save bar until something changes, then counts the changes', () => {
    render(<DetailsTab venue={venue} />);
    expect(screen.queryByTestId('details-save-bar')).toBeNull();
    fireEvent.change(input(FIELDS.address), { target: { value: '1 Main St' } });
    expect(screen.getByText(COPY.saveBar.unsaved(1))).toBeTruthy();
    fireEvent.change(input(FIELDS.neighborhood), { target: { value: 'LoDo' } });
    expect(screen.getByText(COPY.saveBar.unsaved(2))).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: COPY.saveBar.discard }));
    expect(screen.queryByTestId('details-save-bar')).toBeNull();
    expect(input(FIELDS.address).value).toBe(venue.address);
  });

  // Style contract only (jsdom has no layout): Details' look on the shared
  // PinnedSaveBar, as `details-d` and `details-m` draw it.
  it('draws the Save bar in Details’ look on desktop and phone', () => {
    render(<DetailsTab venue={venue} />);
    fireEvent.change(input(FIELDS.address), { target: { value: '1 Main St' } });
    const bar = screen.getByTestId('details-save-bar');
    expect(bar.style.gap).toBe('10px');
    expect(bar.style.padding).toBe('13px 16px');
    expect(bar.style.flexWrap).toBe('');
    expect(screen.getByText(COPY.saveBar.unsaved(1)).style.color).toBe(
      'var(--warning)',
    );
    expect(
      screen.getByRole('button', { name: COPY.saveBar.save }).style.height,
    ).toBe('38px');
    setPhone(true);
    expect(bar.style.gap).toBe('8px');
    expect(bar.style.padding).toBe('12px 16px 24px');
  });

  it('saves only the changed columns, then refreshes', async () => {
    render(<DetailsTab venue={venue} />);
    fireEvent.change(input(FIELDS.mapPin.label), {
      target: { value: '39.75, -105' },
    });
    fireEvent.change(input(FIELDS.contactEmail.label), {
      target: { value: 'hello@ballarena.com' },
    });
    save();
    await waitFor(() => expect(mockUpdateVenue).toHaveBeenCalledTimes(1));
    expect(mockUpdateVenue.mock.calls[0]?.[0]).toBe('venue-1');
    expect([...sentForm().keys()]).toEqual(['lat', 'lng', 'contactEmail']);
    expect(sentForm().get('lat')).toBe('39.75');
    expect(sentForm().get('lng')).toBe('-105');
    await waitFor(() => expect(mockRefresh).toHaveBeenCalled());
    expect(screen.queryByTestId('details-save-bar')).toBeNull();
  });

  it('a capacity type pick writes the setting’s name', async () => {
    render(<DetailsTab venue={venue} />);
    fireEvent.change(screen.getByLabelText(FIELDS.capacityType.label), {
      target: { value: COPY.capacityTypes.theater },
    });
    save();
    await waitFor(() => expect(mockUpdateVenue).toHaveBeenCalledTimes(1));
    expect(sentForm().get('venueType')).toBe(COPY.capacityTypes.theater);
  });

  it('checks the fields before sending anything', () => {
    render(<DetailsTab venue={venue} />);
    fireEvent.change(input(FIELDS.mapPin.label), { target: { value: '39.7' } });
    fireEvent.change(input(FIELDS.contactEmail.label), {
      target: { value: 'nope' },
    });
    save();
    expect(mockUpdateVenue).not.toHaveBeenCalled();
    expect(screen.getByText(FIELDS.mapPin.invalid)).toBeTruthy();
    expect(screen.getByText(FIELDS.contactEmail.invalid)).toBeTruthy();
    expect(input(FIELDS.mapPin.label).getAttribute('aria-invalid')).toBe(
      'true',
    );
  });

  it('a slug refusal lands on Link and keeps the edit, with no Try again', async () => {
    mockUpdateVenue.mockResolvedValue({
      success: false,
      field: 'slug',
      error: 'Slug already in use',
    });
    render(<DetailsTab venue={venue} />);
    fireEvent.change(input(FIELDS.link.label), { target: { value: 'gothic' } });
    save();
    await waitFor(() =>
      expect(input(FIELDS.link.label).getAttribute('aria-invalid')).toBe(
        'true',
      ),
    );
    expect(input(FIELDS.link.label).value).toBe('gothic');
    expect(screen.getByTestId('save-failed')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Try again' })).toBeNull();
  });

  it('a failed save keeps the edit and offers Try again', async () => {
    mockUpdateVenue.mockResolvedValueOnce({ success: false, error: 'Down.' });
    render(<DetailsTab venue={venue} />);
    fireEvent.change(input(FIELDS.address), { target: { value: '1 Main St' } });
    save();
    await waitFor(() => expect(screen.getByTestId('save-failed')).toBeTruthy());
    expect(screen.getByText(COPY.failed.title)).toBeTruthy();
    expect(input(FIELDS.address).value).toBe('1 Main St');
    expect(screen.getByTestId('details-save-bar')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    await waitFor(() => expect(mockUpdateVenue).toHaveBeenCalledTimes(2));
    expect(sentForm().get('address')).toBe('1 Main St');
  });

  it('a thrown save keeps the edit too', async () => {
    mockUpdateVenue.mockRejectedValueOnce(new Error('network'));
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    render(<DetailsTab venue={venue} />);
    fireEvent.change(input(FIELDS.address), { target: { value: '1 Main St' } });
    save();
    await waitFor(() => expect(screen.getByTestId('save-failed')).toBeTruthy());
    expect(input(FIELDS.address).value).toBe('1 Main St');
    spy.mockRestore();
  });

  it('Try again moves the attempt onto a newer row, never writing it back', async () => {
    mockUpdateVenue.mockResolvedValueOnce({ success: false, error: 'Down.' });
    const { rerender } = render(<DetailsTab venue={venue} />);
    fireEvent.change(input(FIELDS.address), { target: { value: '1 Main St' } });
    save();
    await waitFor(() => expect(screen.getByTestId('save-failed')).toBeTruthy());

    // Someone else's save lands before the retry.
    rerender(<DetailsTab venue={{ ...venue, neighborhood: 'LoDo' }} />);
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    await waitFor(() => expect(mockUpdateVenue).toHaveBeenCalledTimes(2));
    expect([...sentForm().keys()]).toEqual(['address']);
    expect(input(FIELDS.neighborhood).value).toBe('LoDo');
    expect(input(FIELDS.address).value).toBe('1 Main St');
  });

  it('a save lays its columns over a row that landed mid-save', async () => {
    let resolve: (value: { success: true }) => void = () => undefined;
    mockUpdateVenue.mockReturnValueOnce(
      new Promise((res) => {
        resolve = res;
      }),
    );
    const { rerender } = render(<DetailsTab venue={venue} />);
    fireEvent.change(input(FIELDS.address), { target: { value: '1 Main St' } });
    save();
    await waitFor(() => expect(mockUpdateVenue).toHaveBeenCalledTimes(1));

    rerender(<DetailsTab venue={{ ...venue, neighborhood: 'LoDo' }} />);
    resolve({ success: true });
    await waitFor(() => expect(mockRefresh).toHaveBeenCalled());
    // The baseline holds both: no edit is counted against the newer row.
    expect(screen.queryByTestId('details-save-bar')).toBeNull();
    expect(input(FIELDS.neighborhood).value).toBe('LoDo');
    expect(input(FIELDS.address).value).toBe('1 Main St');
  });

  it('remakes the link from the name, with no native tooltip', () => {
    render(<DetailsTab venue={venue} />);
    fireEvent.change(input(FIELDS.name), {
      target: { value: 'Ball Arena Denver!' },
    });
    const regenerate = screen.getByRole('button', {
      name: FIELDS.link.regenerate,
    });
    expect(regenerate.hasAttribute('title')).toBe(false);
    fireEvent.click(regenerate);
    expect(input(FIELDS.link.label).value).toBe('ball-arena-denver');
  });

  it('a stored value the rules refuse never blocks saving another field', async () => {
    render(
      <DetailsTab
        venue={{ ...venue, contactEmail: 'bookings at ballarena' }}
      />,
    );
    fireEvent.change(input(FIELDS.address), { target: { value: '1 Main St' } });
    save();
    await waitFor(() => expect(mockUpdateVenue).toHaveBeenCalledTimes(1));
    expect([...sentForm().keys()]).toEqual(['address']);
  });

  it('keeps an edit when a newer row arrives, and takes the rest', () => {
    const { rerender } = render(<DetailsTab venue={venue} />);
    fireEvent.change(input(FIELDS.address), { target: { value: '1 Main St' } });
    rerender(<DetailsTab venue={{ ...venue, neighborhood: 'LoDo' }} />);
    expect(input(FIELDS.address).value).toBe('1 Main St');
    expect(input(FIELDS.neighborhood).value).toBe('LoDo');
  });

  it('never sends About or City unless they were edited', async () => {
    render(<DetailsTab venue={{ ...venue, city: '' }} />);
    fireEvent.change(input(FIELDS.address), { target: { value: '1 Main St' } });
    save();
    await waitFor(() => expect(mockUpdateVenue).toHaveBeenCalledTimes(1));
    expect([...sentForm().keys()]).toEqual(['address']);
  });

  it('saves edited About and City through its own bar', async () => {
    render(<DetailsTab venue={venue} />);
    fireEvent.change(screen.getByRole('textbox', { name: COPY.cards.about }), {
      target: { value: 'A new line.' },
    });
    fireEvent.change(input(FIELDS.city), { target: { value: 'Boulder' } });
    expect(
      screen.getByText(COPY.saveBar.unsaved(2), { exact: false }),
    ).toBeTruthy();
    save();
    await waitFor(() => expect(mockUpdateVenue).toHaveBeenCalledTimes(1));
    expect([...sentForm().keys()].sort()).toEqual(['about', 'city']);
    expect(sentForm().get('about')).toBe('A new line.');
    expect(sentForm().get('city')).toBe('Boulder');
  });

  it('accepting a drafted About also takes its capacity, type and neighborhood', async () => {
    mockGenerate.mockResolvedValue({
      success: true,
      data: {
        about: 'A drafted line.',
        capacity: 18000,
        venueType: 'Amphitheater',
        neighborhood: 'LoDo',
      },
    });
    render(<DetailsTab venue={venue} />);
    fireEvent.click(screen.getByRole('button', { name: FIELDS.about.draft }));
    fireEvent.click(await screen.findByTestId('generate-review'));
    expect(
      screen.getByRole('textbox', { name: COPY.cards.about }),
    ).toHaveProperty('value', 'A drafted line.');
    expect(input(FIELDS.capacity.label).value).toBe('18,000');
    expect(input(FIELDS.neighborhood).value).toBe('LoDo');
    expect(screen.getByLabelText(FIELDS.capacityType.label)).toHaveProperty(
      'value',
      COPY.capacityTypes.outdoor,
    );
  });

  it('an accepted draft is an edit until saved, and saves its four columns', async () => {
    mockGenerate.mockResolvedValue({
      success: true,
      data: {
        about: 'A drafted line.',
        capacity: 18000,
        venueType: 'Amphitheater',
        neighborhood: 'LoDo',
      },
    });
    render(<DetailsTab venue={venue} />);
    expect(mockUpdateVenue).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: FIELDS.about.draft }));
    fireEvent.click(await screen.findByTestId('generate-review'));
    expect(mockUpdateVenue).not.toHaveBeenCalled();
    save();
    await waitFor(() => expect(mockUpdateVenue).toHaveBeenCalledTimes(1));
    expect([...sentForm().keys()].sort()).toEqual([
      'about',
      'capacity',
      'neighborhood',
      'venueType',
    ]);
  });

  it('a draft with no capacity keeps the venue’s own', async () => {
    mockGenerate.mockResolvedValue({
      success: true,
      data: {
        about: 'A drafted line.',
        capacity: null,
        venueType: 'Arena',
        neighborhood: 'LoDo',
      },
    });
    render(<DetailsTab venue={venue} />);
    fireEvent.click(screen.getByRole('button', { name: FIELDS.about.draft }));
    fireEvent.click(await screen.findByTestId('generate-review'));
    expect(input(FIELDS.capacity.label).value).toBe('19,500');
    expect(input(FIELDS.neighborhood).value).toBe('LoDo');
  });

  it('accepting a draft never replaces an edit, and fills the unedited fields', async () => {
    mockGenerate.mockResolvedValue(drafted('A drafted line.'));
    render(<DetailsTab venue={venue} />);
    fireEvent.change(input(FIELDS.capacity.label), {
      target: { value: '20000' },
    });
    fireEvent.click(screen.getByRole('button', { name: FIELDS.about.draft }));
    fireEvent.click(await screen.findByTestId('generate-review'));
    // The admin's capacity survives; the untouched neighborhood and type
    // take the draft's.
    expect(input(FIELDS.capacity.label).value).toBe('20000');
    expect(input(FIELDS.neighborhood).value).toBe('LoDo');
    expect(screen.getByLabelText(FIELDS.capacityType.label)).toHaveProperty(
      'value',
      COPY.capacityTypes.outdoor,
    );
  });

  it('an unedited capacity takes the draft’s', async () => {
    mockGenerate.mockResolvedValue(drafted('A drafted line.'));
    render(<DetailsTab venue={venue} />);
    fireEvent.change(input(FIELDS.neighborhood), {
      target: { value: 'Five Points' },
    });
    fireEvent.click(screen.getByRole('button', { name: FIELDS.about.draft }));
    fireEvent.click(await screen.findByTestId('generate-review'));
    expect(input(FIELDS.capacity.label).value).toBe('18,000');
    expect(input(FIELDS.neighborhood).value).toBe('Five Points');
  });

  it('keeps a draft in review across the phone breakpoint', async () => {
    mockGenerate.mockResolvedValue(drafted('A paid-for line.'));
    render(<DetailsTab venue={venue} />);
    fireEvent.click(screen.getByRole('button', { name: FIELDS.about.draft }));
    await screen.findByTestId('generate-review');
    setPhone(true);
    // About moved into the phone column (a remount), still in review.
    expect(screen.getByTestId('details-venue').parentElement).toBe(
      screen.getByTestId('details-about').parentElement,
    );
    expect(
      screen.getByTestId('generate-review').getAttribute('data-content'),
    ).toBe('A paid-for line.');
    setPhone(false);
    expect(
      screen.getByTestId('generate-review').getAttribute('data-content'),
    ).toBe('A paid-for line.');
    expect(mockGenerate).toHaveBeenCalledTimes(1);
  });

  it('a draft cancelled while loading never opens a review', async () => {
    const request = deferred<ReturnType<typeof drafted>>();
    mockGenerate.mockReturnValueOnce(request.promise);
    render(<DetailsTab venue={venue} />);
    fireEvent.click(screen.getByRole('button', { name: FIELDS.about.draft }));
    expect(screen.getByTestId('generate-loading')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'cancel' }));
    await act(async () => {
      request.resolve(drafted('Too late.'));
      await request.promise;
    });
    expect(screen.queryByTestId('generate-review')).toBeNull();
    expect(
      screen.getByRole('button', { name: FIELDS.about.draft }),
    ).toBeTruthy();
  });

  it('of two overlapping drafts, only the latest lands', async () => {
    const first = deferred<ReturnType<typeof drafted>>();
    const second = deferred<ReturnType<typeof drafted>>();
    mockGenerate
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);
    render(<DetailsTab venue={venue} />);
    fireEvent.click(screen.getByRole('button', { name: FIELDS.about.draft }));
    fireEvent.click(screen.getByRole('button', { name: 'cancel' }));
    fireEvent.click(screen.getByRole('button', { name: FIELDS.about.draft }));
    // The first lands while the second is out: still loading.
    await act(async () => {
      first.resolve(drafted('The first.'));
      await first.promise;
    });
    expect(screen.getByTestId('generate-loading')).toBeTruthy();
    await act(async () => {
      second.resolve(drafted('The second.'));
      await second.promise;
    });
    expect(
      screen.getByTestId('generate-review').getAttribute('data-content'),
    ).toBe('The second.');
  });

  it('refuses an About over 280 on save, never cutting it', () => {
    const long = 'a'.repeat(281);
    render(<DetailsTab venue={venue} />);
    const about = screen.getByRole('textbox', { name: COPY.cards.about });
    // A browser cuts a paste at maxLength (jsdom doesn't), so there is none.
    expect(about.getAttribute('maxlength')).toBeNull();
    fireEvent.change(about, { target: { value: long } });
    expect(about).toHaveProperty('value', long);
    save();
    expect(mockUpdateVenue).not.toHaveBeenCalled();
    expect(screen.getByText(COPY.errors.aboutTooLong)).toBeTruthy();
    expect(about).toHaveProperty('value', long);
  });

  it('a second accepted draft replaces the first’s fills, never an edit', async () => {
    mockGenerate
      .mockResolvedValueOnce(drafted('The first.'))
      .mockResolvedValueOnce({
        success: true,
        data: {
          about: 'The second.',
          capacity: 1100,
          venueType: 'Club',
          neighborhood: 'RiNo',
        },
      });
    render(<DetailsTab venue={venue} />);
    fireEvent.click(screen.getByRole('button', { name: FIELDS.about.draft }));
    fireEvent.click(await screen.findByTestId('generate-review'));
    expect(input(FIELDS.neighborhood).value).toBe('LoDo');
    // Typed between the drafts: an edit, so the second never replaces it.
    fireEvent.change(input(FIELDS.neighborhood), {
      target: { value: 'Five Points' },
    });
    fireEvent.click(screen.getByRole('button', { name: FIELDS.about.draft }));
    fireEvent.click(await screen.findByTestId('generate-review'));
    expect(
      screen.getByRole('textbox', { name: COPY.cards.about }),
    ).toHaveProperty('value', 'The second.');
    expect(input(FIELDS.capacity.label).value).toBe('1,100');
    expect(screen.getByLabelText(FIELDS.capacityType.label)).toHaveProperty(
      'value',
      COPY.capacityTypes.club,
    );
    expect(input(FIELDS.neighborhood).value).toBe('Five Points');
  });

  it('a second draft fills a neighborhood the first filled and nobody touched', async () => {
    mockGenerate
      .mockResolvedValueOnce(drafted('The first.'))
      .mockResolvedValueOnce({
        success: true,
        data: {
          about: 'The second.',
          capacity: 1100,
          venueType: 'Club',
          neighborhood: 'RiNo',
        },
      });
    render(<DetailsTab venue={venue} />);
    fireEvent.click(screen.getByRole('button', { name: FIELDS.about.draft }));
    fireEvent.click(await screen.findByTestId('generate-review'));
    fireEvent.click(screen.getByRole('button', { name: FIELDS.about.draft }));
    fireEvent.click(await screen.findByTestId('generate-review'));
    expect(input(FIELDS.neighborhood).value).toBe('RiNo');
  });

  it('Discard closes an open About review, so nothing can be accepted after', async () => {
    mockGenerate.mockResolvedValue(drafted('A drafted line.'));
    render(<DetailsTab venue={venue} />);
    fireEvent.change(input(FIELDS.city), { target: { value: 'Boulder' } });
    fireEvent.click(screen.getByRole('button', { name: FIELDS.about.draft }));
    await screen.findByTestId('generate-review');
    fireEvent.click(screen.getByRole('button', { name: COPY.saveBar.discard }));
    expect(screen.queryByTestId('generate-review')).toBeNull();
    expect(screen.queryByRole('button', { name: 'accept' })).toBeNull();
    expect(
      screen.getByRole('button', { name: FIELDS.about.draft }),
    ).toBeTruthy();
    expect(input(FIELDS.city).value).toBe('Denver');
  });

  it('holds the About review’s Accept while a save is in flight', async () => {
    const request = deferred<{ success: boolean }>();
    mockUpdateVenue.mockReturnValueOnce(request.promise);
    mockGenerate.mockResolvedValue(drafted('A drafted line.'));
    render(<DetailsTab venue={venue} />);
    fireEvent.change(input(FIELDS.city), { target: { value: 'Boulder' } });
    fireEvent.click(screen.getByRole('button', { name: FIELDS.about.draft }));
    const accept = await screen.findByTestId('generate-review');
    expect(accept).toHaveProperty('disabled', false);
    save();
    await waitFor(() => expect(accept).toHaveProperty('disabled', true));
    await act(async () => {
      request.resolve({ success: true });
      await request.promise;
    });
    expect(screen.getByTestId('generate-review')).toHaveProperty(
      'disabled',
      false,
    );
  });

  it('holds Write a draft while a save is in flight', async () => {
    const request = deferred<{ success: boolean }>();
    mockUpdateVenue.mockReturnValueOnce(request.promise);
    render(<DetailsTab venue={venue} />);
    fireEvent.change(input(FIELDS.city), { target: { value: 'Boulder' } });
    save();
    expect(
      screen.getByRole('button', { name: FIELDS.about.draft }),
    ).toHaveProperty('disabled', true);
    await act(async () => {
      request.resolve({ success: true });
      await request.promise;
    });
  });

  it('logs a draft that fails after it was overtaken, but never shows it', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    let fail: (err: Error) => void = () => undefined;
    mockGenerate.mockReturnValueOnce(
      new Promise((_res, rej) => {
        fail = rej;
      }),
    );
    render(<DetailsTab venue={venue} />);
    fireEvent.click(screen.getByRole('button', { name: FIELDS.about.draft }));
    fireEvent.click(screen.getByRole('button', { name: 'cancel' }));
    await act(async () => {
      fail(new Error('network'));
      await Promise.resolve();
    });
    await waitFor(() =>
      expect(spy).toHaveBeenCalledWith(
        'DetailsAbout: draft failed',
        expect.objectContaining({ venueId: venue.id }),
      ),
    );
    expect(screen.queryByTestId('generate-error')).toBeNull();
    spy.mockRestore();
  });

  it('a failed draft says so and changes nothing', async () => {
    mockGenerate.mockResolvedValue({ success: false });
    render(<DetailsTab venue={venue} />);
    fireEvent.click(screen.getByRole('button', { name: FIELDS.about.draft }));
    expect(await screen.findByTestId('generate-error')).toBeTruthy();
    expect(screen.queryByTestId('details-save-bar')).toBeNull();
  });

  it('draws the Look card before an icon (`details-no-icon`), with no held actions', () => {
    render(<DetailsTab venue={{ ...venue, slug: 'not-a-glyph-venue' }} />);
    const look = screen.getByRole('region', { name: COPY.cards.look });
    expect(within(look).getByText(COPY.look.iconNone)).toBeTruthy();
    expect(within(look).getByText(COPY.look.heroNone)).toBeTruthy();
    expect(within(look).queryAllByRole('button')).toEqual([]);
  });

  it('names the hero setting of a venue that has one', () => {
    render(<DetailsTab venue={venue} />);
    const hero = screen.getByTestId('details-look-hero');
    expect(within(hero).getByText(COPY.capacityTypes.arena)).toBeTruthy();
  });

  it('hints City on desktop only, as the boards draw it', () => {
    const { unmount } = render(<DetailsTab venue={venue} />);
    const cityHint = () =>
      input(FIELDS.city).parentElement?.textContent?.includes(FIELDS.cityHint);
    expect(cityHint()).toBe(true);
    unmount();
    phone = true;
    render(<DetailsTab venue={venue} />);
    expect(cityHint()).toBe(false);
    expect(screen.queryByText(FIELDS.cityHint)).toBeNull();
  });

  it('draws the Look card as details-d on desktop: 56px, icon radius 15, a rule, the hero bar', () => {
    render(<DetailsTab venue={venue} />);
    const icon = screen.getByTestId('details-look-icon');
    const tile = icon.querySelector('svg[data-venue-tile]');
    expect(tile?.getAttribute('width')).toBe('56');
    expect(Number(tile?.querySelector('rect')?.getAttribute('rx'))).toBe(
      (15 * 96) / 56,
    );
    expect(screen.getByTestId('details-look-icon-title').style.fontSize).toBe(
      '13.5px',
    );
    const hero = screen.getByTestId('details-look-hero-thumb');
    expect(hero.style.width).toBe('56px');
    expect(hero.style.borderRadius).toBe('12px');
    expect(screen.queryByTestId('details-look-hero-bar')).not.toBeNull();
    expect(screen.queryByTestId('details-look-rule')).not.toBeNull();
  });

  it('draws the Look card as details-m on phone: 48px, radius 12, 14px titles, no rule, no hero bar', () => {
    phone = true;
    render(<DetailsTab venue={venue} />);
    const tile = screen
      .getByTestId('details-look-icon')
      .querySelector('svg[data-venue-tile]');
    expect(tile?.getAttribute('width')).toBe('48');
    expect(Number(tile?.querySelector('rect')?.getAttribute('rx'))).toBe(
      (12 * 96) / 48,
    );
    for (const id of ['details-look-icon-title', 'details-look-hero-title']) {
      expect(screen.getByTestId(id).style.fontSize).toBe('14px');
    }
    const hero = screen.getByTestId('details-look-hero-thumb');
    expect(hero.style.width).toBe('48px');
    expect(hero.style.borderRadius).toBe('12px');
    expect(screen.queryByTestId('details-look-hero-bar')).toBeNull();
    expect(screen.queryByTestId('details-look-rule')).toBeNull();
  });

  it('draws no fallback art and no Roll control (addendum 5)', () => {
    render(<DetailsTab venue={venue} />);
    expect(screen.queryByTestId('details-fallback-art')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Roll' })).toBeNull();
  });

  it('puts City beside Neighborhood on desktop, Map pin on its own row', () => {
    render(<DetailsTab venue={venue} />);
    const row = (label: string) =>
      input(label).parentElement?.parentElement ?? null;
    expect(row(FIELDS.city)).toBe(row(FIELDS.neighborhood));
    expect(row(FIELDS.city)?.style.gridTemplateColumns).toBe(
      'minmax(0, 1fr) minmax(0, 1fr)',
    );
    expect(row(FIELDS.city)?.style.gap).toBe('10px');
    expect(row(FIELDS.mapPin.label)).not.toBe(row(FIELDS.city));
  });

  it('stacks City straight under Neighborhood on phone', () => {
    phone = true;
    render(<DetailsTab venue={venue} />);
    const field = (label: string) => input(label).parentElement;
    expect(field(FIELDS.neighborhood)?.nextElementSibling).toBe(
      field(FIELDS.city),
    );
    expect(field(FIELDS.city)?.nextElementSibling).toBe(
      field(FIELDS.mapPin.label),
    );
  });

  it('stacks the cards in the phone order: Venue, Tickets, Contact, Look, About', () => {
    phone = true;
    render(<DetailsTab venue={venue} />);
    const titles = screen
      .getAllByRole('region')
      .map((region) => region.getAttribute('aria-label'));
    expect(titles).toEqual([
      COPY.cards.venue,
      COPY.cards.tickets,
      COPY.cards.contact,
      COPY.cards.look,
      COPY.cards.about,
    ]);
    // One column: every card shares a parent (desktop splits them).
    const parentOf = (id: string) => screen.getByTestId(id).parentElement;
    expect(parentOf('details-venue')).toBe(parentOf('details-look'));
    // details-m draws the cards at 16/18 on phone too, unlike Source's 14.
    for (const id of [
      'details-venue',
      'details-about',
      'details-tickets',
      'details-contact',
      'details-look',
    ]) {
      expect(screen.getByTestId(id).style.padding).toBe('16px 18px');
    }
  });

  it('puts Venue and About on the left on desktop, the rest on the right', () => {
    render(<DetailsTab venue={venue} />);
    const parentOf = (id: string) => screen.getByTestId(id).parentElement;
    expect(parentOf('details-venue')).toBe(parentOf('details-about'));
    expect(parentOf('details-venue')).not.toBe(parentOf('details-contact'));
    for (const id of ['details-tickets', 'details-look']) {
      expect(parentOf(id)).toBe(parentOf('details-contact'));
    }
  });
});
